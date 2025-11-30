'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ReactionType } from '@prisma/client';

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
    // 1. Perform the DB Transaction (Updates Counts + Reaction Table)
    await prisma.$transaction(async (tx) => {
      
      const existing = await tx.reaction.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existing) {
        if (existing.type === newType) {
          // A. TOGGLE OFF
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
          } else {
            await tx.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 }, dislikesCount: { increment: 1 } } });
          }
        }
      } else {
        // C. CREATE NEW
        await tx.reaction.create({ data: { userId, postId, type: newType } });
        if (newType === 'LIKE') {
            await tx.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } });
        } else {
            await tx.post.update({ where: { id: postId }, data: { dislikesCount: { increment: 1 } } });
        }
      }
    });

    // 🛑 2. AGGRESSIVE REVALIDATION
    // We must clear the cache for ALL feeds where this post might appear.
    
    // A. The specific channel the post belongs to
    revalidatePath(`/channels/${channelSlug}`);
    
    // B. The Global Discovery Feed
    revalidatePath('/home');
    
    // C. The User's Personal Feed
    revalidatePath('/my-feed');
    
    // D. (Optional) The Profile Page of the current user (if viewing "Liked Posts" or "My Posts")
    if (session.user.username) {
        revalidatePath(`/profile/${session.user.username}`);
    }

    // E. (Optional) We could also revalidate the Author's profile if we had their username, 
    // but that requires an extra DB lookup which might be overkill for a like button.
    
    return { success: true };

  } catch (error) {
    console.error("Reaction Error:", error);
    return { error: "Failed to update reaction." };
  }
}