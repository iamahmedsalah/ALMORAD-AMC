import {z} from 'zod';
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const phoneRegex = /^\+?[0-9\s\-()]{7,25}$/;
export const bookingStatuses=['PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW'] as const;
export const changeStatuses=['OPEN','UNDER_REVIEW','ALTERNATIVE_PROPOSED','APPROVED','DECLINED','WITHDRAWN','EXPIRED'] as const;
export const activeChanges=['OPEN','UNDER_REVIEW','ALTERNATIVE_PROPOSED'] as const;
export const bookingDurations=[30,60,90,120,150,180,210,240,270,300] as const;
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const settingsInput=z.object({version:z.number().int().min(0),enabled:z.boolean(),timezone:z.string().max(80).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}}),durationMinutes:z.number().int().min(5).max(240),stepMinutes:z.number().int().min(5).max(120),bufferBeforeMinutes:z.number().int().min(0).max(240),bufferAfterMinutes:z.number().int().min(0).max(240),leadMinutes:z.number().int().min(0).max(10080),lookaheadDays:z.number().int().min(1).max(90),changeCutoffMinutes:z.number().int().min(0).max(10080),onlineEnabled:z.boolean(),inPersonEnabled:z.boolean(),officeAddressEn:z.string().trim().max(500).nullable(),officeAddressAr:z.string().trim().max(500).nullable(),directionsUrl:z.url().max(1000).nullable(),weeklyHours:z.array(z.object({day:z.number().int().min(1).max(7),open:time,close:time}).strict().refine(v=>v.open<v.close)).max(21),blackoutDates:z.array(date).max(366),serviceSlugs:z.array(z.string().max(80)).min(1).max(11)}).strict().refine(v=>!v.enabled||(v.onlineEnabled||v.inPersonEnabled)).refine(v=>!v.inPersonEnabled||Boolean(v.officeAddressEn&&v.officeAddressAr));
export type ScheduleInput=z.infer<typeof settingsInput>;
export type Schedule=ScheduleInput&{isDemo:boolean};
export const createBookingInput=z.object({
  idempotencyKey:z.uuid(),
  durationMinutes:z.number().int().refine(value=>bookingDurations.some(duration=>duration===value)).optional(),
  serviceSlug:z.string().max(80),
  meetingType:z.enum(['ONLINE','IN_PERSON']),
  startsAt:z.iso.datetime(),
  locale:z.enum(['en','ar']),
  clientName:z.string().trim().min(2, {message: 'Name must be at least 2 characters'}).max(120),
  email:z.string().trim().toLowerCase().regex(emailRegex, {message: 'Please provide a valid email address'}).max(254),
  phone:z.string().trim().regex(phoneRegex, {message: 'Please provide a valid phone number'}).max(40).optional().or(z.literal('')),
  company:z.string().trim().max(120).optional(),
  notes:z.string().trim().max(1500).optional(),
  consent:z.literal(true, {message: 'Consent is required'})
}).strict();
export type CreateBooking=z.infer<typeof createBookingInput>;
export const manageInput=z.object({id:z.uuid(),token:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const clientActionInput=manageInput.extend({idempotencyKey:z.uuid(),action:z.enum(['RESCHEDULE','CANCEL','ACCEPT_ALTERNATIVE','WITHDRAW']),reason:z.string().trim().min(3).max(1000),startsAt:z.iso.datetime().optional()}).strict();
export const staffActionInput=z.object({id:z.uuid(),version:z.number().int().min(1),idempotencyKey:z.uuid(),action:z.enum(['CONFIRM','CANCEL','COMPLETE','NO_SHOW','RESCHEDULE','EDIT','REVIEW','APPROVE','DECLINE','PROPOSE']),reason:z.string().trim().min(3).max(1000),startsAt:z.iso.datetime().optional(),clientName:z.string().trim().min(2).max(120).optional(),email:z.email().max(254).optional(),phone:z.string().trim().max(40).optional(),company:z.string().trim().max(120).optional(),notes:z.string().trim().max(1500).optional()}).strict();
export type BookingRow={id:string;reference:string;serviceSlug:string;meetingType:'ONLINE'|'IN_PERSON';status:typeof bookingStatuses[number];clientName:string;email:string;phone:string|null;company:string|null;notes:string|null;locale:string;timezone:string;startsAt:string;endsAt:string;createdAt:string;version:number;isDemo:boolean;changes:ChangeRow[]};
export type ChangeRow={id:string;kind:'RESCHEDULE'|'CANCEL';status:typeof changeStatuses[number];requestedStartAt:string|null;proposedStartAt:string|null;reason:string;staffResponse:string|null;createdAt:string;resolvedAt:string|null};
export type BookingDetail=BookingRow&{events:{id:string;kind:string;details:Record<string,unknown>;createdAt:string}[];notifications:{status:string;kind:string;createdAt:string}[]};
export type BookingList={items:BookingRow[];total:number;page:number;timezone:string;isDemo:boolean};
export type SlotResponse={slots:{startsAt:string;endsAt:string}[];timezone:string;isDemo:boolean};
export type Analytics={timezone:string;isDemo:boolean;total:number;today:number;upcoming:number;pendingChanges:number;cancelled:number;completed:number;noShow:number;cancellationRate:number|null;noShowRate:number|null;averageResolutionHours:number|null;byService:{key:string;count:number}[];byType:{key:string;count:number}[];byStatus:{key:string;count:number}[];trend:{date:string;count:number}[]};
