import { describe, it, expect } from 'vitest';
import { withPoolerSettings } from './db-url';

const pooler = 'postgresql://u:p@ep-old-morning-abc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

describe('withPoolerSettings', () => {
  it('adds the pooler settings on Vercel and keeps existing ones', () => {
    const url = new URL(withPoolerSettings(pooler, true)!);
    expect(url.searchParams.get('sslmode')).toBe('require');
    expect(url.searchParams.get('pgbouncer')).toBe('true');
    expect(url.searchParams.get('connect_timeout')).toBe('15');
    expect(url.searchParams.get('connection_limit')).toBe('1');
    expect(url.username).toBe('u');
    expect(url.password).toBe('p');
  });

  it('leaves the connection limit alone off Vercel', () => {
    const url = new URL(withPoolerSettings(pooler, false)!);
    expect(url.searchParams.get('pgbouncer')).toBe('true');
    expect(url.searchParams.has('connection_limit')).toBe(false);
  });

  it('does not override settings already in the URL', () => {
    const url = new URL(withPoolerSettings(`${pooler}&connect_timeout=30&connection_limit=3`, true)!);
    expect(url.searchParams.get('connect_timeout')).toBe('30');
    expect(url.searchParams.get('connection_limit')).toBe('3');
  });

  it('leaves direct and local URLs unchanged', () => {
    const direct = 'postgresql://u:p@ep-old-morning-abc.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
    const local = 'postgresql://peakeuser:peakepassword@localhost:5432/peakefeeds_test';
    expect(withPoolerSettings(direct, true)).toBe(direct);
    expect(withPoolerSettings(local, true)).toBe(local);
    expect(withPoolerSettings(undefined, true)).toBeUndefined();
    expect(withPoolerSettings('not a url', true)).toBe('not a url');
  });
});
