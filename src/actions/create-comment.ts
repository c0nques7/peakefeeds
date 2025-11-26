'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const CreateCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(500, "Comment too long"),
  postId: z.string().cuid("Invalid Post ID"),
  channelSlug: z.string(), 
});

export async function createComment(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  // Return standard error format
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  const validated = CreateCommentSchema.safeParse({
    content: formData.get('content'),
    postId: formData.get('postId'),
    channelSlug: formData.get('channelSlug'),
  });

  if (!validated.success) return { success: false, message: "Invalid input" };

  const { content, postId, channelSlug } = validated.data;

  try {
    await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: session.user.id,
      }
    });

    // Revalidate paths
    revalidatePath(`/channels/${channelSlug}`);
    revalidatePath('/home'); 

    return { success: true, message: "Comment added" };

  } catch (error) {
    console.error("Comment Error:", error);
    return { success: false, message: "Database Error" };
  }
}

