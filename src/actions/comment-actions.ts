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
    // 1. Fetch Comment AND the parent Post to check permissions
    const comment = await prisma.comment.findUnique({ 
        where: { id: commentId },
        include: { post: true } // 🟢 Needed to identify the post owner
    });

    if (!comment) return { error: "Comment not found" };

    const isCommentAuthor = comment.authorId === session.user.id;
    const isPostOwner = comment.post.authorId === session.user.id;

    // 2. Permission Check: Allow if User wrote the comment OR owns the post
    if (!isCommentAuthor && !isPostOwner) {
        return { error: "You do not have permission to delete this comment." };
    }

    // 3. Delete
    await prisma.comment.delete({ where: { id: commentId } });
    
    // Refresh the UI paths where this comment might appear
    revalidatePath(`/channels/${channelSlug}`);
    revalidatePath(`/home`);
    revalidatePath(`/profile/[username]`, 'page');
    
    return { success: true };
  } catch (error) {
    console.error("Delete Comment Error:", error);
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
    
    // STRICT: Only the comment author can edit the text
    if (!comment || comment.authorId !== session.user.id) {
        return { error: "Unauthorized" };
    }

    await prisma.comment.update({
        where: { id: commentId },
        data: { content }
    });

    revalidatePath(`/channels/${channelSlug}`);
    revalidatePath(`/home`);
    revalidatePath(`/profile/[username]`, 'page');
    
    return { success: true };
  } catch (error) {
    return { error: "Failed to update comment." };
  }
}