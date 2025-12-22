# Installation & Setup

## Prerequisites

*   **Node.js**: v18 or higher (LTS recommended)
*   **npm** or **yarn** or **pnpm**
*   **Docker**: For running the local PostgreSQL database.

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/peakefeeds.git
cd peakefeeds
```

## 2. Install Dependencies

```bash
npm install
# or
yarn install
```

## 3. Configure Environment

1.  Copy the example environment variables or create a `.env` file.
2.  See [Environment Variables](./environment-variables.md) for details.

```bash
# Create .env from the guide
touch .env
```

## 4. Start the Database

We use Docker Compose to spin up a local PostgreSQL instance.

```bash
docker-compose up -d
```

This will start Postgres on port `5432` with the credentials defined in `docker-compose.yml`.

## 5. Initialize Database Schema

Push the Prisma schema to your local database and seed it with initial data.

```bash
# Run migrations
npx prisma migrate dev

# Seed database (optional, if configured)
npm run seed
```

## 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
