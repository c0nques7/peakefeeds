// Deploys PeakeAnchor.
//   DEPLOYER_PRIVATE_KEY=0x... npm run deploy -- optimism-sepolia
//   DEPLOYER_PRIVATE_KEY=0x... npm run deploy -- optimism
// RPC_URL overrides the chain's public RPC. The deployer only pays gas; it gets no rights over
// the contract, which has no owner.
import { readFileSync } from 'node:fs';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { optimism, optimismSepolia } from 'viem/chains';

const chains = { optimism, 'optimism-sepolia': optimismSepolia };
const chain = chains[process.argv[2]];
if (!chain) {
  console.error(`Usage: npm run deploy -- <${Object.keys(chains).join('|')}>`);
  process.exit(1);
}
const key = process.env.DEPLOYER_PRIVATE_KEY;
if (!key?.match(/^0x[0-9a-fA-F]{64}$/)) {
  console.error('Set DEPLOYER_PRIVATE_KEY to the 0x-prefixed key of a wallet with a little ETH on this chain.');
  process.exit(1);
}

const artifact = JSON.parse(readFileSync(new URL('../out/PeakeAnchor.json', import.meta.url), 'utf8'));
const transport = http(process.env.RPC_URL);
const account = privateKeyToAccount(key);
const wallet = createWalletClient({ account, chain, transport });
const client = createPublicClient({ chain, transport });

console.log(`Deploying PeakeAnchor to ${chain.name} from ${account.address}...`);
const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode });
console.log(`Transaction: ${chain.blockExplorers.default.url}/tx/${hash}`);
const receipt = await client.waitForTransactionReceipt({ hash });
if (receipt.status !== 'success' || !receipt.contractAddress) {
  console.error('Deployment failed.', receipt);
  process.exit(1);
}
console.log(`\nDeployed at ${receipt.contractAddress}`);
console.log(`Set in Vercel:\n  NEXT_PUBLIC_ANCHOR_CHAIN_ID=${chain.id}\n  NEXT_PUBLIC_ANCHOR_CONTRACT_ADDRESS=${receipt.contractAddress}`);
