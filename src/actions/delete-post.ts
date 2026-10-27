'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { getPostPermissions } from '@/lib/permissions';

import { createAdminLog } from "@/lib/admin-logger";
import { AdminLogType } from "@prisma/client";

export async function deletePost(postId: string, reason?: string, comments?: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // 1. Fetch the post + channel + the viewer's membership to verify permissions
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { channel: true }
  });

  if (!post) {
    return { error: "Post not found" };
  }

  const userId = session.user.id;
  const subscription = await prisma.subscription.findUnique({
    where: { userId_channelId: { userId, channelId: post.channelId } }
  });
  const perms = getPostPermissions({ id: userId, role: session.user.role as UserRole }, post, subscription);
  const isAuthor = perms.isAuthor;

  if (!perms.canDelete) {
    return {
      error: post.isVerified
        ? "Verified posts cannot be deleted as they are anchored to the blockchain."
        : "You do not have permission to delete this post."
    };
  }

  // Content under review stays put until staff decide
  if (post.isLocked && perms.channelRole !== 'ADMIN') {
    return { error: "This post is locked for review." };
  }

  // Force reason for staff/mod deletions
  if (perms.deleteNeedsReason && !reason) {
    return { error: "A reason is required for administrative deletions." };
  }

  // 3. Delete
  try {
    const postContent = post.content;
    const authorId = post.authorId;

    await prisma.post.delete({
      where: { id: postId }
    });

    // 4. Log the action if it's an administrative deletion
    if (!isAuthor) {
      await createAdminLog({
        adminId: userId,
        eventType: AdminLogType.ADMIN_ACTION,
        targetResource: `Post:${postId}`,
        details: { 
          action: "DELETE_POST", 
          reason, 
          comments, 
          originalAuthorId: authorId,
          snippet: postContent.substring(0, 100) 
        }
      });
    }
    
    // Refresh the feed
    revalidatePath(`/channels/${post.channel.slug}`);
    revalidatePath('/home');
    
    return { success: true };
  } catch (error) {
    console.error("Delete Error:", error);
    return { error: "Failed to delete post" };
  }
}