import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';

// Integration tests against the local database for Google sign-up with invite codes.

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => { jar.set(name, value); },
    delete: (name: string) => { jar.delete(name); },
  }),
}));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));

import { decideGoogleSignIn, claimInviteForNewGoogleUser } from './google-signup';
import { claimInvite, decodeInviteCookie, encodeInviteCookie, INVITE_COOKIE, INVITES_PER_NEW_USER } from './invites';
import { prepareGoogleSignup } from '@/actions/oauth-invite';
import { chooseUsername } from '@/actions/choose-username';

const tag = `gtest${Date.now()}`;
const code = (n: string) => `PEAKE-${tag.toUpperCase()}-${n}`;
const userIds: string[] = [];

async function makeUser(data: Record<string, unknown>) {
  const u = await prisma.user.create({ data: data as never, select: { id: true } });
  userIds.push(u.id);
  return u.id;
}

beforeAll(async () => {
  await prisma.inviteCode.createMany({ data: ['A', 'B', 'C', 'D', 'USED'].map(n => ({ code: code(n) })) });
  await prisma.inviteCode.update({ where: { code: code('USED') }, data: { usedAt: new Date() } });
});

afterAll(async () => {
  await prisma.inviteCode.deleteMany({ where: { OR: [{ code: { startsWith: `PEAKE-${tag.toUpperCase()}` } }, { issuerId: { in: userIds } }, { usedById: { in: userIds } }] } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

beforeEach(() => { jar.clear(); vi.mocked(getServerSession).mockReset(); });

describe('invite cookie', () => {
  it('round-trips a code', () => {
    expect(decodeInviteCookie(encodeInviteCookie('peake-abc123'))).toBe('PEAKE-ABC123');
  });
  it('rejects a tampered code', () => {
    const [, expires, sig] = encodeInviteCookie('PEAKE-ABC123').split('.');
    expect(decodeInviteCookie(`PEAKE-OTHER.${expires}.${sig}`)).toBeNull();
  });
  it('rejects an expired cookie', () => {
    const old = encodeInviteCookie('PEAKE-ABC123', Date.now() - 60 * 60 * 1000);
    expect(decodeInviteCookie(old)).toBeNull();
  });
});

describe('prepareGoogleSignup', () => {
  it('refuses an unknown or used code and sets no cookie', async () => {
    expect(await prepareGoogleSignup('PEAKE-NOPE')).toHaveProperty('error');
    expect(await prepareGoogleSignup(code('USED'))).toHaveProperty('error');
    expect(jar.has(INVITE_COOKIE)).toBe(false);
  });
  it('stores a valid code in the signed cookie', async () => {
    expect(await prepareGoogleSignup(code('A').toLowerCase())).toEqual({ ok: true });
    expect(decodeInviteCookie(jar.get(INVITE_COOKIE))).toBe(code('A'));
  });
});

describe('decideGoogleSignIn', () => {
  const google = (email: string, providerAccountId = `g-${email}`, emailVerified = true) =>
    decideGoogleSignIn({ providerAccountId, email, emailVerified });

  it('refuses an unverified Google email', async () => {
    expect(await google(`x-${tag}@example.com`, 'g1', false)).toBe('/login?error=GoogleEmailUnverified');
  });

  it('refuses a new account without an invite', async () => {
    expect(await google(`new-${tag}@example.com`)).toBe('/register?error=InviteRequired');
  });

  it('refuses a new account whose invite was already used', async () => {
    jar.set(INVITE_COOKIE, encodeInviteCookie(code('USED')));
    expect(await google(`new-${tag}@example.com`)).toBe('/register?error=InviteRequired');
  });

  it('allows a new account with a valid invite', async () => {
    jar.set(INVITE_COOKIE, encodeInviteCookie(code('B')));
    expect(await google(`new-${tag}@example.com`)).toBe(true);
  });

  it('lets an existing email account sign in with Google (no invite needed)', async () => {
    await makeUser({ email: `existing-${tag}@example.com`, username: `existing_${tag}` });
    expect(await google(`Existing-${tag}@example.com`)).toBe(true);
  });

  it('lets an already-linked Google account sign in', async () => {
    const id = await makeUser({ email: `linked-${tag}@example.com`, username: `linked_${tag}` });
    await prisma.account.create({ data: { userId: id, type: 'oauth', provider: 'google', providerAccountId: `gid-${tag}` } });
    expect(await google(`changed-${tag}@example.com`, `gid-${tag}`)).toBe(true);
  });

  it('refuses a banned account', async () => {
    await makeUser({ email: `banned-${tag}@example.com`, username: `banned_${tag}`, isBanned: true });
    expect(await google(`banned-${tag}@example.com`)).toBe('/login?error=ACCOUNT_SUSPENDED');
  });
});

describe('claimInviteForNewGoogleUser', () => {
  it('claims the invite, mints new invites, lowercases the email and clears the cookie', async () => {
    const id = await makeUser({ email: `Mixed-${tag}@Example.com` });
    jar.set(INVITE_COOKIE, encodeInviteCookie(code('C')));
    expect(await claimInviteForNewGoogleUser(id, `Mixed-${tag}@Example.com`)).toBe(true);

    const invite = await prisma.inviteCode.findUnique({ where: { code: code('C') } });
    expect(invite?.usedById).toBe(id);
    expect(await prisma.inviteCode.count({ where: { issuerId: id } })).toBe(INVITES_PER_NEW_USER);
    expect((await prisma.user.findUnique({ where: { id } }))?.email).toBe(`mixed-${tag}@example.com`);
    expect(jar.has(INVITE_COOKIE)).toBe(false);
  });

  it('removes the new account if the invite was claimed first by someone else', async () => {
    const first = await makeUser({ email: `first-${tag}@example.com` });
    await prisma.$transaction(tx => claimInvite(tx, code('D'), first));

    const second = await makeUser({ email: `second-${tag}@example.com` });
    jar.set(INVITE_COOKIE, encodeInviteCookie(code('D')));
    expect(await claimInviteForNewGoogleUser(second, `second-${tag}@example.com`)).toBe(false);
    expect(await prisma.user.findUnique({ where: { id: second } })).toBeNull();
  });

  it('removes the new account if there is no invite cookie', async () => {
    const id = await makeUser({ email: `nocookie-${tag}@example.com` });
    expect(await claimInviteForNewGoogleUser(id, `nocookie-${tag}@example.com`)).toBe(false);
    expect(await prisma.user.findUnique({ where: { id } })).toBeNull();
  });
});

describe('claimInvite', () => {
  it('lets only one account claim a code', async () => {
    const a = await makeUser({ email: `ca-${tag}@example.com` });
    const b = await makeUser({ email: `cb-${tag}@example.com` });
    await prisma.inviteCode.create({ data: { code: code('SAME') } });
    const results = await Promise.all([
      prisma.$transaction(tx => claimInvite(tx, code('SAME'), a)),
      prisma.$transaction(tx => claimInvite(tx, code('SAME'), b)),
    ].map(p => p.catch(() => false)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe('chooseUsername', () => {
  const loginAs = (id: string) => vi.mocked(getServerSession).mockResolvedValue({ user: { id } } as never);

  it('sets a username once, and refuses invalid or taken ones', async () => {
    await makeUser({ email: `taken-${tag}@example.com`, username: `Taken_${tag}` });
    const id = await makeUser({ email: `pick-${tag}@example.com` });
    loginAs(id);

    expect(await chooseUsername('a b')).toHaveProperty('error');
    expect(await chooseUsername(`taken_${tag}`)).toEqual({ error: `@taken_${tag} is taken. Try another.` });
    expect(await chooseUsername(`pick.${tag}`)).toEqual({ ok: true });
    expect((await prisma.user.findUnique({ where: { id } }))?.username).toBe(`pick.${tag}`);
    expect(await chooseUsername(`again_${tag}`)).toEqual({ error: 'Your account already has a username.' });
  });
});

describe('normalizeInviteCode', () => {
  it('reads a typed O as 0 and I/L as 1 in the code part only', async () => {
    const { normalizeInviteCode } = await import('./invites');
    expect(normalizeInviteCode(' peake-7e57co ')).toBe('PEAKE-7E57C0');
    expect(normalizeInviteCode('PEAKE-1A2BLI')).toBe('PEAKE-1A2B11');
  });
});
