'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deletePost(postId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // 1. Fetch the post + channel details to verify permissions
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { 
        channel: true // Need channel creatorId
    }
  });

  if (!post) {
    return { error: "Post not found" };
  }

  const userId = session.user.id;
  
  // 2. Define Permissions
  const isAuthor = post.authorId === userId;
  const isChannelMod = post.channel.creatorId === userId;
  // const isAdmin = session.user.role === 'ADMIN'; (Future proofing)

  if (!isAuthor && !isChannelMod) {
    return { error: "You do not have permission to delete this post." };
  }

  // 3. Delete
  try {
    await prisma.post.delete({
      where: { id: postId }
    });
    
    // Refresh the feed
    revalidatePath(`/channels/${post.channel.slug}`);
    revalidatePath('/home');
    
    return { success: true };
  } catch (error) {
    console.error("Delete Error:", error);
    return { error: "Failed to delete post" };
  }
}