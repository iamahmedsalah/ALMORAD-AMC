import {Injectable,type OnModuleDestroy,type OnModuleInit} from '@nestjs/common';
import {PrismaPg} from '@prisma/adapter-pg';
import {attachDatabasePool} from '@vercel/functions';
import {Pool} from 'pg';
import {PrismaClient} from '../generated/prisma/client.js';
import {parseEnvironment} from '../config/environment.js';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit,OnModuleDestroy {
 private readonly pool:Pool;
 constructor(){
  const pool=new Pool({connectionString:parseEnvironment(process.env).DATABASE_URL,max:5,idleTimeoutMillis:5000,connectionTimeoutMillis:10000});
  // Nest creates one service per warm application; requests reuse this bounded pool.
  if(process.env.VERCEL)attachDatabasePool(pool);
  super({adapter:new PrismaPg(pool)});this.pool=pool;
 }
 async onModuleInit(){await this.$connect();}
 async onModuleDestroy(){await this.$disconnect();await this.pool.end();}
}
