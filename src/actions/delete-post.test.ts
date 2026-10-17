import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';

// Integration tests against the local database: who can delete a verified post.

vi.mock('next-auth', async (orig) => ({ ...(await orig<typeof import('next-auth')>()), getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/admin-logger', () => ({ createAdminLog: vi.fn() }));

import { deletePost } from './delete-post';

const tag = `dp${Date.now()}`;
type U = { id: string; role: UserRole };
const users = {} as Record<'author' | 'mod' | 'admin', U>;
let channelId: string;

const loginAs = (u: U) => vi.mocked(getServerSession).mockResolvedValue({ user: { id: u.id, role: u.role } } as never);
const verifiedPost = async () =>
  (await prisma.post.create({ data: { content: 'signed', channelId, authorId: users.author.id, isVerified: true } })).id;

beforeAll(async () => {
  for (const [name, role] of [['author', UserRole.STANDARD], ['mod', UserRole.MODERATOR], ['admin', UserRole.ADMIN]] as const) {
    users[name] = await prisma.user.create({ data: { email: `${name}-${tag}@example.com`, username: `${name}_${tag}`, role }, select: { id: true, role: true } });
  }
  // The author owns the channel too, so channel ownership doesn't help either
  channelId = (await prisma.channel.create({ data: { name: `DP ${tag}`, slug: `dp-${tag}`, creatorId: users.author.id } })).id;
});

afterAll(async () => {
  await prisma.channel.deleteMany({ where: { id: channelId } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(users).map(u => u.id) } } });
});

describe('deleting a verified post', () => {
  it('is refused for its author, even when they own the channel', async () => {
    const id = await verifiedPost();
    loginAs(users.author);
    expect(await deletePost(id, 'changed my mind')).toEqual({ error: expect.stringMatching(/Verified posts cannot be deleted/) });
    expect(await prisma.post.count({ where: { id } })).toBe(1);
  });

  it('needs a reason from staff', async () => {
    const id = await verifiedPost();
    loginAs(users.admin);
    expect(await deletePost(id)).toEqual({ error: expect.stringMatching(/reason is required/) });
    expect(await prisma.post.count({ where: { id } })).toBe(1);
  });

  it('works for site moderators and admins with a reason', async () => {
    for (const staff of [users.mod, users.admin]) {
      const id = await verifiedPost();
      loginAs(staff);
      expect(await deletePost(id, 'ILLEGAL_CONTENT')).toEqual({ success: true });
      expect(await prisma.post.count({ where: { id } })).toBe(0);
    }
  });
});
