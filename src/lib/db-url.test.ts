import { describe, it, expect } from 'vitest';
import { poolSettings } from './db-url';

const pooler = 'postgresql://u:p@ep-old-morning-abc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

describe('poolSettings', () => {
  it('limits pooled Neon connections to one per instance on Vercel', () => {
    const settings = poolSettings(pooler, true)!;
    expect(settings.max).toBe(1);
    expect(settings.connectionTimeoutMillis).toBe(15000);
    expect(settings.connectionString).toBe(pooler);
  });

  it('leaves the pool size to pg off Vercel', () => {
    const settings = poolSettings(pooler, false)!;
    expect(settings.max).toBeUndefined();
    expect(settings.connectionTimeoutMillis).toBe(15000);
  });

  it('uses settings already in the URL and strips Prisma-only parameters', () => {
    const settings = poolSettings(`${pooler}&pgbouncer=true&connect_timeout=30&connection_limit=3`, true)!;
    expect(settings.connectionTimeoutMillis).toBe(30000);
    expect(settings.max).toBe(3);
    const url = new URL(settings.connectionString);
    expect(url.searchParams.get('sslmode')).toBe('require');
    expect(url.searchParams.has('pgbouncer')).toBe(false);
    expect(url.searchParams.has('connect_timeout')).toBe(false);
    expect(url.searchParams.has('connection_limit')).toBe(false);
    expect(url.username).toBe('u');
    expect(url.password).toBe('p');
  });

  it('keeps direct and local URLs as they are', () => {
    const direct = 'postgresql://u:p@ep-old-morning-abc.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
    const local = 'postgresql://peakeuser:peakepassword@localhost:5432/peakefeeds_test';
    expect(poolSettings(direct, true)).toEqual({ connectionString: direct, connectionTimeoutMillis: 15000 });
    expect(poolSettings(local, true)).toEqual({ connectionString: local, connectionTimeoutMillis: 15000 });
    expect(poolSettings(undefined, true)).toBeUndefined();
  });
});
