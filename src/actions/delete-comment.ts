'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteComment(commentId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) return { error: "Unauthorized" };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { post: { include: { channel: true } } }
  });

  if (!comment) return { error: "Comment not found" };

  // Allow deletion if: You wrote the comment OR You moderate the channel
  const isAuthor = comment.authorId === session.user.id;
  const isMod = comment.post.channel.creatorId === session.user.id;

  if (!isAuthor && !isMod) {
    return { error: "Permission denied." };
  }

  try {
    await prisma.comment.delete({ where: { id: commentId } });
    revalidatePath(`/channels/${comment.post.channel.slug}`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete." };
  }
}