'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const WalletSchema = z.object({
  // Validate it looks like an Ethereum address
  address: z.string().startsWith("0x").length(42),
});

export async function verifyWalletAddress(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { error: "Unauthorized: Please log in first." };
  }

  const parsed = WalletSchema.safeParse({
    address: formData.get("address"),
  });

  if (!parsed.success) {
    return { error: "Invalid Ethereum address format." };
  }

  const { address } = parsed.data;

  try {
    // 1. Check uniqueness: Is this wallet already used by someone else?
    const existing = await prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (existing && existing.id !== session.user.id) {
      return { error: "This wallet is already linked to another account." };
    }

    // 2. Link it to the current user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { walletAddress: address },
    });

    // 3. Refresh the profile page so the badge updates immediately
    if (session.user.username) {
        revalidatePath(`/profile/${session.user.username}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Wallet Link Error:", error);
    return { error: "Database error: Could not link wallet." };
  }
}
