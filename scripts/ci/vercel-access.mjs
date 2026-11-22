import { pathToFileURL } from 'node:url';

/**
 * Verifies that VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID can read
 * the target Vercel project settings before invoking the Vercel CLI.
 * Never logs token values or raw upstream response bodies.
 */
export async function verifyVercelAccess(env = process.env, fetchImpl = globalThis.fetch) {
  const token = typeof env.VERCEL_TOKEN === 'string' ? env.VERCEL_TOKEN.trim() : '';
  const team = typeof env.VERCEL_ORG_ID === 'string' ? env.VERCEL_ORG_ID.trim() : '';
  const project = typeof env.VERCEL_PROJECT_ID === 'string' ? env.VERCEL_PROJECT_ID.trim() : '';

  if (!token) {
    throw new Error('Vercel access check failed: VERCEL_TOKEN is missing or empty.');
  }
  if (!team) {
    throw new Error('Vercel access check failed: VERCEL_ORG_ID is missing or empty.');
  }
  if (!project) {
    throw new Error('Vercel access check failed: VERCEL_PROJECT_ID is missing or empty.');
  }

  if (!team.startsWith('team_')) {
    throw new Error(
      'Vercel access check failed: VERCEL_ORG_ID must be the team id (team_...) from Vercel Project Settings -> General. A team slug makes the CLI treat the link as a personal account.'
    );
  }

  const projectEndpoint = `https://api.vercel.com/v9/projects/${encodeURIComponent(project)}?teamId=${encodeURIComponent(team)}`;
  const projectResponse = await fetchImpl(projectEndpoint, requestInit(token));
  await projectResponse.body?.cancel();
  assertAccessStatus(projectResponse.status, 'project', team, project);

  // `vercel deploy` also calls GET /teams/:id. A 403 there is printed as
  // "Could not retrieve Project Settings" even when the project GET succeeds
  // and no .vercel directory exists.
  const teamEndpoint = `https://api.vercel.com/teams/${encodeURIComponent(team)}`;
  const teamResponse = await fetchImpl(teamEndpoint, requestInit(token));
  await teamResponse.body?.cancel();
  assertAccessStatus(teamResponse.status, 'team', team, project);

  return { ok: true, status: projectResponse.status };
}

function requestInit(token) {
  return {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(20000),
  };
}

function assertAccessStatus(status, target, team, project) {
  if (status >= 200 && status < 300) return;

  if (status === 401) {
    throw new Error(
      'Vercel access check failed (401): VERCEL_TOKEN is expired, revoked, or invalid. Create a new token in Vercel Account Settings -> Tokens and update the production-vercel secret VERCEL_TOKEN.'
    );
  }
  if (status === 403) {
    throw new Error(
      `Vercel access check failed (403): VERCEL_TOKEN cannot read the ${target} for team ${team} / project ${project}. The deploy CLI reports this as "Could not retrieve Project Settings". Create a team-scoped or Full Account token for this team, not a project-only token, and confirm VERCEL_ORG_ID is the team id.`
    );
  }
  if (status === 404) {
    throw new Error(
      `Vercel access check failed (404): ${target} was not found for team ${team} / project ${project}. Verify VERCEL_ORG_ID and VERCEL_PROJECT_ID in Vercel Project Settings -> General.`
    );
  }

  throw new Error(
    `Vercel access check failed (${status}): unable to retrieve ${target} settings.`
  );
}

const invokedDirectly =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    await verifyVercelAccess();
    console.log('Vercel project access verified.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vercel access check failed.';
    console.error(message);
    process.exitCode = 1;
  }
}
