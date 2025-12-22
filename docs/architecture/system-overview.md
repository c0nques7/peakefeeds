# System Architecture

## Overview

Peake Feeds operates as a **hybrid application**, bridging the gap between a traditional Web2 social platform and Web3 decentralized identity/verification.

The system is composed of three primary layers:

1.  **The Application Layer (Next.js)**: Handles UI, routing, and user interaction.
2.  **The Data Layer (Prisma + PostgreSQL)**: Manages persistent storage for user profiles, posts, social graph, and metadata.
3.  **The Truth Layer (Blockchain/Optimism)**: Provides immutable proof of content integrity and authorship.

---

## 1. Application Layer (Frontend & API)

Built with **Next.js 16 (App Router)**, the application leverages React Server Components (RSC) for performance and Server Actions for mutation logic.

### Key Technologies
*   **Framework**: Next.js 15+ (App Router)
*   **Styling**: Tailwind CSS + Shadcn/UI (Radix primitives)
*   **State Management**: React Context (for global UI state like Theme/Support) + TanStack Query (via Wagmi for blockchain state).
*   **Authentication**:
    *   **NextAuth.js**: Handles social logins (if added) and session management.
    *   **Wagmi / Reown AppKit**: Manages Wallet Connect, MetaMask, and Coinbase Wallet connections.

### Client vs. Server
*   **Server Components**: Used for fetching feed data, profile details, and static content. They interact directly with the DB via Prisma.
*   **Client Components**: Used for interactive elements (Like buttons, Comment forms, Wallet signing).
    *   *Note*: The `CreatePostForm` is a critical Client Component that handles the local cryptographic signing of content before submission.

---

## 2. Data Layer (Backend)

The backend logic is primarily implemented using **Next.js Server Actions**, located in `src/actions/`. This allows for type-safe direct calls from the frontend to the backend without manually managing API endpoints.

### Database (PostgreSQL)
We use **Prisma ORM** to interact with a PostgreSQL database.

*   **User Model**: Stores traditional profile data (name, bio) AND the linked `walletAddress`.
*   **Post Model**: Stores the content payload, but also the cryptographic proofs (`contentHash`, `signature`, `verificationTx`).
*   **Role-Based Access Control (RBAC)**:
    *   `UserRole` enum drives the permission system (STANDARD, BUSINESS, MODERATOR, ADMIN).
    *   See `src/lib/rbac.ts` and `src/lib/permissions.ts` for logic.

---

## 3. The Truth Layer (Blockchain Integration)

This is the unique value proposition of Peake Feeds. It ensures that content cannot be tamper-edited after the fact without invalidating its signature.

### The Flow
1.  **Hashing**: When a user creates a post, the client creates a SHA-256 hash of the content + a random salt.
2.  **Signing**: The user is prompted to sign this hash with their connected wallet (using EIP-712 or standard personal sign).
3.  **Anchoring (Optional)**:
    *   **Direct**: User pays gas to send the hash to the `PostVerifier` contract on Optimism.
    *   **Sponsored**: User watches an ad. The "Ad Mediator" verifies the view and the platform's Relayer wallet submits the transaction on the user's behalf.
4.  **Verification**: The system verifies the signature server-side. If valid, the post is saved with `isVerified = true`.

### Contracts
*   **Location**: `/contracts`
*   **Key Contract**: `Verified.sol`
*   **Network**: Optimism (chosen for low gas fees and speed).

---

## Service Integrations
*   **Email**: Resend (for notifications/invites).
*   **Ads**: HypeLab / Google / Unity (via custom hooks in `src/hooks/useAdMediator.ts`).
