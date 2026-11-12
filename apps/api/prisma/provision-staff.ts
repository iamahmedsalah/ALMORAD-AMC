import {stdin,stdout} from 'node:process';
import {Writable} from 'node:stream';
import {createInterface} from 'node:readline/promises';
import {z} from 'zod';
import {likelyStaffEmailTypo} from '@amc/shared';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../src/generated/prisma/client.js';
import {hashPassword} from '../src/modules/auth/security.js';
const args=process.argv.slice(2);const value=(name:string)=>args[args.indexOf(name)+1];
const parsed=z.object({email:z.string().trim().toLowerCase().pipe(z.email().max(254)),role:z.enum(['ADMIN','MANAGER','RECEPTIONIST'])}).safeParse({email:args.includes('--email')?value('--email'):undefined,role:args.includes('--role')?value('--role'):undefined});
if(!parsed.success)throw new Error('Provide --email and --role ADMIN|MANAGER|RECEPTIONIST');
if(process.env.NODE_ENV==='production'&&!args.includes('--allow-production'))throw new Error('Production provisioning requires explicit --allow-production');
if(!stdin.isTTY)throw new Error('Provisioning requires an interactive terminal; no passwords in command arguments');
let muted=false;const output=new Writable({write(chunk,_encoding,callback){if(!muted)stdout.write(chunk);callback();}});
const prompt=createInterface({input:stdin,output,terminal:true});
async function hidden(question:string){muted=false;const result=prompt.question(question);muted=true;const answer=await result;muted=false;stdout.write('\n');return answer;}
const password=await hidden('Password (12–128 characters): ');const confirmation=await hidden('Confirm password: ');prompt.close();
if(password!==confirmation||password.length<12||password.length>128)throw new Error('Passwords must match and contain 12–128 characters');
const client=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try{
 const existing=await client.staffUser.findUnique({where:{email:parsed.data.email}});
 if(!existing){const candidates=await client.staffUser.findMany({select:{email:true}});if(candidates.some(account=>likelyStaffEmailTypo(account.email,parsed.data.email))&&!args.includes('--confirm-similar-email'))throw new Error('Similarly spelled staff email exists; review the identity before using --confirm-similar-email');}
 if(existing&&!args.includes('--reset-password'))throw new Error('Account exists; reviewed recovery requires --reset-password (revokes all sessions)');
 const passwordHash=await hashPassword(password);
 await client.$transaction(async tx=>{await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1201200)`;if(!existing){const candidates=await tx.staffUser.findMany({select:{email:true}});if(candidates.some(account=>likelyStaffEmailTypo(account.email,parsed.data.email))&&!args.includes('--confirm-similar-email'))throw new Error('Similar staff email requires explicit review');}if(existing){await tx.$queryRaw`SELECT "id" FROM "StaffUser" WHERE "id"=${existing.id}::uuid FOR UPDATE`;const current=await tx.staffUser.findUniqueOrThrow({where:{id:existing.id}});if(current.active&&current.role==='ADMIN'&&parsed.data.role!=='ADMIN'&&await tx.staffUser.count({where:{role:'ADMIN',active:true}})<=1)throw new Error('Keep at least one active admin');}const staff=existing?await tx.staffUser.update({where:{id:existing.id},data:{passwordHash,role:parsed.data.role,active:true}}):await tx.staffUser.create({data:{...parsed.data,passwordHash}});await tx.staffSession.deleteMany({where:{userId:staff.id}});await tx.staffAuditEvent.create({data:{subjectId:staff.id,action:'STAFF_PROVISIONED'}});});
 console.log('Staff access provisioned. No password or session token was logged.');
}finally{await client.$disconnect();}
