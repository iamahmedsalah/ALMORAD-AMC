import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  discoverIndexNowKey,
  KEY_PATTERN,
  parseSitemapUrls,
  submitIndexNow,
} from './indexnow-submit.mjs';

test('discovers and validates the committed IndexNow verification file in apps/web/public', () => {
  const key = discoverIndexNowKey();
  assert.match(key, KEY_PATTERN);
});

test('rejects missing, duplicate, or mismatched IndexNow key files', () => {
  const emptyDir = mkdtempSync(join(tmpdir(), 'amc-indexnow-empty-'));
  const dupDir = mkdtempSync(join(tmpdir(), 'amc-indexnow-dup-'));
  const mismatchDir = mkdtempSync(join(tmpdir(), 'amc-indexnow-mismatch-'));

  try {
    assert.throws(() => discoverIndexNowKey(emptyDir, {}), /key file missing/i);

    const k1 = 'a'.repeat(32);
    const k2 = 'b'.repeat(32);
    writeFileSync(join(dupDir, `${k1}.txt`), k1, 'utf8');
    writeFileSync(join(dupDir, `${k2}.txt`), k2, 'utf8');
    assert.throws(() => discoverIndexNowKey(dupDir, {}), /Multiple IndexNow key files/i);

    writeFileSync(join(mismatchDir, `${k1}.txt`), `${k1}\n`, 'utf8');
    assert.throws(() => discoverIndexNowKey(mismatchDir, {}), /must match its filename/i);
  } finally {
    rmSync(emptyDir, { recursive: true, force: true });
    rmSync(dupDir, { recursive: true, force: true });
    rmSync(mismatchDir, { recursive: true, force: true });
  }
});

test('parses canonical sitemap URLs and rejects foreign hosts', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://almorad-amc.com/en</loc></url>
    <url><loc>https://almorad-amc.com/ar</loc></url>
    <url><loc>https://almorad-amc.com/en</loc></url>
    <url><loc>https://almorad-amc.com/en/services/branding</loc></url>
  </urlset>`;

  assert.deepEqual(parseSitemapUrls(xml, 'https://almorad-amc.com'), [
    'https://almorad-amc.com/en',
    'https://almorad-amc.com/ar',
    'https://almorad-amc.com/en/services/branding',
  ]);

  const foreignXml = `<urlset><url><loc>https://evil.example/en</loc></url></urlset>`;
  assert.throws(
    () => parseSitemapUrls(foreignXml, 'https://almorad-amc.com'),
    /does not match expected origin/i
  );

  assert.throws(
    () => parseSitemapUrls('<urlset></urlset>', 'https://almorad-amc.com'),
    /No <loc> URLs found/i
  );
});

test('verifies live keyLocation and submits official IndexNow JSON payload accepting 200 and 202', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'amc-indexnow-submit-'));
  const fixtureKey = 'a'.repeat(32);
  writeFileSync(join(dir, `${fixtureKey}.txt`), fixtureKey, 'utf8');

  const sitemapXml = `<urlset>
    <url><loc>https://almorad-amc.com/en</loc></url>
    <url><loc>https://almorad-amc.com/ar</loc></url>
  </urlset>`;

  try {
    for (const acceptStatus of [200, 202]) {
      let submittedPayload = null;
      let submittedContentType = '';

      const stubFetch = async (url, options = {}) => {
        const target = String(url);
        if (target === 'https://almorad-amc.com/sitemap.xml') {
          return new Response(sitemapXml, { status: 200 });
        }
        if (target === `https://almorad-amc.com/${fixtureKey}.txt`) {
          return new Response(fixtureKey, { status: 200 });
        }
        if (target === 'https://api.indexnow.org/indexnow') {
          submittedContentType = options.headers?.['Content-Type'] || '';
          submittedPayload = JSON.parse(options.body);
          return new Response('', { status: acceptStatus });
        }
        throw new Error(`Unexpected fetch URL: ${target}`);
      };

      const res = await submitIndexNow({
        publicDir: dir,
        env: {},
        fetchImpl: stubFetch,
      });

      assert.equal(res.ok, true);
      assert.equal(res.status, acceptStatus);
      assert.equal(res.host, 'almorad-amc.com');
      assert.equal(res.keyLocation, `https://almorad-amc.com/${fixtureKey}.txt`);
      assert.equal(res.submittedCount, 2);
      assert.equal(submittedContentType, 'application/json; charset=utf-8');
      assert.deepEqual(submittedPayload, {
        host: 'almorad-amc.com',
        key: fixtureKey,
        keyLocation: `https://almorad-amc.com/${fixtureKey}.txt`,
        urlList: ['https://almorad-amc.com/en', 'https://almorad-amc.com/ar'],
      });
    }

    for (const [errorStatus, pattern] of [
      [403, /403/],
      [429, /429/],
    ]) {
      const errorFetch = async (url) => {
        const target = String(url);
        if (target === 'https://almorad-amc.com/sitemap.xml') {
          return new Response(sitemapXml, { status: 200 });
        }
        if (target === `https://almorad-amc.com/${fixtureKey}.txt`) {
          return new Response(fixtureKey, { status: 200 });
        }
        return new Response('rejected', { status: errorStatus });
      };

      await assert.rejects(
        () => submitIndexNow({ publicDir: dir, env: {}, fetchImpl: errorFetch }),
        pattern
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('dry-run parses sitemap without calling api.indexnow.org', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'amc-indexnow-dry-'));
  const fixtureKey = 'b'.repeat(32);
  writeFileSync(join(dir, `${fixtureKey}.txt`), fixtureKey, 'utf8');

  const calls = [];
  const stubFetch = async (url) => {
    calls.push(String(url));
    if (String(url) === 'https://almorad-amc.com/sitemap.xml') {
      return new Response(
        '<urlset><url><loc>https://almorad-amc.com/en</loc></url><url><loc>https://almorad-amc.com/ar</loc></url></urlset>',
        { status: 200 }
      );
    }
    throw new Error(`Unexpected network call in dry-run: ${url}`);
  };

  try {
    const res = await submitIndexNow({
      publicDir: dir,
      env: {},
      dryRun: true,
      fetchImpl: stubFetch,
    });
    assert.equal(res.dryRun, true);
    assert.equal(res.submittedCount, 2);
    assert.deepEqual(calls, ['https://almorad-amc.com/sitemap.xml']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
