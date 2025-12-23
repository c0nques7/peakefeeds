'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { UserRole, ChannelRole } from '@prisma/client';

const EditPostSchema = z.object({
  postId: z.string(),
  content: z.string().min(1, "Content cannot be empty").max(1000),
});

export async function editPost(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validatedFields = EditPostSchema.safeParse({
    postId: formData.get('postId'),
    content: formData.get('content'),
  });

  if (!validatedFields.success) {
    return { error: "Invalid data." };
  }

  const { postId, content } = validatedFields.data;

  // 1. Fetch post to check permissions and verification status
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { channel: true }
  });

  if (!post) return { error: "Post not found." };

  if (post.isVerified) {
    return { error: "Verified posts cannot be edited." };
  }

  const userId = session.user.id;
  const isAuthor = post.authorId === userId;
  
  const subscription = await prisma.subscription.findUnique({
    where: { userId_channelId: { userId, channelId: post.channelId } }
  });

  const isChannelOwner = post.channel.creatorId === userId;
  const isChannelMod = subscription?.role === ChannelRole.MODERATOR;
  const isGlobalAdmin = (session.user as any).role === UserRole.ADMIN;

  if (!isAuthor && !isChannelOwner && !isChannelMod && !isGlobalAdmin) {
    return { error: "You do not have permission to edit this post." };
  }

  try {
    await prisma.post.update({
      where: { id: postId },
      data: { content }
    });

    revalidatePath(`/channels/${post.channel.slug}`);
    revalidatePath('/home');
    return { success: true };
  } catch (error) {
    return { error: "Failed to update post." };
  }
}
