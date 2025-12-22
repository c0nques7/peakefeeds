# The Truth Layer (Verification Protocol)

## Concept

The "Truth Layer" is Peake Feeds' mechanism for proving the provenance and integrity of content. Unlike traditional platforms where database entries can be silently edited by admins, Peake Feeds links content to a cryptographic signature from the author.

## How it Works

### 1. Content Hashing
Before a post leaves the user's device (browser), we generate a **Content Hash**.

```typescript
// Pseudo-code for Hashing Logic
const salt = crypto.randomUUID();
const message = postContent.trim();
const contentHash = sha256(message + "::" + salt);
```

*   **Salt**: Adds entropy to prevent rainbow table attacks on short messages.
*   **Hash**: Creates a fixed-length fingerprint of the content.

### 2. Wallet Signature
The user's Web3 wallet (MetaMask, Coinbase, etc.) is requested to sign the `contentHash`.

*   **Function**: `personal_sign` or `eth_signTypedData` (EIP-712).
*   **Result**: A 65-byte ECDSA signature (`0x...`).

This signature proves:
1.  **Identity**: Only the owner of `walletAddress` could have signed it.
2.  **Integrity**: If `postContent` changes by one byte, the signature is invalid.

### 3. Server-Side Validation
When the post is submitted via `src/actions/create-post.ts`:

1.  Server receives: `{ content, salt, signature, walletAddress }`.
2.  Server re-calculates `expectedHash = sha256(content + "::" + salt)`.
3.  Server recovers the signer address from `signature` and `expectedHash`.
4.  **Check**: Does `recoveredAddress` match `walletAddress`?
    *   **Yes**: Post is authentic. Saved with `isVerified = true`.
    *   **No**: Post is rejected or flagged as unverified.

### 4. On-Chain Anchoring (Optional)
For maximum durability, the hash can be stored on the Optimism blockchain.

*   **Contract**: `PostVerifier.sol`
*   **Method**: `verifyPost(bytes32 _contentHash)`
*   **Event Emitted**: `PostVerified(address indexed author, bytes32 indexed contentHash, uint256 timestamp)`

This creates a permanent public record that "User X published Content Y at Time Z".

## Ad-Sponsored Verification (Gasless)

To lower the barrier to entry, users can "Sponsor Gas" by engaging with ads.

1.  User clicks "Verify (Watch Ad)".
2.  Ad plays to completion.
3.  Client receives a temporary "Proof of View" token.
4.  Client submits post + token to backend.
5.  Backend validates token.
6.  Backend's **Relayer Wallet** calls the smart contract, paying the gas fees.
7.  The user gets the on-chain verification badge without holding ETH/OP.
