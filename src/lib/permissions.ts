import { UserRole, ChannelRole } from '@prisma/client';

type UserWithRole = { id: string; role: UserRole };
type ChannelMembership = { role: ChannelRole };

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

/**
 * Can this user delete this post?
 */
export function canDeletePost(
  user: UserWithRole, 
  postAuthorId: string, 
  channelMembership?: ChannelMembership | null
) {
  // 1. Author always can
  if (user.id === postAuthorId) return true;

  // 2. Global Admin/Mod always can
  if (isGlobalAdmin(user)) return true;

  // 3. Channel Moderator/Owner can
  if (channelMembership && (channelMembership.role === 'MODERATOR' || channelMembership.role === 'OWNER')) {
      return true;
  }

  return false;
}