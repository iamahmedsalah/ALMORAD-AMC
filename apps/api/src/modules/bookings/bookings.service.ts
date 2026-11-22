import {normalizeAssigneeIds,resolveBookingAssignees} from './assignment.js';
import {hubspotContactUrl,hubspotMeetingUrl} from '../contact/hubspot-links.js';
import {BadRequestException,ForbiddenException,ConflictException,Inject,Injectable,NotFoundException,Optional,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {can,meetLinkInput,activeChanges,recoverBookingInput,type StaffRole,bookingDurations,createBookingInput,clientActionInput,manageInput,services,settingsInput,staffActionInput,type ScheduleInput} from '@amc/shared';
import {GoogleCalendarService} from '../notifications/google-calendar.service.js';
import {GoogleMeetError} from '../notifications/google-calendar.error.js';
import {PrismaService} from '../../prisma/prisma.service.js';
import type {Booking,BookingSettings,Prisma} from '../../generated/prisma/client.js';
import {analyticsBounds,calendarSlots,dayBounds,localDate,overlaps} from './schedule.js';
import {HubSpotClient, HubSpotRateLimitError,HubSpotAmbiguousCreateError,type HubSpotOutcome} from '../contact/hubspot.client.js';

type Tx=Prisma.TransactionClient;
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const visible={id:true,reference:true,serviceSlug:true,meetingType:true,status:true,clientName:true,clientTitle:true,email:true,phone:true,company:true,notes:true,meetingUrl:true,googleEventId:true,assignees:{select:{staff:{select:{id:true,firstName:true,lastName:true,email:true}}}},assignedToId:true,assignedTo:{select:{firstName:true,lastName:true}},locale:true,timezone:true,startsAt:true,endsAt:true,createdAt:true,version:true,isDemo:true,changes:{orderBy:{createdAt:'desc' as const},take:50}} as const;
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
   @Optional() @Inject(HubSpotClient) private readonly hubspot?: HubSpotClient,
   @Optional() @Inject(GoogleCalendarService) private readonly googleCalendar?:GoogleCalendarService
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
 async slots(date:unknown,service:unknown,format:unknown,duration?:unknown){await this.ensureDevSettings();const data=parse(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),service:z.string().max(80),format:z.enum(['ONLINE','IN_PERSON']),duration:z.coerce.number().int().refine(value=>bookingDurations.some(item=>item===value)).optional()}),{date,service,format,duration});return this.db.$transaction(async tx=>{const row=await this.config(tx);const rules=schedule(row);this.format(rules,data.service,data.format);let candidates:ReturnType<typeof calendarSlots>;try{candidates=calendarSlots(rules,data.date,undefined,data.duration??rules.durationMinutes);}catch{throw new BadRequestException('Invalid date');}const bounds=dayBounds(data.date,rules.timezone);const reserved=await tx.booking.findMany({where:{deletedAt:null,status:{not:'CANCELLED'},blockedStartsAt:{lt:bounds.to},blockedEndsAt:{gt:bounds.from}},select:{blockedStartsAt:true,blockedEndsAt:true}});return {slots:candidates.filter(a=>!reserved.some(b=>overlaps(a,b))).map(({startsAt,endsAt})=>({startsAt,endsAt})),timezone:rules.timezone,isDemo:rules.isDemo};});}
 private format(rules:ScheduleInput,slug:string,format:string){if(!rules.serviceSlugs.includes(slug)||(format==='ONLINE'&&!rules.onlineEnabled)||(format==='IN_PERSON'&&!rules.inPersonEnabled))throw new BadRequestException('Service or meeting format unavailable');}
 private async slot(tx:Tx,row:BookingSettings,start:string,exclude?:string,durationMinutes=row.durationMinutes){const rules=schedule(row);const instant=new Date(start);const candidate=calendarSlots(rules,localDate(instant,row.timezone),undefined,durationMinutes).find(v=>v.startsAt.getTime()===instant.getTime());if(!candidate)throw new ConflictException('This slot is unavailable');const conflict=await tx.booking.findFirst({where:{id:exclude?{not:exclude}:undefined,deletedAt:null,status:{not:'CANCELLED'},blockedStartsAt:{lt:candidate.blockedEndsAt},blockedEndsAt:{gt:candidate.blockedStartsAt}},select:{id:true}});if(conflict)throw new ConflictException('This slot was just reserved');return candidate;}
 private async event(tx:Tx,id:string,kind:string,actorId:string|undefined,details:Prisma.InputJsonValue,emailStatus='UNCONFIGURED'){
   const event=await tx.bookingEvent.create({data:{bookingId:id,actorId,kind,details}});
   await tx.bookingOutbox.create({data:{bookingId:id,eventId:event.id,kind:kind+':EMAIL',status:emailStatus}});
   await tx.bookingOutbox.create({data:{bookingId:id,eventId:event.id,kind:kind+':OWNER:EMAIL',status:emailStatus}});
   const crmStatus=this.hubspot?.enabled?'PENDING':'UNCONFIGURED';
   await tx.bookingOutbox.create({data:{bookingId:id,eventId:event.id,kind:kind+':HUBSPOT',status:crmStatus}});
   if(['BOOKING_CREATED','BOOKING_RESCHEDULED','BOOKING_CANCELLED','BOOKING_DELETED'].includes(kind)){
     const booking=await tx.booking.findUniqueOrThrow({where:{id},select:{isDemo:true,meetingType:true}});
     await tx.bookingOutbox.create({data:{bookingId:id,eventId:event.id,kind:kind+':MEET',status:booking.isDemo||booking.meetingType!=='ONLINE'?'SKIPPED':this.googleCalendar?.enabled?'PENDING':'UNCONFIGURED'}});
   }
   await tx.staffAuditEvent.create({data:{actorId,subjectId:id,action:kind}});
 }
 private async result(tx:Tx,id:string,client=false){const booking=await tx.booking.findUniqueOrThrow({where:{id},select:detail});if(client){const state=await tx.booking.findUniqueOrThrow({where:{id}});const outbox=await tx.bookingOutbox.findFirst({where:{bookingId:id,kind:{in:['BOOKING_CREATED','BOOKING_CREATED:EMAIL']}}});return {booking:{...booking,events:booking.events.map(event=>({...event,details:event.details&&typeof event.details==='object'&&!Array.isArray(event.details)?Object.fromEntries(Object.entries(event.details).filter(([key])=>!['assignedToId','previousAssignedToId','assigneeIds','previousAssigneeIds'].includes(key))):event.details})),assignedToId:undefined,assignedTo:undefined,assignees:undefined,googleEventId:undefined},token:this.token(state),notification:outbox?.status||'UNCONFIGURED'};}return {booking};}
 private async guarded<T>(work:()=>Promise<T>){try{return await work();}catch(error){if(error&&typeof error==='object'&&'code' in error&&['P2002','P2004','P2034'].includes(String(error.code)))throw new ConflictException('The appointment changed or slot was reserved; refresh and try again');throw error;}}
 async create(input:unknown,actorId?:string,actorRole?:StaffRole){await this.ensureDevSettings();const data=parse(createBookingInput,input);if(!actorId&&(data.assignedToId||data.assigneeIds?.length)||actorRole==='MANAGER'&&normalizeAssigneeIds(data)?.some(id=>id!==actorId))throw new ForbiddenException();const requestHash=hash(JSON.stringify({...data,actorId:actorId||null}));const replay=await this.db.booking.findUnique({where:{idempotencyKey:data.idempotencyKey},include:{assignees:true}});if(replay){if(actorRole==='MANAGER'&&replay.assignedToId!==actorId&&!replay.assignees.some(a=>a.staffId===actorId))throw new NotFoundException();if(replay.requestHash!==requestHash||replay.tokenVersion!==0||replay.tokenExpiresAt<new Date())throw new ConflictException('Submission already used');return this.db.$transaction(tx=>this.result(tx,replay.id,!actorId));}
  return this.guarded(()=>this.db.$transaction(async tx=>{const row=await this.config(tx);this.format(schedule(row),data.serviceSlug,data.meetingType);const slot=await this.slot(tx,row,data.startsAt,undefined,data.durationMinutes??row.durationMinutes);const assigneeIds=await resolveBookingAssignees(where=>tx.staffUser.findFirst({where,select:{id:true}}),normalizeAssigneeIds(data),actorId?{id:actorId,role:actorRole}:undefined);const assignedToId=assigneeIds[0];const id=randomUUID(),tokenNonce=randomBytes(32).toString('hex');const token=this.token({id,tokenNonce,tokenVersion:0});await tx.booking.create({data:{id,reference:'AMC-'+randomBytes(6).toString('hex').toUpperCase(),calendarId:row.id,assignedToId,assignees:{create:assigneeIds.map(staffId=>({staffId}))},serviceSlug:data.serviceSlug,meetingType:data.meetingType,clientName:data.clientName,clientTitle:data.clientTitle,email:data.email,phone:data.phone,company:data.company,notes:data.notes,locale:data.locale,timezone:row.timezone,...slot,tokenNonce,tokenHash:hash(token),tokenExpiresAt:new Date(slot.endsAt.getTime()+30*86400000),idempotencyKey:data.idempotencyKey,requestHash,isDemo:row.isDemo}});const outboxStatus=(!row.isDemo&&process.env.RESEND_API_KEY)?'PENDING':'UNCONFIGURED';await this.event(tx,id,'BOOKING_CREATED',actorId,{startsAt:slot.startsAt.toISOString(),endsAt:slot.endsAt.toISOString(),source:actorId?'STAFF':'CLIENT',consent:{acknowledged:true,textVersion:'booking-details-v1',source:actorId?'STAFF_ATTESTATION':'CLIENT'}},outboxStatus);return this.result(tx,id,!actorId);})).catch(async error=>{const existing=await this.db.booking.findUnique({where:{idempotencyKey:data.idempotencyKey},include:{assignees:true}});if(existing&&(actorRole!=='MANAGER'||existing.assignedToId===actorId||existing.assignees.some(a=>a.staffId===actorId))&&existing.requestHash===requestHash&&existing.tokenVersion===0&&existing.tokenExpiresAt>new Date())return this.db.$transaction(tx=>this.result(tx,existing.id,!actorId));throw error;});
 }
 private async lock(tx:Tx,id:string,allowDeleted=false){await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id"=${id}::uuid FOR UPDATE`;const booking=await tx.booking.findUnique({where:{id}});if(!booking||(!allowDeleted&&booking.deletedAt))throw new NotFoundException();return booking;}
 private verify(booking:Booking,token:string){const supplied=hash(token);if(booking.tokenExpiresAt<new Date()||!timingSafeEqual(Buffer.from(supplied,'hex'),Buffer.from(booking.tokenHash,'hex')))throw new UnauthorizedException('Management link is invalid or expired');}
 async manage(input:unknown){const data=parse(manageInput,input);return this.db.$transaction(async tx=>{const booking=await this.lock(tx,data.id);this.verify(booking,data.token);const row=await this.config(tx,false);return {...await this.result(tx,data.id,true),schedule:schedule(row)};});}
 private mutable(booking:Booking){if(!['PENDING','CONFIRMED'].includes(booking.status))throw new ConflictException('Appointment is closed');}
 async clientAction(input:unknown){const data=parse(clientActionInput,input),requestHash=hash(JSON.stringify(data)),actorKey='c:'+hash(data.token);return this.guarded(()=>this.db.$transaction(async tx=>{const booking=await this.lock(tx,data.id);if(booking.tokenExpiresAt<new Date())throw new UnauthorizedException('Management link expired');const replay=await tx.bookingCommand.findUnique({where:{id:data.idempotencyKey}});if(replay){if(replay.bookingId!==booking.id||replay.actorKey!==actorKey||replay.requestHash!==requestHash||replay.resultVersion!==booking.version)throw new ConflictException('Action already used');return this.result(tx,booking.id,true);}this.verify(booking,data.token);this.mutable(booking);const row=await this.config(tx,false);if(booking.startsAt.getTime()-Date.now()<row.changeCutoffMinutes*60000)throw new ConflictException('Change cutoff has passed; contact staff');const ticket=await tx.bookingChangeRequest.findFirst({where:{bookingId:booking.id,status:{in:active}}});let eventKind:string;let changeId=ticket?.id||null;
   if(data.action==='CANCEL'||data.action==='RESCHEDULE'){if(ticket)throw new ConflictException('A change request is already open');if(data.action==='RESCHEDULE'){if(!this.enabled(row)||!data.startsAt)throw new BadRequestException('Choose an available time');await this.slot(tx,row,data.startsAt,booking.id,bookingDuration(booking));}const createdChange=await tx.bookingChangeRequest.create({data:{bookingId:booking.id,kind:data.action,reason:data.reason,requestedStartAt:data.action==='RESCHEDULE'?new Date(data.startsAt!):undefined}});changeId=createdChange.id;eventKind='CHANGE_REQUESTED';}
   else {if(!ticket)throw new ConflictException('No open change request');if(data.action==='WITHDRAW'){await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'WITHDRAWN',resolvedAt:new Date()}});eventKind='CHANGE_WITHDRAWN';}else{if(ticket.status!=='ALTERNATIVE_PROPOSED'||!ticket.proposedStartAt||!this.enabled(row))throw new ConflictException('No alternative to accept');const slot=await this.slot(tx,row,ticket.proposedStartAt.toISOString(),booking.id,bookingDuration(booking));await tx.booking.update({where:{id:booking.id},data:{...slot,timezone:row.timezone,tokenExpiresAt:new Date(slot.endsAt.getTime()+30*86400000)}});await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'APPROVED',resolvedAt:new Date()}});eventKind='BOOKING_RESCHEDULED';}}
   const next={...booking,tokenVersion:booking.tokenVersion+1};const changed=await tx.booking.update({where:{id:booking.id},data:{version:{increment:1},tokenVersion:{increment:1},tokenHash:hash(this.token(next))}});const finalChange=changeId?await tx.bookingChangeRequest.findUnique({where:{id:changeId}}):null;
   const outboxStatus=(!row.isDemo&&process.env.RESEND_API_KEY)?'PENDING':'UNCONFIGURED';
   await this.event(tx,booking.id,eventKind,undefined,{reason:data.reason,previousStartAt:booking.startsAt.toISOString(),previousEndAt:booking.endsAt.toISOString(),startsAt:changed.startsAt.toISOString(),endsAt:changed.endsAt.toISOString(),changeRequestId:changeId,previousChangeStatus:ticket?.status||null,changeStatus:finalChange?.status||null,requestedStartAt:finalChange?.requestedStartAt?.toISOString()||null,previousProposedStartAt:ticket?.proposedStartAt?.toISOString()||null,proposedStartAt:finalChange?.proposedStartAt?.toISOString()||null},outboxStatus);await tx.bookingCommand.create({data:{id:data.idempotencyKey,bookingId:booking.id,actorKey,requestHash,resultVersion:booking.version+1}});return this.result(tx,booking.id,true);
  }));}
 async list(input:Record<string,unknown>,actor?:{id:string;role:StaffRole}){const query=parse(z.object({from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),page:z.coerce.number().int().min(0).max(1000).default(0),search:z.string().trim().max(120).default(''),status:z.enum(['ALL','PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW']).default('ALL'),changes:z.enum(['all','open']).default('all'),assignment:z.enum(['all','unassigned']).default('all'),service:z.string().max(80).optional(),format:z.enum(['ONLINE','IN_PERSON']).optional()}),input);const settings=await this.getSettings();if(!settings)return {items:[],total:0,page:query.page,timezone:'Africa/Cairo',isDemo:false};let range:ReturnType<typeof analyticsBounds>;try{range=analyticsBounds(query.from,query.to,settings.timezone);}catch{throw new BadRequestException('Invalid date range');}const where:Prisma.BookingWhereInput={deletedAt:null,AND:[...(actor?.role==='MANAGER'?[{OR:[{assignedToId:actor.id},{assignees:{some:{staffId:actor.id}}}]}]:[]),...(actor?.role!=='MANAGER'&&query.assignment==='unassigned'?[{assignedToId:null,assignees:{none:{}}}]:[])],startsAt:range,status:query.status==='ALL'?undefined:query.status,serviceSlug:query.service,meetingType:query.format,changes:query.changes==='open'?{some:{status:{in:active}}}:undefined,OR:query.search?[{reference:{contains:query.search,mode:'insensitive'}},{clientName:{contains:query.search,mode:'insensitive'}},{email:{contains:query.search,mode:'insensitive'}}]:undefined};const [items,total]=await this.db.$transaction([this.db.booking.findMany({where,select:visible,orderBy:[{startsAt:'asc'},{id:'asc'}],skip:query.page*25,take:25}),this.db.booking.count({where})]);return {items,total,page:query.page,timezone:settings.timezone,isDemo:settings.isDemo};}
 async staffDetail(id:string,actor?:{id:string;role:StaffRole}){parse(z.uuid(),id);const booking=await this.db.booking.findFirst({where:{id,deletedAt:null,...(actor?.role==='MANAGER'?{OR:[{assignedToId:actor.id},{assignees:{some:{staffId:actor.id}}}]}:{})},select:{...detail,hubspotContactId:true,hubspotMeetingId:true}});if(!booking)throw new NotFoundException();return {booking:{...booking,hubspotContactUrl:hubspotContactUrl(booking.hubspotContactId),hubspotMeetingUrl:hubspotMeetingUrl(booking.hubspotMeetingId)}};}
 async staffAction(input:unknown,actorId:string,role?:StaffRole){const data=parse(staffActionInput,input);if(data.action==='DELETE'&&role!=='ADMIN'||(data.assignedToId!==undefined||data.assigneeIds!==undefined)&&(!role||!can(role,'appointments:assign')))throw new ForbiddenException();const requestHash=hash(JSON.stringify(data)),actorKey='staff:'+actorId;return this.guarded(()=>this.db.$transaction(async tx=>{const booking=await this.lock(tx,data.id,true);if(role==='MANAGER'&&booking.assignedToId!==actorId&&!await tx.bookingAssignee.findUnique({where:{bookingId_staffId:{bookingId:booking.id,staffId:actorId}}}))throw new NotFoundException();const replay=await tx.bookingCommand.findUnique({where:{id:data.idempotencyKey}});if(replay){if(replay.bookingId!==booking.id||replay.actorKey!==actorKey||replay.requestHash!==requestHash||replay.resultVersion!==booking.version)throw new ConflictException('Action already used');return this.result(tx,booking.id);}if(booking.deletedAt)throw new NotFoundException();if(booking.version!==data.version)throw new ConflictException('Appointment changed; refresh');if(data.action!=='DELETE'&&!(data.action==='EDIT'&&role==='ADMIN'))this.mutable(booking);const row=await this.config(tx,false);const previousAssigneeIds=(await tx.bookingAssignee.findMany({where:{bookingId:booking.id},select:{staffId:true}})).map(a=>a.staffId);const requestedAssignees=normalizeAssigneeIds(data);if(requestedAssignees!==undefined&&data.action!=='EDIT')throw new BadRequestException('Assignment changes require EDIT');const assigneeIds=requestedAssignees===undefined?undefined:await resolveBookingAssignees(where=>tx.staffUser.findFirst({where,select:{id:true}}),requestedAssignees,{id:actorId,role});const ticket=await tx.bookingChangeRequest.findFirst({where:{bookingId:booking.id,status:{in:active}}});let kind='BOOKING_'+data.action;let update:Prisma.BookingUpdateInput={version:{increment:1}};let closeChanges=false;
   if(data.meetingUrl&&booking.meetingType!=='ONLINE')throw new BadRequestException('Meeting links are for online appointments');
   if(data.assignedToId){const assignee=await tx.staffUser.findFirst({where:{id:data.assignedToId,active:true,role:{in:['MANAGER','ADMIN']}},select:{id:true}});if(!assignee)throw new BadRequestException('Choose an active manager');}if(data.action==='DELETE'){const active=['PENDING','CONFIRMED'].includes(booking.status);update={...update,...(active?{status:'CANCELLED' as const}:{}),deletedAt:new Date()};closeChanges=true;kind=active?'BOOKING_CANCELLED':'BOOKING_DELETED';if(active)await tx.staffAuditEvent.create({data:{actorId,subjectId:booking.id,action:'BOOKING_DELETED'}});}else if(data.action==='EDIT'){update={...update,clientName:data.clientName,clientTitle:data.clientTitle,email:data.email?.toLowerCase(),phone:data.phone,company:data.company,notes:data.notes,meetingUrl:data.meetingUrl,assignedTo:assigneeIds===undefined?undefined:assigneeIds.length?{connect:{id:assigneeIds[0]}}:{disconnect:true}};}
   else if(data.action==='CONFIRM'){const manager=await tx.staffUser.findFirst({where:{...((booking.assignedToId||previousAssigneeIds[0])?{id:booking.assignedToId||previousAssigneeIds[0],role:{in:['MANAGER' as const,'ADMIN' as const]}}:{email:process.env.DEFAULT_BOOKING_MANAGER_EMAIL||'mo.khaledmorad@almorad-amc.com',role:'MANAGER' as const}),active:true},select:{id:true}});if(!manager)throw new BadRequestException('Assign an active manager before confirming');if(!booking.assignedToId)update.assignedTo={connect:{id:manager.id}};await tx.bookingAssignee.upsert({where:{bookingId_staffId:{bookingId:booking.id,staffId:manager.id}},create:{bookingId:booking.id,staffId:manager.id},update:{}});if(booking.status!=='PENDING')throw new ConflictException('Already confirmed');update.status='CONFIRMED';}
   else if(data.action==='CANCEL'){update.status='CANCELLED';closeChanges=true;kind='BOOKING_CANCELLED';}
   else if(data.action==='COMPLETE'||data.action==='NO_SHOW'){if((data.action==='COMPLETE'?booking.endsAt:booking.startsAt)>new Date())throw new ConflictException('Meeting has not occurred yet');update.status=data.action==='COMPLETE'?'COMPLETED':'NO_SHOW';closeChanges=true;}
   else if(data.action==='RESCHEDULE'){if(!data.startsAt||!this.enabled(row))throw new BadRequestException('Choose a slot');update={...update,...await this.slot(tx,row,data.startsAt,booking.id,bookingDuration(booking)),timezone:row.timezone};closeChanges=true;kind='BOOKING_RESCHEDULED';}
   else {if(!ticket)throw new ConflictException('No open change request');if(data.action==='REVIEW'){if(ticket.status!=='OPEN')throw new ConflictException('Already reviewed');await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'UNDER_REVIEW',staffResponse:data.reason,respondedBy:actorId}});kind='CHANGE_UNDER_REVIEW';}
    else if(data.action==='DECLINE'){await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'DECLINED',staffResponse:data.reason,respondedBy:actorId,resolvedAt:new Date()}});kind='CHANGE_DECLINED';}
    else if(data.action==='PROPOSE'){if(ticket.kind!=='RESCHEDULE'||!data.startsAt||!this.enabled(row))throw new BadRequestException('Choose an alternative');await this.slot(tx,row,data.startsAt,booking.id,bookingDuration(booking));await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'ALTERNATIVE_PROPOSED',proposedStartAt:new Date(data.startsAt),staffResponse:data.reason,respondedBy:actorId}});kind='CHANGE_ALTERNATIVE_PROPOSED';}
    else {if(ticket.status==='ALTERNATIVE_PROPOSED')throw new ConflictException('Await client acceptance of the alternative');if(ticket.kind==='CANCEL'){update.status='CANCELLED';kind='BOOKING_CANCELLED';}else{if(!ticket.requestedStartAt||!this.enabled(row))throw new ConflictException('Requested slot unavailable');update={...update,...await this.slot(tx,row,ticket.requestedStartAt.toISOString(),booking.id,bookingDuration(booking)),timezone:row.timezone};kind='BOOKING_RESCHEDULED';}await tx.bookingChangeRequest.update({where:{id:ticket.id},data:{status:'APPROVED',staffResponse:data.reason,respondedBy:actorId,resolvedAt:new Date()}});}}
   if(closeChanges)await tx.bookingChangeRequest.updateMany({where:{bookingId:booking.id,status:{in:active}},data:{status:'WITHDRAWN',staffResponse:data.reason,respondedBy:actorId,resolvedAt:new Date()}});if(update.endsAt instanceof Date)update.tokenExpiresAt=new Date(update.endsAt.getTime()+30*86400000);if(assigneeIds!==undefined){await tx.bookingAssignee.deleteMany({where:{bookingId:booking.id}});if(assigneeIds.length)await tx.bookingAssignee.createMany({data:assigneeIds.map(staffId=>({bookingId:booking.id,staffId}))});}const changed=await tx.booking.update({where:{id:booking.id},data:update});const finalChange=ticket?await tx.bookingChangeRequest.findUnique({where:{id:ticket.id}}):null;
   const outboxStatus=data.action==='DELETE'&&!['PENDING','CONFIRMED'].includes(booking.status)?'SKIPPED':(!row.isDemo&&process.env.RESEND_API_KEY)?'PENDING':'UNCONFIGURED';
   await this.event(tx,booking.id,kind,actorId,{previousAssigneeIds,assigneeIds:assigneeIds??previousAssigneeIds,reason:data.reason,previousStartAt:booking.startsAt.toISOString(),previousEndAt:booking.endsAt.toISOString(),startsAt:changed.startsAt.toISOString(),endsAt:changed.endsAt.toISOString(),previousAssignedToId:booking.assignedToId,assignedToId:changed.assignedToId,previousStatus:booking.status,status:changed.status,changeRequestId:ticket?.id||null,previousChangeStatus:ticket?.status||null,changeStatus:finalChange?.status||null,requestedStartAt:finalChange?.requestedStartAt?.toISOString()||null,previousProposedStartAt:ticket?.proposedStartAt?.toISOString()||null,proposedStartAt:finalChange?.proposedStartAt?.toISOString()||null},outboxStatus);await tx.bookingCommand.create({data:{id:data.idempotencyKey,bookingId:booking.id,actorKey,requestHash,resultVersion:booking.version+1}});return this.result(tx,booking.id);
  }));}

 get googleMeetEnabled(){return this.googleCalendar?.enabled??false;}
 get googleMeetControlsEnabled(){return this.googleCalendar?.controlsEnabled??false;}
 private async hasMeetManager(tx:Tx,booking:Booking){
  const assignments=await tx.bookingAssignee.findMany({where:{bookingId:booking.id},select:{staffId:true}});
  const ids=[...new Set([...assignments.map(a=>a.staffId),...(booking.assignedToId?[booking.assignedToId]:[])])];
  return ids.length>0&&await tx.staffUser.count({where:{id:{in:ids},active:true,role:{in:['MANAGER','ADMIN']}}})>0;
 }
 async meetLink(input:unknown,actor:{id:string;role:StaffRole}){
  const data=parse(meetLinkInput,input);
  return this.db.$transaction(async tx=>{
   const booking=await this.lock(tx,data.id);
   if(actor.role==='MANAGER'&&booking.assignedToId!==actor.id&&!await tx.bookingAssignee.findUnique({where:{bookingId_staffId:{bookingId:booking.id,staffId:actor.id}}}))throw new NotFoundException();
   if(booking.meetingType!=='ONLINE')throw new BadRequestException('Only online meetings support Google Meet');
   this.mutable(booking);
   if(booking.isDemo)throw new BadRequestException('Demo bookings cannot create Google Meet events');
   const actorKey='staff:'+actor.id,requestHash=hash(JSON.stringify(data));
   if(data.action!=='CREATE'){
    const replay=await tx.bookingCommand.findUnique({where:{id:data.idempotencyKey!}});
    if(replay){if(replay.bookingId!==booking.id||replay.actorKey!==actorKey||replay.requestHash!==requestHash||replay.resultVersion!==booking.version)throw new ConflictException('Action already used');return {meetingUrl:booking.meetingUrl,googleEventId:booking.googleEventId};}
    if(data.version!==booking.version)throw new ConflictException('Appointment changed; refresh');
    if(!booking.meetingUrl||data.action!=='REMOVE'&&!booking.googleEventId)throw new BadRequestException('A managed Google Meet link is required');
   }
   if(data.action==='CREATE'&&booking.meetingUrl)return {meetingUrl:booking.meetingUrl,googleEventId:booking.googleEventId};
   if(['CREATE','REGENERATE'].includes(data.action)&&!await this.hasMeetManager(tx,booking))throw new BadRequestException('Assign and save an active meeting manager before generating the link');
   if(data.action==='REMOVE'){
    if(booking.googleEventId){if(!this.googleCalendar?.enabled)throw new GoogleMeetError('GOOGLE_MEET_NOT_CONFIGURED','configuration');await this.googleCalendar.removeConference(booking.googleEventId);}
    await tx.booking.update({where:{id:booking.id},data:{meetingUrl:null,version:{increment:1}}});
    await this.event(tx,booking.id,'BOOKING_UPDATED',actor.id,{googleMeet:true,action:'REMOVE',meetingUrl:null},process.env.RESEND_API_KEY?'PENDING':'UNCONFIGURED');
    await tx.bookingCommand.create({data:{id:data.idempotencyKey!,bookingId:booking.id,actorKey,requestHash,resultVersion:booking.version+1}});
    return {meetingUrl:null,googleEventId:booking.googleEventId};
   }
   if(!this.googleCalendar?.enabled)throw new GoogleMeetError('GOOGLE_MEET_NOT_CONFIGURED','configuration');
   if(data.action==='END'){
    await this.googleCalendar.endConference(booking.meetingUrl!);
    await tx.booking.update({where:{id:booking.id},data:{version:{increment:1}}});
    await tx.bookingEvent.create({data:{bookingId:booking.id,actorId:actor.id,kind:'MEET_CALL_ENDED',details:{permanentLinkRevocation:false}}});
    await tx.staffAuditEvent.create({data:{actorId:actor.id,subjectId:booking.id,action:'MEET_CALL_ENDED'}});
    await tx.bookingCommand.create({data:{id:data.idempotencyKey!,bookingId:booking.id,actorKey,requestHash,resultVersion:booking.version+1}});
    return {meetingUrl:booking.meetingUrl,googleEventId:booking.googleEventId};
   }
   const result=await this.googleCalendar.sync(booking,data.action==='REGENERATE'?data.idempotencyKey:booking.googleEventId?hash(booking.id+':'+booking.version):undefined);
   if(data.action==='REGENERATE'&&result.meetingUrl===booking.meetingUrl)throw new GoogleMeetError('GOOGLE_MEET_PENDING','conference');
   await tx.booking.update({where:{id:booking.id},data:{...result,version:{increment:1}}});
   await this.event(tx,booking.id,'BOOKING_UPDATED',actor.id,{googleMeet:true,action:data.action,meetingUrl:result.meetingUrl},process.env.RESEND_API_KEY?'PENDING':'UNCONFIGURED');
   if(data.action==='REGENERATE')await tx.bookingCommand.create({data:{id:data.idempotencyKey!,bookingId:booking.id,actorKey,requestHash,resultVersion:booking.version+1}});
   return result;
  },{timeout:30000});
 }
 async drainMeet(batchSize=10){
  if(!this.googleCalendar?.enabled)return {processed:0,succeeded:0,failed:0};
  const claimed=await this.db.$queryRaw<{id:string;bookingId:string;attempts:number}[]>`
   WITH claimable AS (SELECT current."id" FROM "BookingOutbox" current
    WHERE (current."status"='PENDING' OR (current."status"='PROCESSING' AND current."updatedAt"<NOW()-INTERVAL '5 minutes'))
    AND current."kind" LIKE '%:MEET' AND (current."nextRetryAt" IS NULL OR current."nextRetryAt"<=NOW())
    AND NOT EXISTS (SELECT 1 FROM "BookingOutbox" earlier WHERE earlier."bookingId"=current."bookingId" AND earlier."kind" LIKE '%:MEET' AND earlier."status" IN ('PENDING','PROCESSING') AND (earlier."createdAt",earlier."id")<(current."createdAt",current."id"))
    ORDER BY current."createdAt",current."id" LIMIT ${batchSize} FOR UPDATE SKIP LOCKED)
   UPDATE "BookingOutbox" SET "status"='PROCESSING',"attempts"="attempts"+1,"updatedAt"=NOW() WHERE "id" IN (SELECT "id" FROM claimable) RETURNING "id","bookingId","attempts"`;
  let succeeded=0,failed=0;
  for(const item of claimed){try{
   await this.db.$transaction(async tx=>{
    const booking=await this.lock(tx,item.bookingId,true);
    if(booking.isDemo||booking.meetingType!=='ONLINE'||booking.meetingUrl&&!booking.googleEventId&&!booking.deletedAt&&booking.status!=='CANCELLED'){await tx.bookingOutbox.update({where:{id:item.id},data:{status:'SKIPPED'}});return;}
    if(!booking.googleEventId&&!await this.hasMeetManager(tx,booking)){await tx.bookingOutbox.update({where:{id:item.id},data:{status:'SKIPPED'}});return;}
    // Removed conference details stay removed until staff explicitly generates a replacement.
    if(booking.googleEventId&&!booking.meetingUrl&&!booking.deletedAt&&booking.status!=='CANCELLED'){await tx.bookingOutbox.update({where:{id:item.id},data:{status:'SKIPPED'}});return;}
    const result=await this.googleCalendar!.sync(booking);
    await tx.booking.update({where:{id:booking.id},data:result});
    if(result.meetingUrl&&result.meetingUrl!==booking.meetingUrl){
      const pendingInitialEmail=await tx.bookingOutbox.findFirst({where:{bookingId:booking.id,kind:'BOOKING_CREATED:EMAIL',status:{in:['PENDING','PROCESSING']}},select:{id:true}});
      if(pendingInitialEmail){
        await tx.bookingEvent.create({data:{bookingId:booking.id,kind:'BOOKING_UPDATED',details:{googleMeet:true,mergedWithConfirmation:true}}});
      } else {
        await this.event(tx,booking.id,'BOOKING_UPDATED',undefined,{googleMeet:true},process.env.RESEND_API_KEY?'PENDING':'UNCONFIGURED');
      }
    }
    await tx.bookingOutbox.update({where:{id:item.id},data:{status:'DELIVERED',deliveredAt:new Date(),lastError:null}});
   },{timeout:30000});succeeded++;
  }catch(error){failed++;await this.db.bookingOutbox.update({where:{id:item.id},data:{status:item.attempts>=5?'FAILED':'PENDING',nextRetryAt:new Date(Date.now()+Math.min(900,5*2**(item.attempts-1))*1000),lastError:error instanceof GoogleMeetError?error.code:'Google Meet sync failed; verify configuration and retry'}});}}
  return {processed:claimed.length,succeeded,failed};
 }
 async assignees(){return this.db.staffUser.findMany({where:{active:true,role:{in:['MANAGER','ADMIN']}},select:{id:true,email:true,firstName:true,lastName:true,role:true},orderBy:{email:'asc'},take:200});}
 private async recoveryAllowed(identifier:string){
  const key=hash('booking-recovery:'+identifier);
  const rows=await this.db.$queryRaw<{totalHits:number}[]>`INSERT INTO "RequestThrottle" ("key","totalHits","expiresAt") VALUES (${key},1,NOW()+INTERVAL '10 minutes') ON CONFLICT ("key") DO UPDATE SET "totalHits"=CASE WHEN "RequestThrottle"."expiresAt"<=NOW() THEN 1 ELSE "RequestThrottle"."totalHits"+1 END,"expiresAt"=CASE WHEN "RequestThrottle"."expiresAt"<=NOW() THEN NOW()+INTERVAL '10 minutes' ELSE "RequestThrottle"."expiresAt" END RETURNING "totalHits"`;
  return (rows[0]?.totalHits??4)<=3;
 }
 private async queueAccess(ids:string[]){
  await this.db.$transaction(async tx=>{for(const id of ids){let booking:Booking;try{booking=await this.lock(tx,id,true);}catch(error){if(error instanceof NotFoundException)continue;throw error;}if(booking.deletedAt||!['PENDING','CONFIRMED'].includes(booking.status))continue;if(booking.tokenExpiresAt<new Date()){const next={...booking,tokenNonce:randomBytes(32).toString('hex'),tokenVersion:booking.tokenVersion+1};await tx.booking.update({where:{id},data:{tokenNonce:next.tokenNonce,tokenVersion:next.tokenVersion,tokenHash:hash(this.token(next)),tokenExpiresAt:new Date(Date.now()+30*60000)}});}const event=await tx.bookingEvent.create({data:{bookingId:id,kind:'BOOKING_ACCESS_RECOVERY',details:{}}});await tx.bookingOutbox.create({data:{bookingId:id,eventId:event.id,kind:'BOOKING_ACCESS_RECOVERY:EMAIL',status:!booking.isDemo&&process.env.RESEND_API_KEY?'PENDING':'UNCONFIGURED'}});}});
 }
 async recover(input:unknown){
  const data=parse(recoverBookingInput,input);const email=data.identifier.includes('@');const normalized=email?data.identifier.toLowerCase():data.identifier.replace(/[^0-9]/g,'');
  if(!await this.recoveryAllowed(normalized))return {accepted:true};
  const phoneIds=email?[]:await this.db.$queryRaw<{id:string}[]>`SELECT "id" FROM "Booking" WHERE "deletedAt" IS NULL AND "endsAt">NOW() AND "status"::text IN ('PENDING','CONFIRMED') AND regexp_replace("phone",'[^0-9]','','g')=${normalized} ORDER BY "startsAt" LIMIT 5`;
  const bookings=await this.db.booking.findMany({where:{deletedAt:null,status:{in:['PENDING','CONFIRMED']},endsAt:{gt:new Date()},...(email?{email:normalized}:{id:{in:phoneIds.map(row=>row.id)}})},select:{id:true},orderBy:{startsAt:'asc'},take:5});
  if(bookings.length)await this.queueAccess(bookings.map(row=>row.id));
  return {accepted:true};
 }
 async resendConfirmation(input:unknown){const data=parse(manageInput,input);const booking=await this.db.booking.findUnique({where:{id:data.id}});if(!booking||booking.deletedAt)throw new NotFoundException();this.verify(booking,data.token);this.mutable(booking);if(await this.recoveryAllowed('booking:'+booking.id))await this.queueAccess([booking.id]);return {accepted:true};}
 async analytics(input:Record<string,unknown>){const data=parse(z.object({from:z.string(),to:z.string(),service:z.string().max(80).optional(),format:z.enum(['ONLINE','IN_PERSON']).optional()}),input);const settings=await this.getSettings();if(!settings)throw new ServiceUnavailableException('Configure booking first');let range:ReturnType<typeof analyticsBounds>;try{range=analyticsBounds(data.from,data.to,settings.timezone);}catch{throw new BadRequestException('Invalid date range');}const now=new Date(),today=dayBounds(localDate(now,settings.timezone),settings.timezone);const filter:Prisma.BookingWhereInput={deletedAt:null,serviceSlug:data.service,meetingType:data.format};const cohort={...filter,createdAt:range};const result=await this.db.$transaction(async tx=>{const [total,cancelled,completed,noShow,todayCount,upcoming,pendingChanges,expected,byService,byType,byStatus]=await Promise.all([tx.booking.count({where:cohort}),tx.booking.count({where:{...cohort,status:'CANCELLED'}}),tx.booking.count({where:{...filter,status:'COMPLETED',startsAt:range}}),tx.booking.count({where:{...filter,status:'NO_SHOW',startsAt:range}}),tx.booking.count({where:{...filter,startsAt:{gte:today.from,lt:today.to},status:{not:'CANCELLED'}}}),tx.booking.count({where:{...filter,status:'CONFIRMED',startsAt:{gte:new Date(Math.max(now.getTime(),range.gte.getTime())),lt:range.lt}}}),tx.bookingChangeRequest.count({where:{status:{in:active},booking:{...filter,startsAt:range}}}),tx.booking.count({where:{...filter,status:{not:'CANCELLED'},startsAt:{gte:range.gte,lt:new Date(Math.min(now.getTime(),range.lt.getTime()))}}}),tx.booking.groupBy({by:['serviceSlug'],where:cohort,_count:{_all:true}}),tx.booking.groupBy({by:['meetingType'],where:cohort,_count:{_all:true}}),tx.booking.groupBy({by:['status'],where:cohort,_count:{_all:true}})]);
 const rows=await tx.$queryRaw<{date:string;count:number}[]>`SELECT to_char("createdAt" AT TIME ZONE ${settings.timezone},'YYYY-MM-DD') AS date,count(*)::int AS count FROM "Booking" WHERE "deletedAt" IS NULL AND "createdAt">=${range.gte} AND "createdAt"<${range.lt} AND (${data.service||null}::text IS NULL OR "serviceSlug"=${data.service||null}) AND (${data.format||null}::text IS NULL OR "meetingType"::text=${data.format||null}) GROUP BY 1 ORDER BY 1`;
 const resolution=await tx.$queryRaw<{hours:number|null}[]>`SELECT avg(extract(epoch from (c."resolvedAt"-c."createdAt"))/3600)::float8 AS hours FROM "BookingChangeRequest" c JOIN "Booking" b ON b.id=c."bookingId" WHERE b."deletedAt" IS NULL AND c."resolvedAt">=${range.gte} AND c."resolvedAt"<${range.lt} AND (${data.service||null}::text IS NULL OR b."serviceSlug"=${data.service||null}) AND (${data.format||null}::text IS NULL OR b."meetingType"::text=${data.format||null})`;
 return {total,cancelled,completed,noShow,today:todayCount,upcoming,pendingChanges,cancellationRate:total?cancelled/total:null,noShowRate:expected?noShow/expected:null,averageResolutionHours:resolution[0]?.hours??null,byService:byService.map(v=>({key:v.serviceSlug,count:v._count._all})),byType:byType.map(v=>({key:v.meetingType,count:v._count._all})),byStatus:byStatus.map(v=>({key:v.status,count:v._count._all})),trend:rows};});return {...result,timezone:settings.timezone,isDemo:settings.isDemo};
 }

 /**
  * Claims and processes pending HubSpot CRM outbox records using PostgreSQL SKIP LOCKED.
  */
 async drainCrm(batchSize = 10): Promise<{processed: number; succeeded: number; failed: number}> {
   if (!this.hubspot?.enabled) return {processed: 0, succeeded: 0, failed: 0};
   const claimed = await this.db.$queryRaw<{id: string; bookingId: string; kind: string; attempts: number;lastError?:string|null}[]>`
     WITH claimable AS (
       SELECT current."id" FROM "BookingOutbox" current
       WHERE (
         "status" = 'PENDING'
         OR ("status" = 'PROCESSING' AND "updatedAt" < NOW() - INTERVAL '5 minutes')
       )
       AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW())
       AND "kind" LIKE '%:HUBSPOT'
       -- One oldest unresolved intent per booking, even across parallel drains.
       AND NOT EXISTS (SELECT 1 FROM "BookingOutbox" earlier
         WHERE earlier."bookingId"=current."bookingId" AND earlier."kind" LIKE '%:HUBSPOT'
           AND earlier."status" IN ('PENDING','PROCESSING')
           AND (earlier."createdAt",earlier."id") < (current."createdAt",current."id"))
       ORDER BY "createdAt" ASC,"id" ASC
       LIMIT ${batchSize}
       FOR UPDATE SKIP LOCKED
     )
     UPDATE "BookingOutbox"
     SET "status" = 'PROCESSING', "attempts" = "attempts" + 1, "updatedAt" = NOW()
     WHERE "id" IN (SELECT "id" FROM claimable)
     RETURNING "id", "bookingId", "kind", "attempts", "lastError";
   `;

   if (!claimed || claimed.length === 0) return {processed: 0, succeeded: 0, failed: 0};
   let succeeded = 0;
   let failed = 0;

   for (const item of claimed) {
     let remoteCreateAttempted=false;
     try {
       const booking = await this.db.booking.findUnique({where: {id: item.bookingId},include:{calendar:true}});
       if (!booking) {
         await this.db.bookingOutbox.update({where: {id: item.id}, data: {status: 'FAILED', lastError: 'Booking not found'}});
         failed++;
         continue;
       }

       if(booking.isDemo||item.kind.startsWith('CHANGE_')){
         await this.db.bookingOutbox.update({where:{id:item.id},data:{status:'SKIPPED',lastError:null}});succeeded++;continue;
       }
       const contactInput={
           email: booking.email,
           name: booking.clientName,
           phone: booking.phone,
           company: booking.company,
           locale: booking.locale
       };
       const contactId=booking.hubspotContactId
         ? await this.hubspot.updateBookingContact(booking.hubspotContactId,contactInput)
         : await this.hubspot.upsertBookingContact(contactInput);
       if(!contactId)throw new Error('HubSpot returned no contact ID');
       if(!booking.hubspotContactId)await this.db.booking.update({where:{id:booking.id},data:{hubspotContactId:contactId}});
       const outcome:HubSpotOutcome=booking.status==='CANCELLED'?'CANCELED':booking.status==='COMPLETED'?'COMPLETED':booking.status==='NO_SHOW'?'NO_SHOW':item.kind.startsWith('BOOKING_RESCHEDULED')?'RESCHEDULED':'SCHEDULED';
       const origin=process.env.WEB_ORIGIN;
       const externalUrl=origin?new URL(`/${booking.locale}/staff/calendar?appointment=${encodeURIComponent(booking.id)}`,origin).href:undefined;
       const location=booking.meetingType==='ONLINE'?(booking.meetingUrl||'Online - link pending'):(booking.locale==='ar'?booking.calendar?.officeAddressAr:booking.calendar?.officeAddressEn)||'';
       const currentMeeting={startsAt:booking.startsAt,endsAt:booking.endsAt,outcome,location,externalUrl,description:`ALMORAD AMC - ${booking.reference}\n${booking.meetingType}\n${booking.timezone}`};
       let meetingId=booking.hubspotMeetingId;
       if(!meetingId&&item.attempts>1)meetingId=await this.hubspot.findMeetingByReference(booking.reference);
       if(!meetingId){
         if(item.lastError?.includes('CRM_MEETING_RECONCILE_REQUIRED'))throw new Error('CRM_MEETING_RECONCILE_REQUIRED: no indexed match; staff reconciliation required');
         if(!item.kind.startsWith('BOOKING_CREATED'))throw new Error('CRM_MEETING_NOT_LINKED: resolve creation before updating');
         // Persist before the provider call so a process crash cannot lose uncertainty.
         await this.db.bookingOutbox.update({where:{id:item.id},data:{lastError:'CRM_MEETING_RECONCILE_REQUIRED'}});
         remoteCreateAttempted=true;
         meetingId = await this.hubspot.createMeeting({contactId,
           title: `ALMORAD AMC Consultation - ${booking.reference}`,
           reference: booking.reference,...currentMeeting
         });
       }else await this.hubspot.updateMeeting(meetingId,currentMeeting);
       if(!meetingId)throw new HubSpotAmbiguousCreateError();
       await this.db.booking.update({where:{id:booking.id},data:{hubspotContactId:contactId,hubspotMeetingId:meetingId}});
       remoteCreateAttempted=false;

       await this.db.bookingOutbox.update({
         where: {id: item.id},
         data: {status: 'DELIVERED', deliveredAt: new Date(), lastError: null}
       });
       succeeded++;
     } catch (error: unknown) {
       failed++;
       const msg = error instanceof Error ? error.message : String(error);
       const isClientError = /400|401|403|404|422|CRM_MEETING_NOT_LINKED|staff reconciliation required|multiple matching meetings/i.test(msg);
       const maxAttempts = item.attempts >= 5;
       const uncertain=Boolean(item.lastError?.includes('CRM_MEETING_RECONCILE_REQUIRED'))||error instanceof HubSpotAmbiguousCreateError||(remoteCreateAttempted&&!isClientError&&!(error instanceof HubSpotRateLimitError));
       const sanitized = (uncertain?'CRM_MEETING_RECONCILE_REQUIRED: ':'')+msg.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]').slice(0, 850);

       if (error instanceof HubSpotRateLimitError&&!maxAttempts) {
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
