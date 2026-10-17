import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { ChannelRole, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

// Integration tests against the local database for "Download my data" and account deletion.

vi.mock('next-auth', async (orig) => ({ ...(await orig<typeof import('next-auth')>()), getServerSession: vi.fn() }));
vi.mock('@/lib/b2', async (orig) => ({
  ...(await orig<typeof import('@/lib/b2')>()),
  deleteFileByName: vi.fn().mockResolvedValue(1),
  getAuthorizedDownloadUrl: vi.fn(async (name: string) => `https://signed.example/${name}`),
}));

import { deleteFileByName } from '@/lib/b2';
import { buildAccountExport } from './account-export';
import { getDeletionBlocker } from './account-deletion';
import { deleteMyAccount } from '@/actions/delete-account';

const tag = `del${Date.now()}`;
const PASSWORD = 'correct horse';
process.env.B2_BUCKET_NAME = 'test-bucket';
const media = (name: string) => `https://f005.backblazeb2.com/file/test-bucket/${name}`;

type U = { id: string; username: string; email: string };
const users = {} as Record<'leaver' | 'heir' | 'other' | 'admin' | 'google', U>;
const ids: Record<string, string> = {};

const loginAs = (u: U) =>
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: u.id, username: u.username, email: u.email, role: UserRole.STANDARD } } as never);

beforeAll(async () => {
  const passwordHash = await argon2.hash(PASSWORD);
  for (const name of ['leaver', 'heir', 'other', 'admin', 'google'] as const) {
    users[name] = await prisma.user.create({
      data: {
        email: `${name}-${tag}@example.com`, username: `${name}_${tag}`, ageConfirmedAt: new Date(),
        passwordHash: name === 'google' ? null : passwordHash,
        role: name === 'admin' ? UserRole.ADMIN : UserRole.STANDARD,
        twoFactorSecret: 'secret-2fa',
        image: name === 'leaver' ? media(`avatar-${tag}.jpg`) : null,
      },
      select: { id: true, username: true, email: true },
    }) as U;
  }
  const { leaver, heir, other, admin } = users;

  // The leaver's channel, which a member and another poster also use
  const channel = await prisma.channel.create({
    data: { name: `Leaver ${tag}`, slug: `leaver-${tag}`, creatorId: leaver.id, subscribers: { create: [{ userId: leaver.id, role: ChannelRole.OWNER }, { userId: heir.id }] } },
  });
  const otherChannel = await prisma.channel.create({ data: { name: `Other ${tag}`, slug: `other-${tag}`, creatorId: other.id } });
  ids.channel = channel.id;
  ids.otherChannel = otherChannel.id;

  ids.othersPostInLeaversChannel = (await prisma.post.create({ data: { content: 'mine', channelId: channel.id, authorId: other.id, likesCount: 1 } })).id;
  ids.leaversPost = (await prisma.post.create({ data: { content: 'bye', channelId: otherChannel.id, authorId: leaver.id, mediaUrl: media(`post-${tag}.png`), isVerified: true } })).id;
  await prisma.reaction.create({ data: { userId: leaver.id, postId: ids.othersPostInLeaversChannel, type: 'LIKE' } });
  await prisma.comment.create({ data: { content: 'nice', authorId: leaver.id, postId: ids.othersPostInLeaversChannel } });

  const convo = await prisma.conversation.create({ data: { participants: { connect: [{ id: leaver.id }, { id: other.id }] } } });
  ids.conversation = convo.id;
  await prisma.directMessage.createMany({ data: [
    { conversationId: convo.id, senderId: leaver.id, content: 'hi' },
    { conversationId: convo.id, senderId: other.id, content: 'hello' },
  ] });

  const ticket = await prisma.supportTicket.create({ data: { userId: leaver.id, internalNotes: 'staff only' } });
  ids.ticket = ticket.id;
  await prisma.ticketMessage.createMany({ data: [
    { ticketId: ticket.id, text: 'help me', sender: 'user' },
    { ticketId: ticket.id, text: 'internal', sender: 'admin', isInternal: true },
  ] });

  ids.reportByLeaver = (await prisma.report.create({ data: { reason: 'SPAM', targetType: 'POST', reporterId: leaver.id, postId: ids.othersPostInLeaversChannel } })).id;
  ids.reportOnLeaver = (await prisma.report.create({ data: { reason: 'SPAM', targetType: 'USER', reporterId: other.id, reportedProfileId: leaver.id } })).id;
  await prisma.penalty.create({ data: { type: 'WARNING', reason: 'test', userId: leaver.id, issuerId: admin.id } });
  ids.invite = (await prisma.inviteCode.create({ data: { code: `PEAKE-${tag.toUpperCase()}`, issuerId: leaver.id } })).id;
});

afterAll(async () => {
  const userIds = Object.values(users).map(u => u.id);
  await prisma.inviteCode.deleteMany({ where: { id: ids.invite } });
  await prisma.report.deleteMany({ where: { reporterId: { in: userIds } } });
  await prisma.penalty.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { issuerId: { in: userIds } }] } });
  await prisma.directMessage.deleteMany({ where: { senderId: { in: userIds } } });
  await prisma.conversation.deleteMany({ where: { participants: { some: { id: { in: userIds } } } } });
  await prisma.supportTicket.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.channel.deleteMany({ where: { id: { in: [ids.channel, ids.otherChannel] } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe('download my data', () => {
  it('includes what the account made, with signed media links, and no secrets or staff notes', async () => {
    const data = await buildAccountExport(users.leaver.id);
    const json = JSON.stringify(data);

    expect(data?.profile).toMatchObject({ username: users.leaver.username, signInMethods: ['password'] });
    expect(data?.profile.image).toBe(`https://signed.example/avatar-${tag}.jpg`);
    expect(data?.posts.map(p => p.mediaUrl)).toEqual([`https://signed.example/post-${tag}.png`]);
    expect(data?.comments).toHaveLength(1);
    expect(data?.conversations[0].messages.map(m => m.content)).toEqual(['hi', 'hello']);
    expect(data?.supportTickets[0].messages.map(m => m.text)).toEqual(['help me']);
    expect(data?.moderationActions).toHaveLength(1);

    expect(json).not.toContain('passwordHash');
    expect(json).not.toContain('secret-2fa');
    expect(json).not.toContain('staff only');
    expect(json).not.toContain('internal');
  });
});

describe('deleting an account', () => {
  it('is refused for staff and allowed for members', async () => {
    expect(await getDeletionBlocker(users.admin.id)).toMatch(/Staff accounts/);
    expect(await getDeletionBlocker(users.other.id)).toBeNull();
  });

  it('needs the password, or the username for Google-only accounts', async () => {
    loginAs(users.leaver);
    expect(await deleteMyAccount('wrong')).toEqual({ error: expect.stringMatching(/password/) });
    loginAs(users.google);
    expect(await deleteMyAccount('someone_else')).toEqual({ error: expect.stringMatching(/username/) });
    expect(await prisma.user.count({ where: { id: { in: [users.leaver.id, users.google.id] } } })).toBe(2);
  });

  it('removes the account and its data but keeps other people’s things', async () => {
    loginAs(users.leaver);
    expect(await deleteMyAccount(PASSWORD)).toEqual({ ok: true });

    expect(await prisma.user.findUnique({ where: { id: users.leaver.id } })).toBeNull();
    expect(await prisma.post.findUnique({ where: { id: ids.leaversPost } })).toBeNull();
    expect(await prisma.conversation.findUnique({ where: { id: ids.conversation } })).toBeNull();
    expect(await prisma.supportTicket.findUnique({ where: { id: ids.ticket } })).toBeNull();
    expect(await prisma.report.count({ where: { id: { in: [ids.reportByLeaver, ids.reportOnLeaver] } } })).toBe(0);
    expect(await prisma.penalty.count({ where: { userId: users.leaver.id } })).toBe(0);

    // The channel passes to its member, and other people's posts in it stay
    expect(await prisma.channel.findUnique({ where: { id: ids.channel }, select: { creatorId: true } })).toEqual({ creatorId: users.heir.id });
    expect(await prisma.subscription.findUnique({ where: { userId_channelId: { userId: users.heir.id, channelId: ids.channel } } })).toMatchObject({ role: ChannelRole.OWNER, canDeletePosts: true });
    expect(await prisma.post.findUnique({ where: { id: ids.othersPostInLeaversChannel }, select: { likesCount: true } })).toEqual({ likesCount: 0 });

    // Invites it handed out keep working
    expect(await prisma.inviteCode.findUnique({ where: { id: ids.invite }, select: { issuerId: true, usedAt: true } })).toEqual({ issuerId: null, usedAt: null });

    // Uploads are removed from storage
    expect(vi.mocked(deleteFileByName).mock.calls.map(c => c[0]).sort()).toEqual([`avatar-${tag}.jpg`, `post-${tag}.png`]);
  });

  it('lets a Google-only account confirm with its username', async () => {
    loginAs(users.google);
    expect(await deleteMyAccount(`@${users.google.username.toUpperCase()}`)).toEqual({ ok: true });
    expect(await prisma.user.findUnique({ where: { id: users.google.id } })).toBeNull();
  });
});
