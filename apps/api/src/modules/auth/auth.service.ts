import {randomBytes,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {BadRequestException,ConflictException,Inject,Injectable,Logger,NotFoundException,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import {z} from 'zod';
import {waitUntil} from '@vercel/functions';
import {OAuth2Client} from 'google-auth-library';
import {NotificationsService} from '../notifications/notifications.service.js';
import {forgotPasswordInput,resetPasswordInput,googleAuthInput,staffEmailSchema} from '@amc/shared';
import {PrismaService} from '../../prisma/prisma.service.js';
import {CsrfService} from './csrf.js';
import {hashPassword,otpHash,tokenHash,verifyPassword} from './security.js';
import type {StaffRequest} from './session.guard.js';
const credentials=z.object({email:staffEmailSchema,password:z.string().min(1).max(128)}).strict();
const change=z.object({currentPassword:z.string().min(1).max(128),newPassword:z.string().min(12).max(128)}).strict();
const staffSelect={id:true,email:true,firstName:true,lastName:true,role:true,passwordHash:true,googleEmail:true,googleLinkedAt:true} as const;
type StaffIdentity={id:string;email:string;firstName:string;lastName:string;role:string;passwordHash:string|null;googleEmail?:string|null;googleLinkedAt?:Date|null};
export function toPublicUser(user:StaffIdentity){return {id:user.id,email:user.email,firstName:user.firstName,lastName:user.lastName,role:user.role,googleEmail:user.googleEmail??null,googleLinkedAt:user.googleLinkedAt??null,hasPassword:Boolean(user.passwordHash)};}
@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma:PrismaService,@Inject(CsrfService) private readonly csrf:CsrfService,@Inject(NotificationsService) private readonly notifications:NotificationsService){}
  async login(input:unknown,previousToken?:string) {
    const parsed=credentials.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid sign-in request');
    const user=await this.prisma.staffUser.findUnique({where:{email:parsed.data.email}});
    const valid=await verifyPassword(parsed.data.password,user?.passwordHash);
    if(!valid||!user?.active){await this.prisma.staffAuditEvent.create({data:{action:'SIGN_IN_FAILED',actorId:user?.id,subjectId:user?.id}});throw new UnauthorizedException('Invalid credentials');}
    const token=randomBytes(32).toString('hex');const expiresAt=new Date(Date.now()+8*60*60*1000);
    await this.prisma.$transaction(async tx=>{
      // Serialize issuance against password changes and recheck the verified hash.
      await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
      const current=await tx.staffUser.findUnique({where:{id:user.id}});
      if(!current?.active||current.passwordHash!==user.passwordHash)throw new UnauthorizedException('Invalid credentials');
      // Revoke the prior browser session when replacing its identity.
      if(previousToken)await tx.staffSession.deleteMany({where:{tokenHash:tokenHash(previousToken)}});
      await tx.staffSession.create({data:{tokenHash:tokenHash(token),userId:user.id,expiresAt}});
      await tx.staffAuditEvent.create({data:{actorId:user.id,subjectId:user.id,action:'SIGNED_IN'}});
    });
    return {token,expiresAt,staff:toPublicUser(user),csrfToken:this.csrf.token(token)};
  }
  private readonly logger=new Logger(AuthService.name);
  async forgotPassword(input:unknown){
    const parsed=forgotPasswordInput.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid recovery request');
    if(process.env.NODE_ENV==='production'&&(!process.env.STAFF_OTP_SECRET||process.env.STAFF_OTP_SECRET.length<32)){this.logger.warn('Staff recovery is not configured');return {accepted:true};}
    // Identity cooldown is persisted and applies equally to unknown addresses.
    const key=tokenHash('staff-reset:'+parsed.data.email);
    const allowed=await this.prisma.$queryRaw<{totalHits:number}[]>`INSERT INTO "RequestThrottle" ("key","totalHits","expiresAt") VALUES (${key},1,NOW()+INTERVAL '60 seconds') ON CONFLICT ("key") DO UPDATE SET "totalHits"=CASE WHEN "RequestThrottle"."expiresAt"<=NOW() THEN 1 ELSE "RequestThrottle"."totalHits"+1 END,"expiresAt"=CASE WHEN "RequestThrottle"."expiresAt"<=NOW() THEN NOW()+INTERVAL '60 seconds' ELSE "RequestThrottle"."expiresAt" END RETURNING "totalHits"`;
    if(allowed[0]?.totalHits!==1)return {accepted:true};
    const delivery=await this.prisma.$transaction(async tx=>{
      const found=await tx.staffUser.findUnique({where:{email:parsed.data.email},select:{id:true}});if(!found)return null;
      await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${found.id}::uuid FOR UPDATE`;
      const user=await tx.staffUser.findUnique({where:{id:found.id}});if(!user?.active)return null;
      const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0');
      await tx.staffPasswordResetToken.updateMany({where:{userId:user.id,consumedAt:null},data:{consumedAt:new Date()}});
      await tx.staffPasswordResetToken.create({data:{id,userId:user.id,codeHash:otpHash(user.id,id,code),expiresAt:new Date(Date.now()+15*60000)}});
      await tx.staffAuditEvent.create({data:{subjectId:user.id,action:'PASSWORD_RESET_REQUESTED'}});
      return {email:user.email,code,id};
    });
    if(delivery){const job=this.notifications.sendStaffPasswordResetOtp(delivery.email,delivery.code,parsed.data.locale,delivery.id).catch(()=>{this.logger.warn('Staff recovery delivery failed');});if(process.env.VERCEL)waitUntil(job);else void job;}
    return {accepted:true};
  }
  async resetPassword(input:unknown){
    const parsed=resetPasswordInput.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid reset request');
    if(process.env.NODE_ENV==='production'&&(!process.env.STAFF_OTP_SECRET||process.env.STAFF_OTP_SECRET.length<32))throw new ServiceUnavailableException('Password recovery is not configured');
    // Always derive before account lookup to reduce password-hashing timing differences.
    const passwordHash=await hashPassword(parsed.data.newPassword);
    const result=await this.prisma.$transaction(async tx=>{
      const found=await tx.staffUser.findUnique({where:{email:parsed.data.email},select:{id:true}});if(!found)return false;
      await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${found.id}::uuid FOR UPDATE`;
      const user=await tx.staffUser.findUnique({where:{id:found.id}});if(!user?.active)return false;
      const token=await tx.staffPasswordResetToken.findFirst({where:{userId:user.id,consumedAt:null,expiresAt:{gt:new Date()}},orderBy:{createdAt:'desc'}});
      if(!token||token.attempts>=5)return false;
      const valid=timingSafeEqual(Buffer.from(token.codeHash,'hex'),Buffer.from(otpHash(user.id,token.id,parsed.data.code),'hex'));
      if(!valid){await tx.staffPasswordResetToken.update({where:{id:token.id},data:{attempts:{increment:1}}});return false;}
      await tx.staffPasswordResetToken.updateMany({where:{userId:user.id,consumedAt:null},data:{consumedAt:new Date()}});
      await tx.staffUser.update({where:{id:user.id},data:{passwordHash}});
      await tx.staffSession.deleteMany({where:{userId:user.id}});
      await tx.staffAuditEvent.create({data:{subjectId:user.id,action:'PASSWORD_RESET_COMPLETED'}});
      return true;
    });
    if(!result)throw new BadRequestException('Invalid or expired reset code');return {reset:true};
  }
  async verifyGoogle(input:unknown){
    const parsed=googleAuthInput.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid Google request');
    const audience=process.env.GOOGLE_CLIENT_ID;if(!audience)throw new ServiceUnavailableException('Google sign-in is not configured');
    try{const ticket=await new OAuth2Client(audience).verifyIdToken({idToken:parsed.data.credential,audience});const payload=ticket.getPayload();
      if(!payload?.sub||!payload.email||payload.email_verified!==true||!['https://accounts.google.com','accounts.google.com'].includes(payload.iss))throw new Error();
      return {sub:payload.sub,email:payload.email.toLowerCase(),authoritative:payload.email.endsWith('@gmail.com')||Boolean(payload.hd)};
    }catch{throw new UnauthorizedException('Invalid Google credentials');}
  }
  async googleLogin(input:unknown,previousToken?:string){
    const google=await this.verifyGoogle(input);const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+8*3600000);
    try{
      const user=await this.prisma.$transaction(async tx=>{
        let found=await tx.staffUser.findUnique({where:{googleId:google.sub}});
        if(!found&&google.authoritative&&process.env.GOOGLE_AUTO_LINK_BY_EMAIL==='true')found=await tx.staffUser.findUnique({where:{email:google.email}});
        if(!found)return null;
        await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${found.id}::uuid FOR UPDATE`;
        const current=await tx.staffUser.findUnique({where:{id:found.id}});
        if(!current?.active||current.googleId&&current.googleId!==google.sub||!current.googleId&&!(google.authoritative&&process.env.GOOGLE_AUTO_LINK_BY_EMAIL==='true'&&current.email===google.email))return null;
        const linked=await tx.staffUser.update({where:{id:current.id},data:{googleId:google.sub,googleEmail:google.email,googleLinkedAt:current.googleLinkedAt??new Date()}});
        if(previousToken)await tx.staffSession.deleteMany({where:{tokenHash:tokenHash(previousToken)}});
        await tx.staffSession.create({data:{tokenHash:tokenHash(token),userId:current.id,expiresAt}});
        await tx.staffAuditEvent.create({data:{actorId:current.id,subjectId:current.id,action:'SIGNED_IN_GOOGLE'}});return linked;
      });
      if(!user){await this.prisma.staffAuditEvent.create({data:{action:'SIGN_IN_FAILED'}});throw new UnauthorizedException('Google account is not linked to active staff');}
      return {token,expiresAt,staff:toPublicUser(user),csrfToken:this.csrf.token(token)};
    }catch(error){if(error&&typeof error==='object'&&'code' in error&&error.code==='P2002')throw new UnauthorizedException('Google account unavailable');throw error;}
  }
  async googleLink(request:StaffRequest,input:unknown){
    const google=await this.verifyGoogle(input);
    try{return await this.prisma.$transaction(async tx=>{
      const id=request.staff!.id;await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${id}::uuid FOR UPDATE`;
      const user=await tx.staffUser.findUnique({where:{id}});if(!user?.active)throw new UnauthorizedException();
      if(user.googleId&&user.googleId!==google.sub)throw new ConflictException('Unlink your current Google account first');
      const owner=await tx.staffUser.findUnique({where:{googleId:google.sub}});if(owner&&owner.id!==id)throw new ConflictException('Google account is already linked');
      const changed=await tx.staffUser.update({where:{id},data:{googleId:google.sub,googleEmail:google.email,googleLinkedAt:new Date()}});
      await tx.staffAuditEvent.create({data:{actorId:id,subjectId:id,action:'GOOGLE_ACCOUNT_LINKED'}});return {staff:toPublicUser(changed)};
    });}catch(error){if(error&&typeof error==='object'&&'code' in error&&error.code==='P2002')throw new ConflictException('Google account is already linked');throw error;}
  }
  async googleUnlink(request:StaffRequest){
    return this.prisma.$transaction(async tx=>{
      const id=request.staff!.id;await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${id}::uuid FOR UPDATE`;
      const user=await tx.staffUser.findUnique({where:{id}});if(!user?.active)throw new UnauthorizedException();if(!user.passwordHash)throw new BadRequestException('Set a password before unlinking Google');
      const changed=await tx.staffUser.update({where:{id},data:{googleId:null,googleEmail:null,googleLinkedAt:null}});
      await tx.staffAuditEvent.create({data:{actorId:id,subjectId:id,action:'GOOGLE_ACCOUNT_UNLINKED'}});return {staff:toPublicUser(changed)};
    });
  }
  async session(request:StaffRequest) {
    const staff=await this.prisma.staffUser.findUnique({where:{id:request.staff!.id},select:staffSelect});if(!staff)throw new UnauthorizedException();
    return {staff:toPublicUser(staff),csrfToken:this.csrf.token(request.sessionToken!)};
  }
  async logout(request:StaffRequest) {
    await this.prisma.$transaction(async tx=>{await tx.staffSession.deleteMany({where:{id:request.sessionId,userId:request.staff!.id}});await tx.staffAuditEvent.create({data:{actorId:request.staff!.id,subjectId:request.staff!.id,action:'SIGNED_OUT'}});});
  }
  async password(request:StaffRequest,input:unknown) {
    const parsed=change.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid password request');
    const user=await this.prisma.staffUser.findUnique({where:{id:request.staff!.id}});
    if(!await verifyPassword(parsed.data.currentPassword,user?.passwordHash))throw new UnauthorizedException('Invalid credentials');
    const passwordHash=await hashPassword(parsed.data.newPassword);
    await this.prisma.$transaction(async tx=>{
      // Conditional write prevents two concurrent password changes both succeeding.
      const updated=await tx.staffUser.updateMany({where:{id:user!.id,passwordHash:user!.passwordHash,active:true},data:{passwordHash}});
      if(updated.count!==1)throw new UnauthorizedException('Credentials changed; sign in again');
      await tx.staffSession.deleteMany({where:{userId:user!.id}});
      await tx.staffAuditEvent.create({data:{actorId:user!.id,subjectId:user!.id,action:'PASSWORD_CHANGED'}});
    });
  }
  sessions(request:StaffRequest) {return this.prisma.staffSession.findMany({where:{userId:request.staff!.id,expiresAt:{gt:new Date()}},select:{id:true,createdAt:true,expiresAt:true},orderBy:{createdAt:'desc'},take:50}).then(items=>items.map(item=>({...item,current:item.id===request.sessionId})));}
  async revoke(request:StaffRequest,input:unknown) {
    const parsed=z.object({id:z.uuid()}).strict().safeParse(input);if(!parsed.success)throw new BadRequestException();
    await this.prisma.$transaction(async tx=>{const deleted=await tx.staffSession.deleteMany({where:{id:parsed.data.id,userId:request.staff!.id}});if(!deleted.count)throw new NotFoundException();await tx.staffAuditEvent.create({data:{actorId:request.staff!.id,subjectId:request.staff!.id,action:'SESSION_REVOKED'}});});
    return {signedOut:parsed.data.id===request.sessionId};
  }
  async overview() {const now=new Date();const [activeStaff,activeSessions,failedSignIns]=await Promise.all([this.prisma.staffUser.count({where:{active:true}}),this.prisma.staffSession.count({where:{expiresAt:{gt:now},user:{active:true}}}),this.prisma.staffAuditEvent.count({where:{action:'SIGN_IN_FAILED',createdAt:{gte:new Date(now.getTime()-24*60*60*1000)}}})]);return {activeStaff,activeSessions,failedSignIns};}
  async audit(page:unknown) {const parsed=z.coerce.number().int().min(0).max(1000).safeParse(page??0);if(!parsed.success)throw new BadRequestException();const [items,total]=await Promise.all([this.prisma.staffAuditEvent.findMany({skip:parsed.data*25,take:25,orderBy:[{createdAt:'desc'},{id:'desc'}],select:{id:true,action:true,createdAt:true,actor:{select:{email:true}},subjectId:true}}),this.prisma.staffAuditEvent.count()]);return {items,total,page:parsed.data};}
}
