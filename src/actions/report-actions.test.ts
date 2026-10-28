import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';

// Integration tests against the local database.

vi.mock('next-auth', async (orig) => ({ ...(await orig<typeof import('next-auth')>()), getServerSession: vi.fn() }));

import { submitReport } from './report-actions';

const tag = `ra${Date.now()}`;
const users = {} as Record<'reporter' | 'author' | 'staff', { id: string }>;
let postId: string;
let channelId: string;

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
};

beforeAll(async () => {
  for (const [name, role] of [['reporter', UserRole.STANDARD], ['author', UserRole.STANDARD], ['staff', UserRole.MODERATOR]] as const) {
    users[name] = await prisma.user.create({ data: { email: `${name}-${tag}@example.com`, username: `${name}_${tag}`, role }, select: { id: true } });
  }
  channelId = (await prisma.channel.create({ data: { name: `RA ${tag}`, slug: `ra-${tag}`, creatorId: users.author.id } })).id;
  postId = (await prisma.post.create({ data: { content: 'reported', channelId, authorId: users.author.id } })).id;
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: users.reporter.id } } as never);
});

afterAll(async () => {
  const ids = Object.values(users).map(u => u.id);
  await prisma.report.deleteMany({ where: { reporterId: { in: ids } } });
  await prisma.channel.deleteMany({ where: { id: channelId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

describe('submitReport', () => {
  it('files a report against the post author and notifies staff', async () => {
    const res = await submitReport({}, form({ targetId: postId, targetType: 'POST', reason: 'SPAM' }));
    expect(res).toMatchObject({ success: true, reportedUserId: users.author.id });
    const report = await prisma.report.findUnique({ where: { id: res.reportId } });
    expect(report).toMatchObject({ postId, reportedProfileId: users.author.id, status: 'PENDING' });
    expect(await prisma.notification.count({ where: { reportId: res.reportId, userId: users.staff.id } })).toBe(1);
  });

  it("doesn't file or notify again while the same report is still open", async () => {
    const before = await prisma.report.count({ where: { reporterId: users.reporter.id } });
    const res = await submitReport({}, form({ targetId: postId, targetType: 'POST', reason: 'OTHER' }));
    expect(res).toMatchObject({ success: true, message: expect.stringMatching(/already reported/) });
    expect(await prisma.report.count({ where: { reporterId: users.reporter.id } })).toBe(before);
  });

  it('rejects missing targets and oversized details', async () => {
    expect(await submitReport({}, form({ targetId: 'nope', targetType: 'POST', reason: 'SPAM' })))
      .toMatchObject({ success: false, message: 'Post not found.' });
    expect(await submitReport({}, form({ targetId: users.author.id, targetType: 'USER', reason: 'SPAM', details: 'x'.repeat(2001) })))
      .toMatchObject({ success: false });
  });

  it('files only one report when the same one is submitted in parallel', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () =>
      submitReport({}, form({ targetId: users.author.id, targetType: 'USER', reason: 'OTHER' }))));
    expect(results.every(r => r.success)).toBe(true);
    expect(await prisma.report.count({ where: { reporterId: users.reporter.id, targetType: 'USER', reportedProfileId: users.author.id } })).toBe(1);
  });
});
