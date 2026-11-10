/** Return only bounded diagnostic categories; never return provider messages or URLs. */
export function databaseFailure(error: unknown) {
  const value = error as {code?: unknown; message?: unknown; meta?: {code?: unknown; message?: unknown; driverAdapterError?: {cause?: {originalCode?: unknown; originalMessage?: unknown}}}} | null;
  const cause = value?.meta?.driverAdapterError?.cause;
  const code = typeof value?.code === 'string' && /^P\d{4}$/.test(value.code) ? value.code : undefined;
  const rawState = value?.meta?.code ?? cause?.originalCode;
  const sqlState = typeof rawState === 'string' && /^[0-9A-Z]{5}$/.test(rawState) ? rawState : undefined;
  const reason = [value?.message, value?.meta?.message, cause?.originalMessage].filter(item => typeof item === 'string').join(' ').toLowerCase();
  const category = reason.includes('failed to connect to upstream database') ? 'provider_upstream_unreachable'
    : sqlState === '42P01' || sqlState === '42703' || code === 'P2021' || code === 'P2022' ? 'schema_missing'
    : sqlState?.startsWith('28') || code === 'P1000' ? 'authentication'
    : sqlState?.startsWith('08') || code === 'P1001' || code === 'P1002' ? 'connection'
    : 'unclassified';
  return {code, sqlState, category};
}
