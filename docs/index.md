# Peake Feeds Technical Documentation

Welcome to the technical documentation for **Peake Feeds**, a hybrid social media platform that integrates traditional social features with a blockchain-based "Truth Layer" for content verification.

## Documentation Structure

### 1. [Getting Started](./setup/installation.md)
*   **Installation**: How to set up the project locally.
*   **Environment Variables**: Configuration guide.

### 2. [System Architecture](./architecture/system-overview.md)
*   **High-Level Overview**: Understanding the Client-Server-Blockchain triangle.
*   **Database Schema**: Overview of the Prisma data model.
*   **Tech Stack**: Libraries and frameworks used.

### 3. Features & Deep Dives
*   **[The Truth Layer](./features/the-truth-layer.md)**: Detailed explanation of the content hashing, signing, and on-chain anchoring protocol.
*   **[Ad-Sponsored Verification](./features/ad-mediation.md)**: How the Ad Mediator system sponsors gas fees for users.
*   **[Moderation System](./features/moderation.md)**: The roles, reporting, and penalty logic.

### 4. Smart Contracts
*   **Contracts Overview**: Documentation for `Verified.sol`.
*   **Deployment**: Ignition modules and Hardhat scripts.
