// Connection settings for Neon's pooled endpoint (hosts ending in "-pooler"), added in code because
// the production DATABASE_URL is managed by the Neon integration and can't be edited in Vercel.
// Settings already in the URL win.
//  - pgbouncer=true: Neon's pooler is PgBouncer, which can't hold Prisma's prepared statements
//  - connect_timeout=15: give a suspended Neon compute time to wake (Prisma's default is 5s)
//  - connection_limit=1 (on Vercel only): one connection per serverless instance, as Prisma
//    recommends, so instances don't exhaust the pooler
export function withPoolerSettings(url: string | undefined, onVercel = Boolean(process.env.VERCEL)): string | undefined {
  if (!url) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!parsed.hostname.split('.')[0].endsWith('-pooler')) return url;

  const defaults: Record<string, string> = { pgbouncer: 'true', connect_timeout: '15' };
  if (onVercel) defaults.connection_limit = '1';
  for (const [key, value] of Object.entries(defaults)) {
    if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}
