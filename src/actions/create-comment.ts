'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { createNotification } from "@/lib/notifications"; // 1. Import Notification Utility

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
    // 2. Create the Comment
    const newComment = await prisma.comment.create({
      data: {
        content,
        postId,
        parentId,
        authorId: session.user.id,
      },
    });

    // 3. Fetch Context (Post & Channel)
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { channel: true }
    });

    if (post) {
      // 4. NOTIFICATION LOGIC 🔔
      if (parentId) {
        // A) It's a REPLY -> Notify the author of the parent comment
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentId },
          select: { authorId: true }
        });

        if (parentComment) {
          await createNotification({
            type: 'REPLY',
            actorId: session.user.id,
            recipientId: parentComment.authorId,
            postId: postId,
            commentId: newComment.id
          });
        }
      } else {
        // B) It's a ROOT COMMENT -> Notify the post author
        await createNotification({
          type: 'COMMENT',
          actorId: session.user.id,
          recipientId: post.authorId,
          postId: postId,
          commentId: newComment.id
        });
      }

      // Revalidate the channel page to show new comment
      revalidatePath(`/channels/${post.channel.slug}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to post." };
  }
}