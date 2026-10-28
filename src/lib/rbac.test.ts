import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';

const { getServerAuthSession, redirect } = vi.hoisted(() => ({
  getServerAuthSession: vi.fn(),
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
}));
vi.mock('@/lib/auth.config', () => ({ getServerAuthSession }));
vi.mock('next/navigation', () => ({ redirect }));

import { requireRole, requireStaff } from './rbac';

const as = (role: UserRole | null) =>
  getServerAuthSession.mockResolvedValue(role ? { user: { id: 'u1', role } } : null);

describe('rbac', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends signed-out visitors to sign in', async () => {
    as(null);
    await expect(requireStaff()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/api/auth/signin');
  });

  it('refuses roles outside the list (no hierarchy: a moderator is not an admin)', async () => {
    as(UserRole.MODERATOR);
    await expect(requireRole([UserRole.ADMIN])).rejects.toThrow(/Insufficient permissions/);
    as(UserRole.STANDARD);
    await expect(requireStaff()).rejects.toThrow(/Insufficient permissions/);
  });

  it('returns the session for allowed roles', async () => {
    for (const role of [UserRole.MODERATOR, UserRole.ADMIN]) {
      as(role);
      expect(await requireStaff()).toMatchObject({ user: { role } });
    }
  });
});
