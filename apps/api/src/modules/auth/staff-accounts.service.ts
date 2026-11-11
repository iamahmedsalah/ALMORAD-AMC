import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {z} from 'zod';
import {PrismaService} from '../../prisma/prisma.service.js';
import {hashPassword} from './security.js';

const role=z.enum(['RECEPTIONIST','MANAGER']);
const email=z.email().max(254).transform(value=>value.trim().toLowerCase());
const password=z.string().min(12).max(128);
const createInput=z.object({email,role,password}).strict();
const updateInput=z.object({id:z.uuid(),role:role.optional(),active:z.boolean().optional(),password:password.optional()}).strict().refine(value=>value.role!==undefined||value.active!==undefined||value.password!==undefined);
const idInput=z.object({id:z.uuid()}).strict();
const publicAccount={id:true,email:true,role:true,active:true,createdAt:true} as const;

@Injectable()
export class StaffAccountsService {
  constructor(@Inject(PrismaService) private readonly prisma:PrismaService){}
  list(){return this.prisma.staffUser.findMany({where:{role:{in:['RECEPTIONIST','MANAGER']}},select:publicAccount,orderBy:[{createdAt:'desc'},{id:'desc'}],take:200});}
  async create(actorId:string,input:unknown){
    const parsed=createInput.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid staff account');
    const passwordHash=await hashPassword(parsed.data.password);
    try{return await this.prisma.$transaction(async tx=>{
      const account=await tx.staffUser.create({data:{email:parsed.data.email,role:parsed.data.role,passwordHash},select:publicAccount});
      await tx.staffAuditEvent.create({data:{actorId,subjectId:account.id,action:'STAFF_ACCOUNT_CREATED'}});
      return account;
    });}catch(error){if((error as {code?:string}).code==='P2002')throw new ConflictException('Staff email already exists');throw error;}
  }
  async update(actorId:string,input:unknown){
    const parsed=updateInput.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid staff update');
    const {id,role,active,password:nextPassword}=parsed.data;
    const passwordHash=nextPassword?await hashPassword(nextPassword):undefined;
    return this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${id}::uuid FOR UPDATE`;
      const current=await tx.staffUser.findUnique({where:{id}});
      if(!current||current.role==='CEO')throw new NotFoundException();
      const account=await tx.staffUser.update({where:{id},data:{role,active,passwordHash},select:publicAccount});
      await tx.staffSession.deleteMany({where:{userId:id}});
      await tx.staffAuditEvent.create({data:{actorId,subjectId:id,action:'STAFF_ACCOUNT_UPDATED'}});
      return account;
    });
  }
  async deactivate(actorId:string,input:unknown){
    const parsed=idInput.safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid staff account');
    const {id}=parsed.data;
    return this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${id}::uuid FOR UPDATE`;
      const current=await tx.staffUser.findUnique({where:{id}});
      if(!current||current.role==='CEO')throw new NotFoundException();
      const account=await tx.staffUser.update({where:{id},data:{active:false},select:publicAccount});
      await tx.staffSession.deleteMany({where:{userId:id}});
      await tx.staffAuditEvent.create({data:{actorId,subjectId:id,action:'STAFF_ACCOUNT_DEACTIVATED'}});
      return account;
    });
  }
}
