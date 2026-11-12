import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {z} from 'zod';
import {staffEmailSchema,likelyStaffEmailTypo} from '@amc/shared';
import {PrismaService} from '../../prisma/prisma.service.js';
import {hashPassword} from './security.js';

const role=z.enum(['RECEPTIONIST','MANAGER','ADMIN']);
const email=staffEmailSchema;
const password=z.string().min(12).max(128);
const name=z.string().trim().max(80);
const createInput=z.object({email,role,password,firstName:name.default(''),lastName:name.default(''),confirmSimilarEmail:z.boolean().optional()}).strict();
const updateInput=z.object({id:z.uuid(),firstName:name.optional(),lastName:name.optional(),role:role.optional(),active:z.boolean().optional(),password:password.optional()}).strict().refine(value=>value.firstName!==undefined||value.lastName!==undefined||value.role!==undefined||value.active!==undefined||value.password!==undefined);
const idInput=z.object({id:z.uuid()}).strict();
const publicAccount={id:true,email:true,firstName:true,lastName:true,role:true,active:true,createdAt:true} as const;

@Injectable()
export class StaffAccountsService {
  constructor(@Inject(PrismaService) private readonly prisma:PrismaService){}
  list(){return this.prisma.staffUser.findMany({select:publicAccount,orderBy:[{createdAt:'desc'},{id:'desc'}],take:200});}
  async create(actorId:string,input:unknown){
    const parsed=createInput.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid staff account');
    const passwordHash=await hashPassword(parsed.data.password);
    try{return await this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1201200)`;
      const existing=await tx.staffUser.findMany({select:{email:true}});
      if(existing.some(account=>account.email.trim().toLowerCase()===parsed.data.email))throw new ConflictException({code:'STAFF_EMAIL_EXISTS',message:'Staff email already exists'});
      const similar=existing.filter(account=>likelyStaffEmailTypo(account.email,parsed.data.email)).map(account=>account.email);
      if(similar.length&&!parsed.data.confirmSimilarEmail)throw new ConflictException({code:'STAFF_EMAIL_REVIEW_REQUIRED',message:'Review similarly spelled staff emails before creating another account',similarEmails:similar});
      const account=await tx.staffUser.create({data:{email:parsed.data.email,role:parsed.data.role,firstName:parsed.data.firstName,lastName:parsed.data.lastName,passwordHash},select:publicAccount});
      await tx.staffAuditEvent.create({data:{actorId,subjectId:account.id,action:'STAFF_ACCOUNT_CREATED'}});
      if(similar.length)await tx.staffAuditEvent.create({data:{actorId,subjectId:account.id,action:'STAFF_SIMILAR_EMAIL_CONFIRMED'}});
      return account;
    });}catch(error){if((error as {code?:string}).code==='P2002')throw new ConflictException('Staff email already exists');throw error;}
  }
  async update(actorId:string,input:unknown){
    const parsed=updateInput.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid staff update');
    const {id,firstName,lastName,role,active,password:nextPassword}=parsed.data;
    const passwordHash=nextPassword?await hashPassword(nextPassword):undefined;
    return this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1201200)`;
      await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${id}::uuid FOR UPDATE`;
      const current=await tx.staffUser.findUnique({where:{id}});
      if(!current)throw new NotFoundException();
      if(current.active&&current.role==='ADMIN'&&(active===false||role&&role!=='ADMIN')&&await tx.staffUser.count({where:{role:'ADMIN',active:true}})<=1)throw new ConflictException('Keep at least one active admin');
      const account=await tx.staffUser.update({where:{id},data:{firstName,lastName,role,active,passwordHash},select:publicAccount});
      await tx.staffSession.deleteMany({where:{userId:id}});
      await tx.staffAuditEvent.create({data:{actorId,subjectId:id,action:'STAFF_ACCOUNT_UPDATED'}});
      return account;
    });
  }
  async deactivate(actorId:string,input:unknown){
    const parsed=idInput.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid staff account');
    const {id}=parsed.data;
    return this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1201200)`;
      await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${id}::uuid FOR UPDATE`;
      const current=await tx.staffUser.findUnique({where:{id}});
      if(!current)throw new NotFoundException();
      if(current.active&&current.role==='ADMIN'&&await tx.staffUser.count({where:{role:'ADMIN',active:true}})<=1)throw new ConflictException('Keep at least one active admin');
      const account=await tx.staffUser.update({where:{id},data:{active:false},select:publicAccount});
      await tx.staffSession.deleteMany({where:{userId:id}});
      await tx.staffAuditEvent.create({data:{actorId,subjectId:id,action:'STAFF_ACCOUNT_DEACTIVATED'}});
      return account;
    });
  }
}
