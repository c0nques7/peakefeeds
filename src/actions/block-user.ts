'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';

const BlockUserSchema = z.object({
  userIdToBlock: z.string().min(1),
});

export type BlockUserState = {
  message?: string | null;
  success?: boolean;
}

export async function blockUser(
  prevState: BlockUserState,
  formData: FormData
): Promise<BlockUserState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { message: "You must be signed in to block a user." };
  }

  const validatedFields = BlockUserSchema.safeParse({
    userIdToBlock: formData.get('userIdToBlock'),
  });

  if (!validatedFields.success) {
    return { message: "Invalid user ID." };
  }

  const { userIdToBlock } = validatedFields.data;

  if (userIdToBlock === session.user.id) {
    return { message: "You cannot block yourself." };
  }

  try {
    // Check if target user is an Admin/Moderator
    const targetUser = await prisma.user.findUnique({
      where: { id: userIdToBlock },
      select: { role: true }
    });

    if (!targetUser) {
      return { message: "User not found." };
    }

    if (targetUser.role === UserRole.ADMIN || targetUser.role === UserRole.MODERATOR) {
        return { message: "You cannot block an administrator or moderator." };
    }

    await prisma.block.create({
      data: {
        blockerId: session.user.id,
        blockedId: userIdToBlock,
      },
    });

    revalidatePath(`/profile/${userIdToBlock}`); // Optional: revalidate profile page if we show block status there
    return { success: true, message: "User blocked successfully." };
  } catch (error) {
      // Prisma error code P2002 means unique constraint failed (already blocked)
      // We can just return success or a specific message
      // @ts-ignore
      if (error.code === 'P2002') {
          return { success: true, message: "User is already blocked." };
      }
    console.error("Failed to block user:", error);
    return { message: "Database Error: Could not block user." };
  }
}
