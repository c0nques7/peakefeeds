'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(500),
  postId: z.string(),
  parentId: z.string().optional(), // 👈 NEW: Optional Parent ID for replies
});

export async function createComment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = CreateCommentSchema.safeParse({
    content: formData.get('content'),
    postId: formData.get('postId'),
    parentId: formData.get('parentId') || undefined, // Handle empty string as undefined
  });

  if (!validated.success) return { error: "Invalid input." };

  const { content, postId, parentId } = validated.data;

  try {
    await prisma.comment.create({
      data: {
        content,
        postId,
        parentId, // 👈 Link the reply
        authorId: session.user.id,
      },
    });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { channel: true }
    });

    if (post) revalidatePath(`/channels/${post.channel.slug}`);
    
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to post." };
  }
}