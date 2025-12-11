'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ReactionType } from '@prisma/client';
import { createNotification } from "@/lib/notifications"; // 1. Import

const ReactionSchema = z.object({
  postId: z.string(),
  channelSlug: z.string(), 
  reactionType: z.enum(['LIKE', 'DISLIKE']), 
});

export async function setReaction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = ReactionSchema.safeParse({
    postId: formData.get('postId'),
    channelSlug: formData.get('channelSlug'),
    reactionType: formData.get('reactionType'), 
  });

  if (!validated.success) return { error: "Invalid input" };

  const { postId, channelSlug, reactionType } = validated.data;
  const userId = session.user.id;
  const newType = reactionType as ReactionType; 

  try {
    // 2. Fetch Post to get Author ID (Needed for notification)
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) return { error: "Post not found" };

    // 3. Perform the DB Transaction (Returns 'shouldNotify' flag)
    const transactionResult = await prisma.$transaction(async (tx) => {
      let shouldNotify = false;

      const existing = await tx.reaction.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existing) {
        if (existing.type === newType) {
          // A. TOGGLE OFF (Delete)
          await tx.reaction.delete({ where: { id: existing.id } });
          if (newType === 'LIKE') {
            await tx.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } });
          } else {
            await tx.post.update({ where: { id: postId }, data: { dislikesCount: { decrement: 1 } } });
          }
        } else {
          // B. SWITCH (Swap Sides)
          await tx.reaction.update({ where: { id: existing.id }, data: { type: newType } });
          if (newType === 'LIKE') {
            await tx.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 }, dislikesCount: { decrement: 1 } } });
            shouldNotify = true; // We switched to LIKE
          } else {
            await tx.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 }, dislikesCount: { increment: 1 } } });
          }
        }
      } else {
        // C. CREATE NEW
        await tx.reaction.create({ data: { userId, postId, type: newType } });
        if (newType === 'LIKE') {
            await tx.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } });
            shouldNotify = true; // We created a LIKE
        } else {
            await tx.post.update({ where: { id: postId }, data: { dislikesCount: { increment: 1 } } });
        }
      }
      
      return { shouldNotify };
    });

    // 4. TRIGGER NOTIFICATION 🔔 (Outside transaction to keep DB lock short)
    if (transactionResult.shouldNotify) {
        await createNotification({
            type: 'LIKE',
            actorId: session.user.id,
            recipientId: post.authorId,
            postId: postId
        });
    }

    // 🛑 5. AGGRESSIVE REVALIDATION
    revalidatePath(`/channels/${channelSlug}`);
    revalidatePath('/home');
    revalidatePath('/discover');
    revalidatePath('/my-feed');
    
    if (session.user.username) {
        revalidatePath(`/profile/${session.user.username}`);
    }

    return { success: true };

  } catch (error) {
    console.error("Reaction Error:", error);
    return { error: "Failed to update reaction." };
  }
}