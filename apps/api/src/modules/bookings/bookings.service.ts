import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException,Optional,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {activeChanges,bookingDurations,createBookingInput,clientActionInput,manageInput,services,settingsInput,staffActionInput,type ScheduleInput} from '@amc/shared';
import {PrismaService} from '../../prisma/prisma.service.js';
import type {Booking,BookingSettings,Prisma} from '../../generated/prisma/client.js';
import {analyticsBounds,calendarSlots,dayBounds,localDate,overlaps} from './schedule.js';
import {HubSpotClient, HubSpotRateLimitError} from '../contact/hubspot.client.js';

type Tx=Prisma.TransactionClient;
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const visible={id:true,reference:true,serviceSlug:true,meetingType:true,status:true,clientName:true,email:true,phone:true,company:true,notes:true,locale:true,timezone:true,startsAt:true,endsAt:true,createdAt:true,version:true,isDemo:true,hubspotContactId:true,hubspotMeetingId:true,changes:{orderBy:{createdAt:'desc' as const},take:50}} as const;
const detail={...visible,events:{orderBy:{createdAt:'desc' as const},take:100,select:{id:true,kind:true,details:true,createdAt:true}},notifications:{orderBy:{createdAt:'desc' as const},take:20,select:{kind:true,status:true,createdAt:true}}} as const;
const active=[...activeChanges];
const bookingDuration=(booking:Booking)=>(booking.endsAt.getTime()-booking.startsAt.getTime())/60000;
function parse<T>(schema:z.ZodType<T>,input:unknown):T{const result=schema.safeParse(input);if(!result.success)throw new BadRequestException('Invalid booking input');return result.data;}
function schedule(row:BookingSettings){return {...parse(settingsInput.strip(),row),isDemo:row.isDemo};}

@Injectable()
export class BookingsService {
 private readonly secret=process.env.BOOKING_TOKEN_SECRET||randomBytes(32).toString('hex');
 constructor(
   @Inject(PrismaService) private readonly db:PrismaService,
   @Optional() @Inject(HubSpotClient) private readonly hubspot?: HubSpotClient
 ){if(process.env.NODE_ENV==='production'&&(!process.env.BOOKING_TOKEN_SECRET||process.env.BOOKING_TOKEN_SECRET.length<64))throw new Error('BOOKING_TOKEN_SECRET requires 64+ characters in production');}
 private token(booking:Pick<Booking,'id'|'tokenNonce'|'tokenVersion'>){return createHmac('sha256',this.secret).update(JSON.stringify([booking.id,booking.tokenNonce,booking.tokenVersion])).digest('hex');}
 private enabled(row:BookingSettings){return row.enabled&&(process.env.NODE_ENV!=='production'||(process.env.BOOKING_APPROVED==='true'&&!row.isDemo));}
 private async ensureDevSettings(){
  let row=await this.db.bookingSettings.findUnique({where:{id:'agency'}});
  let localDatabase=false;try{localDatabase=['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL||'').hostname);}catch{/* Invalid configuration is rejected at startup. */}
  if(localDatabase&&process.env.NODE_ENV==='development'&&!process.env.VITEST&&(!row||!row.enabled)){
   await Promise.all(services.map(s=>this.db.bookingService.upsert({where:{slug:s.slug},create:{slug:s.slug},update:{}})));
   const defaultHours=Array.from({length:7},(_,i)=>({day:i+1,open:'09:00',close:'17:00'}));
   const defaultSlugs=services.map(v=>v.slug);
   row=await this.db.bookingSettings.upsert({
    where:{id:'agency'},
    create:{id:'agency',enabled:true,isDemo:true,timezone:'Africa/Cairo',durationMinutes:30,stepMinutes:15,bufferBeforeMinutes:5,bufferAfterMinutes:5,leadMinutes:60,lookaheadDays:30,changeCutoffMinutes:60,onlineEnabled:true,inPersonEnabled:false,weeklyHours:defaultHours,blackoutDates:[],serviceSlugs:defaultSlugs},
    update:{enabled:true,onlineEnabled:row?.onlineEnabled||row?.inPersonEnabled?row.onlineEnabled:true,weeklyHours:Array.isArray(row?.weeklyHours)&&row.weeklyHours.length?row.weeklyHours:defaultHours,serviceSlugs:Array.isArray(row?.serviceSlugs)&&row.serviceSlugs.length?row.serviceSlugs:defaultSlugs}
   });
  }
  return row;
 }
 private async config(tx:Tx,requireEnabled=true){await tx.$queryRaw`SELECT "id" FROM "BookingSettings" WHERE "id"='agency' FOR SHARE`;const row=await tx.bookingSettings.findUnique({where:{id:'agency'}});if(!row||(requireEnabled&&!this.enabled(row)))throw new ServiceUnavailableException('Booking is not enabled');return row;}
 async publicConfig(){const row=await this.ensureDevSettings();return {enabled:row?this.enabled(row):false,schedule:row?schedule(row):null,services};}
 async getSettings(){const row=await this.ensureDevSettings();return row?schedule(row):null;}
 async saveSettings(input:unknown,actorId:string){const data=parse(settingsInput,input);if(data.serviceSlugs.some(s=>!services.some(v=>v.slug===s)))throw new BadRequestException('Unknown service');for(const date of data.blackoutDates){try{dayBounds(date,data.timezone);}catch{throw new BadRequestException('Invalid closed date');}}if(data.directionsUrl){const url=new URL(data.directionsUrl);if(url.protocol!=='https:'||!['www.google.com','google.com','maps.google.com','maps.app.goo.gl'].includes(url.hostname))throw new BadRequestException('Use a verified Google Maps directions URL');}for(const a of data.weeklyHours)for(const b of data.weeklyHours)if(a!==b&&a.day===b.day&&a.open<b.close&&a.close>b.open)throw new BadRequestException('Working intervals overlap');
  return this.db.$transaction(async tx=>{await tx.$queryRaw`SELECT "id" FROM "BookingSettings" WHERE "id"='agency' FOR UPDATE`;const old=await tx.bookingSettings.findUnique({where:{id:'agency'}});if((old?.version||0)!==data.version)throw new ConflictException('Settings changed; refresh');const row=await tx.bookingSettings.upsert({where:{id:'agency'},create:{...data,id:'agency',version:1},update:{...data,version:{increment:1}}});await tx.staffAuditEvent.create({data:{actorId,action:'BOOKING_SETTINGS_UPDATED'}});return schedule(row);});
 }
 async slots(date:unknown,service:unknown,format:unknown,duration?:unknown){await this.ensureDevSettings();const data=parse(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),service:z.string().max(80),format:z.enum(['ONLINE','IN_PERSON']),duration:z.coerce.number().int().refine(value=>bookingDurations.some(item=>item===value)).optional()}),{date,service,format,duration});return this.db.$transaction(async tx=>{const row=await this.config(tx);const rules=schedule(row);this.format(rules,data.service,data.format);let candidates:ReturnType<typeof calendarSlots>;try{candidates=calendarSlots(rules,data.date,undefined,data.duration??rules.durationMinutes);}catch{throw new BadRequestException('Invalid date');}const bounds=dayBounds(data.date,rules.timezone);const reserved=await tx.booking.findMany({where:{status:{not:'CANCELLED'},blockedStartsAt:{lt:bounds.to},blockedEndsAt:{gt:bounds.from}},select:{blockedStartsAt:true,blockedEndsAt:true}});return {slots:candidates.filter(a=>!reserved.some(b=>overlaps(a,b))).map(({startsAt,endsAt})=>({startsAt,endsAt})),timezone:rules.timezone,isDemo:rules.isDemo};});}
 private format(rules:ScheduleInput,slug:string,format:string){if(!rules.serviceSlugs.includes(slug)||(format==='ONLINE'&&!rules.onlineEnabled)||(format==='IN_PERSON'&&!rules.inPersonEnabled))throw new BadRequestException('Service or meeting format unavailable');}
 private async slot(tx:Tx,row:BookingSettings,start:string,exclude?:string,durationMinutes=row.durationMinutes){const rules=schedule(row);const instant=new Date(start);const candidate=calendarSlots(rules,localDate(instant,row.timezone),undefined,durationMinutes).find(v=>v.startsAt.getTime()===instant.getTime());if(!candidate)throw new ConflictException('This slot is unavailable');const conflict=await tx.booking.findFirst({where:{id:exclude?{not:exclude}:undefined,status:{not:'CANCELLED'},blockedStartsAt:{lt:candidate.blockedEndsAt},blockedEndsAt:{gt:candidate.blockedStartsAt}},select:{id:true}});if(conflict)throw new ConflictException('This slot was just reserved');return candidate;}
 private async event(tx:Tx,id:string,kind:string,actorId:string|undefined,details:Prisma.InputJsonValue,emailStatus='UNCONFIGURED'){
   const event=await tx.bookingEvent.create({data:{bookingId:id,actorId,kind,details}});
   await tx.bookingOutbox.create({data:{bookingId:id,eventId:event.id,kind:kind+':EMAIL',status:emailStatus}});
   if(kind==='BOOKING_CREATED'&&process.env.BOOKING_INBOX_EMAIL)await tx.bookingOutbox.create({data:{bookingId:id,eventId:event.id,kind:'BOOKING_CREATED:OWNER:EMAIL',status:emailStatus}});
   const crmStatus=this.hubspot?.enabled?'PENDING':'UNCONFIGURED';
   await tx.bookingOutbox.create({data:{bookingId:id,eventId:event.id,kind:kind+':HUBSPOT',status:crmStatus}});
   await tx.staffAuditEvent.create({data:{actorId,subjectId:id,action:kind}});
 }
 private async result(tx:Tx,id:string,client=false){const booking=await tx.booking.findUniqueOrThrow({where:{id},select:detail});if(client){const state=await tx.booking.findUniqueOrThrow({where:{id}});const outbox=await tx.bookingOutbox.findFirst({where:{bookingId:id,kind:{in:['BOOKING_CREATED','BOOKING_CREATED:EMAIL']}}});return {booking,token:this.token(state),notification:outbox?.status||'UNCONFIGURED'};}return {booking};}
 private async guarded<T>(work:()=>Promise<T>){try{return await work();}catch(error){if(error&&typeof error==='object'&&'code' in error&&['P2002','P2004','P2034'].includes(String(error.code)))throw new ConflictException('The appointment changed or slot was reserved; refresh and try again');throw error;}}
 async create(input:unknown,actorId?:string){await this.ensureDevSettings();const data=parse(createBookingInput,input);const requestHash=hash(JSON.stringify({...data,actorId:actorId||null}));const replay=await this.db.booking.findUnique({where:{idempotencyKey:data.idempotencyKey}});if(replay){if(replay.requestHash!==requestHash||replay.tokenVersion!==0||replay.tokenExpiresAt<new Date())throw new ConflictException('Submission already used');return this.db.$transaction(tx=>this.result(tx,replay.id,!actorId));}
  return this.guarded(()=>this.db.$transaction(async tx=>{const row=await this.config(tx);this.format(schedule(row),data.serviceSlug,data.meetingType);const slot=await this.slot(tx,row,data.startsAt,undefined,data.durationMinutes??row.durationMinutes);const id=randomUUID(),tokenNonce=randomBytes(32).toString('hex');const token=this.token({id,tokenNonce,tokenVersion:0});await tx.booking.create({data:{id,reference:'AMC-'+randomBytes(6).toString('hex').toUpperCase(),calendarId:row.id,serviceSlug:data.serviceSlug,meetingType:data.meetingType,clientName:data.clientName,email:data.email,phone:data.phone,company:data.company,notes:data.notes,locale:data.locale,timezone:row.timezone,...slot,tokenNonce,tokenHash:hash(token),tokenExpiresAt:new Date(slot.endsAt.getTime()+30*86400000),idempotencyKey:data.idempotencyKey,requestHash,isDemo:row.isDemo}});const outboxStatus=(!row.isDemo&&process.env.RESEND_API_KEY)?'PENDING':'UNCONFIGURED';await this.event(tx,id,'BOOKING_CREATED',actorId,{startsAt:slot.startsAt.toISOString(),endsAt:slot.endsAt.toISOString(),source:actorId?'STAFF':'CLIENT',consent:{acknowledged:true,textVersion:'booking-details-v1',source:actorId?'STAFF_ATTESTATION':'CLIENT'}},outboxStatus);return this.result(tx,id,!actorId);})).catch(async error=>{const existing=await this.db.booking.findUnique({where:{idempotencyKey:data.idempotencyKey}});if(existing&&existing.requestHash===requestHash&&existing.tokenVersion===0&&existing.tokenExpiresAt>new Date())return this.db.$transaction(tx=>this.result(tx,existing.id,!actorId));throw error;});
 }
 private async lock(tx:Tx,id:string){await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id"=${id}::uuid FOR UPDATE`;const booking=await tx.booking.findUnique({where:{id}});if(!booking)throw new NotFoundException();return booking;}
 private verify(booking:Booking,token:string){const supplied=hash(token);if(booking.tokenExpiresAt<new Date()||!timingSafeEqual(Buffer.from(supplied,'hex'),Buffer.from(booking.tokenHash,'hex')))throw new UnauthorizedException('Management link is invalid or expired');}
 async manage(input:unknown){const data=parse(manageInput,input);return this.db.$transaction(async tx=>{const booking=await this.lock(tx,data.id);this.verify(booking,data.token);const row=await this.config(tx,false);return {...await this.result(tx,data.id),schedule:schedule(row),notification:'UNCONFIGURED'};});}
 private mutable(booking:Booking){if(!['PENDING','CONFIRMED'].includes(booking.status))throw new ConflictException('Appointment is closed');}
 async clientAction(input:unknown){const data=parse(clientActionInput,input),requestHash=hash(JSON.stringify(data)),actorKey='c:'+hash(data.token);return this.guarded(()=>this.db.$transaction(async tx=>{const booking=await this.lock(tx,data.id);if(booking.tokenExpiresAt<new Date())throw new UnauthorizedException('Management link expired');const replay=await tx.bookingCommand.findUnique({where:{id:data.idempotencyKey}});if(replay){if(replay.bookingId!==booking.id||replay.actorKey!==actorKey||replay.requestHash!==requestHash||replay.resultVersion!==booking.version)throw new ConflictException('Action already used');return this.result(tx,booking.id,true);}this.verify(booking,data.token);this.mutable(booking);const row=await this.config(tx,false);if(booking.startsAt.getTime()-Date.now()<row.changeCutoffMinutes*60000)throw new ConflictException('Change cutoff has passed; contact staff');const ticket=await tx.bookingChangeRequest.findFirst({where:{bookingId:booking.id,status:{in:active}}});let eventKind:string;let changeId=ticket?.id||null;
   if(data.action==='CANCEL'||data.action==='RESCHEDULE'){if(ticket)throw new ConflictException('A change request is already open');if(data.action==='RESCHEDULE'){if(!this.enabled(row)||!data.startsAt)throw new BadRequestException('Choose an available time');await this.slot(tx,row,data.startsAt,booking.id,bookingDuration(booking));}const createdChange=await tx.bookingChangeRequest.create({data:{bookingId:booking.id,kind:data.action,reason:data.reason,requestedStartAt:data.action==='RESCHEDULE'?new Date(data.startsAt!):undefined}});changeId=createdChange.id;eventKind='CHANGE_REQUESTED';}
   else {if(!ticket)throw new ConflictException('No open change request');if(data.action==='WITHDRAW'){await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'WITHDRAWN',resolvedAt:new Date()}});eventKind='CHANGE_WITHDRAWN';}else{if(ticket.status!=='ALTERNATIVE_PROPOSED'||!ticket.proposedStartAt||!this.enabled(row))throw new ConflictException('No alternative to accept');const slot=await this.slot(tx,row,ticket.proposedStartAt.toISOString(),booking.id,bookingDuration(booking));await tx.booking.update({where:{id:booking.id},data:{...slot,timezone:row.timezone,tokenExpiresAt:new Date(slot.endsAt.getTime()+30*86400000)}});await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'APPROVED',resolvedAt:new Date()}});eventKind='BOOKING_RESCHEDULED';}}
   const next={...booking,tokenVersion:booking.tokenVersion+1};const changed=await tx.booking.update({where:{id:booking.id},data:{version:{increment:1},tokenVersion:{increment:1},tokenHash:hash(this.token(next))}});const finalChange=changeId?await tx.bookingChangeRequest.findUnique({where:{id:changeId}}):null;
   const outboxStatus=(!row.isDemo&&process.env.RESEND_API_KEY)?'PENDING':'UNCONFIGURED';
   await this.event(tx,booking.id,eventKind,undefined,{reason:data.reason,previousStartAt:booking.startsAt.toISOString(),previousEndAt:booking.endsAt.toISOString(),startsAt:changed.startsAt.toISOString(),endsAt:changed.endsAt.toISOString(),changeRequestId:changeId,previousChangeStatus:ticket?.status||null,changeStatus:finalChange?.status||null,requestedStartAt:finalChange?.requestedStartAt?.toISOString()||null,previousProposedStartAt:ticket?.proposedStartAt?.toISOString()||null,proposedStartAt:finalChange?.proposedStartAt?.toISOString()||null},outboxStatus);await tx.bookingCommand.create({data:{id:data.idempotencyKey,bookingId:booking.id,actorKey,requestHash,resultVersion:booking.version+1}});return this.result(tx,booking.id,true);
  }));}
 async list(input:Record<string,unknown>){const query=parse(z.object({from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),page:z.coerce.number().int().min(0).max(1000).default(0),search:z.string().trim().max(120).default(''),status:z.enum(['ALL','PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW']).default('ALL'),changes:z.enum(['all','open']).default('all'),service:z.string().max(80).optional(),format:z.enum(['ONLINE','IN_PERSON']).optional()}),input);const settings=await this.getSettings();if(!settings)return {items:[],total:0,page:query.page,timezone:'Africa/Cairo',isDemo:false};let range:ReturnType<typeof analyticsBounds>;try{range=analyticsBounds(query.from,query.to,settings.timezone);}catch{throw new BadRequestException('Invalid date range');}const where:Prisma.BookingWhereInput={startsAt:range,status:query.status==='ALL'?undefined:query.status,serviceSlug:query.service,meetingType:query.format,changes:query.changes==='open'?{some:{status:{in:active}}}:undefined,OR:query.search?[{reference:{contains:query.search,mode:'insensitive'}},{clientName:{contains:query.search,mode:'insensitive'}},{email:{contains:query.search,mode:'insensitive'}}]:undefined};const [items,total]=await this.db.$transaction([this.db.booking.findMany({where,select:visible,orderBy:[{startsAt:'asc'},{id:'asc'}],skip:query.page*25,take:25}),this.db.booking.count({where})]);return {items,total,page:query.page,timezone:settings.timezone,isDemo:settings.isDemo};}
 async staffDetail(id:string){parse(z.uuid(),id);const booking=await this.db.booking.findUnique({where:{id},select:detail});if(!booking)throw new NotFoundException();return {booking};}
 async staffAction(input:unknown,actorId:string){const data=parse(staffActionInput,input),requestHash=hash(JSON.stringify(data)),actorKey='staff:'+actorId;return this.guarded(()=>this.db.$transaction(async tx=>{const booking=await this.lock(tx,data.id);const replay=await tx.bookingCommand.findUnique({where:{id:data.idempotencyKey}});if(replay){if(replay.bookingId!==booking.id||replay.actorKey!==actorKey||replay.requestHash!==requestHash||replay.resultVersion!==booking.version)throw new ConflictException('Action already used');return this.result(tx,booking.id);}if(booking.version!==data.version)throw new ConflictException('Appointment changed; refresh');this.mutable(booking);const row=await this.config(tx,false);const ticket=await tx.bookingChangeRequest.findFirst({where:{bookingId:booking.id,status:{in:active}}});let kind='BOOKING_'+data.action;let update:Prisma.BookingUpdateInput={version:{increment:1}};let closeChanges=false;
   if(data.action==='EDIT'){update={...update,clientName:data.clientName,email:data.email?.toLowerCase(),phone:data.phone,company:data.company,notes:data.notes};}
   else if(data.action==='CONFIRM'){if(booking.status!=='PENDING')throw new ConflictException('Already confirmed');update.status='CONFIRMED';}
   else if(data.action==='CANCEL'){update.status='CANCELLED';closeChanges=true;kind='BOOKING_CANCELLED';}
   else if(data.action==='COMPLETE'||data.action==='NO_SHOW'){if((data.action==='COMPLETE'?booking.endsAt:booking.startsAt)>new Date())throw new ConflictException('Meeting has not occurred yet');update.status=data.action==='COMPLETE'?'COMPLETED':'NO_SHOW';closeChanges=true;}
   else if(data.action==='RESCHEDULE'){if(!data.startsAt||!this.enabled(row))throw new BadRequestException('Choose a slot');update={...update,...await this.slot(tx,row,data.startsAt,booking.id,bookingDuration(booking)),timezone:row.timezone};closeChanges=true;kind='BOOKING_RESCHEDULED';}
   else {if(!ticket)throw new ConflictException('No open change request');if(data.action==='REVIEW'){if(ticket.status!=='OPEN')throw new ConflictException('Already reviewed');await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'UNDER_REVIEW',staffResponse:data.reason,respondedBy:actorId}});kind='CHANGE_UNDER_REVIEW';}
    else if(data.action==='DECLINE'){await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'DECLINED',staffResponse:data.reason,respondedBy:actorId,resolvedAt:new Date()}});kind='CHANGE_DECLINED';}
    else if(data.action==='PROPOSE'){if(ticket.kind!=='RESCHEDULE'||!data.startsAt||!this.enabled(row))throw new BadRequestException('Choose an alternative');await this.slot(tx,row,data.startsAt,booking.id,bookingDuration(booking));await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'ALTERNATIVE_PROPOSED',proposedStartAt:new Date(data.startsAt),staffResponse:data.reason,respondedBy:actorId}});kind='CHANGE_ALTERNATIVE_PROPOSED';}
    else {if(ticket.status==='ALTERNATIVE_PROPOSED')throw new ConflictException('Await client acceptance of the alternative');if(ticket.kind==='CANCEL'){update.status='CANCELLED';kind='BOOKING_CANCELLED';}else{if(!ticket.requestedStartAt||!this.enabled(row))throw new ConflictException('Requested slot unavailable');update={...update,...await this.slot(tx,row,ticket.requestedStartAt.toISOString(),booking.id,bookingDuration(booking)),timezone:row.timezone};kind='BOOKING_RESCHEDULED';}await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'APPROVED',staffResponse:data.reason,respondedBy:actorId,resolvedAt:new Date()}});}}
   if(closeChanges)await tx.bookingChangeRequest.updateMany({where:{bookingId:booking.id,status:{in:active}},data:{status:'WITHDRAWN',staffResponse:data.reason,respondedBy:actorId,resolvedAt:new Date()}});if(update.endsAt instanceof Date)update.tokenExpiresAt=new Date(update.endsAt.getTime()+30*86400000);const changed=await tx.booking.update({where:{id:booking.id},data:update});const finalChange=ticket?await tx.bookingChangeRequest.findUnique({where:{id:ticket.id}}):null;
   const outboxStatus=(!row.isDemo&&process.env.RESEND_API_KEY)?'PENDING':'UNCONFIGURED';
   await this.event(tx,booking.id,kind,actorId,{reason:data.reason,previousStartAt:booking.startsAt.toISOString(),previousEndAt:booking.endsAt.toISOString(),startsAt:changed.startsAt.toISOString(),endsAt:changed.endsAt.toISOString(),previousStatus:booking.status,status:changed.status,changeRequestId:ticket?.id||null,previousChangeStatus:ticket?.status||null,changeStatus:finalChange?.status||null,requestedStartAt:finalChange?.requestedStartAt?.toISOString()||null,previousProposedStartAt:ticket?.proposedStartAt?.toISOString()||null,proposedStartAt:finalChange?.proposedStartAt?.toISOString()||null},outboxStatus);await tx.bookingCommand.create({data:{id:data.idempotencyKey,bookingId:booking.id,actorKey,requestHash,resultVersion:booking.version+1}});return this.result(tx,booking.id);
  }));}
 async analytics(input:Record<string,unknown>){const data=parse(z.object({from:z.string(),to:z.string(),service:z.string().max(80).optional(),format:z.enum(['ONLINE','IN_PERSON']).optional()}),input);const settings=await this.getSettings();if(!settings)throw new ServiceUnavailableException('Configure booking first');let range:ReturnType<typeof analyticsBounds>;try{range=analyticsBounds(data.from,data.to,settings.timezone);}catch{throw new BadRequestException('Invalid date range');}const now=new Date(),today=dayBounds(localDate(now,settings.timezone),settings.timezone);const filter:Prisma.BookingWhereInput={serviceSlug:data.service,meetingType:data.format};const cohort={...filter,createdAt:range};const result=await this.db.$transaction(async tx=>{const [total,cancelled,completed,noShow,todayCount,upcoming,pendingChanges,expected,byService,byType,byStatus]=await Promise.all([tx.booking.count({where:cohort}),tx.booking.count({where:{...cohort,status:'CANCELLED'}}),tx.booking.count({where:{...filter,status:'COMPLETED',startsAt:range}}),tx.booking.count({where:{...filter,status:'NO_SHOW',startsAt:range}}),tx.booking.count({where:{...filter,startsAt:{gte:today.from,lt:today.to},status:{not:'CANCELLED'}}}),tx.booking.count({where:{...filter,status:'CONFIRMED',startsAt:{gte:new Date(Math.max(now.getTime(),range.gte.getTime())),lt:range.lt}}}),tx.bookingChangeRequest.count({where:{status:{in:active},booking:{...filter,startsAt:range}}}),tx.booking.count({where:{...filter,status:{not:'CANCELLED'},startsAt:{gte:range.gte,lt:new Date(Math.min(now.getTime(),range.lt.getTime()))}}}),tx.booking.groupBy({by:['serviceSlug'],where:cohort,_count:{_all:true}}),tx.booking.groupBy({by:['meetingType'],where:cohort,_count:{_all:true}}),tx.booking.groupBy({by:['status'],where:cohort,_count:{_all:true}})]);
 const rows=await tx.$queryRaw<{date:string;count:number}[]>`SELECT to_char("createdAt" AT TIME ZONE ${settings.timezone},'YYYY-MM-DD') AS date,count(*)::int AS count FROM "Booking" WHERE "createdAt">=${range.gte} AND "createdAt"<${range.lt} AND (${data.service||null}::text IS NULL OR "serviceSlug"=${data.service||null}) AND (${data.format||null}::text IS NULL OR "meetingType"::text=${data.format||null}) GROUP BY 1 ORDER BY 1`;
 const resolution=await tx.$queryRaw<{hours:number|null}[]>`SELECT avg(extract(epoch from (c."resolvedAt"-c."createdAt"))/3600)::float8 AS hours FROM "BookingChangeRequest" c JOIN "Booking" b ON b.id=c."bookingId" WHERE c."resolvedAt">=${range.gte} AND c."resolvedAt"<${range.lt} AND (${data.service||null}::text IS NULL OR b."serviceSlug"=${data.service||null}) AND (${data.format||null}::text IS NULL OR b."meetingType"::text=${data.format||null})`;
 return {total,cancelled,completed,noShow,today:todayCount,upcoming,pendingChanges,cancellationRate:total?cancelled/total:null,noShowRate:expected?noShow/expected:null,averageResolutionHours:resolution[0]?.hours??null,byService:byService.map(v=>({key:v.serviceSlug,count:v._count._all})),byType:byType.map(v=>({key:v.meetingType,count:v._count._all})),byStatus:byStatus.map(v=>({key:v.status,count:v._count._all})),trend:rows};});return {...result,timezone:settings.timezone,isDemo:settings.isDemo};
 }

 /**
  * Claims and processes pending HubSpot CRM outbox records using PostgreSQL SKIP LOCKED.
  */
 async drainCrm(batchSize = 10): Promise<{processed: number; succeeded: number; failed: number}> {
   if (!this.hubspot?.enabled) return {processed: 0, succeeded: 0, failed: 0};
   const claimed = await this.db.$queryRaw<{id: string; bookingId: string; kind: string; attempts: number}[]>`
     WITH claimable AS (
       SELECT "id" FROM "BookingOutbox"
       WHERE (
         "status" = 'PENDING'
         OR ("status" = 'PROCESSING' AND "updatedAt" < NOW() - INTERVAL '5 minutes')
       )
       AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW())
       AND "kind" LIKE '%:HUBSPOT'
       ORDER BY "createdAt" ASC
       LIMIT ${batchSize}
       FOR UPDATE SKIP LOCKED
     )
     UPDATE "BookingOutbox"
     SET "status" = 'PROCESSING', "attempts" = "attempts" + 1, "updatedAt" = NOW()
     WHERE "id" IN (SELECT "id" FROM claimable)
     RETURNING "id", "bookingId", "kind", "attempts";
   `;

   if (!claimed || claimed.length === 0) return {processed: 0, succeeded: 0, failed: 0};
   let succeeded = 0;
   let failed = 0;

   for (const item of claimed) {
     try {
       const booking = await this.db.booking.findUnique({where: {id: item.bookingId}});
       if (!booking) {
         await this.db.bookingOutbox.update({where: {id: item.id}, data: {status: 'FAILED', lastError: 'Booking not found'}});
         failed++;
         continue;
       }

       if (item.kind.includes('CREATED')) {
         const contactId = await this.hubspot.upsertBookingContact({
           email: booking.email,
           name: booking.clientName,
           phone: booking.phone,
           company: booking.company,
           locale: booking.locale
         });
         const meetingId = await this.hubspot.createMeeting({
           contactId,
           title: `ALMORAD AMC Consultation - ${booking.reference}`,
           startsAt: booking.startsAt,
           endsAt: booking.endsAt,
           reference: booking.reference
         });
         await this.db.booking.update({
           where: {id: booking.id},
           data: {hubspotContactId: contactId, hubspotMeetingId: meetingId}
         });
       } else if (item.kind.includes('RESCHEDULE')) {
         if (booking.hubspotMeetingId) {
           await this.hubspot.updateMeeting(booking.hubspotMeetingId, {
             startsAt: booking.startsAt,
             endsAt: booking.endsAt,
             outcome: 'RESCHEDULED'
           });
         }
       } else if (item.kind.includes('CANCEL')) {
         if (booking.hubspotMeetingId) {
           await this.hubspot.updateMeeting(booking.hubspotMeetingId, {
             outcome: 'CANCELED'
           });
         }
       }

       await this.db.bookingOutbox.update({
         where: {id: item.id},
         data: {status: 'DELIVERED', deliveredAt: new Date(), lastError: null}
       });
       succeeded++;
     } catch (error: unknown) {
       failed++;
       const msg = error instanceof Error ? error.message : String(error);
       const isClientError = /400|401|403|422/i.test(msg);
       const maxAttempts = item.attempts >= 5;
       const sanitized = msg.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]').slice(0, 1000);

       if (error instanceof HubSpotRateLimitError) {
         const nextRetryAt = new Date(Date.now() + error.retryAfterSeconds * 1000);
         await this.db.bookingOutbox.update({
           where: {id: item.id},
           data: {status: 'PENDING', nextRetryAt, lastError: sanitized}
         });
       } else if (isClientError || maxAttempts) {
         await this.db.bookingOutbox.update({
           where: {id: item.id},
           data: {status: 'FAILED', lastError: sanitized}
         });
       } else {
         const delay = Math.min(900, Math.round(5 * Math.pow(2, item.attempts - 1)));
         await this.db.bookingOutbox.update({
           where: {id: item.id},
           data: {status: 'PENDING', nextRetryAt: new Date(Date.now() + delay * 1000), lastError: sanitized}
         });
       }
     }
   }

   return {processed: claimed.length, succeeded, failed};
 }
}
