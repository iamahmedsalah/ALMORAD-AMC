import {Inject,Injectable} from '@nestjs/common';
import type {ThrottlerStorage} from '@nestjs/throttler';
import {PrismaService} from '../../prisma/prisma.service.js';
type Record={totalHits:number;timeToExpire:number;isBlocked:boolean;timeToBlockExpire:number};
@Injectable()
export class PostgresThrottleStorage implements ThrottlerStorage {
 constructor(@Inject(PrismaService) private readonly prisma:PrismaService){}
 async increment(key:string,ttl:number,limit:number,blockDuration:number):Promise<Record>{
  const rows=await this.prisma.$queryRaw<Record[]>`
   INSERT INTO "RequestThrottle" ("key","totalHits","expiresAt","blockedUntil")
   VALUES (${key},1,CURRENT_TIMESTAMP+(${ttl}*interval '1 millisecond'),NULL)
   ON CONFLICT ("key") DO UPDATE SET
    "totalHits"=CASE WHEN ("RequestThrottle"."blockedUntil" IS NOT NULL AND "RequestThrottle"."blockedUntil"<=CURRENT_TIMESTAMP) OR ("RequestThrottle"."expiresAt"<=CURRENT_TIMESTAMP AND "RequestThrottle"."blockedUntil" IS NULL) THEN 1 ELSE "RequestThrottle"."totalHits"+1 END,
    "expiresAt"=CASE WHEN ("RequestThrottle"."blockedUntil" IS NOT NULL AND "RequestThrottle"."blockedUntil"<=CURRENT_TIMESTAMP) OR ("RequestThrottle"."expiresAt"<=CURRENT_TIMESTAMP AND "RequestThrottle"."blockedUntil" IS NULL) THEN CURRENT_TIMESTAMP+(${ttl}*interval '1 millisecond') ELSE "RequestThrottle"."expiresAt" END,
    "blockedUntil"=CASE WHEN "RequestThrottle"."blockedUntil">CURRENT_TIMESTAMP THEN "RequestThrottle"."blockedUntil" WHEN "RequestThrottle"."expiresAt"<=CURRENT_TIMESTAMP OR "RequestThrottle"."blockedUntil"<=CURRENT_TIMESTAMP THEN NULL WHEN "RequestThrottle"."totalHits"+1>${limit} THEN CURRENT_TIMESTAMP+(${blockDuration}*interval '1 millisecond') ELSE NULL END
   RETURNING "totalHits",GREATEST(CEIL(EXTRACT(EPOCH FROM "expiresAt"-CURRENT_TIMESTAMP)),0)::int AS "timeToExpire",COALESCE("blockedUntil">CURRENT_TIMESTAMP,false) AS "isBlocked",GREATEST(COALESCE(CEIL(EXTRACT(EPOCH FROM "blockedUntil"-CURRENT_TIMESTAMP)),0),0)::int AS "timeToBlockExpire"
  `;
  return rows[0]!;
 }
}
