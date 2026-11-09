// src/lib/prisma.ts
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { poolSettings } from './db-url';

const prismaClientSingleton = () => {
  // PRISMA_NEON_WS=1 (Development only) talks to Neon over WebSockets on port 443,
  // for networks that block Postgres' port 5432. Everything else uses node-postgres over TCP.
  if (process.env.PRISMA_NEON_WS === '1') {
    neonConfig.webSocketConstructor = ws;
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
  }
  const settings = poolSettings(process.env.DATABASE_URL);
  if (!settings) throw new Error('DATABASE_URL is not set');
  return new PrismaClient({ adapter: new PrismaPg(settings) });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
