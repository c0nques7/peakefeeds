'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { getInteractionBlockReason } from '@/lib/interaction-guard';

const UpdateCommentSchema = z.object({
  commentId: z.string(),
  content: z.string().min(1).max(500),
});

export async function deleteComment(commentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    // 1. Fetch Comment AND the parent Post to check permissions
    const comment = await prisma.comment.findUnique({ 
        where: { id: commentId },
        include: { post: { select: { authorId: true, channel: { select: { slug: true } } } } } // 🟢 Needed to identify the post owner
    });

    if (!comment) return { error: "Comment not found" };

    const isCommentAuthor = comment.authorId === session.user.id;
    const isPostOwner = comment.post.authorId === session.user.id;
    const isStaff = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MODERATOR;

    // 2. Permission Check: Allow if User wrote the comment OR owns the post
    if (!isCommentAuthor && !isPostOwner && !isStaff) {
        return { error: "You do not have permission to delete this comment." };
    }
    // Content under review stays put until staff decide
    if (comment.isLocked && !isStaff) {
        return { error: "This comment is locked for review." };
    }

    // 3. Delete
    await prisma.comment.delete({ where: { id: commentId } });
    
    // Refresh the UI paths where this comment might appear
    revalidatePath(`/channels/${comment.post.channel.slug}`);
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
  });

  if (!validated.success) return { error: "Invalid input" };
  const { commentId, content } = validated.data;

  try {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { authorId: true, post: { select: { channel: { select: { slug: true } } } } }
    });
    
    // STRICT: Only the comment author can edit the text
    if (!comment || comment.authorId !== session.user.id) {
        return { error: "Unauthorized" };
    }

    const blocked = await getInteractionBlockReason({ userId: session.user.id, action: 'edit-comment', commentId });
    if (blocked) return { error: blocked };

    await prisma.comment.update({
        where: { id: commentId },
        data: { content }
    });

    revalidatePath(`/channels/${comment.post.channel.slug}`);
    revalidatePath(`/home`);
    revalidatePath(`/profile/[username]`, 'page');
    
    return { success: true };
  } catch (error) {
    return { error: "Failed to update comment." };
  }
}