import {BadRequestException, Controller, Get, Header, Inject, Query, UseGuards} from '@nestjs/common';
import {z} from 'zod';
import {PrismaService} from '../../prisma/prisma.service.js';
import {SessionGuard} from '../auth/session.guard.js';
import {PermissionGuard, RequirePermission} from '../auth/permission.guard.js';
import {hubspotContactUrl} from './hubspot-links.js';

@Controller('staff/inquiries')
@UseGuards(SessionGuard, PermissionGuard)
@RequirePermission('inquiries:read')
export class InquiriesController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  @Get() @Header('Cache-Control', 'private, no-store')
  async list(@Query() input: Record<string, unknown>) {
    const parsed = z.object({search:z.string().trim().max(120).default(''),page:z.coerce.number().int().min(0).max(10000).default(0)}).strict().safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid inquiry filters');
    const {search,page} = parsed.data;
    const where = search ? {OR:['name','email','phone'].map(field=>({[field]:{contains:search,mode:'insensitive' as const}}))} : {};
    const [items,total] = await this.db.$transaction([
      this.db.contactInquiry.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:page*25,take:25,
        select:{id:true,name:true,email:true,phone:true,message:true,locale:true,createdAt:true,ownerEmailStatus:true,visitorEmailStatus:true,hubspotStatus:true,hubspotContactId:true}}),
      this.db.contactInquiry.count({where})
    ]);
    return {items:items.map(item=>({...item,hubspotContactUrl:hubspotContactUrl(item.hubspotContactId)})),total,page};
  }
}
