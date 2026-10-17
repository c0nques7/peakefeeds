import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

// Integration tests against the local database for ban and mute enforcement.

vi.mock('next-auth', async (orig) => ({ ...(await orig<typeof import('next-auth')>()), getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/admin-logger', () => ({ createAdminLog: vi.fn() }));

import { authOptions } from '@/lib/auth.config';
import { getPostingBlockReason, clearAccountStatusCache } from './penalties';
import { createComment } from '@/actions/create-comment';
import { startConversation, sendMessage } from '@/actions/messaging';
import { resolveReport } from '@/actions/admin-moderation';
import { toggleBan } from '@/actions/admin-user-detail';
import { confirmAge } from '@/actions/confirm-age';

const tag = `pen${Date.now()}`;
const PASSWORD = 'correct horse';
type U = { id: string; email: string; role: UserRole; username: string };
const users = {} as Record<'ok' | 'banned' | 'suspended' | 'muted' | 'mod' | 'admin' | 'unconfirmed' | 'adult' | 'teen' | 'underage', U>;
let ticketId: string;

const loginAs = (u: U) =>
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: u.id, role: u.role, username: u.username, email: u.email } } as never);

// The credentials provider's authorize() and the jwt callback, as next-auth calls them
const authorize = (email: string, password = PASSWORD) =>
  (authOptions.providers[0] as unknown as { options: { authorize: (c: Record<string, string>) => Promise<unknown> } })
    .options.authorize({ email, password });
const jwt = (id: string) => authOptions.callbacks!.jwt!({ token: { id } as never, user: undefined as never, account: null });

beforeAll(async () => {
  const passwordHash = await argon2.hash(PASSWORD);
  const hour = 60 * 60 * 1000;
  const setup = {
    ok: {},
    banned: { isBanned: true },
    suspended: { bannedUntil: new Date(Date.now() + 24 * hour) },
    muted: { mutedUntil: new Date(Date.now() + hour) },
    mod: { role: UserRole.MODERATOR },
    admin: { role: UserRole.ADMIN },
    unconfirmed: { ageConfirmedAt: null },
    adult: { ageConfirmedAt: null },
    teen: { ageConfirmedAt: null },
    underage: { ageConfirmedAt: null, ageRejectedAt: new Date() },
  };
  for (const [name, extra] of Object.entries(setup)) {
    users[name as keyof typeof users] = (await prisma.user.create({
      data: { email: `${name}-${tag}@example.com`, username: `${name}_${tag}`, passwordHash, ageConfirmedAt: new Date(), ...extra },
      select: { id: true, email: true, role: true, username: true },
    })) as U;
  }
  ticketId = (await prisma.supportTicket.create({ data: { userId: users.muted.id } })).id;
});

afterAll(async () => {
  const ids = Object.values(users).map(u => u.id);
  await prisma.report.deleteMany({ where: { reporterId: { in: ids } } });
  await prisma.penalty.deleteMany({ where: { userId: { in: ids } } });
  await prisma.supportTicket.deleteMany({ where: { userId: { in: ids } } });
  await prisma.conversation.deleteMany({ where: { participants: { some: { id: { in: ids } } } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

beforeEach(() => {
  vi.mocked(getServerSession).mockReset();
  for (const u of Object.values(users)) clearAccountStatusCache(u.id);
});

describe('login', () => {
  it('lets a normal user in', async () => {
    expect(await authorize(users.ok.email)).toMatchObject({ id: users.ok.id });
  });

  it('refuses a banned user', async () => {
    await expect(authorize(users.banned.email)).rejects.toThrow(/^ACCOUNT_SUSPENDED$/);
  });

  it('refuses a suspended user and says until when', async () => {
    await expect(authorize(users.suspended.email)).rejects.toThrow(/^ACCOUNT_SUSPENDED:\d{4}-/);
  });

  it("doesn't reveal a ban to someone with the wrong password", async () => {
    expect(await authorize(users.banned.email, 'wrong')).toBeNull();
  });

  it('lets a muted user log in', async () => {
    expect(await authorize(users.muted.email)).toMatchObject({ id: users.muted.id });
  });
});

describe('existing sessions', () => {
  it('end for banned users', async () => {
    await expect(jwt(users.banned.id)).rejects.toThrow('ACCOUNT_SUSPENDED');
  });

  it('continue for normal users and pick up role changes', async () => {
    await prisma.user.update({ where: { id: users.ok.id }, data: { role: UserRole.EXPERT } });
    expect(await jwt(users.ok.id)).toMatchObject({ id: users.ok.id, role: UserRole.EXPERT });
    await prisma.user.update({ where: { id: users.ok.id }, data: { role: UserRole.STANDARD } });
  });
});

describe('mutes', () => {
  it('block posting-type actions', async () => {
    expect(await getPostingBlockReason(users.muted.id)).toMatch(/muted until/);
    expect(await getPostingBlockReason(users.ok.id)).toBeNull();

    loginAs(users.muted);
    const fd = new FormData();
    fd.append('content', 'hello');
    fd.append('postId', 'any');
    expect(await createComment(fd)).toMatchObject({ error: expect.stringMatching(/muted until/) });
    expect(await startConversation(users.ok.id)).toMatchObject({ error: expect.stringMatching(/muted until/) });
  });

  it('still allow replying on their own support ticket', async () => {
    loginAs(users.muted);
    expect(await sendMessage(ticketId, 'please review my mute')).toEqual({ success: true });
  });
});

describe('moderation penalties', () => {
  const reportAgainst = async (offender: U) =>
    (await prisma.report.create({
      data: { reason: 'SPAM', targetType: 'USER', reporterId: users.ok.id, reportedProfileId: offender.id },
    })).id;

  it('a timeout mutes for about 24 hours', async () => {
    loginAs(users.mod);
    await resolveReport({ reportId: await reportAgainst(users.ok), verdict: 'PENALIZE', penaltyType: 'STRIKE_1_TIMEOUT' });
    const u = await prisma.user.findUnique({ where: { id: users.ok.id }, select: { mutedUntil: true, strikeCount: true } });
    const hours = (u!.mutedUntil!.getTime() - Date.now()) / 3.6e6;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24);
    expect(u!.strikeCount).toBe(1);
    await prisma.user.update({ where: { id: users.ok.id }, data: { mutedUntil: null, strikeCount: 0 } });
  });

  it('a suspension locks the account for about 7 days, and unbanning lifts it', async () => {
    loginAs(users.mod);
    await resolveReport({ reportId: await reportAgainst(users.ok), verdict: 'PENALIZE', penaltyType: 'STRIKE_2_SUSPENSION' });
    const u = await prisma.user.findUnique({ where: { id: users.ok.id }, select: { bannedUntil: true } });
    expect((u!.bannedUntil!.getTime() - Date.now()) / 8.64e7).toBeCloseTo(7, 1);
    await expect(authorize(users.ok.email)).rejects.toThrow(/ACCOUNT_SUSPENDED:/);

    expect(await toggleBan(users.ok.id, false)).toEqual({ success: true });
    expect(await authorize(users.ok.email)).toMatchObject({ id: users.ok.id });
    expect(await prisma.penalty.count({ where: { userId: users.ok.id, isActive: true, type: 'STRIKE_2_SUSPENSION' } })).toBe(0);
  });

  it("moderators can't ban admins", async () => {
    loginAs(users.mod);
    expect(await toggleBan(users.admin.id, true)).toEqual({ success: false, error: 'Only admins can ban staff accounts.' });
    expect((await prisma.user.findUnique({ where: { id: users.admin.id } }))!.isBanned).toBe(false);
  });
});

describe('age check', () => {
  const yearsAgo = (years: number) => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - years);
    return d.toISOString().slice(0, 10);
  };

  it('refuses login for an account closed by the age check, without telling strangers', async () => {
    await expect(authorize(users.underage.email)).rejects.toThrow(/^ACCOUNT_UNDERAGE$/);
    expect(await authorize(users.underage.email, 'wrong')).toBeNull();
  });

  it('ends sessions of closed accounts and tells the app who still has to confirm', async () => {
    await expect(jwt(users.underage.id)).rejects.toThrow('ACCOUNT_UNDERAGE');
    expect(await jwt(users.unconfirmed.id)).toMatchObject({ ageConfirmed: false });
    expect(await jwt(users.ok.id)).toMatchObject({ ageConfirmed: true });
  });

  it('blocks posting until the age is confirmed, and for closed accounts', async () => {
    expect(await getPostingBlockReason(users.unconfirmed.id)).toMatch(/date of birth/);
    expect(await getPostingBlockReason(users.underage.id)).toMatch(/closed/);
    expect(await getPostingBlockReason(users.ok.id)).toBeNull();
  });

  it('confirms an adult and keeps no date of birth', async () => {
    loginAs(users.adult);
    expect(await confirmAge('not a date')).toEqual({ error: expect.any(String) });
    expect(await confirmAge(yearsAgo(30))).toEqual({ ok: true });
    const row = await prisma.user.findUnique({ where: { id: users.adult.id } });
    expect(row?.ageConfirmedAt).toBeInstanceOf(Date);
    expect(row?.ageRejectedAt).toBeNull();
    expect(await getPostingBlockReason(users.adult.id)).toBeNull();
  });

  it('closes an under-18 account, and a second answer cannot reopen it', async () => {
    loginAs(users.teen);
    expect(await confirmAge(yearsAgo(17))).toEqual({ closed: true });
    expect(await confirmAge(yearsAgo(30))).toEqual({ closed: true });
    const row = await prisma.user.findUnique({ where: { id: users.teen.id } });
    expect(row?.ageRejectedAt).toBeInstanceOf(Date);
    expect(row?.ageConfirmedAt).toBeNull();
    await expect(authorize(users.teen.email)).rejects.toThrow(/^ACCOUNT_UNDERAGE$/);
  });
});
