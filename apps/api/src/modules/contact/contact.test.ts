import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {Test} from '@nestjs/testing';
import {type INestApplication} from '@nestjs/common';
import {getStorageToken, ThrottlerStorageService} from '@nestjs/throttler';
import request from 'supertest';
import {AppModule} from '../../app.module.js';
import {PrismaService} from '../../prisma/prisma.service.js';
import {ContactService} from './contact.service.js';

const payload = () => ({locale:'en', name:'Contact fixture', email:'CONTACT@example.invalid', message:'Synthetic inquiry for testing only.', consent:true, website:'', idempotencyKey:randomUUID()});
function database() {
  const rows = new Map<string, {requestHash:string}>();
  return {contactInquiry: {
    findUnique: vi.fn(async ({where}: {where:{idempotencyKey:string}}) => rows.get(where.idempotencyKey) || null),
    create: vi.fn(async ({data}: {data:{idempotencyKey:string; requestHash:string}}) => {
      if (rows.has(data.idempotencyKey)) throw {code:'P2002'};
      rows.set(data.idempotencyKey, data); return data;
    })
  }};
}
describe('contact storage contract', () => {
  it('persists a supplied phone and rejects a malformed number before writing',async()=>{
    const db=database(),service=new ContactService(db as unknown as PrismaService);
    await service.submit({...payload(),phone:'+1 202 555 0100'});
    expect(db.contactInquiry.create.mock.calls[0]?.[0].data).toMatchObject({phone:'+1 202 555 0100'});
    await expect(service.submit({...payload(),phone:'not-a-number'})).rejects.toMatchObject({status:400});
    expect(db.contactInquiry.create).toHaveBeenCalledTimes(1);
  });
  it('normalizes data, stores consent and acknowledges retries without duplicate writes', async () => {
    const db = database(); const service = new ContactService(db as unknown as PrismaService); const body = payload();
    await expect(service.submit(body)).resolves.toEqual({accepted:true});
    await expect(service.submit(body)).resolves.toEqual({accepted:true});
    expect(db.contactInquiry.create).toHaveBeenCalledTimes(1);
    expect(db.contactInquiry.create.mock.calls[0]?.[0].data).toMatchObject({email:'contact@example.invalid'});
    await expect(service.submit({...body,message:'Different message with same key'})).rejects.toMatchObject({status:409});
  });
  it('handles a concurrent duplicate using the database unique key', async () => {
    const db = database(); const service = new ContactService(db as unknown as PrismaService); const body = payload();
    await expect(Promise.all([service.submit(body), service.submit(body)])).resolves.toEqual([{accepted:true},{accepted:true}]);
  });
  it('rejects invalid/extra input, discards honeypots and propagates storage failures', async () => {
    const db = database(); const service = new ContactService(db as unknown as PrismaService);
    for (const body of [{...payload(),consent:false}, {...payload(),message:'short'}, {...payload(),email:'invalid'}, {...payload(),role:'CEO'}]) await expect(service.submit(body)).rejects.toMatchObject({status:400});
    await expect(service.submit({...payload(),website:'https://spam.invalid'})).resolves.toEqual({accepted:true});
    expect(db.contactInquiry.create).not.toHaveBeenCalled();
    db.contactInquiry.create.mockRejectedValueOnce(new Error('Synthetic database unavailable'));
    await expect(service.submit(payload())).rejects.toThrow('Synthetic database unavailable');
  });
});
describe('contact HTTP boundary (mock persistence, real guards)', () => {
  let app:INestApplication;
  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({imports:[AppModule]})
      .overrideProvider(getStorageToken()).useClass(ThrottlerStorageService)
      .overrideProvider(PrismaService).useValue(database()).compile();
    app = testingModule.createNestApplication(); await app.init();
  });
  afterAll(async () => { await app?.close(); });
  it('rejects cross-origin requests and validates, stores, then throttles submissions', async () => {
    const http = app.getHttpServer();
    await request(http).post('/contact/submit').set('Origin','https://wrong.invalid').send(payload()).expect(403);
    await request(http).post('/contact/submit').set('Origin','http://localhost:3000').send({...payload(),consent:false}).expect(400);
    await request(http).post('/contact/submit').set('Origin','http://localhost:3000').send(payload()).expect(201,{accepted:true});
    await request(http).post('/contact/submit').set('Origin','http://localhost:3000').send(payload()).expect(429);
  });
});
