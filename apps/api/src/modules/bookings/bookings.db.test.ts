import 'reflect-metadata';
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';import {randomBytes,randomUUID} from 'node:crypto';
import {PrismaPg} from '@prisma/adapter-pg';import {PrismaClient} from '../../generated/prisma/client.js';import type {PrismaService} from '../../prisma/prisma.service.js';
import {BookingsService} from './bookings.service.js';import type {GoogleCalendarService} from '../notifications/google-calendar.service.js';import {calendarSlots,localDate} from './schedule.js';import {services,type ScheduleInput} from '@amc/shared';
import {StaffAccountsService} from '../auth/staff-accounts.service.js';
import {InquiriesController} from '../contact/inquiries.controller.js';
import type {StaffRequest} from '../auth/session.guard.js';
import {Test} from '@nestjs/testing';import type {INestApplication} from '@nestjs/common';import request from 'supertest';import {AppModule} from '../../app.module.js';import {PrismaService as Provider} from '../../prisma/prisma.service.js';import {hashPassword} from '../auth/security.js';
const value=process.env.TEST_DATABASE_URL;if(!value)throw new Error('TEST_DATABASE_URL required');const url=new URL(value);if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw new Error('Isolated local *_test database required');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:value})});const actor=randomUUID(),receptionist=randomUUID(),managerOne=randomUUID(),managerTwo=randomUUID(),email=randomUUID()+'@example.invalid';let api:BookingsService,other:BookingsService,app:INestApplication;let ownsSettings=false;
const rules:ScheduleInput={version:0,enabled:true,timezone:'Africa/Cairo',durationMinutes:30,stepMinutes:15,bufferBeforeMinutes:5,bufferAfterMinutes:5,leadMinutes:0,lookaheadDays:60,changeCutoffMinutes:60,onlineEnabled:true,inPersonEnabled:false,officeAddressEn:null,officeAddressAr:null,directionsUrl:null,weeklyHours:Array.from({length:7},(_,i)=>({day:i+1,open:'01:00',close:'23:00'})),blackoutDates:[],serviceSlugs:services.map(v=>v.slug)};
function slot(day:number,index=0){const date=new Date(localDate(new Date(),'Africa/Cairo')+'T12:00Z');date.setUTCDate(date.getUTCDate()+day);return calendarSlots(rules,date.toISOString().slice(0,10))[index]!.startsAt.toISOString();}
function input(day:number,index=0){return {idempotencyKey:randomUUID(),serviceSlug:'branding',meetingType:'ONLINE' as const,startsAt:slot(day,index),locale:'en' as const,clientName:'Isolated booking fixture',email,phone:'+201000000000',consent:true as const};}
const asClient=(value:unknown)=>value as {booking:{id:string;startsAt:Date;version:number;status:string;changes:{status:string}[]};token:string};
beforeAll(async()=>{await db.$connect();if(await db.bookingSettings.findUnique({where:{id:'agency'}}))throw new Error('Booking test requires no existing agency settings; refuses to overwrite them');vi.stubEnv('BOOKING_TOKEN_SECRET',randomBytes(32).toString('hex'));api=new BookingsService(db as unknown as PrismaService);other=new BookingsService(db as unknown as PrismaService);await db.staffUser.createMany({data:[{id:actor,email:actor+'@example.invalid',role:'ADMIN',passwordHash:await hashPassword('Isolated fixture password 123')},{id:receptionist,email:receptionist+'@example.invalid',role:'RECEPTIONIST',passwordHash:await hashPassword('Isolated fixture password 123')},...([managerOne,managerTwo].map(id=>({id,email:id+'@example.invalid',role:'MANAGER' as const})))]});await api.saveSettings(rules,actor);ownsSettings=true;const testingModule=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(Provider).useValue(db).compile();app=testingModule.createNestApplication();await app.init();});
afterAll(async()=>{await app?.close();const bookings=await db.booking.findMany({where:{email},select:{id:true}});await db.booking.deleteMany({where:{email}});await db.staffAuditEvent.deleteMany({where:{OR:[{actorId:{in:[actor,receptionist,managerOne,managerTwo]}},{subjectId:{in:bookings.map(v=>v.id)}}]}});await db.staffUser.deleteMany({where:{id:{in:[actor,receptionist,managerOne,managerTwo]}}});if(ownsSettings)await db.bookingSettings.delete({where:{id:'agency'}});await db.$disconnect();vi.unstubAllEnvs();});
describe.sequential('conflict-safe booking and staff-reviewed client changes',()=>{
 it('allows only one of two independent clients to reserve the same slot',async()=>{const a=input(3),b=input(3);const results=await Promise.allSettled([api.create(a),other.create(b)]);expect(results.filter(v=>v.status==='fulfilled')).toHaveLength(1);expect(await db.booking.count({where:{email,startsAt:new Date(a.startsAt)}})).toBe(1);const stored=await db.booking.findFirstOrThrow({where:{email,startsAt:new Date(a.startsAt)}});await expect(db.booking.create({data:{...stored,id:randomUUID(),reference:randomUUID().slice(0,20),idempotencyKey:randomUUID(),startsAt:new Date(stored.endsAt),endsAt:new Date(stored.endsAt.getTime()+1800000),blockedStartsAt:new Date(stored.endsAt.getTime()-300000),blockedEndsAt:new Date(stored.endsAt.getTime()+2100000)}})).rejects.toThrow();});
 it('makes creation retries idempotent and rejects altered payload reuse',async()=>{const body=input(4);const first=asClient(await api.create(body)),retry=asClient(await api.create(body));expect(retry.booking.id).toBe(first.booking.id);expect(retry.token).toBe(first.token);const event=await db.bookingEvent.findFirstOrThrow({where:{bookingId:first.booking.id,kind:'BOOKING_CREATED'}});expect(event.details).toMatchObject({consent:{acknowledged:true,textVersion:'booking-details-v1',source:'CLIENT'}});const intents=await db.bookingOutbox.findMany({where:{bookingId:first.booking.id},select:{eventId:true,kind:true}});expect(intents.map(intent=>intent.kind).sort()).toEqual(['BOOKING_CREATED:EMAIL','BOOKING_CREATED:HUBSPOT','BOOKING_CREATED:MEET','BOOKING_CREATED:OWNER:EMAIL'].sort());expect(intents.every(intent=>intent.eventId===event.id)).toBe(true);await expect(api.create({...body,clientName:'Different fixture'})).rejects.toThrow();});
 it('keeps cancellation requests confirmed, rotates links, and audits approval once',async()=>{const created=asClient(await api.create(input(5)));const command={id:created.booking.id,token:created.token,idempotencyKey:randomUUID(),action:'CANCEL',reason:'Client requires cancellation'};const requested=asClient(await api.clientAction(command));expect(requested.booking.status).toBe('CONFIRMED');expect(requested.booking.startsAt).toEqual(created.booking.startsAt);expect(requested.token).not.toBe(created.token);expect(asClient(await api.clientAction(command)).token).toBe(requested.token);await expect(api.manage({id:created.booking.id,token:created.token})).rejects.toThrow();const action={id:created.booking.id,version:requested.booking.version,idempotencyKey:randomUUID(),action:'APPROVE',reason:'Staff approves cancellation'};await api.staffAction(action,actor);await api.staffAction(action,actor);expect((await db.booking.findUniqueOrThrow({where:{id:created.booking.id}})).status).toBe('CANCELLED');expect(await db.bookingEvent.count({where:{bookingId:created.booking.id,kind:'BOOKING_CANCELLED'}})).toBe(1);});
 it('rolls back an approval when the requested slot becomes occupied',async()=>{const created=asClient(await api.create(input(6)));const requested=asClient(await api.clientAction({id:created.booking.id,token:created.token,idempotencyKey:randomUUID(),action:'RESCHEDULE',startsAt:slot(7),reason:'Need a later day'}));await api.create(input(7));await expect(api.staffAction({id:created.booking.id,version:requested.booking.version,idempotencyKey:randomUUID(),action:'APPROVE',reason:'Review requested time'},actor)).rejects.toThrow();const current=await db.booking.findUniqueOrThrow({where:{id:created.booking.id},include:{changes:true}});expect(current.startsAt).toEqual(created.booking.startsAt);expect(current.status).toBe('CONFIRMED');expect(current.changes[0]!.status).toBe('OPEN');});
 it('does not move an alternative until the client accepts it transactionally',async()=>{const created=asClient(await api.create(input(8)));const requested=asClient(await api.clientAction({id:created.booking.id,token:created.token,idempotencyKey:randomUUID(),action:'RESCHEDULE',startsAt:slot(9),reason:'Request different day'}));await api.staffAction({id:created.booking.id,version:requested.booking.version,idempotencyKey:randomUUID(),action:'PROPOSE',startsAt:slot(10),reason:'Staff offers another day'},actor);const pending=await db.booking.findUniqueOrThrow({where:{id:created.booking.id}});expect(pending.startsAt).toEqual(created.booking.startsAt);const event=await db.bookingEvent.findFirstOrThrow({where:{bookingId:created.booking.id,kind:'CHANGE_ALTERNATIVE_PROPOSED'}});expect(event.details).toMatchObject({proposedStartAt:slot(10),previousProposedStartAt:null});const accepted=asClient(await api.clientAction({id:created.booking.id,token:requested.token,idempotencyKey:randomUUID(),action:'ACCEPT_ALTERNATIVE',reason:'Client accepts offered day'}));expect(accepted.booking.startsAt.toISOString()).toBe(slot(10));expect(accepted.booking.status).toBe('CONFIRMED');expect(accepted.booking.changes[0]!.status).toBe('APPROVED');});
 it('rejects stale staff updates and premature attendance outcomes',async()=>{const created=asClient(await api.create(input(11)));await expect(api.staffAction({id:created.booking.id,version:created.booking.version,idempotencyKey:randomUUID(),action:'COMPLETE',reason:'Too early to complete'},actor)).rejects.toThrow();await api.staffAction({id:created.booking.id,version:created.booking.version,idempotencyKey:randomUUID(),action:'EDIT',clientName:'Updated isolated fixture',reason:'Correct client name'},actor);await expect(api.staffAction({id:created.booking.id,version:created.booking.version,idempotencyKey:randomUUID(),action:'CANCEL',reason:'Stale client action'},actor)).rejects.toThrow();});
 it('enforces receptionist permissions and CSRF at the HTTP API',async()=>{const agent=request.agent(app.getHttpServer());const login=await agent.post('/staff/auth/login').set('Origin','http://localhost:3000').send({email:receptionist+'@example.invalid',password:'Isolated fixture password 123'}).expect(200);expect(login.body.csrfToken).toBeTruthy();await agent.get('/staff/booking-settings').expect(403);await agent.get('/staff/booking-analytics?from=2026-01-01&to=2026-01-10').expect(403);const from=localDate(new Date(),'Africa/Cairo');await agent.get('/staff/appointments?from='+from+'&to='+from).expect(200);await agent.post('/staff/appointments/action').set('Origin','http://localhost:3000').send({}).expect(403);await request(app.getHttpServer()).post('/booking/create').set('Origin','https://wrong.invalid').send(input(12)).expect(403);await request(app.getHttpServer()).get('/staff/appointments?from='+from+'&to='+from).expect(401);});
 it('aggregates real creation cohorts and does not invent conversion/revenue',async()=>{const today=localDate(new Date(),'Africa/Cairo');const metrics=await api.analytics({from:today,to:today});expect(metrics.total).toBe(await db.booking.count({where:{email}}));expect(metrics.cancelled).toBe(1);expect(metrics.cancellationRate).toBe(1/metrics.total);expect(metrics).not.toHaveProperty('conversionRate');expect(metrics).not.toHaveProperty('revenue');});
});

// Real PostgreSQL claim serialization; providers are mocked and require no account.
it('serializes HubSpot intents for one booking across independent drains',async()=>{
 // Earlier fixture commands may leave unrelated retries; scope this claim test to its own cohort.
 await db.bookingOutbox.updateMany({where:{booking:{email},kind:{endsWith:':HUBSPOT'},status:{in:['PENDING','PROCESSING']}},data:{status:'SKIPPED'}});
 const created=asClient(await api.create(input(55)));
 await db.bookingOutbox.deleteMany({where:{bookingId:created.booking.id,kind:{endsWith:':HUBSPOT'}}});
 const firstEvent=await db.bookingEvent.create({data:{bookingId:created.booking.id,kind:'BOOKING_CREATED',details:{}}});
 const nextEvent=await db.bookingEvent.create({data:{bookingId:created.booking.id,kind:'BOOKING_EDIT',details:{}}});
 await db.bookingOutbox.createMany({data:[{bookingId:created.booking.id,eventId:firstEvent.id,kind:'BOOKING_CREATED:HUBSPOT',status:'PENDING',createdAt:new Date(Date.now()-2000)},{bookingId:created.booking.id,eventId:nextEvent.id,kind:'BOOKING_EDIT:HUBSPOT',status:'PENDING'}]});
 let release!:()=>void,entered!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;}),started=new Promise<void>(resolve=>{entered=resolve;});
 const provider={enabled:true,upsertBookingContact:vi.fn().mockResolvedValue('42'),updateBookingContact:vi.fn().mockResolvedValue('42'),createMeeting:vi.fn(async()=>{entered();await gate;return '88';}),updateMeeting:vi.fn().mockResolvedValue(undefined)};
 const left=new BookingsService(db as unknown as PrismaService,provider as unknown as import('../contact/hubspot.client.js').HubSpotClient),right=new BookingsService(db as unknown as PrismaService,provider as unknown as import('../contact/hubspot.client.js').HubSpotClient);
 const first=left.drainCrm(1);
 try {await Promise.race([started,first.then(()=>{throw new Error('CRM create was not entered');})]);expect(await right.drainCrm(1)).toEqual({processed:0,succeeded:0,failed:0});}finally{release();await first;}
 expect(await first).toEqual({processed:1,succeeded:1,failed:0});
 expect(await right.drainCrm(1)).toEqual({processed:1,succeeded:1,failed:0});expect(provider.createMeeting).toHaveBeenCalledTimes(1);expect(provider.updateMeeting).toHaveBeenCalledTimes(1);
 expect((await db.booking.findUniqueOrThrow({where:{id:created.booking.id}})).hubspotMeetingId).toBe('88');
});

it('isolates manager reads/edits and preserves an admin-deleted meeting while releasing its slot',async()=>{
 const left=asClient(await api.create(input(58),managerOne,'MANAGER'));
 const right=asClient(await api.create(input(58,4),managerTwo,'MANAGER'));
 const day=localDate(new Date(slot(58)),'Africa/Cairo');
 const list=await api.list({from:day,to:day},{id:managerOne,role:'MANAGER'});
 expect(list.items.map(row=>row.id)).toContain(left.booking.id);expect(list.items.map(row=>row.id)).not.toContain(right.booking.id);
 await expect(api.staffDetail(right.booking.id,{id:managerOne,role:'MANAGER'})).rejects.toMatchObject({status:404});
 await expect(api.staffAction({id:right.booking.id,version:1,idempotencyKey:randomUUID(),action:'EDIT',reason:'Cross-manager denied'},managerOne,'MANAGER')).rejects.toMatchObject({status:404});
 await api.staffAction({id:left.booking.id,version:1,idempotencyKey:randomUUID(),action:'EDIT',notes:'Manager-owned update',reason:'Client requested detail change'},managerOne,'MANAGER');
 await api.staffAction({id:left.booking.id,version:2,idempotencyKey:randomUUID(),action:'DELETE',reason:'Admin removes synthetic meeting'},actor,'ADMIN');
 const stored=await db.booking.findUniqueOrThrow({where:{id:left.booking.id}});
 expect(stored.deletedAt).toBeInstanceOf(Date);expect(stored.status).toBe('CANCELLED');expect(stored.notes).toBe('Manager-owned update');
 expect(await db.bookingEvent.count({where:{bookingId:stored.id}})).toBeGreaterThan(1);
 expect(await db.staffAuditEvent.count({where:{subjectId:stored.id,action:'BOOKING_DELETED'}})).toBe(1);
 await expect(api.staffDetail(stored.id,{id:actor,role:'ADMIN'})).rejects.toMatchObject({status:404});
 expect(asClient(await api.create(input(58))).booking.id).not.toBe(stored.id);
});

it('shares a meeting with multiple managers without widening unrelated manager access',async()=>{
 const result=asClient(await api.create({...input(44),assigneeIds:[managerOne,managerTwo]},actor,'ADMIN'));
 const stored=await db.booking.findUniqueOrThrow({where:{id:result.booking.id},include:{assignees:true}});
 expect(stored.assignedToId).toBe(managerOne);expect(stored.assignees.map(a=>a.staffId).sort()).toEqual([managerOne,managerTwo].sort());
 const day=localDate(stored.startsAt,'Africa/Cairo');
 for(const manager of [managerOne,managerTwo]){
  expect((await api.list({from:day,to:day,search:'Isolated'},{id:manager,role:'MANAGER'})).items.map(r=>r.id)).toContain(stored.id);
  expect((await api.staffDetail(stored.id,{id:manager,role:'MANAGER'})).booking.id).toBe(stored.id);
 }
 await api.staffAction({id:stored.id,version:1,idempotencyKey:randomUUID(),action:'EDIT',reason:'Secondary manager update',notes:'Both managers can work'},managerTwo,'MANAGER');
 await expect(api.staffAction({id:stored.id,version:2,idempotencyKey:randomUUID(),action:'EDIT',reason:'Managers cannot assign',assigneeIds:[managerTwo]},managerTwo,'MANAGER')).rejects.toMatchObject({status:403});
 await api.staffAction({id:stored.id,version:2,idempotencyKey:randomUUID(),action:'EDIT',reason:'Reception updates owners',assigneeIds:[managerTwo]},receptionist,'RECEPTIONIST');
 await expect(api.staffDetail(stored.id,{id:managerOne,role:'MANAGER'})).rejects.toMatchObject({status:404});
 const event=await db.bookingEvent.findFirstOrThrow({where:{bookingId:stored.id,kind:'BOOKING_EDIT'},orderBy:{createdAt:'desc'}});expect(event.details).toMatchObject({assigneeIds:[managerTwo]});
});
it('backfills legacy primary assignments idempotently without changing ownership',async()=>{
 const created=asClient(await api.create({...input(49),assignedToId:managerOne},actor,'ADMIN'));
 await db.bookingAssignee.deleteMany({where:{bookingId:created.booking.id}});
 for(let i=0;i<2;i++)await db.$executeRaw`INSERT INTO "BookingAssignee" ("bookingId","staffId") SELECT "id","assignedToId" FROM "Booking" WHERE "assignedToId" IS NOT NULL ON CONFLICT DO NOTHING`;
 expect(await db.bookingAssignee.count({where:{bookingId:created.booking.id,staffId:managerOne}})).toBe(1);
 expect((await db.booking.findUniqueOrThrow({where:{id:created.booking.id}})).assignedToId).toBe(managerOne);
});
it('keeps public assignment private, enforces multiple owner validation and client slot conflicts',async()=>{
 await expect(api.create({...input(45),assigneeIds:[managerOne]})).rejects.toMatchObject({status:403});
 await expect(api.create({...input(45),assigneeIds:[actor,randomUUID()]},actor,'ADMIN')).rejects.toMatchObject({status:400});
 const data={...input(45),assigneeIds:[managerOne,managerTwo]};const replay=await api.create(data,managerOne,'MANAGER').then(()=>null,error=>error);expect(replay).toMatchObject({status:403});
 const result=asClient(await api.create(input(45)));await api.staffAction({id:result.booking.id,version:1,idempotencyKey:randomUUID(),action:'EDIT',reason:'Private assignment review',assigneeIds:[managerOne,managerTwo]},actor,'ADMIN');const managed=await api.manage({id:result.booking.id,token:result.token});
 expect(JSON.stringify(managed.booking)).not.toContain('assignedTo');expect(managed.booking).not.toHaveProperty('googleId');
 const pair=await Promise.allSettled([api.create({...input(46),assigneeIds:[managerOne]},actor,'ADMIN'),api.create({...input(46),assigneeIds:[managerTwo]},actor,'ADMIN')]);expect(pair.filter(r=>r.status==='fulfilled')).toHaveLength(1);
});

it('serializes on-demand Meet creation across managers and retries outbox failures without touching booking state',async()=>{
 const sync=vi.fn().mockResolvedValue({meetingUrl:'https://meet.google.com/abc-defg-hij',googleEventId:'amctestevent'});
 const meet=new BookingsService(db as unknown as PrismaService,undefined,{enabled:true,sync} as unknown as GoogleCalendarService);
 const created=asClient(await meet.create({...input(47),assigneeIds:[managerOne,managerTwo]},actor,'ADMIN'));
 await Promise.all([meet.meetLink({id:created.booking.id},{id:managerOne,role:'MANAGER'}),meet.meetLink({id:created.booking.id},{id:managerTwo,role:'MANAGER'})]);expect(sync).toHaveBeenCalledTimes(1);
 await expect(meet.meetLink({id:created.booking.id},{id:receptionist,role:'MANAGER'})).rejects.toMatchObject({status:404});
 const status=(await db.booking.findUniqueOrThrow({where:{id:created.booking.id}})).status;
 sync.mockRejectedValue(new Error('Synthetic provider timeout'));
 const result=await meet.drainMeet();expect(result.failed).toBeGreaterThan(0);
 expect((await db.booking.findUniqueOrThrow({where:{id:created.booking.id}})).status).toBe(status);
 expect(await db.bookingOutbox.count({where:{bookingId:created.booking.id,kind:{endsWith:':MEET'},status:'PENDING',attempts:1}})).toBe(1);
 // Retain the verified retry but keep it from becoming due during the independent manual-link check.
 await db.bookingOutbox.updateMany({where:{bookingId:created.booking.id,kind:{endsWith:':MEET'},status:'PENDING'},data:{nextRetryAt:new Date(Date.now()+3600000)}});
 const demo=asClient(await meet.create({...input(48),assigneeIds:[managerOne]},actor,'ADMIN'));await db.booking.update({where:{id:demo.booking.id},data:{isDemo:true}});
 await expect(meet.meetLink({id:demo.booking.id},{id:managerOne,role:'MANAGER'})).rejects.toMatchObject({status:400});
 const manual=asClient(await meet.create({...input(50),assigneeIds:[managerOne]},actor,'ADMIN'));await db.booking.update({where:{id:manual.booking.id},data:{meetingUrl:'https://zoom.us/j/123456789'}});sync.mockClear();await meet.drainMeet();expect(sync).not.toHaveBeenCalled();expect((await db.booking.findUniqueOrThrow({where:{id:manual.booking.id}})).meetingUrl).toBe('https://zoom.us/j/123456789');
});

it('serializes concurrent replacement commands and queues manager mail without a general inbox',async()=>{
 const sync=vi.fn().mockResolvedValue({meetingUrl:'https://meet.google.com/new-link-abc',googleEventId:'test-event'});
 const provider={enabled:true,controlsEnabled:true,sync,endConference:vi.fn().mockResolvedValue(undefined)};
 const meet=new BookingsService(db as unknown as PrismaService,undefined,provider as unknown as GoogleCalendarService);
 const created=asClient(await meet.create({...input(52),assigneeIds:[managerOne,managerTwo]},actor,'ADMIN'));
 await db.booking.update({where:{id:created.booking.id},data:{googleEventId:'test-event',meetingUrl:'https://meet.google.com/old-link-abc'}});
 const command={id:created.booking.id,version:1,idempotencyKey:randomUUID(),action:'REGENERATE'};
 const responses=await Promise.all([meet.meetLink(command,{id:managerOne,role:'MANAGER'}),meet.meetLink(command,{id:managerOne,role:'MANAGER'})]);
 expect(sync).toHaveBeenCalledTimes(1);expect(responses[0]).toEqual(responses[1]);
 const saved=await db.booking.findUniqueOrThrow({where:{id:created.booking.id}});expect(saved.version).toBe(2);
 expect(await db.bookingOutbox.count({where:{bookingId:saved.id,kind:'BOOKING_UPDATED:OWNER:EMAIL'}})).toBe(1);
 await expect(meet.meetLink({...command,idempotencyKey:randomUUID()},{id:managerTwo,role:'MANAGER'})).rejects.toMatchObject({status:409});
 const end={id:saved.id,version:2,idempotencyKey:randomUUID(),action:'END'};
 await meet.meetLink(end,{id:managerTwo,role:'MANAGER'});await meet.meetLink(end,{id:managerTwo,role:'MANAGER'});
 expect(provider.endConference).toHaveBeenCalledTimes(1);expect((await db.booking.findUniqueOrThrow({where:{id:saved.id}})).status).toBe(saved.status);
});

it('serializes internal contact intake and retains an archive audit without creating a booking',async()=>{
 const controller=new InquiriesController(db as unknown as PrismaService),req={staff:{id:actor,role:'ADMIN'}} as StaffRequest;
 const payload={idempotencyKey:randomUUID(),name:'Isolated internal contact',email,message:'Synthetic staff intake for transaction validation.',locale:'en'};
 const before=await db.booking.count({where:{email}});
 const [left,right]=await Promise.all([controller.create(req,payload),controller.create(req,payload)]);expect(left.id).toBe(right.id);
 const stored=await db.contactInquiry.findUniqueOrThrow({where:{id:left.id}});expect(stored.source).toBe('STAFF');expect(stored.consentAt).toBeNull();expect(stored.visitorEmailStatus).toBe('SKIPPED');
 expect(await db.staffAuditEvent.count({where:{subjectId:left.id,action:'CONTACT_INQUIRY_CREATED'}})).toBe(1);
 await controller.remove(req,{id:left.id,reason:'Completed synthetic test'});
 expect((await db.contactInquiry.findUniqueOrThrow({where:{id:left.id}})).deletedAt).not.toBeNull();
 expect(await db.booking.count({where:{email}})).toBe(before);
 await db.contactInquiry.delete({where:{id:left.id}});
});

it('archives a manager and revokes sessions while preserving meeting ownership and blocking further generation',async()=>{
 const created=asClient(await api.create({...input(51),assigneeIds:[managerOne]},actor,'ADMIN'));
 await db.staffSession.create({data:{userId:managerOne,tokenHash:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+60000)}});
 const accounts=new StaffAccountsService(db as unknown as PrismaService);
 await accounts.remove(actor,{id:managerOne,reason:'Synthetic archive verification'});
 expect((await db.booking.findUniqueOrThrow({where:{id:created.booking.id}})).assignedToId).toBe(managerOne);
 expect(await db.staffSession.count({where:{userId:managerOne}})).toBe(0);expect((await db.staffUser.findUniqueOrThrow({where:{id:managerOne}})).deletedAt).not.toBeNull();
 const sync=vi.fn(),meet=new BookingsService(db as unknown as PrismaService,undefined,{enabled:true,sync} as unknown as GoogleCalendarService);
 await expect(meet.meetLink({id:created.booking.id},{id:actor,role:'ADMIN'})).rejects.toMatchObject({status:400});expect(sync).not.toHaveBeenCalled();
 await expect(accounts.update(actor,{id:managerOne,active:true})).rejects.toMatchObject({status:404});
});
