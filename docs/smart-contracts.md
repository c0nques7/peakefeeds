# Smart Contracts

Peake Feeds utilizes the **Optimism** blockchain (an Ethereum L2) to provide an immutable "Truth Layer" for content verification.

## Contract: `PostVerifier.sol`

This is a minimalist contract designed to act as a public notary. It does not store content data (which is expensive); instead, it stores **cryptographic proofs**.

### Source Code
*   **Location**: `contracts/Verified.sol`
*   **Language**: Solidity ^0.8.26

### Functionality

#### `signPost`
The primary entry point. It emits an event that indexers (like The Graph or our own internal indexer) can pick up.

```solidity
function signPost(bytes32 _contentHash, string calldata _channelSlug) external;
```

*   **`_contentHash`**: The SHA-256 hash of the post content (generated client-side).
*   **`_channelSlug`**: The identifier of the channel where the post was made.
*   **`msg.sender`**: The wallet address of the author (automatically captured by the EVM).

### Events

#### `PostVerified`
Emitted whenever `signPost` is called successfully.

```solidity
event PostVerified(
    address indexed author, 
    bytes32 indexed contentHash, 
    string channelSlug,
    uint256 timestamp
);
```

*   **`indexed author`**: Allows filtering events by a specific user.
*   **`indexed contentHash`**: Allows proving that a specific piece of content was published at a specific time.

## Deployment

We use **Hardhat Ignition** for declarative deployment management.

### Prerequisites
*   `OPTIMISM_RPC_URL` set in `.env`
*   `PRIVATE_KEY` set in `.env` (The deployer wallet must have ETH for gas).

### Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to local Hardhat Network
npx hardhat ignition deploy ignition/modules/PostVerifier.ts

# Deploy to Optimism Mainnet (requires env vars)
npx hardhat ignition deploy ignition/modules/PostVerifier.ts --network optimism
```

### Deployed Addresses

| Network | Address |
| :--- | :--- |
| **Localhost** | *Run deployment to generate* |
| **Optimism Sepolia** | `TBD` |
| **Optimism Mainnet** | `TBD` |

*(Note: Update this table after your first production deployment)*
