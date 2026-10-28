import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { getPostingBlockReason } from '@/lib/penalties';

export type InteractionAction = 'post' | 'comment' | 'react' | 'edit-post' | 'edit-comment';

type Target = {
  userId: string;
  action: InteractionAction;
  /** 'post' */
  channelId?: string;
  /** 'comment', 'react', 'edit-post' */
  postId?: string;
  /** 'edit-comment', or the parent when replying with 'comment' */
  commentId?: string;
};

const LOCKED_CHANNEL = 'This channel is under review, so new posts and interactions are disabled.';
const LOCKED_POST = 'This post is under review, so interactions are disabled.';
const LOCKED_COMMENT = 'This comment is under review, so interactions are disabled.';
const LOCKED_AUTHOR = "This user's account is under review, so interacting with their content is disabled.";

/**
 * The server-side rule for creating or changing content: why `userId` may not do `action` on the
 * target (null when they may). Covers account penalties, staff locks on the channel, post, comment
 * or its author, and the per-channel canPost/canComment switches. Site staff skip the locks and
 * channel switches, but not their own penalties.
 */
export async function getInteractionBlockReason({ userId, action, channelId, postId, commentId }: Target): Promise<string | null> {
  const blocked = await getPostingBlockReason(userId);
  if (blocked) return blocked;

  const comment = commentId
    ? await prisma.comment.findUnique({
        where: { id: commentId },
        select: { postId: true, isLocked: true, author: { select: { isLocked: true } } },
      })
    : null;
  if (commentId && !comment) return 'Comment not found.';
  if (comment && postId && comment.postId !== postId) return 'Comment not found.';

  const targetPostId = postId ?? comment?.postId;
  const post = targetPostId
    ? await prisma.post.findUnique({
        where: { id: targetPostId },
        select: { channelId: true, isLocked: true, author: { select: { isLocked: true } } },
      })
    : null;
  if (targetPostId && !post) return 'Post not found.';

  const targetChannelId = channelId ?? post?.channelId;
  if (!targetChannelId) return 'Channel not found.';

  const [channel, user, subscription] = await Promise.all([
    prisma.channel.findUnique({ where: { id: targetChannelId }, select: { isLocked: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.subscription.findUnique({
      where: { userId_channelId: { userId, channelId: targetChannelId } },
      select: { canPost: true, canComment: true },
    }),
  ]);
  if (!channel) return 'Channel not found.';

  if (user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR) return null;

  if (channel.isLocked) return LOCKED_CHANNEL;
  if (post?.isLocked) return LOCKED_POST;
  if (comment?.isLocked) return LOCKED_COMMENT;
  // Someone else's locked account: you can't interact with their content (your own stays editable)
  if (action !== 'edit-post' && action !== 'edit-comment' && (post?.author.isLocked || comment?.author.isLocked)) {
    return LOCKED_AUTHOR;
  }

  // No subscription row means the channel defaults (allowed)
  if ((action === 'post' || action === 'edit-post') && subscription?.canPost === false) {
    return "You can't post in this channel.";
  }
  if ((action === 'comment' || action === 'edit-comment') && subscription?.canComment === false) {
    return "You can't comment in this channel.";
  }
  return null;
}
