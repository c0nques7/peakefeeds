import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';

// Ticket creation caps, with the database mocked: `counts` decides what each count query returns.

const { requestHeaders } = vi.hoisted(() => ({ requestHeaders: new Map<string, string>() }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => ({ get: (k: string) => requestHeaders.get(k) ?? null }) }));
vi.mock('@/lib/db', () => ({
  prisma: { supportTicket: { count: vi.fn(), create: vi.fn() } },
}));
// The lock needs a real database (see support-queue.test.ts); here it just runs the callback
vi.mock('@/lib/advisory-lock', async () => {
  const { prisma } = await import('@/lib/db');
  return { withAdvisoryLock: (_key: string, fn: (tx: unknown) => unknown) => fn(prisma) };
});

import { createTicketAction } from './support';

type CountArgs = { where: { userId?: string | null; clientKey?: string } };
const counts = (byClient: number, allAnonymous: number) =>
  vi.mocked(prisma.supportTicket.count).mockImplementation((async ({ where }: CountArgs) =>
    where.clientKey ? byClient : allAnonymous) as never);

describe('createTicketAction caps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestHeaders.clear();
    requestHeaders.set('x-real-ip', '203.0.113.7');
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.supportTicket.create).mockResolvedValue({ id: 't1' } as never);
  });

  it('stops one anonymous visitor after a few tickets', async () => {
    counts(3, 3);
    expect(await createTicketAction('help')).toMatchObject({ success: false });
    expect(prisma.supportTicket.create).not.toHaveBeenCalled();
  });

  it("doesn't let one visitor's tickets block another visitor", async () => {
    counts(0, 30);
    expect(await createTicketAction('help')).toMatchObject({ success: true });
  });

  it('records a hashed client key, never the raw IP', async () => {
    counts(0, 0);
    await createTicketAction('help');
    const data = vi.mocked(prisma.supportTicket.create).mock.calls[0][0].data;
    expect(data.clientKey).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(data)).not.toContain('203.0.113.7');
  });

  it('keeps a site-wide ceiling for anonymous tickets', async () => {
    counts(0, 100);
    expect(await createTicketAction('help')).toMatchObject({ success: false });
  });
});
