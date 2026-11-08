import 'reflect-metadata';
import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import type {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {getStorageToken,ThrottlerStorageService} from '@nestjs/throttler';
import {AppModule} from './app.module.js';
import {PrismaService} from './prisma/prisma.service.js';
describe('complete API module startup and global guards', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({imports: [AppModule]})
      .overrideProvider(getStorageToken()).useClass(ThrottlerStorageService)
      .overrideProvider(PrismaService).useValue({$queryRaw: vi.fn().mockResolvedValue([{ok: 1}])}).compile();
    app = testingModule.createNestApplication();
    await app.init();
  });
  afterAll(async () => {await app?.close();});
  it('starts all real guards, preserves private-route denial and enforces the request limit', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200, {status: 'ok', database: 'up'});
    for (let i = 0; i < 60; i++) await request(app.getHttpServer()).get('/staff/me').expect(401);
    const response = await request(app.getHttpServer()).get('/staff/me').expect(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });
});
