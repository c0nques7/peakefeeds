# PeakeAnchor

The contract behind verified posts. A verified post's fingerprint is `keccak256(content | salt)`
(`src/lib/verification.ts`). The author's own wallet calls `anchor(fingerprint)`, paying the gas,
and the contract emits `Anchored(author, contentHash)` with `author = msg.sender`. The server
(`src/lib/anchor-verify.ts`) only saves the post as verified once that event is on-chain, from
our contract, for the account's linked wallet and the exact hash it recomputes.

The contract has no owner, no storage and refuses ETH, so there is nothing to administer, upgrade
or drain. The salt never goes on-chain, so the fingerprint reveals nothing about the post.

## Develop

```bash
cd contracts
npm ci
npm test        # compiles with the pinned solc-js, then runs the tests in an in-process EVM
```

`out/PeakeAnchor.json` (ABI and bytecode) is committed and CI checks it matches the source. The
app's copy of the ABI lives in `src/lib/anchor-abi.ts`; a test checks the two agree.

## Deploy

Any wallet with a little ETH on the chain can deploy; it gets no rights over the contract.

```bash
DEPLOYER_PRIVATE_KEY=0x... npm run deploy -- optimism-sepolia   # testnet first
DEPLOYER_PRIVATE_KEY=0x... npm run deploy -- optimism
```

The script prints the address. Set `NEXT_PUBLIC_ANCHOR_CHAIN_ID` (10, or 11155420 for OP Sepolia)
and `NEXT_PUBLIC_ANCHOR_CONTRACT_ADDRESS` in Vercel, plus `ANCHOR_RPC_URL` for a dedicated RPC.
Verified posting stays off in the app until the address is set.
