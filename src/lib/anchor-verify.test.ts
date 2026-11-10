import { describe, it, expect, vi } from 'vitest';
import { encodeAbiParameters, encodeEventTopics, keccak256, toBytes, type TransactionReceipt } from 'viem';

const CONTRACT = '0x1111111111111111111111111111111111111111';
vi.stubEnv('NEXT_PUBLIC_ANCHOR_CONTRACT_ADDRESS', CONTRACT);
const { verifyAnchorTx } = await import('./anchor-verify');
const { anchorAbi } = await import('./anchor-abi');

const author = '0x00000000000000000000000000000000000A11cE';
const contentHash = keccak256(toBytes('post|salt'));
const txHash = `0x${'ab'.repeat(32)}` as const;

const anchoredLog = (opts: { address?: string; author?: `0x${string}`; hash?: `0x${string}` } = {}) => ({
  address: opts.address ?? CONTRACT,
  topics: encodeEventTopics({ abi: anchorAbi, eventName: 'Anchored', args: { author: opts.author ?? author, contentHash: opts.hash ?? contentHash } }),
  data: encodeAbiParameters([], []),
  blockNumber: BigInt(1), blockHash: txHash, logIndex: 0, transactionHash: txHash, transactionIndex: 0, removed: false,
});

const clientWith = (receipt: Partial<TransactionReceipt> | Error) => ({
  waitForTransactionReceipt: vi.fn(async () => {
    if (receipt instanceof Error) throw receipt;
    return { status: 'success', logs: [], ...receipt } as TransactionReceipt;
  }),
});

describe('verifyAnchorTx', () => {
  it('accepts an Anchored event from our contract for this author and hash', async () => {
    const client = clientWith({ logs: [anchoredLog()] as never });
    expect(await verifyAnchorTx({ txHash, author: author.toLowerCase(), contentHash }, client)).toEqual({ ok: true });
  });

  it('rejects a reverted transaction', async () => {
    const client = clientWith({ status: 'reverted', logs: [anchoredLog()] as never });
    expect((await verifyAnchorTx({ txHash, author, contentHash }, client)).ok).toBe(false);
  });

  it('rejects a transaction it cannot find', async () => {
    const client = clientWith(new Error('not found'));
    expect((await verifyAnchorTx({ txHash, author, contentHash }, client)).ok).toBe(false);
  });

  it('rejects an anchor made by a different wallet', async () => {
    const client = clientWith({ logs: [anchoredLog({ author: '0x0000000000000000000000000000000000000b0b' })] as never });
    expect((await verifyAnchorTx({ txHash, author, contentHash }, client)).ok).toBe(false);
  });

  it('rejects an anchor of a different hash', async () => {
    const client = clientWith({ logs: [anchoredLog({ hash: keccak256(toBytes('other')) })] as never });
    expect((await verifyAnchorTx({ txHash, author, contentHash }, client)).ok).toBe(false);
  });

  it('ignores look-alike events from other contracts', async () => {
    const client = clientWith({ logs: [anchoredLog({ address: '0x2222222222222222222222222222222222222222' })] as never });
    expect((await verifyAnchorTx({ txHash, author, contentHash }, client)).ok).toBe(false);
  });
});
