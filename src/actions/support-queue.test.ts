import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';

// Integration tests against the local database: the polled lists stay small.

vi.mock('next-auth', async (orig) => ({ ...(await orig<typeof import('next-auth')>()), getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/admin-logger', () => ({ createAdminLog: vi.fn() }));

import { getAllTicketsAction, getStaffTicketAction, createTicketAction } from './support';
import { getConversations } from './messaging';

const tag = `sq${Date.now()}`;
type U = { id: string; role: UserRole; username: string };
const users = {} as Record<'customer' | 'staff', U>;
let ticketId: string;

const loginAs = (u: U) => vi.mocked(getServerSession).mockResolvedValue({ user: { id: u.id, role: u.role, username: u.username } } as never);

beforeAll(async () => {
  for (const [name, role] of [['customer', UserRole.STANDARD], ['staff', UserRole.MODERATOR]] as const) {
    users[name] = await prisma.user.create({
      data: { email: `${name}-${tag}@example.com`, username: `${name}_${tag}`, role },
      select: { id: true, role: true, username: true },
    }) as U;
  }
  const t0 = Date.now() - 60_000;
  ticketId = (await prisma.supportTicket.create({
    data: {
      userId: users.customer.id,
      messages: { create: [
        { text: `first ${tag}`, sender: 'user', createdAt: new Date(t0) },
        { text: 'a reply', sender: 'admin', adminId: users.staff.id, createdAt: new Date(t0 + 1000) },
        { text: 'secret internal note', sender: 'admin', adminId: users.staff.id, isInternal: true, createdAt: new Date(t0 + 2000) },
      ] },
    },
  })).id;
});

afterAll(async () => {
  await prisma.supportTicket.deleteMany({ where: { OR: [{ id: ticketId }, { userId: users.customer.id }] } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(users).map(u => u.id) } } });
});

describe('staff support queue', () => {
  it('lists each ticket with its latest message only', async () => {
    loginAs(users.staff);
    const res = await getAllTicketsAction();
    const ticket = res.data!.find(t => t.id === ticketId)!;
    expect(ticket.messages.map(m => m.text)).toEqual(['secret internal note']);
  });

  it('searches every message on the server', async () => {
    loginAs(users.staff);
    expect((await getAllTicketsAction(`FIRST ${tag}`)).data!.map(t => t.id)).toEqual([ticketId]);
    expect((await getAllTicketsAction(`no-such-text-${tag}`)).data).toEqual([]);
  });

  it('loads the whole thread for the open ticket', async () => {
    loginAs(users.staff);
    const res = await getStaffTicketAction(ticketId);
    expect(res.data!.messages.map(m => m.text)).toEqual([`first ${tag}`, 'a reply', 'secret internal note']);
  });

  it('is staff only', async () => {
    loginAs(users.customer);
    expect(await getAllTicketsAction()).toMatchObject({ success: false });
    expect(await getStaffTicketAction(ticketId)).toMatchObject({ success: false });
  });
});

describe('inbox', () => {
  it("never previews a staff-only note in the user's inbox", async () => {
    loginAs(users.customer);
    const res = await getConversations();
    const ticket = res.data!.find(c => c.id === ticketId)!;
    expect(ticket.messages[0].content).toBe('a reply');
  });
});

describe('ticket creation cap', () => {
  it('holds under a burst of parallel requests', async () => {
    loginAs(users.customer);
    await Promise.all(Array.from({ length: 10 }, (_, i) => createTicketAction(`burst ${i} ${tag}`)));
    // The customer already had one ticket; the cap is 5 an hour
    expect(await prisma.supportTicket.count({ where: { userId: users.customer.id } })).toBe(5);
  });
});
