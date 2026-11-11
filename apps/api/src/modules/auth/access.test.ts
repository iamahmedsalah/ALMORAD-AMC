import 'reflect-metadata';
import {createHash} from 'node:crypto';
import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {Test} from '@nestjs/testing';
import type {INestApplication} from '@nestjs/common';
import request from 'supertest';
import {PrismaService} from '../../prisma/prisma.service.js';
import {SessionGuard} from './session.guard.js';
import {PermissionGuard} from './permission.guard.js';
import {StaffController} from './staff.controller.js';
import {InquiriesController} from '../contact/inquiries.controller.js';
describe('staff HTTP authentication and authorization', () => {
  let app: INestApplication;
  const lookup = vi.fn(); const token = 'a'.repeat(64);
  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({controllers:[StaffController,InquiriesController], providers:[SessionGuard,PermissionGuard,{provide:PrismaService,useValue:{staffSession:{findUnique:lookup},contactInquiry:{findMany:vi.fn().mockResolvedValue([{id:'test-inquiry',phone:'+20200000000'}]),count:vi.fn().mockResolvedValue(1)},$transaction:async(queries:Promise<unknown>[])=>Promise.all(queries)}}]}).compile();
    app = testingModule.createNestApplication(); await app.init();
  });
  afterAll(async () => {await app?.close();});
  it('rejects missing and malformed credentials', async () => {
    await request(app.getHttpServer()).get('/staff/me').expect(401);
    await request(app.getHttpServer()).get('/staff/inquiries').expect(401);
    await request(app.getHttpServer()).get('/staff/me').set('Authorization','Bearer fake').expect(401);
    expect(lookup).not.toHaveBeenCalled();
  });
  it('rejects unknown, expired and disabled sessions', async () => {
    for (const session of [null,{expiresAt:new Date(0),user:{active:true,role:'CEO'}},{expiresAt:new Date(Date.now()+60000),user:{active:false,role:'CEO'}}]) {
      lookup.mockResolvedValueOnce(session);
      await request(app.getHttpServer()).get('/staff/me').set('Authorization',`Bearer ${token}`).expect(401);
    }
  });
  it('allows operational identity but denies settings to receptionist', async () => {
    lookup.mockResolvedValue({expiresAt:new Date(Date.now()+60000),user:{id:'staff-test',active:true,role:'RECEPTIONIST'}});
    await request(app.getHttpServer()).get('/staff/me').set('Authorization',`Bearer ${token}`).expect(200,{id:'staff-test',role:'RECEPTIONIST'});
    expect(lookup).toHaveBeenLastCalledWith({where:{tokenHash:createHash('sha256').update(token).digest('hex')},include:{user:true}});
    await request(app.getHttpServer()).get('/staff/access/settings').set('Authorization',`Bearer ${token}`).expect(403);
  });
  it('allows manager settings permission', async () => {
    lookup.mockResolvedValue({expiresAt:new Date(Date.now()+60000),user:{id:'manager-test',active:true,role:'MANAGER'}});
    await request(app.getHttpServer()).get('/staff/access/settings').set('Authorization',`Bearer ${token}`).expect(200,{allowed:true});
  });
  it('allows receptionist inquiry access with phone details and rejects invalid pagination',async()=>{
    lookup.mockResolvedValue({expiresAt:new Date(Date.now()+60000),user:{id:'staff-test',active:true,role:'RECEPTIONIST'}});
    const response=await request(app.getHttpServer()).get('/staff/inquiries?search=Test').set('Authorization',`Bearer ${token}`).expect(200);
    expect(response.body.items[0].phone).toBe('+20200000000');expect(response.headers['cache-control']).toContain('no-store');
    await request(app.getHttpServer()).get('/staff/inquiries?page=-1').set('Authorization',`Bearer ${token}`).expect(400);
  });
});
