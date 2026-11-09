import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { loadSidebarData } from './sidebar-data';

// Integration test against the local database
const tag = `sb${Date.now()}`;
let userIds: string[] = [];
let newestId: string;
let emptyId: string;

beforeAll(async () => {
  const users = await Promise.all([0, 1, 2].map(i => prisma.user.create({
    data: { email: `u${i}-${tag}@example.com`, username: `u${i}_${tag}`, ageConfirmedAt: new Date() },
    select: { id: true },
  })));
  userIds = users.map(u => u.id);

  // Created first, so it's the older of the two
  emptyId = (await prisma.channel.create({
    data: { name: `Empty ${tag}`, slug: `empty-${tag}`, creatorId: userIds[0] },
  })).id;

  newestId = (await prisma.channel.create({
    data: {
      name: `Busy ${tag}`, slug: `busy-${tag}`, creatorId: userIds[0],
      createdAt: new Date(Date.now() + 1000),
      subscribers: { create: userIds.map(userId => ({ userId })) },
    },
  })).id;

  await prisma.post.create({
    data: { content: 'older post', channelId: newestId, authorId: userIds[0], createdAt: new Date(Date.now() - 60_000), likesCount: 3 },
  });
  await prisma.post.create({
    data: { title: 'Newest title', content: 'newest post', channelId: newestId, authorId: userIds[1], likesCount: 1_000_000 },
  });
});

afterAll(async () => {
  await prisma.channel.deleteMany({ where: { id: { in: [newestId, emptyId] } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe('loadSidebarData', () => {
  it('returns the newest channels with subscriber counts and each latest post', async () => {
    const { channels } = await loadSidebarData(2);
    expect(channels.map(c => c.id)).toEqual([newestId, emptyId]);
    expect(channels[0]).toMatchObject({
      slug: `busy-${tag}`, subscribersCount: 3, latest: { title: 'Newest title', content: 'newest post' },
    });
    expect(channels[1]).toMatchObject({ subscribersCount: 0, latest: null });
  });

  it('ranks this week’s posts by likes', async () => {
    const { trendingPosts } = await loadSidebarData(5, 1);
    expect(trendingPosts).toEqual([expect.objectContaining({ content: 'newest post', likesCount: 1_000_000, channelSlug: `busy-${tag}` })]);
  });
});
