'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function setReaction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const postId = formData.get("postId") as string;
  const reactionType = formData.get("reactionType") as "LIKE" | "DISLIKE";
  const channelSlug = formData.get("channelSlug") as string;

  if (!postId || !reactionType) return { error: "Missing data" };

  try {
    // 1. Check if user already reacted
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.type === reactionType) {
        // 2. SAME reaction? Toggle OFF (Delete)
        await prisma.reaction.delete({
          where: { id: existingReaction.id },
        });
      } else {
        // 3. DIFFERENT reaction? Switch it (Update)
        await prisma.reaction.update({
          where: { id: existingReaction.id },
          data: { type: reactionType },
        });
      }
    } else {
      // 4. NO reaction? Create new
      await prisma.reaction.create({
        data: {
          userId: session.user.id,
          postId: postId,
          type: reactionType,
        },
      });
    }

    // Refresh the UI
    revalidatePath(`/channels/${channelSlug}`);
    return { success: true };
  } catch (error) {
    console.error("Reaction Error:", error);
    return { error: "Database error" };
  }
}

