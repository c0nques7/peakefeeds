import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEVM } from '@ethereumjs/evm';
import { createAddressFromString, hexToBytes, bytesToHex } from '@ethereumjs/util';
import { encodeFunctionData, decodeEventLog, keccak256, toBytes, getAddress } from 'viem';
import { anchorAbi } from '../../src/lib/anchor-abi.ts';

const artifact = JSON.parse(readFileSync(new URL('../out/PeakeAnchor.json', import.meta.url), 'utf8'));
const alice = '0x00000000000000000000000000000000000a11ce';
const bob = '0x0000000000000000000000000000000000000b0b';

async function deploy() {
  const evm = await createEVM();
  const result = await evm.runCall({
    caller: createAddressFromString(alice),
    data: hexToBytes(artifact.bytecode),
    gasLimit: 1_000_000n,
    skipBalance: true,
  });
  assert.equal(result.execResult.exceptionError, undefined);
  return { evm, address: result.createdAddress };
}

async function anchor(evm, address, caller, contentHash, value = 0n) {
  return evm.runCall({
    caller: createAddressFromString(caller),
    to: address,
    value,
    data: hexToBytes(encodeFunctionData({ abi: anchorAbi, functionName: 'anchor', args: [contentHash] })),
    gasLimit: 100_000n,
    skipBalance: true,
  });
}

const logsOf = (result) => (result.execResult.logs ?? []).map(([, topics, data]) =>
  decodeEventLog({ abi: anchorAbi, topics: topics.map(bytesToHex), data: bytesToHex(data) }));

test("the app's ABI matches the compiled contract", () => {
  const normalize = (abi) => JSON.stringify([...abi].map((item) => ({
    type: item.type, name: item.name, stateMutability: item.stateMutability,
    inputs: item.inputs.map(({ name, type, indexed }) => ({ name, type, indexed })),
  })).sort((a, b) => a.name.localeCompare(b.name)));
  assert.equal(normalize(anchorAbi), normalize(artifact.abi));
});

test('anchor emits Anchored with the caller as author', async () => {
  const { evm, address } = await deploy();
  const hash = keccak256(toBytes('hello|salt'));
  const result = await anchor(evm, address, bob, hash);
  assert.equal(result.execResult.exceptionError, undefined);
  const logs = logsOf(result);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].eventName, 'Anchored');
  assert.equal(logs[0].args.author, getAddress(bob));
  assert.equal(logs[0].args.contentHash, hash);
});

test('the same hash can be anchored by different wallets, each as itself', async () => {
  const { evm, address } = await deploy();
  const hash = keccak256(toBytes('same'));
  const first = logsOf(await anchor(evm, address, alice, hash));
  const second = logsOf(await anchor(evm, address, bob, hash));
  assert.equal(first[0].args.author, getAddress(alice));
  assert.equal(second[0].args.author, getAddress(bob));
});

test('rejects ETH so nothing can get stuck in the contract', async () => {
  const { evm, address } = await deploy();
  const result = await anchor(evm, address, alice, keccak256(toBytes('x')), 1n);
  assert.ok(result.execResult.exceptionError, 'expected a revert');
});

test('an anchor call costs well under 30k execution gas', async () => {
  const { evm, address } = await deploy();
  const result = await anchor(evm, address, alice, keccak256(toBytes('gas')));
  // Execution gas only (the 21k base transaction cost and calldata are on top)
  assert.ok(result.execResult.executionGasUsed < 30_000n, `used ${result.execResult.executionGasUsed}`);
});
