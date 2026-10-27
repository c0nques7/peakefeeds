import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { ChannelRole, UserRole } from '@prisma/client';
import { authenticator } from 'otplib';

// Integration tests against the local database: the server enforces the same rules the UI shows.

vi.mock('next-auth', async (orig) => ({ ...(await orig<typeof import('next-auth')>()), getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/admin-logger', () => ({ createAdminLog: vi.fn() }));
vi.mock('@/lib/metadata', () => ({ fetchLinkMetadata: vi.fn().mockResolvedValue({ url: null, title: null }) }));

import { authOptions } from '@/lib/auth.config';
import { clearAccountStatusCache } from './penalties';
import { getInteractionBlockReason } from './interaction-guard';
import { findOrCreateDirectConversation } from './conversations';
import { createComment } from '@/actions/create-comment';
import { createPost } from '@/actions/create-post';
import { editPost } from '@/actions/edit-post';
import { deletePost } from '@/actions/delete-post';
import { setReaction } from '@/actions/toggle-reaction';
import { updateComment } from '@/actions/comment-actions';
import { toggleSubscription } from '@/actions/subscribe';
import { createChannel } from '@/actions/create-channel';
import { getMessages, sendMessage, startConversation } from '@/actions/messaging';
import { createTicketAction } from '@/actions/support';
import { registerUser } from '@/actions/auth-register';
import { completePasswordReset } from '@/actions/auth-reset';
import { disableTwoFactor } from '@/actions/two-factor';

const tag = `ig${Date.now()}`;
type U = { id: string; role: UserRole; username: string; email: string };
const names = ['owner', 'member', 'mod', 'noComment', 'noPost', 'staff', 'locked', 'other'] as const;
const users = {} as Record<(typeof names)[number], U>;
let channelId: string;
let lockedChannelId: string;
const invites: string[] = [];

const loginAs = (u: U) =>
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: u.id, role: u.role, username: u.username, email: u.email } } as never);
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
};
const newPost = async (extra: { authorId?: string; isLocked?: boolean; channelId?: string } = {}) =>
  (await prisma.post.create({
    data: { content: 'hello', channelId: extra.channelId ?? channelId, authorId: extra.authorId ?? users.owner.id, isLocked: extra.isLocked ?? false },
  })).id;
const jwt = (token: Record<string, unknown>) =>
  authOptions.callbacks!.jwt!({ token: token as never, user: undefined as never, account: null });

beforeAll(async () => {
  for (const name of names) {
    users[name] = (await prisma.user.create({
      data: {
        email: `${name}-${tag}@example.com`, username: `${name}_${tag}`, ageConfirmedAt: new Date(),
        role: name === 'staff' ? UserRole.MODERATOR : UserRole.STANDARD,
        isLocked: name === 'locked',
      },
      select: { id: true, role: true, username: true, email: true },
    })) as U;
  }
  channelId = (await prisma.channel.create({
    data: {
      name: `IG ${tag}`, slug: `ig-${tag}`, creatorId: users.owner.id,
      subscribers: {
        create: [
          { userId: users.owner.id, role: ChannelRole.OWNER },
          { userId: users.member.id },
          { userId: users.mod.id, role: ChannelRole.MODERATOR },
          { userId: users.noComment.id, canComment: false },
          { userId: users.noPost.id, canPost: false },
        ],
      },
    },
  })).id;
  lockedChannelId = (await prisma.channel.create({
    data: { name: `IG locked ${tag}`, slug: `ig-locked-${tag}`, creatorId: users.owner.id, isLocked: true },
  })).id;
});

afterAll(async () => {
  const ids = Object.values(users).map(u => u.id);
  await prisma.supportTicket.deleteMany({ where: { userId: { in: ids } } });
  await prisma.conversation.deleteMany({ where: { participants: { some: { id: { in: ids } } } } });
  await prisma.channel.deleteMany({ where: { creatorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { OR: [{ id: { in: ids } }, { email: { contains: tag } }] } });
  await prisma.inviteCode.deleteMany({ where: { code: { in: invites } } });
});

beforeEach(() => {
  vi.mocked(getServerSession).mockReset();
  for (const u of Object.values(users)) clearAccountStatusCache(u.id);
});

describe('interaction guard', () => {
  it('refuses comments on a locked post, in a locked channel, or on a locked author\'s post', async () => {
    loginAs(users.member);
    const lockedPost = await newPost({ isLocked: true });
    const inLockedChannel = await newPost({ channelId: lockedChannelId });
    const byLockedUser = await newPost({ authorId: users.locked.id });
    for (const postId of [lockedPost, inLockedChannel, byLockedUser]) {
      expect(await createComment(form({ content: 'hi', postId }))).toEqual({ error: expect.stringMatching(/under review/) });
    }
    expect(await prisma.comment.count({ where: { postId: { in: [lockedPost, inLockedChannel, byLockedUser] } } })).toBe(0);
  });

  it('lets site staff act on locked content', async () => {
    const lockedPost = await newPost({ isLocked: true });
    expect(await getInteractionBlockReason({ userId: users.staff.id, action: 'comment', postId: lockedPost })).toBeNull();
  });

  it('honours canComment and canPost', async () => {
    const postId = await newPost();
    loginAs(users.noComment);
    expect(await createComment(form({ content: 'hi', postId }))).toEqual({ error: "You can't comment in this channel." });
    loginAs(users.noPost);
    expect(await createPost({}, form({ content: 'hi', channelId, verificationMethod: 'SKIP' })))
      .toMatchObject({ message: "You can't post in this channel." });
  });

  it("refuses a reply whose parent is on another post", async () => {
    const [a, b] = [await newPost(), await newPost()];
    const parent = await prisma.comment.create({ data: { content: 'parent', postId: a, authorId: users.owner.id } });
    loginAs(users.member);
    expect(await createComment(form({ content: 'hi', postId: b, parentId: parent.id }))).toEqual({ error: 'Comment not found.' });
  });

  it('refuses reactions on a locked post', async () => {
    loginAs(users.member);
    const postId = await newPost({ isLocked: true });
    expect(await setReaction(form({ postId, reactionType: 'LIKE' }))).toEqual({ error: expect.stringMatching(/under review/) });
    expect(await prisma.reaction.count({ where: { postId } })).toBe(0);
  });

  it('stops a muted user editing their comment', async () => {
    const postId = await newPost();
    const comment = await prisma.comment.create({ data: { content: 'mine', postId, authorId: users.member.id } });
    await prisma.user.update({ where: { id: users.member.id }, data: { mutedUntil: new Date(Date.now() + 60_000) } });
    loginAs(users.member);
    expect(await updateComment(form({ commentId: comment.id, content: 'edited' }))).toEqual({ error: expect.stringMatching(/muted/) });
    await prisma.user.update({ where: { id: users.member.id }, data: { mutedUntil: null } });
  });
});

describe('post permissions in actions', () => {
  it("doesn't let a member edit someone else's post, but lets a channel moderator", async () => {
    const postId = await newPost();
    loginAs(users.member);
    expect(await editPost(form({ postId, content: 'changed' }))).toEqual({ error: 'You do not have permission to edit this post.' });
    loginAs(users.mod);
    expect(await editPost(form({ postId, content: 'x'.repeat(2000) }))).toEqual({ success: true });
  });

  it('lets a member with canDeletePosts delete, with a reason', async () => {
    await prisma.subscription.update({ where: { userId_channelId: { userId: users.member.id, channelId } }, data: { canDeletePosts: true } });
    const postId = await newPost();
    loginAs(users.member);
    expect(await deletePost(postId)).toEqual({ error: expect.stringMatching(/reason is required/) });
    expect(await deletePost(postId, 'SPAM')).toEqual({ success: true });
    await prisma.subscription.update({ where: { userId_channelId: { userId: users.member.id, channelId } }, data: { canDeletePosts: false } });
  });

  it("doesn't let the author delete a post that is locked for review", async () => {
    const postId = await newPost({ authorId: users.member.id, isLocked: true });
    loginAs(users.member);
    expect(await deletePost(postId)).toEqual({ error: 'This post is locked for review.' });
  });
});

describe('channels', () => {
  it("doesn't let the owner unsubscribe from their own channel", async () => {
    loginAs(users.owner);
    expect(await toggleSubscription({}, form({ channelId, channelSlug: 'ignored' })))
      .toEqual({ message: "Channel owners can't unsubscribe from their own channel." });
    expect(await prisma.subscription.count({ where: { userId: users.owner.id, channelId } })).toBe(1);
  });

  it('never gives a channel a reserved slug', async () => {
    const taken = await prisma.channel.findUnique({ where: { slug: 'create' } });
    loginAs(users.other);
    await createChannel({}, form({ name: 'Create' }));
    const made = await prisma.channel.findFirst({ where: { creatorId: users.other.id, name: 'Create' } });
    expect(made?.slug).not.toBe('create');
    expect(taken).toBeNull();
  });
});

describe('messaging', () => {
  it('shows staff replies on a ticket but not internal notes', async () => {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: users.member.id,
        messages: { create: [
          { text: 'help', sender: 'user' },
          { text: 'staff reply', sender: 'admin', adminId: users.staff.id },
          { text: 'internal note', sender: 'admin', adminId: users.staff.id, isInternal: true },
        ] },
      },
    });
    loginAs(users.member);
    const res = await getMessages(ticket.id);
    const texts = (res.data as { content: string }[]).map(m => m.content);
    expect(texts).toEqual(['help', 'staff reply']);
  });

  it('validates DM content and reports ticket send failures', async () => {
    loginAs(users.member);
    const { conversationId } = (await startConversation(users.other.id)) as { conversationId: string };
    expect(await sendMessage(conversationId, '   ')).toEqual({ error: "Message can't be empty." });
    expect(await sendMessage(conversationId, 'x'.repeat(2001))).toEqual({ error: expect.stringMatching(/2000/) });

    const othersTicket = await prisma.supportTicket.create({ data: { userId: users.other.id } });
    expect(await sendMessage(othersTicket.id, 'hello')).toEqual({ error: 'Unauthorized' });
  });

  it("can't start a conversation with yourself", async () => {
    loginAs(users.member);
    expect(await startConversation(users.member.id)).toEqual({ error: "You can't message yourself." });
  });

  it('only reuses a conversation between exactly the same two people', async () => {
    const withOther = await findOrCreateDirectConversation(users.mod.id, users.other.id);
    const withStaff = await findOrCreateDirectConversation(users.mod.id, users.staff.id);
    expect(withStaff.id).not.toBe(withOther.id);
    expect((await findOrCreateDirectConversation(users.staff.id, users.mod.id)).id).toBe(withStaff.id);
  });
});

describe('support tickets', () => {
  it('limits ticket length and how many a user opens per hour', async () => {
    loginAs(users.noPost);
    expect(await createTicketAction('x'.repeat(2001))).toMatchObject({ success: false });
    for (let i = 0; i < 5; i++) expect(await createTicketAction(`issue ${i}`)).toMatchObject({ success: true });
    expect(await createTicketAction('one more')).toMatchObject({ success: false, error: expect.stringMatching(/several tickets/) });
  });
});

describe('auth', () => {
  // Digits only: normalizeInviteCode rewrites O, I and L
  const invite = async () => {
    const code = (await prisma.inviteCode.create({ data: { code: `PEAKE-${Date.now()}${Math.floor(Math.random() * 1e6)}` } })).code;
    invites.push(code);
    return code;
  };

  it('applies the shared password and username rules at registration', async () => {
    const code = await invite();
    expect(await registerUser(form({ username: `new_${tag}`, email: `new-${tag}@example.com`, password: 'short', inviteCode: code })))
      .toEqual({ error: 'Password must be at least 8 characters long.' });
    expect(await registerUser(form({ username: 'bad name!', email: `new-${tag}@example.com`, password: 'long enough', inviteCode: code })))
      .toEqual({ error: expect.stringMatching(/letters, numbers/) });
    // Usernames are unique regardless of case
    expect(await registerUser(form({ username: users.member.username.toUpperCase(), email: `new-${tag}@example.com`, password: 'long enough', inviteCode: code })))
      .toEqual({ error: 'Email or Username already taken.' });
  });

  it('a password reset ends sessions that signed in before it', async () => {
    const before = Date.now() - 1000;
    expect(await jwt({ id: users.other.id, signedInAt: before })).toMatchObject({ id: users.other.id });

    await prisma.verificationToken.create({ data: { identifier: users.other.email, token: `t-${tag}`, expires: new Date(Date.now() + 60_000) } });
    await completePasswordReset(`t-${tag}`, users.other.email, form({ password: 'new password', confirm: 'new password' }));

    await expect(jwt({ id: users.other.id, signedInAt: before })).rejects.toThrow('SESSION_EXPIRED');
    expect(await jwt({ id: users.other.id, signedInAt: Date.now() + 1000 })).toMatchObject({ id: users.other.id });
  });

  it('needs a current code to turn off 2FA', async () => {
    const secret = authenticator.generateSecret();
    await prisma.user.update({ where: { id: users.mod.id }, data: { twoFactorEnabled: true, twoFactorSecret: secret } });
    loginAs(users.mod);
    expect(await disableTwoFactor(users.mod.id, '000000')).toMatchObject({ success: false });
    expect((await prisma.user.findUnique({ where: { id: users.mod.id } }))!.twoFactorEnabled).toBe(true);
    expect(await disableTwoFactor(users.mod.id, authenticator.generate(secret))).toEqual({ success: true });
    expect((await prisma.user.findUnique({ where: { id: users.mod.id } }))!.twoFactorEnabled).toBe(false);
  });
});
