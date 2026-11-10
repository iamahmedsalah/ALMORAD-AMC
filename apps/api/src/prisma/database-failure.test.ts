import {expect,it} from 'vitest';
import {databaseFailure} from './database-failure.js';
it('identifies upstream provider failures without returning connection details',()=>{
  const result=databaseFailure({code:'P2010',meta:{code:'XX000',message:'Failed to connect to upstream database postgres://private-user:private-password@host/database'}});
  expect(result).toEqual({code:'P2010',sqlState:'XX000',category:'provider_upstream_unreachable'});
  expect(JSON.stringify(result)).not.toContain('private');
});
it('distinguishes schema and authentication failures',()=>{
  expect(databaseFailure({code:'P2010',meta:{driverAdapterError:{cause:{originalCode:'42P01',originalMessage:'private table'}}}}).category).toBe('schema_missing');
  expect(databaseFailure({code:'P1000'}).category).toBe('authentication');
});
it('does not return arbitrary codes or error messages',()=>{
  expect(databaseFailure({code:'private-password',message:'private email and token',meta:{code:'secret-value'}})).toEqual({code:undefined,sqlState:undefined,category:'unclassified'});
  expect(databaseFailure(null).category).toBe('unclassified');
});
