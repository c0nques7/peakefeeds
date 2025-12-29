import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';

// 1. Mock 'resend' BEFORE importing the module under test
const { sendMock } = vi.hoisted(() => {
  return { sendMock: vi.fn() }
})

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: sendMock
      };
      constructor() {}
    }
  };
});

// 2. Ensure API key is set so the module actually creates the Resend instance
process.env.RESEND_API_KEY = 'test_key';

// 3. Import the module under test
import { requestPasswordReset } from './auth-reset';

describe('auth-reset action', () => {
  const testEmail = 'test-reset@example.com';

  beforeEach(async () => {
    // Clear DB
    await prisma.verificationToken.deleteMany({ where: { identifier: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // Create a dummy user
    await prisma.user.create({
      data: {
        email: testEmail,
        username: 'testresetuser',
        passwordHash: 'hash', 
      }
    });

    // Reset mocks
    sendMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await prisma.verificationToken.deleteMany({ where: { identifier: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  it('should reduce cooldown to 1 minute', async () => {
    // Setup: Email send succeeds
    sendMock.mockResolvedValue({ data: { id: '123' }, error: null });

    // 1. First request
    const formData = new FormData();
    formData.append('email', testEmail);
    await requestPasswordReset(formData);

    // Verify token created
    const token1 = await prisma.verificationToken.findFirst({
      where: { identifier: testEmail }
    });
    expect(token1).toBeDefined();

    // 2. Immediate second request (should trigger cooldown)
    // We can't easily check the "return" value since it returns { success: true } anyway,
    // but we can check that sendMock was NOT called a second time.
    await requestPasswordReset(formData);
    expect(sendMock).toHaveBeenCalledTimes(1); 

    // 3. Advance time by 61 seconds
    const now = Date.now();
    vi.setSystemTime(now + 61 * 1000);

    // 4. Third request (should succeed and create new token)
    await requestPasswordReset(formData);
    expect(sendMock).toHaveBeenCalledTimes(2);

    const token2 = await prisma.verificationToken.findFirst({
      where: { identifier: testEmail }
    });
    expect(token2?.token).not.toBe(token1?.token);
  });

  it('should delete token if email sending fails', async () => {
    // Setup: Email send FAILS
    sendMock.mockResolvedValue({ data: null, error: { message: 'Resend Error' } });

    const formData = new FormData();
    formData.append('email', testEmail);

    // 1. Request reset
    // The function catches the error and returns success (or logs it), 
    // but we want to verify the side effect: token deletion.
    await requestPasswordReset(formData);

    // 2. Verify token is GONE
    const token = await prisma.verificationToken.findFirst({
      where: { identifier: testEmail }
    });
    expect(token).toBeNull();
  });
  
  it('should delete token if email sending throws exception', async () => {
    // Setup: Email send THROWS
    sendMock.mockRejectedValue(new Error('Network Error'));

    const formData = new FormData();
    formData.append('email', testEmail);

    await requestPasswordReset(formData);

    // Verify token is GONE
    const token = await prisma.verificationToken.findFirst({
      where: { identifier: testEmail }
    });
    expect(token).toBeNull();
  });
});
