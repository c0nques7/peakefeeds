'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { createNotification } from "@/lib/notifications"; 

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(500),
  postId: z.string(),
  parentId: z.string().optional(),
});

export async function createComment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = CreateCommentSchema.safeParse({
    content: formData.get('content'),
    postId: formData.get('postId'),
    parentId: formData.get('parentId') || undefined,
  });

  if (!validated.success) return { error: "Invalid input." };

  const { content, postId, parentId } = validated.data;

  try {
    // 1. Create the Comment (Include Author details for the UI)
    const newComment = await prisma.comment.create({
      data: {
        content,
        postId,
        parentId,
        authorId: session.user.id,
      },
      include: {
        author: {
            select: {
                id: true,
                username: true,
                image: true,
                role: true
            }
        }
      }
    });

    // 2. Fetch Context (Post & Channel) for Notifications/Revalidation
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { channel: true }
    });

    if (post) {
      // 3. NOTIFICATION LOGIC 🔔
      // Don't notify if user is commenting on their own stuff
      const isSelf = parentId 
        ? false // Logic to check parent author would go here, but for now we skip strict self-check on replies inside this block to keep it simple, or implement fully.
        : post.authorId === session.user.id;

      if (parentId) {
        // A) It's a REPLY -> Notify the author of the parent comment
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentId },
          select: { authorId: true }
        });

        if (parentComment && parentComment.authorId !== session.user.id) {
          await createNotification({
            type: 'REPLY',
            actorId: session.user.id,
            recipientId: parentComment.authorId,
            postId: postId,
            commentId: newComment.id
          });
        }
      } else if (post.authorId !== session.user.id) {
        // B) It's a ROOT COMMENT -> Notify the post author
        await createNotification({
          type: 'COMMENT',
          actorId: session.user.id,
          recipientId: post.authorId,
          postId: postId,
          commentId: newComment.id
        });
      }

      // 4. Revalidate
      if (post.channel) {
          revalidatePath(`/channels/${post.channel.slug}`);
      }
    }
    
    // 🟢 RETURN THE COMMENT OBJECT (Fixes the TypeScript/UI Error)
    return { success: true, comment: newComment };

  } catch (error) {
    console.error("Create comment error:", error);
    return { error: "Failed to post." };
  }
}