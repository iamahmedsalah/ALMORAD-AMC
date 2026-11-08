import {Controller,Get,Post,Req,ServiceUnavailableException,UnauthorizedException,Inject} from '@nestjs/common';
import {SkipThrottle} from '@nestjs/throttler';
import {ApiBearerAuth, ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import type {Request} from 'express';
import {timingSafeEqual} from 'node:crypto';
import {tokenHash} from './modules/auth/security.js';
import {PrismaService} from './prisma/prisma.service.js';
import {NotificationsService} from './modules/notifications/notifications.service.js';
import {ContactService} from './modules/contact/contact.service.js';

@ApiTags('Operations & Maintenance')
@ApiBearerAuth()
@Controller('ops')
@SkipThrottle()
export class OperationsController {
 constructor(
   @Inject(PrismaService) private readonly prisma: PrismaService,
   @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(ContactService) private readonly contacts: ContactService
 ){}

 @ApiOperation({
   summary: 'Scheduled maintenance task',
   description: 'Purges expired staff sessions and expired request throttle records. Requires Bearer CRON_SECRET.'
 })
 @ApiResponse({ status: 200, description: 'Maintenance complete with count of purged records' })
 @ApiResponse({ status: 401, description: 'Invalid or missing CRON_SECRET' })
 @ApiResponse({ status: 503, description: 'Maintenance secret not configured' })
 @Get('maintenance')
 async maintenance(@Req() request:Request){
  const secret=process.env.CRON_SECRET;if(!secret||secret.length<32)throw new ServiceUnavailableException();
  const supplied=request.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/)?.[1];
  if(!supplied||!timingSafeEqual(Buffer.from(tokenHash(secret),'hex'),Buffer.from(tokenHash(supplied),'hex')))throw new UnauthorizedException();
  const now=new Date();
  return this.prisma.$transaction(async tx=>{
   const sessions=await tx.staffSession.deleteMany({where:{expiresAt:{lte:now}}});
   const rateLimits=await tx.requestThrottle.deleteMany({where:{expiresAt:{lte:now},OR:[{blockedUntil:null},{blockedUntil:{lte:now}}]}});
   await tx.staffAuditEvent.create({data:{action:'SYSTEM_MAINTENANCE'}});
   return {removedExpiredSessions:sessions.count,removedRateBuckets:rateLimits.count};
  });
 }

 @ApiOperation({
   summary: 'Drain pending booking notifications',
   description: 'Atomically processes pending transactional outbox records and sends confirmation emails via Resend. Requires Bearer CRON_SECRET.'
 })
 @ApiResponse({ status: 200, description: 'Batch processing summary' })
 @ApiResponse({ status: 401, description: 'Invalid or missing CRON_SECRET' })
 @ApiResponse({ status: 503, description: 'Maintenance secret not configured' })
 @Get('notifications/drain')
 @Post('notifications/drain')
 async drainNotifications(@Req() request: Request) {
   const secret = process.env.CRON_SECRET;
   if (!secret || secret.length < 32) throw new ServiceUnavailableException();
   const supplied = request.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/)?.[1];
   if (!supplied || !timingSafeEqual(Buffer.from(tokenHash(secret), 'hex'), Buffer.from(tokenHash(supplied), 'hex'))) {
     throw new UnauthorizedException();
   }
   return {...(await this.notifications.drain()), contacts: await this.contacts?.drain()};
 }
}
