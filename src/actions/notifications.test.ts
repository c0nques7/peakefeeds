import { describe, it, expect, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { markAsRead } from './notifications';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth.config', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ prisma: { notification: { update: vi.fn(), updateMany: vi.fn() } } }));

describe('markAsRead', () => {
  it("only matches the caller's own notification", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'me' } } as never);
    await markAsRead('someone-elses-notification');
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'someone-elses-notification', userId: 'me' },
      data: { isRead: true },
    });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });
});
