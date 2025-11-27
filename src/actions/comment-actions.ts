'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const UpdateCommentSchema = z.object({
  commentId: z.string(),
  content: z.string().min(1).max(500),
  channelSlug: z.string(),
});

export async function deleteComment(commentId: string, channelSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return { error: "Comment not found" };

    // Permission check: Author only (expand logic for admins later if needed)
    if (comment.authorId !== session.user.id) {
        return { error: "You can only delete your own comments." };
    }

    await prisma.comment.delete({ where: { id: commentId } });
    
    // Refresh the UI
    revalidatePath(`/channels/${channelSlug}`);
    revalidatePath(`/home`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete comment." };
  }
}

export async function updateComment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = UpdateCommentSchema.safeParse({
    commentId: formData.get('commentId'),
    content: formData.get('content'),
    channelSlug: formData.get('channelSlug'),
  });

  if (!validated.success) return { error: "Invalid input" };
  const { commentId, content, channelSlug } = validated.data;

  try {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.authorId !== session.user.id) {
        return { error: "Unauthorized" };
    }

    await prisma.comment.update({
        where: { id: commentId },
        data: { content }
    });

    revalidatePath(`/channels/${channelSlug}`);
    revalidatePath(`/home`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to update comment." };
  }
}