import {test} from 'node:test';import assert from 'node:assert/strict';import {releaseOrigin,releaseHeaders} from './release-origin.mjs';
test('accepts Vercel candidates and the exact approved canonical domain',()=>{
 assert.equal(releaseOrigin('https://candidate.vercel.app').vercel,true);
 assert.equal(releaseOrigin('https://almorad-amc.com').vercel,false);
 for(const url of ['http://almorad-amc.com','https://www.almorad-amc.com','https://almorad-amc.com.evil.test','https://evil.test','https://user:pass@almorad-amc.com','https://almorad-amc.com:444','https://almorad-amc.com/path','https://almorad-amc.com?token=x','https://almorad-amc.com#x'])assert.throws(()=>releaseOrigin(url));
});
test('never sends candidate protection credentials to the public custom domain',()=>{
 assert.deepEqual(releaseHeaders(false,'private-fixture'),{});
 assert.deepEqual(releaseHeaders(true,'private-fixture'),{'x-vercel-protection-bypass':'private-fixture'});
});
