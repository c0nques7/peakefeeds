// Prisma CLI settings (Prisma 7 no longer reads these from schema.prisma or package.json).
// The CLI doesn't load .env files on its own: dotenv picks up `.env` here, and everything else
// (CI, Vercel, `DATABASE_URL=... npx prisma migrate deploy`) passes DATABASE_URL in the environment.
// Never point this at .env.local, which holds production credentials.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Optional so `prisma generate` works without a database (e.g. a fresh checkout)
  datasource: { url: process.env.DATABASE_URL },
});
