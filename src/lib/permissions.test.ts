import { describe, it, expect } from 'vitest';
import { ChannelRole, UserRole } from '@prisma/client';
import { getPostPermissions } from './permissions';

const post = (extra: Partial<{ authorId: string; isVerified: boolean; creatorId: string }> = {}) => ({
  authorId: extra.authorId ?? 'author',
  isVerified: extra.isVerified ?? false,
  channel: { creatorId: extra.creatorId ?? 'creator' },
});
const user = (id: string, role: UserRole = UserRole.STANDARD) => ({ id, role });
const member = (role: ChannelRole, canDeletePosts = false) => ({ role, canDeletePosts });

describe('getPostPermissions', () => {
  it('lets the author edit and delete their own post without a reason', () => {
    expect(getPostPermissions(user('author'), post())).toMatchObject({ canEdit: true, canDelete: true, deleteNeedsReason: false });
  });

  it('gives a plain member nothing on someone else\'s post', () => {
    expect(getPostPermissions(user('x'), post(), member(ChannelRole.MEMBER))).toMatchObject({ canEdit: false, canDelete: false });
  });

  it('gives logged-out viewers nothing', () => {
    expect(getPostPermissions(null, post())).toMatchObject({ canEdit: false, canDelete: false, channelRole: null });
  });

  it('lets the channel creator and OWNER members edit and delete, with a reason', () => {
    for (const perms of [
      getPostPermissions(user('creator'), post()),
      getPostPermissions(user('co-owner'), post(), member(ChannelRole.OWNER)),
    ]) {
      expect(perms).toMatchObject({ canEdit: true, canDelete: true, deleteNeedsReason: true, channelRole: 'OWNER' });
    }
  });

  it('lets channel moderators edit, but only delete with canDeletePosts', () => {
    expect(getPostPermissions(user('mod'), post(), member(ChannelRole.MODERATOR))).toMatchObject({ canEdit: true, canDelete: false });
    expect(getPostPermissions(user('mod'), post(), member(ChannelRole.MODERATOR, true))).toMatchObject({ canDelete: true });
  });

  it('treats site moderators and admins as staff', () => {
    for (const role of [UserRole.MODERATOR, UserRole.ADMIN]) {
      expect(getPostPermissions(user('staff', role), post())).toMatchObject({ canEdit: true, canDelete: true, channelRole: 'ADMIN' });
    }
  });

  it('locks verified posts: nobody edits, only staff delete', () => {
    const verified = post({ isVerified: true, creatorId: 'author' });
    expect(getPostPermissions(user('author'), verified)).toMatchObject({ canEdit: false, canDelete: false });
    expect(getPostPermissions(user('mod'), verified, member(ChannelRole.MODERATOR, true))).toMatchObject({ canDelete: false });
    expect(getPostPermissions(user('staff', UserRole.MODERATOR), verified)).toMatchObject({ canEdit: false, canDelete: true, deleteNeedsReason: true });
  });
});
