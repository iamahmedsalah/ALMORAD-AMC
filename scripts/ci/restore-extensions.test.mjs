import {test} from 'node:test';
import assert from 'node:assert/strict';
import {archiveExtensions,missingExtensions} from './restore-extensions.mjs';
test('restore preflight reports missing extensions without exposing archive objects',()=>{
 const toc='; private archive header\n2; 3079 16385 EXTENSION - btree_gist \n3; 0 0 COMMENT - EXTENSION btree_gist \n4; 1259 42 TABLE public private_client_table owner\n5; 3079 22 EXTENSION - provider_extension \n';
 assert.deepEqual(archiveExtensions(toc),['btree_gist','provider_extension']);
 assert.deepEqual(missingExtensions(archiveExtensions(toc),'plpgsql\nbtree_gist\n'),['provider_extension']);
});
test('restore preflight handles CRLF and duplicate extensions',()=>{
 assert.deepEqual(archiveExtensions('2; 3079 1 EXTENSION - btree_gist\r\n3; 3079 2 EXTENSION - btree_gist\r\n'),['btree_gist']);
 assert.deepEqual(missingExtensions(['btree_gist'],'btree_gist\r\n'),[]);
 assert.deepEqual(archiveExtensions('4; 3079 3 EXTENSION - uuid-ossp'),['uuid-ossp']);
});
test('restore preflight rejects identifiers that could disclose arbitrary text',()=>{
 assert.throws(()=>archiveExtensions('2; 3079 1 EXTENSION - sensitive@example.invalid'),/Unsupported extension identifier/);
});
