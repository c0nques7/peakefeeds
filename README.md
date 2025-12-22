# Peake Feeds

Peake Feeds is a next-generation social platform that restores trust in online content through the "Truth Layer"—a blockchain-based verification system.

## 📚 Documentation

We have comprehensive technical documentation available in the `docs/` directory.

*   **[Getting Started](./docs/setup/installation.md)**: Setup guide for developers.
*   **[System Architecture](./docs/architecture/system-overview.md)**: High-level technical design.
*   **[The Truth Layer](./docs/features/the-truth-layer.md)**: How our verification protocol works.
*   **[Database Schema](./docs/architecture/database-schema.md)**: Understanding the data model.
*   **[Environment Variables](./docs/setup/environment-variables.md)**: Configuration reference.

## Features

*   **Hybrid Architecture**: Seamless Web2 UX with Web3 guarantees.
*   **Content Verification**: Sign posts with your Ethereum wallet to prove authorship.
*   **On-Chain Anchoring**: Permanently store content hashes on Optimism.
*   **Ad-Sponsored Gas**: Users can watch ads to pay for verification fees.
*   **Moderation**: Robust reporting, strikes, and penalty system.

## Quick Start

1.  Install dependencies: `npm install`
2.  Start DB: `docker-compose up -d`
3.  Migrate DB: `npx prisma migrate dev`
4.  Run App: `npm run dev`

See [Installation Guide](./docs/setup/installation.md) for full details.