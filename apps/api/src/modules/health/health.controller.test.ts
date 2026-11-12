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
  expect(error).toMatchObject({status:503});expect((error as {getResponse():unknown}).getResponse()).toEqual({status:'unavailable',database:'down',category:'unclassified'});
 }
});
it('readiness returns only a bounded category for a missing schema',async()=>{
 const query=vi.fn().mockRejectedValue({code:'P2021',message:'private table and database URL'});
 const controller=new HealthController({$queryRaw:query} as unknown as PrismaService);
 try{await controller.ready();throw new Error('Expected unavailable');}catch(error){
  expect(error).toMatchObject({status:503});
  const response=(error as {getResponse():unknown}).getResponse();
  expect(response).toEqual({status:'unavailable',database:'down',category:'schema_missing'});
  expect(JSON.stringify(response)).not.toContain('private table');
 }
});
it.each(['b."meetingUrl"','ci."phone"'])('readiness rejects a database missing %s before promotion',async(column)=>{
 const query=vi.fn().mockImplementation(async(parts:TemplateStringsArray)=>{
  if(parts.join('').includes(column))throw {code:'P2010',meta:{code:'42703',message:'private column details'}};
  return [];
 });
 const controller=new HealthController({$queryRaw:query} as unknown as PrismaService);
 await expect(controller.ready()).rejects.toMatchObject({
  status:503,response:{status:'unavailable',database:'down',category:'schema_missing'}
 });
});
