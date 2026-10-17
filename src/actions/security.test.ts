import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';

// Integration tests against the local database: they prove the queries themselves
// keep secrets out and reject callers who aren't allowed.

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/admin-logger', () => ({ createAdminLog: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class { emails = { send: vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null }) } },
}));

import { getMessages, sendMessage } from './messaging';
import { getTicketAction, addMessageAction, resolveTicketAction, updateInternalNotesAction } from './support';
import { createUser } from './admin-users';
import { updateUserDetails } from './admin-user-detail';

const tag = `sec${Date.now()}`;
type U = { id: string; email: string; role: UserRole; username: string };
const users: Record<'alice' | 'bob' | 'eve' | 'mod' | 'admin', U> = {} as never;
let conversationId: string;
let ticketId: string;

const loginAs = (u: U | null) =>
  vi.mocked(getServerSession).mockResolvedValue(
    u ? ({ user: { id: u.id, role: u.role, username: u.username, email: u.email } } as never) : null,
  );

beforeAll(async () => {
  const roles = { alice: 'STANDARD', bob: 'STANDARD', eve: 'STANDARD', mod: 'MODERATOR', admin: 'ADMIN' } as const;
  for (const [name, role] of Object.entries(roles)) {
    users[name as keyof typeof users] = await prisma.user.create({
      data: {
        email: `${name}-${tag}@example.com`,
        username: `${name}_${tag}`,
        role,
        passwordHash: 'secret-hash',
        twoFactorSecret: 'secret-2fa',
        ageConfirmedAt: new Date(),
      },
      select: { id: true, email: true, role: true, username: true },
    }) as U;
  }
  conversationId = (await prisma.conversation.create({
    data: { participants: { connect: [{ id: users.alice.id }, { id: users.bob.id }] } },
  })).id;
  ticketId = (await prisma.supportTicket.create({
    data: {
      userId: users.alice.id,
      internalNotes: 'staff-only notes',
      messages: { create: [{ text: 'help me', sender: 'user' }, { text: 'internal remark', sender: 'admin', isInternal: true }] },
    },
  })).id;
});

afterAll(async () => {
  const ids = Object.values(users).map(u => u.id);
  await prisma.conversation.deleteMany({ where: { id: conversationId } });
  await prisma.supportTicket.deleteMany({ where: { userId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { OR: [{ id: { in: ids } }, { email: { contains: tag.toLowerCase() } }] } });
});

beforeEach(() => vi.mocked(getServerSession).mockReset());

describe('messaging', () => {
  it('returns participants without password hashes, 2FA secrets or emails', async () => {
    loginAs(users.alice);
    const res = await getMessages(conversationId);
    expect(res).toMatchObject({ success: true });
    const participants = (res as { participants: Record<string, unknown>[] }).participants;
    expect(participants).toHaveLength(2);
    for (const p of participants) {
      expect(Object.keys(p).sort()).toEqual(['id', 'image', 'name', 'username']);
    }
  });

  it('rejects sending into a conversation the sender is not part of', async () => {
    loginAs(users.eve);
    expect(await sendMessage(conversationId, 'hi')).toEqual({ error: 'Conversation not found' });
    expect(await prisma.directMessage.count({ where: { conversationId } })).toBe(0);
  });

  it('still lets participants send', async () => {
    loginAs(users.bob);
    expect(await sendMessage(conversationId, 'hello alice')).toMatchObject({ success: true });
  });
});

describe('support tickets', () => {
  it("hides another user's ticket", async () => {
    loginAs(users.eve);
    expect(await getTicketAction(ticketId)).toEqual({ success: false, error: 'Ticket not found' });
  });

  it('shows the owner their ticket without internal notes', async () => {
    loginAs(users.alice);
    const res = await getTicketAction(ticketId);
    expect(res.success).toBe(true);
    const data = (res as { data: { internalNotes: unknown; messages: { text: string }[] } }).data;
    expect(data.internalNotes).toBeNull();
    expect(data.messages.map(m => m.text)).toEqual(['help me']);
  });

  it('shows staff the internal notes', async () => {
    loginAs(users.mod);
    const res = await getTicketAction(ticketId);
    const data = (res as { data: { internalNotes: unknown; messages: unknown[] } }).data;
    expect(data.internalNotes).toBe('staff-only notes');
    expect(data.messages).toHaveLength(2);
  });

  it('blocks non-staff from posting as admin or into other tickets', async () => {
    loginAs(users.eve);
    await expect(addMessageAction(ticketId, 'fake staff reply', 'admin')).rejects.toThrow();
    expect(await addMessageAction(ticketId, 'not my ticket', 'user')).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('blocks logged-out and non-staff callers from staff actions', async () => {
    loginAs(null);
    await expect(resolveTicketAction(ticketId)).rejects.toThrow();
    loginAs(users.eve);
    await expect(updateInternalNotesAction(ticketId, 'overwritten')).rejects.toThrow();
    const t = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    expect(t?.status).toBe('OPEN');
    expect(t?.internalNotes).toBe('staff-only notes');
  });
});

describe('admin user management', () => {
  const form = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return fd;
  };

  it('stops moderators creating admins', async () => {
    loginAs(users.mod);
    const res = await createUser(form({ email: `x-${tag}@example.com`, username: `x_${tag}`, password: 'pw123456', role: 'ADMIN' }));
    expect(res).toEqual({ error: 'Only admins can create admin or moderator accounts.' });
  });

  it('lets admins create users and stores the email lowercased', async () => {
    loginAs(users.admin);
    const res = await createUser(form({ email: `Mixed-${tag}@Example.com`, username: `mixed_${tag}`, password: 'pw123456', role: 'STANDARD' }));
    expect(res).not.toHaveProperty('error');
    const created = await prisma.user.findUnique({ where: { username: `mixed_${tag}` }, select: { email: true } });
    expect(created?.email).toBe(`mixed-${tag}@example.com`.toLowerCase());
  });

  it("stops moderators changing an admin's email", async () => {
    loginAs(users.mod);
    const res = await updateUserDetails(users.admin.id, { email: `takeover-${tag}@example.com` });
    expect(res).toEqual({ error: 'Only admins can edit staff accounts.' });
  });

  it('never returns the password hash when updating a user', async () => {
    loginAs(users.admin);
    const res = await updateUserDetails(users.bob.id, { name: 'Bob' });
    expect(res).toMatchObject({ success: true });
    expect((res as { user: object }).user).not.toHaveProperty('passwordHash');
    expect((res as { user: object }).user).not.toHaveProperty('twoFactorSecret');
  });
});
