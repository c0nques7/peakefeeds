import { createPublicClient, http, isAddressEqual, parseEventLogs, type PublicClient } from 'viem';
import { anchorAbi, anchorChain, anchorContractAddress } from './anchor';

let client: PublicClient | undefined;
function getClient(): PublicClient {
  // ANCHOR_RPC_URL (a paid RPC in production) falls back to the chain's public endpoint
  client ??= createPublicClient({ chain: anchorChain, transport: http(process.env.ANCHOR_RPC_URL || undefined) }) as PublicClient;
  return client;
}

export type AnchorCheck = { ok: true } | { ok: false; error: string };

/**
 * Checks that `txHash` is a successful PeakeAnchor.anchor(contentHash) call made by `author`
 * on the configured chain. The author comes from the contract's event (msg.sender), not the
 * transaction's sender, so smart-contract wallets whose transactions are relayed still match.
 */
export async function verifyAnchorTx(
  { txHash, author, contentHash }: { txHash: `0x${string}`; author: string; contentHash: string },
  publicClient: Pick<PublicClient, 'waitForTransactionReceipt'> = getClient(),
): Promise<AnchorCheck> {
  const contract = anchorContractAddress;
  if (!contract) return { ok: false, error: 'Verified posting is not set up yet.' };

  let receipt;
  try {
    // The client already waited for the receipt; this only covers an RPC that is a block behind
    receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 15_000 });
  } catch {
    return { ok: false, error: `Couldn't find that transaction on ${anchorChain.name}.` };
  }
  if (receipt.status !== 'success') return { ok: false, error: 'The anchor transaction failed.' };

  const anchored = parseEventLogs({
    abi: anchorAbi,
    eventName: 'Anchored',
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, contract)),
  });
  const match = anchored.some((log) =>
    isAddressEqual(log.args.author, author as `0x${string}`) &&
    log.args.contentHash.toLowerCase() === contentHash.toLowerCase());

  return match ? { ok: true } : { ok: false, error: "That transaction didn't anchor this post from your linked wallet." };
}
