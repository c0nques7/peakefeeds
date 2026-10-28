'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { getPostPermissions } from '@/lib/permissions';
import { getInteractionBlockReason } from '@/lib/interaction-guard';

const EditPostSchema = z.object({
  postId: z.string(),
  content: z.string().min(1, "Content cannot be empty").max(2000),
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

  const userId = session.user.id;
  const subscription = await prisma.subscription.findUnique({
    where: { userId_channelId: { userId, channelId: post.channelId } }
  });
  const perms = getPostPermissions({ id: userId, role: session.user.role as UserRole }, post, subscription);

  if (!perms.canEdit) {
    return { error: post.isVerified ? "Verified posts cannot be edited." : "You do not have permission to edit this post." };
  }

  const blocked = await getInteractionBlockReason({ userId, action: 'edit-post', postId });
  if (blocked) return { error: blocked };

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
