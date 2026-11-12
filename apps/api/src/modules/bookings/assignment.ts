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
