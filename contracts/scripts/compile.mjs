// Compiles src/PeakeAnchor.sol with the pinned solc-js and writes out/PeakeAnchor.json (abi + bytecode).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import solc from 'solc';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/PeakeAnchor.sol'), 'utf8');

const output = JSON.parse(solc.compile(JSON.stringify({
  language: 'Solidity',
  sources: { 'PeakeAnchor.sol': { content: source } },
  settings: {
    // Cancun is live on OP Mainnet and OP Sepolia; newer defaults could emit opcodes they lack.
    evmVersion: 'cancun',
    optimizer: { enabled: true, runs: 10_000 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  },
})));

const errors = (output.errors ?? []).filter((e) => e.severity === 'error');
for (const e of output.errors ?? []) console.error(e.formattedMessage);
if (errors.length) process.exit(1);

const contract = output.contracts['PeakeAnchor.sol'].PeakeAnchor;
mkdirSync(join(root, 'out'), { recursive: true });
writeFileSync(join(root, 'out/PeakeAnchor.json'), JSON.stringify({
  compiler: solc.version(),
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
  deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
}, null, 2) + '\n');
console.log(`Compiled PeakeAnchor with solc ${solc.version()}`);
