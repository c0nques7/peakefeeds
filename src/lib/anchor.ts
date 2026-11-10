import { isAddress, type Address } from 'viem';
import { optimism, optimismSepolia } from 'viem/chains';

export { anchorAbi } from './anchor-abi';

/**
 * Verified posts are anchored by the author's own wallet calling PeakeAnchor.anchor(contentHash)
 * (contracts/src/PeakeAnchor.sol). OP Mainnet by default; NEXT_PUBLIC_ANCHOR_CHAIN_ID=11155420
 * points everything at OP Sepolia for testing.
 */
export const anchorChain =
  process.env.NEXT_PUBLIC_ANCHOR_CHAIN_ID === String(optimismSepolia.id) ? optimismSepolia : optimism;

const configuredAddress = process.env.NEXT_PUBLIC_ANCHOR_CONTRACT_ADDRESS;

/** The deployed PeakeAnchor contract, or null when it isn't configured (verified posting is then off). */
export const anchorContractAddress: Address | null =
  configuredAddress && isAddress(configuredAddress) ? configuredAddress : null;

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
export const isTxHash = (value: string): value is `0x${string}` => TX_HASH.test(value);

/** Block explorer link for an anchor transaction on the configured chain. */
export function anchorTxUrl(txHash: string): string {
  return `${anchorChain.blockExplorers.default.url}/tx/${txHash}`;
}
