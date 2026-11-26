import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const KEY_PATTERN = /^[a-f0-9]{32}$/;
const GENERAL_KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;
const DEFAULT_ORIGIN = 'https://almorad-amc.com';
const DEFAULT_ENDPOINT = 'https://api.indexnow.org/indexnow';
const DEFAULT_PUBLIC_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../apps/web/public'
);

/**
 * Resolves the IndexNow ownership key from INDEXNOW_KEY (when explicitly supplied)
 * or from the single 32-char lowercase hex verification file in apps/web/public.
 */
export function discoverIndexNowKey(publicDir = DEFAULT_PUBLIC_DIR, env = process.env) {
  const override = typeof env.INDEXNOW_KEY === 'string' ? env.INDEXNOW_KEY.trim() : '';
  if (override) {
    if (!GENERAL_KEY_PATTERN.test(override)) {
      throw new Error('INDEXNOW_KEY must be 8-128 alphanumeric or dash characters.');
    }
    return override;
  }

  const entries = readdirSync(publicDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^[a-f0-9]{32}\.txt$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (entries.length === 0) {
    throw new Error(
      `IndexNow key file missing in ${publicDir}. Expected one <32-hex>.txt file.`
    );
  }
  if (entries.length > 1) {
    throw new Error(
      `Multiple IndexNow key files found in ${publicDir}: ${entries.join(', ')}. Keep exactly one.`
    );
  }

  const filename = entries[0];
  const expectedKey = filename.slice(0, -4);
  if (!KEY_PATTERN.test(expectedKey)) {
    throw new Error(`Invalid IndexNow key filename: ${filename}`);
  }

  const content = readFileSync(resolve(publicDir, filename), 'utf8');
  if (content !== expectedKey) {
    throw new Error(
      `IndexNow key file ${filename} content must match its filename without whitespace or extra text.`
    );
  }

  return expectedKey;
}

/**
 * Extracts and validates canonical URLs from sitemap XML for the expected origin.
 */
export function parseSitemapUrls(xml, expectedOrigin = DEFAULT_ORIGIN) {
  const normalizedOrigin = normalizeOrigin(expectedOrigin);
  const matches = xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi);
  const seen = new Set();
  const urls = [];

  for (const match of matches) {
    const raw = match[1]
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&apos;', "'");

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(`Invalid URL in sitemap: ${raw}`);
    }

    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.origin !== normalizedOrigin
    ) {
      throw new Error(
        `Sitemap URL ${parsed.href} does not match expected origin ${normalizedOrigin}.`
      );
    }

    if (!seen.has(parsed.href)) {
      seen.add(parsed.href);
      urls.push(parsed.href);
    }
  }

  if (urls.length === 0) {
    throw new Error(`No <loc> URLs found in sitemap for ${normalizedOrigin}.`);
  }

  return urls;
}

function normalizeOrigin(origin) {
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Invalid IndexNow origin: ${origin}`);
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`IndexNow origin must be a credential-free HTTPS origin: ${origin}`);
  }

  return parsed.origin;
}

/**
 * Reads sitemap.xml, verifies the live IndexNow key file when not in dry-run mode,
 * and submits all canonical URLs to the official IndexNow API endpoint.
 */
export async function submitIndexNow({
  origin = DEFAULT_ORIGIN,
  endpoint = DEFAULT_ENDPOINT,
  publicDir = DEFAULT_PUBLIC_DIR,
  env = process.env,
  dryRun = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  const normalizedOrigin = normalizeOrigin(origin);
  const key = discoverIndexNowKey(publicDir, env);
  const host = new URL(normalizedOrigin).host;
  const keyLocation = `${normalizedOrigin}/${key}.txt`;

  const sitemapUrl = `${normalizedOrigin}/sitemap.xml`;
  const sitemapRes = await fetchImpl(sitemapUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
  });
  if (sitemapRes.status !== 200) {
    await sitemapRes.body?.cancel();
    throw new Error(`Failed to fetch sitemap (${sitemapRes.status}) from ${sitemapUrl}.`);
  }
  const xml = await sitemapRes.text();
  const urlList = parseSitemapUrls(xml, normalizedOrigin);

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      status: null,
      host,
      keyLocation,
      submittedCount: urlList.length,
      urlList,
    };
  }

  const keyRes = await fetchImpl(keyLocation, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  if (keyRes.status !== 200) {
    await keyRes.body?.cancel();
    throw new Error(
      `Live IndexNow key file check failed (${keyRes.status}) at ${keyLocation}. Ensure the deployment includes the verification file before notifying IndexNow.`
    );
  }
  const liveKeyBody = await keyRes.text();
  if (liveKeyBody.trim() !== key) {
    throw new Error(`Live IndexNow key file at ${keyLocation} does not match expected key.`);
  }

  const submitRes = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList,
    }),
    signal: AbortSignal.timeout(20000),
  });

  await submitRes.body?.cancel();

  if (submitRes.status === 200 || submitRes.status === 202) {
    return {
      ok: true,
      dryRun: false,
      status: submitRes.status,
      host,
      keyLocation,
      submittedCount: urlList.length,
    };
  }

  if (submitRes.status === 403) {
    throw new Error(
      `IndexNow submission rejected (403): key at ${keyLocation} was not accepted or invalid.`
    );
  }
  if (submitRes.status === 422) {
    throw new Error(
      `IndexNow submission rejected (422): URLs in urlList do not belong to host ${host} / keyLocation.`
    );
  }
  if (submitRes.status === 429) {
    throw new Error('IndexNow submission rate limited (429): retry later.');
  }

  throw new Error(`IndexNow submission failed with status ${submitRes.status}.`);
}

const invokedDirectly =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const dryRun = process.argv.includes('--dry-run');
  const origin = process.env.INDEXNOW_ORIGIN?.trim() || DEFAULT_ORIGIN;
  try {
    const result = await submitIndexNow({ origin, dryRun });
    console.log(
      JSON.stringify({
        ok: result.ok,
        dryRun: result.dryRun,
        status: result.status,
        host: result.host,
        keyLocation: result.keyLocation,
        submittedCount: result.submittedCount,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'IndexNow submission failed.';
    console.error(message);
    process.exitCode = 1;
  }
}
