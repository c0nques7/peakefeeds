import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

// Integration tests against the local database for the wallet-link, channel-slug and
// message-paging fixes.

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }));
const redirectMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import { getWalletLinkStatus, verifyWalletAddress } from './verify-wallet';
import { createChannel } from './create-channel';
import { getMessages } from './messaging';

const tag = `bug${Date.now()}`;
type U = { id: string; username: string };
let alice: U, bob: U;

const loginAs = (u: U) => vi.mocked(getServerSession).mockResolvedValue({ user: { id: u.id, username: u.username, role: 'STANDARD' } } as never);
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
};

beforeAll(async () => {
  alice = await prisma.user.create({ data: { email: `alice-${tag}@example.com`, username: `alice_${tag}`, ageConfirmedAt: new Date() }, select: { id: true, username: true } }) as U;
  bob = await prisma.user.create({ data: { email: `bob-${tag}@example.com`, username: `bob_${tag}`, ageConfirmedAt: new Date() }, select: { id: true, username: true } }) as U;
});

afterAll(async () => {
  const ids = [alice.id, bob.id];
  await prisma.conversation.deleteMany({ where: { participants: { some: { id: { in: ids } } } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: ids } } });
  await prisma.channel.deleteMany({ where: { creatorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

beforeEach(() => { vi.mocked(getServerSession).mockReset(); redirectMock.mockReset(); });

describe('wallet linking', () => {
  const wallet = privateKeyToAccount(generatePrivateKey());

  it('refuses to link a wallet without a valid signature', async () => {
    loginAs(alice);
    expect(await verifyWalletAddress(form({ address: wallet.address, signature: '0x1234' })))
      .toEqual({ error: "Signature doesn't match this wallet." });
  });

  it("refuses a signature made for someone else's account", async () => {
    loginAs(bob);
    const status = await getWalletLinkStatus(wallet.address);
    const bobsSignature = await wallet.signMessage({ message: (status as { message: string }).message });
    loginAs(alice);
    expect(await verifyWalletAddress(form({ address: wallet.address, signature: bobsSignature })))
      .toEqual({ error: "Signature doesn't match this wallet." });
  });

  it('links the wallet when the owner signs the link message, then reports it as linked', async () => {
    loginAs(alice);
    const status = await getWalletLinkStatus(wallet.address);
    expect(status).toMatchObject({ linked: false });
    const signature = await wallet.signMessage({ message: (status as { message: string }).message });
    expect(await verifyWalletAddress(form({ address: wallet.address, signature }))).toEqual({ success: true });
    expect(await getWalletLinkStatus(wallet.address.toLowerCase())).toEqual({ linked: true });
  });

  it('stops a second account claiming an already-linked wallet, whatever the letter case', async () => {
    loginAs(bob);
    const lower = wallet.address.toLowerCase();
    const status = await getWalletLinkStatus(lower);
    const signature = await wallet.signMessage({ message: (status as { message: string }).message });
    expect(await verifyWalletAddress(form({ address: lower, signature })))
      .toEqual({ error: 'This wallet is already linked to another account.' });
  });
});

describe('channel slugs', () => {
  const create = async (name: string) => {
    loginAs(alice);
    await createChannel({} as never, form({ name, description: 'test channel', tags: '' }));
    return redirectMock.mock.calls.at(-1)?.[0] as string;
  };

  it('gives a name with no usable characters a non-empty slug', async () => {
    const url = await create('    ');
    expect(url).toMatch(/^\/channels\/channel(-\d+)?$/);
  });

  it('adds the next free number for a taken name', async () => {
    const name = `Slug ${tag}`;
    const first = await create(name);
    const second = await create(name);
    const third = await create(name);
    expect([first, second, third]).toEqual([`/channels/slug-${tag}`, `/channels/slug-${tag}-1`, `/channels/slug-${tag}-2`]);
  });
});

describe('message paging', () => {
  it('returns only the latest 50 messages, oldest first', async () => {
    const convo = await prisma.conversation.create({
      data: { participants: { connect: [{ id: alice.id }, { id: bob.id }] } },
    });
    const start = Date.now() - 100_000;
    await prisma.directMessage.createMany({
      data: Array.from({ length: 60 }, (_, i) => ({
        conversationId: convo.id, senderId: alice.id, content: `m${i}`, createdAt: new Date(start + i * 1000),
      })),
    });

    loginAs(bob);
    const res = await getMessages(convo.id) as { data: { content: string }[] };
    expect(res.data).toHaveLength(50);
    expect(res.data[0].content).toBe('m10');
    expect(res.data.at(-1)!.content).toBe('m59');
  });
});
