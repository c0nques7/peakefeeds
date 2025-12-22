# Environment Variables

To run Peake Feeds, you need to configure the following environment variables in a `.env` file at the root of the project.

## Core Configuration

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string for PostgreSQL (Prisma). | `postgresql://user:pass@localhost:5432/peakefeeds_local` |
| `NEXTAUTH_URL` | The canonical URL of your site. | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret key for encrypting sessions. | `openssl rand -base64 32` |

## Web3 & Blockchain

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Project ID from [Reown Cloud](https://cloud.reown.com). Required for AppKit. | `abc123...` |
| `OPTIMISM_RPC_URL` | RPC URL for Optimism (required for deployment scripts). | `https://mainnet.optimism.io` |
| `PRIVATE_KEY` | Private key for the deployer wallet (do not share!). | `0x123...` |

## Services

| Variable | Description | Example |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | API Key for [Resend](https://resend.com) to send transactional emails. | `re_123...` |

## Example `.env` File

```bash
# Database (matches docker-compose.yml default)
DATABASE_URL="postgresql://peakeuser:peakepassword@localhost:5432/peakefeeds_local"

# Next Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="super-secret-key-change-me"

# WalletConnect / Reown
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=""

# Optional: Email Service
RESEND_API_KEY=""

# Optional: Smart Contract Deployment
OPTIMISM_RPC_URL="https://mainnet.optimism.io"
PRIVATE_KEY=""
```
