'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { UserRole, ChannelRole } from '@prisma/client';

import { createAdminLog } from "@/lib/admin-logger";
import { AdminLogType } from "@prisma/client";

export async function deletePost(postId: string, reason?: string, comments?: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // 1. Fetch the post + channel + subscription details to verify permissions
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { 
        channel: true,
        author: { select: { role: true } }
    }
  });

  if (!post) {
    return { error: "Post not found" };
  }

  // Blockchain Finality Check
  if (post.isVerified) {
    return { error: "Verified posts cannot be deleted as they are anchored to the blockchain." };
  }

  const userId = session.user.id;
  
  // 2. Fetch current user's role in the channel
  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_channelId: {
        userId,
        channelId: post.channelId
      }
    }
  });

  // 3. Define Permissions
  const isAuthor = post.authorId === userId;
  const isChannelOwner = post.channel.creatorId === userId;
  const isChannelMod = subscription?.role === ChannelRole.MODERATOR;
  const hasModDeletePermission = subscription?.canDeletePosts === true;
  const isGlobalAdmin = (session.user as any).role === UserRole.ADMIN;

  if (!isAuthor && !isChannelOwner && !isGlobalAdmin && !(isChannelMod && hasModDeletePermission)) {
    return { error: "You do not have permission to delete this post." };
  }

  // Force reason for staff/mod deletions
  if (!isAuthor && !reason) {
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