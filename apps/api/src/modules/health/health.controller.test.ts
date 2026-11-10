import {expect,it,vi} from 'vitest';
import {HealthController} from './health.controller.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
it('readiness succeeds when the current schema is reachable',async()=>{
 const query=vi.fn().mockResolvedValue([]);const controller=new HealthController({$queryRaw:query} as unknown as PrismaService);
 expect(await controller.ready()).toEqual({status:'ok',database:'up'});expect(query).toHaveBeenCalledOnce();
});
it('readiness fails closed without exposing database error details',async()=>{
 const query=vi.fn().mockRejectedValue(new Error('sensitive provider connection details'));
 const controller=new HealthController({$queryRaw:query} as unknown as PrismaService);
 try{await controller.ready();throw new Error('Expected unavailable');}catch(error){
  expect(error).toMatchObject({status:503});expect((error as {getResponse():unknown}).getResponse()).toEqual({status:'unavailable',database:'down'});
 }
});
