import {BadRequestException,ForbiddenException} from '@nestjs/common';
import type {StaffRole} from '@amc/shared';
import type {Prisma} from '../../generated/prisma/client.js';
export const defaultManagerEmail='mo.khaledmorad@almorad-amc.com';
export async function resolveBookingAssignee(find:(where:Prisma.StaffUserWhereInput)=>Promise<{id:string}|null>,requested:string|undefined,actor?:{id:string;role?:StaffRole}){
 if(requested&&!actor||actor?.role==='MANAGER'&&requested&&requested!==actor.id)throw new ForbiddenException();
 const id=actor?.role==='MANAGER'?actor.id:requested;
 const result=await find({active:true,...(id?{id,role:{in:['MANAGER','ADMIN']}}:{email:defaultManagerEmail,role:'MANAGER'})});
 if(id&&!result)throw new BadRequestException('Choose an active manager');
 return result?.id;
}

export function normalizeAssigneeIds(data:{assigneeIds?:string[];assignedToId?:string|null}){
 return data.assigneeIds??(data.assignedToId?[data.assignedToId]:data.assignedToId===null?[]:undefined);
}
export async function resolveBookingAssignees(find:(where:Prisma.StaffUserWhereInput)=>Promise<{id:string}|null>,requested:string[]|undefined,actor?:{id:string;role?:StaffRole}):Promise<string[]>{
 if(!actor&&requested?.length||actor?.role==='MANAGER'&&requested?.some(id=>id!==actor.id))throw new ForbiddenException();
 const ids=actor?.role==='MANAGER'?[actor.id]:actor?requested:undefined;
 if(ids!==undefined){for(const id of ids){if(!await find({id,active:true,role:{in:['MANAGER','ADMIN']}}))throw new BadRequestException('Choose active managers');}return ids;}
 const fallback=await find({email:process.env.DEFAULT_BOOKING_MANAGER_EMAIL||defaultManagerEmail,active:true,role:'MANAGER'});return fallback?[fallback.id]:[];
}
