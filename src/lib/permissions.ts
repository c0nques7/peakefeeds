import { UserRole, ChannelRole } from '@prisma/client';

type UserWithRole = { id: string; role: UserRole };

/**
 * Checks if a user has global administrative power.
 */
export function isGlobalAdmin(user: UserWithRole) {
  return user.role === 'ADMIN' || user.role === 'MODERATOR';
}

/**
 * Checks if a user is a "Verified Entity" (Business, Gov, Fact Checker).
 * Useful for boosting algorithm priority or trust scores.
 */
export function isVerifiedEntity(user: UserWithRole) {
  return ['BUSINESS', 'GOVERNMENT', 'FACT_CHECKER'].includes(user.role);
}

export type PostPermissions = {
  isAuthor: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Deleting someone else's post (or any verified post) needs a reason for the admin log */
  deleteNeedsReason: boolean;
  /** The viewer's standing in the post's channel ('ADMIN' for site staff) */
  channelRole: 'ADMIN' | ChannelRole | null;
};

/**
 * The one rule for who may edit or delete a post, used by the edit/delete actions and the feed
 * view models alike. Verified posts are anchored on-chain: nobody edits them and only site staff
 * may remove one. `membership` is the viewer's subscription to the post's channel.
 */
export function getPostPermissions(
  viewer: UserWithRole | null | undefined,
  post: { authorId: string; isVerified: boolean; channel: { creatorId: string } },
  membership?: { role: ChannelRole; canDeletePosts: boolean } | null,
): PostPermissions {
  if (!viewer) {
    return { isAuthor: false, canEdit: false, canDelete: false, deleteNeedsReason: true, channelRole: null };
  }

  const isStaff = isGlobalAdmin(viewer);
  const isAuthor = post.authorId === viewer.id;
  const isOwner = post.channel.creatorId === viewer.id || membership?.role === ChannelRole.OWNER;
  const isChannelMod = membership?.role === ChannelRole.MODERATOR;

  const channelRole = isStaff ? 'ADMIN' : isOwner ? ChannelRole.OWNER : (membership?.role ?? null);

  if (post.isVerified) {
    return { isAuthor, canEdit: false, canDelete: isStaff, deleteNeedsReason: true, channelRole };
  }

  return {
    isAuthor,
    canEdit: isAuthor || isOwner || isChannelMod || isStaff,
    canDelete: isAuthor || isOwner || isStaff || membership?.canDeletePosts === true,
    deleteNeedsReason: !isAuthor,
    channelRole,
  };
}
