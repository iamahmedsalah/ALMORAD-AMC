import {BadRequestException, Body, ConflictException, Controller, Get, Header, HttpCode, Inject, NotFoundException, Post, Query, Req, UseGuards} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {inquirySchema} from '@amc/shared';
import {z} from 'zod';
import {PrismaService} from '../../prisma/prisma.service.js';
import {SessionGuard,type StaffRequest} from '../auth/session.guard.js';
import {CsrfGuard} from '../auth/csrf.js';
import {PermissionGuard, RequirePermission} from '../auth/permission.guard.js';
import {hubspotContactUrl} from './hubspot-links.js';

@Controller('staff/inquiries')
@UseGuards(SessionGuard, CsrfGuard, PermissionGuard)
@RequirePermission('inquiries:read')
export class InquiriesController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  @Get() @Header('Cache-Control', 'private, no-store')
  async list(@Query() input: Record<string, unknown>) {
    const parsed = z.object({search:z.string().trim().max(120).default(''),page:z.coerce.number().int().min(0).max(10000).default(0)}).strict().safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid inquiry filters');
    const {search,page} = parsed.data;
    const where = {deletedAt:null,...(search ? {OR:['name','email','phone'].map(field=>({[field]:{contains:search,mode:'insensitive' as const}}))} : {})};
    const [items,total] = await this.db.$transaction([
      this.db.contactInquiry.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:page*25,take:25,
        select:{id:true,name:true,email:true,phone:true,message:true,locale:true,source:true,createdAt:true,ownerEmailStatus:true,visitorEmailStatus:true,hubspotStatus:true,hubspotContactId:true}}),
      this.db.contactInquiry.count({where})
    ]);
    return {items:items.map(item=>({...item,hubspotContactUrl:hubspotContactUrl(item.hubspotContactId)})),total,page};
  }
  @Post('create') @HttpCode(200) @Header('Cache-Control','private, no-store') @RequirePermission('staff:manage')
  async create(@Req() req:StaffRequest,@Body() input:unknown){
    const parsed=inquirySchema.extend({idempotencyKey:z.uuid()}).strict().safeParse(input);if(!parsed.success)throw new BadRequestException('Invalid contact inquiry');
    const {idempotencyKey,...data}=parsed.data;
    const requestHash=createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${idempotencyKey}))`;
      const existing=await tx.contactInquiry.findUnique({where:{idempotencyKey}});
      if(existing){if(existing.requestHash!==requestHash||existing.source!=='STAFF'||existing.deletedAt)throw new ConflictException('Submission key already used');return {id:existing.id};}
      const row=await tx.contactInquiry.create({data:{...data,phone:data.phone||null,idempotencyKey,requestHash,source:'STAFF',consentAt:null,ownerEmailStatus:'SKIPPED',visitorEmailStatus:'SKIPPED',hubspotStatus:'SKIPPED'}});
      await tx.staffAuditEvent.create({data:{actorId:req.staff!.id,subjectId:row.id,action:'CONTACT_INQUIRY_CREATED'}});
      return {id:row.id};
    });
  }
  @Post('delete') @HttpCode(200) @Header('Cache-Control','private, no-store') @RequirePermission('staff:manage')
  async remove(@Req() req:StaffRequest,@Body() input:unknown){
    const parsed=z.object({id:z.uuid(),reason:z.string().trim().min(3).max(1000)}).strict().safeParse(input);if(!parsed.success)throw new BadRequestException('Inquiry and deletion reason required');
    const {id,reason}=parsed.data;
    return this.db.$transaction(async tx=>{
      const result=await tx.contactInquiry.updateMany({where:{id,deletedAt:null},data:{deletedAt:new Date(),ownerEmailStatus:'SKIPPED',visitorEmailStatus:'SKIPPED',hubspotStatus:'SKIPPED'}});
      if(!result.count)throw new NotFoundException();
      await tx.staffAuditEvent.create({data:{actorId:req.staff!.id,subjectId:id,action:'CONTACT_INQUIRY_DELETED',details:{reason}}});
      return {deleted:true};
    });
  }
}
