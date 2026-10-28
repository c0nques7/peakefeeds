import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Runs `fn` in a transaction holding a Postgres advisory lock on `key`, so a check-then-insert
 * (a rate cap, a dedupe) can't be raced by parallel requests for the same key. The lock is
 * released when the transaction ends; other keys don't wait.
 */
export function withAdvisoryLock<T>(key: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    return fn(tx);
  });
}
