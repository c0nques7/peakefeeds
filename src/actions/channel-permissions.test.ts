import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateChannelPermissions, getChannelPermissions } from './channel-permissions';
import { prisma } from '@/lib/db';
import { getServerSession } from "next-auth";
import { ChannelRole } from '@prisma/client';

// Mock Dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    channel: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    adminLog: {
      create: vi.fn(),
    }
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/admin-logger', () => ({
  createAdminLog: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Channel Permissions Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateChannelPermissions', () => {
    it('should allow channel owner to update permissions', async () => {
      const mockSession = { user: { id: 'admin-id' } };
      (getServerSession as any).mockResolvedValue(mockSession);

      // Mock subscription check for authorized user
      (prisma.subscription.findUnique as any).mockResolvedValue({
        userId: 'admin-id',
        role: ChannelRole.OWNER,
      });

      // Mock channel check
      (prisma.channel.findUnique as any).mockResolvedValue({
        creatorId: 'admin-id',
      });

      // Mock user check
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'admin-id',
        role: 'STANDARD',
      });

      const params = {
        channelId: 'channel-1',
        userId: 'user-to-update',
        role: ChannelRole.MODERATOR,
        permissions: {
          canPost: true,
          canComment: true,
          canDeletePosts: true,
          canPinPosts: false,
        }
      };

      await updateChannelPermissions(params);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: {
          userId_channelId: {
            userId: 'user-to-update',
            channelId: 'channel-1',
          },
        },
        data: expect.objectContaining({
          role: ChannelRole.MODERATOR,
          canPost: true,
        }),
      });
    });

    it('should throw error if user is not authorized', async () => {
      const mockSession = { user: { id: 'regular-user-id' } };
      (getServerSession as any).mockResolvedValue(mockSession);

      (prisma.subscription.findUnique as any).mockResolvedValue({
        userId: 'regular-user-id',
        role: ChannelRole.MEMBER,
      });

      (prisma.channel.findUnique as any).mockResolvedValue({
        creatorId: 'other-id',
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'regular-user-id',
        role: 'STANDARD',
      });

      const params = {
        channelId: 'channel-1',
        userId: 'some-user',
        role: ChannelRole.MODERATOR,
        permissions: {
          canPost: true,
          canComment: true,
          canDeletePosts: false,
          canPinPosts: false,
        }
      };

      await expect(updateChannelPermissions(params)).rejects.toThrow("You do not have permission to manage this channel.");
    });
  });
});
