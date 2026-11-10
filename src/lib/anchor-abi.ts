// ABI of contracts/src/PeakeAnchor.sol. Kept dependency-free so the contract tests can check it
// against the compiler's output (contracts/test/PeakeAnchor.test.mjs).
export const anchorAbi = [
  {
    type: 'event',
    name: 'Anchored',
    anonymous: false,
    inputs: [
      { name: 'author', type: 'address', indexed: true, internalType: 'address' },
      { name: 'contentHash', type: 'bytes32', indexed: true, internalType: 'bytes32' },
    ],
  },
  {
    type: 'function',
    name: 'anchor',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'contentHash', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [],
  },
] as const;
