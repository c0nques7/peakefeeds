// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

const prismaClientSingleton = () => {
  // PRISMA_NEON_WS=1 (Development only) talks to Neon over WebSockets on port 443,
  // for networks that block Postgres' port 5432. Production uses the default TCP driver.
  if (process.env.PRISMA_NEON_WS === '1') {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter: new PrismaNeon(pool) });
  }
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
