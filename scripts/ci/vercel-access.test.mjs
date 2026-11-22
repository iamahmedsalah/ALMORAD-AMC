import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyVercelAccess } from './vercel-access.mjs';

const validEnv = {
  VERCEL_TOKEN: 'secret-fixture-token',
  VERCEL_ORG_ID: 'team_fixture',
  VERCEL_PROJECT_ID: 'prj_fixture',
};

test('accepts valid project and team access and queries both Vercel API endpoints', async () => {
  const calls = [];

  const stubFetch = async (url, options) => {
    calls.push({
      url: String(url),
      method: options.method,
      auth: options.headers.Authorization,
    });
    return new Response('{}', { status: 200 });
  };

  const result = await verifyVercelAccess(validEnv, stubFetch);
  assert.deepEqual(result, { ok: true, status: 200 });
  assert.deepEqual(
    calls.map((call) => call.url),
    [
      'https://api.vercel.com/v9/projects/prj_fixture?teamId=team_fixture',
      'https://api.vercel.com/teams/team_fixture',
    ]
  );
  assert.ok(calls.every((call) => call.method === 'GET'));
  assert.ok(calls.every((call) => call.auth === 'Bearer secret-fixture-token'));
});

test('classifies 401, 403, and 404 failures with actionable remediation without leaking VERCEL_TOKEN', async () => {
  for (const [status, expectedSnippet] of [
    [401, 'Vercel access check failed (401): VERCEL_TOKEN is expired'],
    [403, 'Could not retrieve Project Settings'],
    [404, 'Vercel access check failed (404): project was not found'],
  ]) {
    const stubFetch = async () =>
      new Response(JSON.stringify({ error: { tokenEcho: 'secret-fixture-token' } }), { status });

    await assert.rejects(
      () => verifyVercelAccess(validEnv, stubFetch),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes(expectedSnippet));
        assert.equal(err.message.includes('secret-fixture-token'), false);
        return true;
      }
    );
  }
});

test('fails when the project is readable but the team lookup is forbidden', async () => {
  const stubFetch = async (url) => {
    const status = String(url).includes('/teams/') ? 403 : 200;
    return new Response('{}', { status });
  };

  await assert.rejects(
    () => verifyVercelAccess(validEnv, stubFetch),
    /cannot read the team/
  );
});

test('rejects a team slug in VERCEL_ORG_ID before calling Vercel', async () => {
  const stubFetch = async () => {
    throw new Error('fetch should not be called');
  };

  await assert.rejects(
    () => verifyVercelAccess({ ...validEnv, VERCEL_ORG_ID: 'almorad' }, stubFetch),
    /must be the team id/
  );
});

test('fails closed when required Vercel access variables are missing', async () => {
  const stubFetch = async () => {
    throw new Error('fetch should not be called');
  };

  await assert.rejects(
    () => verifyVercelAccess({ ...validEnv, VERCEL_TOKEN: '   ' }, stubFetch),
    /VERCEL_TOKEN is missing or empty/
  );
  await assert.rejects(
    () => verifyVercelAccess({ ...validEnv, VERCEL_ORG_ID: '' }, stubFetch),
    /VERCEL_ORG_ID is missing or empty/
  );
  await assert.rejects(
    () => verifyVercelAccess({ ...validEnv, VERCEL_PROJECT_ID: undefined }, stubFetch),
    /VERCEL_PROJECT_ID is missing or empty/
  );
});
