import {randomBytes} from 'node:crypto';
import {BadRequestException,Inject,Injectable,NotFoundException,UnauthorizedException} from '@nestjs/common';
import {z} from 'zod';
import {PrismaService} from '../../prisma/prisma.service.js';
import {CsrfService} from './csrf.js';
import {hashPassword,tokenHash,verifyPassword} from './security.js';
import type {StaffRequest} from './session.guard.js';
const credentials=z.object({email:z.email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(1).max(128)}).strict();
const change=z.object({currentPassword:z.string().min(1).max(128),newPassword:z.string().min(12).max(128)}).strict();
const publicUser={id:true,email:true,role:true} as const;
@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma:PrismaService,@Inject(CsrfService) private readonly csrf:CsrfService){}
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
    return {token,expiresAt,staff:{id:user.id,email:user.email,role:user.role},csrfToken:this.csrf.token(token)};
  }
  async session(request:StaffRequest) {
    const staff=await this.prisma.staffUser.findUnique({where:{id:request.staff!.id},select:publicUser});if(!staff)throw new UnauthorizedException();
    return {staff,csrfToken:this.csrf.token(request.sessionToken!)};
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
