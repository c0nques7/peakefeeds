import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { authenticator } from 'otplib';
import { prisma } from '@/lib/db';
import { checkTwoFactorCode, MAX_TWO_FACTOR_FAILURES } from './two-factor-guard';

// Integration tests against the local database.

const tag = `tf${Date.now()}`;
const secret = authenticator.generateSecret();
let userId: string;

// A well-formed code that isn't the current one
const wrongCode = () => String((Number(authenticator.generate(secret)) + 1) % 1_000_000).padStart(6, '0');

beforeEach(async () => {
  if (userId) await prisma.user.delete({ where: { id: userId } });
  userId = (await prisma.user.create({
    data: { email: `${tag}-${Date.now()}@example.com`, twoFactorEnabled: true, twoFactorSecret: secret },
  })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe('checkTwoFactorCode', () => {
  it('accepts the current code and clears earlier failures', async () => {
    expect(await checkTwoFactorCode(userId, wrongCode())).toBe('invalid');
    expect(await checkTwoFactorCode(userId, authenticator.generate(secret))).toBe('ok');
    expect(await prisma.user.findUnique({ where: { id: userId } })).toMatchObject({ twoFactorFailures: 0 });
  });

  it('locks code checks after too many wrong codes, even the right one', async () => {
    for (let i = 1; i < MAX_TWO_FACTOR_FAILURES; i++) expect(await checkTwoFactorCode(userId, wrongCode())).toBe('invalid');
    expect(await checkTwoFactorCode(userId, wrongCode())).toBe('locked');
    expect(await checkTwoFactorCode(userId, authenticator.generate(secret))).toBe('locked');
  });

  it('counts every guess in a parallel burst', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => checkTwoFactorCode(userId, wrongCode())));
    expect(results.filter(r => r === 'invalid')).toHaveLength(MAX_TWO_FACTOR_FAILURES - 1);
    expect(results.filter(r => r === 'locked')).toHaveLength(20 - (MAX_TWO_FACTOR_FAILURES - 1));
  });
});
