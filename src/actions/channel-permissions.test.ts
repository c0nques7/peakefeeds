import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateChannelPermissions, removeChannelUser } from './channel-permissions';
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
      delete: vi.fn(),
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

  describe('role rules', () => {
    const perms = { canPost: true, canComment: true, canDeletePosts: false, canPinPosts: false };

    // `me` is the acting user; `subs` maps user id -> their channel role
    const setup = (me: string, subs: Record<string, ChannelRole>, siteRole = 'USER') => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: me } } as never);
      vi.mocked(prisma.channel.findUnique).mockResolvedValue({ creatorId: 'creator' } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: siteRole } as never);
      vi.mocked(prisma.subscription.findUnique).mockImplementation((({ where }: { where: { userId_channelId: { userId: string } } }) => {
        const role = subs[where.userId_channelId.userId];
        return Promise.resolve(role ? { userId: where.userId_channelId.userId, role } : null);
      }) as never);
    };
    const update = (userId: string, role: ChannelRole) =>
      updateChannelPermissions({ channelId: 'channel-1', userId, role, permissions: perms });

    it("doesn't let a moderator promote themselves to owner", async () => {
      setup('mod', { mod: ChannelRole.MODERATOR });
      expect(await update('mod', ChannelRole.OWNER)).toMatchObject({ success: false });
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it("doesn't let a moderator hand out moderator or owner roles", async () => {
      setup('mod', { mod: ChannelRole.MODERATOR, member: ChannelRole.MEMBER });
      expect(await update('member', ChannelRole.OWNER)).toMatchObject({ success: false });
      expect(await update('member', ChannelRole.MODERATOR)).toMatchObject({ success: false });
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it("doesn't let a moderator demote or remove another moderator", async () => {
      setup('mod', { mod: ChannelRole.MODERATOR, mod2: ChannelRole.MODERATOR });
      expect(await update('mod2', ChannelRole.MEMBER)).toMatchObject({ success: false });
      expect(await removeChannelUser('channel-1', 'mod2')).toMatchObject({ success: false });
      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(prisma.subscription.delete).not.toHaveBeenCalled();
    });

    it('lets a moderator manage ordinary members', async () => {
      setup('mod', { mod: ChannelRole.MODERATOR, member: ChannelRole.MEMBER });
      expect(await update('member', ChannelRole.MEMBER)).toMatchObject({ success: true });
      expect(await removeChannelUser('channel-1', 'member')).toMatchObject({ success: true });
    });

    it("never touches the creator's membership, even for a site admin", async () => {
      setup('admin', { creator: ChannelRole.OWNER }, 'ADMIN');
      expect(await update('creator', ChannelRole.MEMBER)).toMatchObject({ success: false });
      expect(await removeChannelUser('channel-1', 'creator')).toMatchObject({ success: false });
    });

    it('lets the owner promote a member to moderator', async () => {
      setup('creator', { creator: ChannelRole.OWNER, member: ChannelRole.MEMBER });
      expect(await update('member', ChannelRole.MODERATOR)).toMatchObject({ success: true });
      expect(prisma.subscription.update).toHaveBeenCalled();
    });
  });
});
