'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const UnblockUserSchema = z.object({
  userIdToUnblock: z.string().min(1),
});

export type UnblockUserState = {
  message?: string | null;
  success?: boolean;
}

export async function unblockUser(
  prevState: UnblockUserState,
  formData: FormData
): Promise<UnblockUserState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { message: "You must be signed in to unblock a user." };
  }

  const validatedFields = UnblockUserSchema.safeParse({
    userIdToUnblock: formData.get('userIdToUnblock'),
  });

  if (!validatedFields.success) {
    return { message: "Invalid user ID." };
  }

  const { userIdToUnblock } = validatedFields.data;

  try {
    await prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: userIdToUnblock,
        },
      },
    });

    revalidatePath(`/profile/${userIdToUnblock}`);
    return { success: true, message: "User unblocked successfully." };
  } catch (error) {
      // @ts-ignore
      if (error.code === 'P2025') {
          return { message: "Block record not found." };
      }
    console.error("Failed to unblock user:", error);
    return { message: "Database Error: Could not unblock user." };
  }
}
