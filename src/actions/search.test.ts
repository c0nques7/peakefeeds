import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { searchChannels } from './search';

// Integration tests against the local database: channel search by name and by tag.

const tag = `srch${Date.now()}`;
let userId: string;
let channelId: string;

beforeAll(async () => {
  userId = (await prisma.user.create({ data: { email: `${tag}@example.com`, username: tag } })).id;
  channelId = (await prisma.channel.create({
    data: { name: `Mountain Bikes ${tag}`, slug: `mtb-${tag}`, creatorId: userId, tags: [`Cycling${tag}`, 'outdoors'] },
  })).id;
});

afterAll(async () => {
  await prisma.channel.deleteMany({ where: { id: channelId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

const ids = async (q: string) => (await searchChannels(q)).map(c => c.id);

describe('searchChannels', () => {
  it('finds a channel by name', async () => {
    expect(await ids(`bikes ${tag}`)).toContain(channelId);
  });

  it('finds a channel by part of a tag, ignoring case and a leading #', async () => {
    expect(await ids(`cycling${tag}`)).toContain(channelId);
    expect(await ids(`#CYCLING${tag}`)).toContain(channelId);
    expect(await ids(`cling${tag}`)).toContain(channelId);
  });

  it('treats _ and % in a tag search literally', async () => {
    expect(await ids(`cyc_ing${tag}`)).not.toContain(channelId);
    expect(await ids(`cyc%${tag}`)).not.toContain(channelId);
  });
});
