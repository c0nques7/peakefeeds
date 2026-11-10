// Connection pool settings for the `pg` driver adapter (Prisma 7 connects through it).
// The production DATABASE_URL is managed by the Neon integration and can't be edited in Vercel,
// so these are set in code. Values already in the URL win.
//  - connect_timeout -> connectionTimeoutMillis (15s): give a suspended Neon compute time to wake.
//    `pg` waits forever by default.
//  - connection_limit -> max: a small pool (VERCEL_POOL_MAX) per serverless instance on Neon's
//    pooled endpoint (hosts ending in "-pooler") when running on Vercel. Not 1: a page render runs
//    several queries at once (each findMany with relations is several statements, plus the
//    sidebars), and Vercel sends concurrent requests to the same instance, so a one-connection pool
//    queues all of them behind each other (2-6x slower pages, and pool-wait timeouts under load).
//    Neon's pooler (PgBouncer) takes thousands of client connections, so a few per instance is safe.
//  - sslmode=require/prefer/verify-ca -> verify-full: what `pg` 8 already does with them, made
//    explicit so it stops printing a deprecation warning on every cold start (pg 9 changes them).
// Prisma-only URL parameters (pgbouncer, connection_limit, connect_timeout, pool_timeout) are
// removed from the URL because `pg` doesn't understand them.
const PRISMA_ONLY_PARAMS = ['pgbouncer', 'connection_limit', 'connect_timeout', 'pool_timeout'];

export interface PoolSettings {
  connectionString: string;
  connectionTimeoutMillis: number;
  max?: number;
}

const DEFAULT_CONNECT_TIMEOUT_SECONDS = 15;
export const VERCEL_POOL_MAX = 5;

export function poolSettings(
  url: string | undefined,
  onVercel = Boolean(process.env.VERCEL),
): PoolSettings | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { connectionString: url, connectionTimeoutMillis: DEFAULT_CONNECT_TIMEOUT_SECONDS * 1000 };
  }

  const timeout = Number(parsed.searchParams.get('connect_timeout')) || DEFAULT_CONNECT_TIMEOUT_SECONDS;
  const limit = Number(parsed.searchParams.get('connection_limit')) || undefined;
  const isPooler = parsed.hostname.split('.')[0].endsWith('-pooler');

  let changed = PRISMA_ONLY_PARAMS.some((key) => parsed.searchParams.has(key));
  for (const key of PRISMA_ONLY_PARAMS) parsed.searchParams.delete(key);
  if (['prefer', 'require', 'verify-ca'].includes(parsed.searchParams.get('sslmode') ?? '')) {
    parsed.searchParams.set('sslmode', 'verify-full');
    changed = true;
  }

  const settings: PoolSettings = {
    connectionString: changed ? parsed.toString() : url,
    connectionTimeoutMillis: timeout * 1000,
  };
  const max = limit ?? (isPooler && onVercel ? VERCEL_POOL_MAX : undefined);
  if (max) settings.max = max;
  return settings;
}
