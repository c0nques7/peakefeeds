'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ReactionType } from '@prisma/client'; // Import the new enum from Prisma

// Note: The schema field 'type' must match the Prisma enum (LIKE or DISLIKE)
const ReactionSchema = z.object({
  postId: z.string().cuid("Invalid Post ID"),
  channelSlug: z.string(), 
  reactionType: z.enum(['LIKE', 'DISLIKE']), // The specific reaction requested
});

export async function setReaction(formData: FormData) { // 👈 The core action
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
  
  // Cast string to Prisma Enum type
  const type = reactionType as ReactionType; 

  try {
    // 1. Check for existing reaction
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
      select: { type: true } // Only need the type field
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        // 2a. Action: Remove reaction (If user clicks the same one again)
        await prisma.reaction.delete({ where: { userId_postId: { userId, postId } } });
      } else {
        // 2b. Action: Switch reaction (Like -> Dislike or vice versa)
        await prisma.reaction.update({
          where: { userId_postId: { userId, postId } },
          data: { type: type },
        });
      }
    } else {
      // 3. Action: Create new reaction
      await prisma.reaction.create({ data: { userId, postId, type: type } });
    }

    // 4. Revalidate to update counts
    revalidatePath(`/channels/${channelSlug}`);
    revalidatePath(`/home`); 

    return { success: true };

  } catch (error) {
    console.error("Reaction DB Error:", error);
    return { error: "Database Error: Failed to set reaction." };
  }
}