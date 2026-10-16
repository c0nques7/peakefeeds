'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { verifyMessage } from "viem";
import { z } from "zod";
import { clearAccountStatusCache } from "@/lib/penalties";

const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Ethereum address format.");

// The exact text the wallet signs. It names both the wallet and the account, so a signature
// can't be replayed to link the wallet to a different account.
function linkMessage(address: string, userId: string) {
  return `Link wallet ${address.toLowerCase()} to PeakeFeeds account ${userId}`;
}

/**
 * Step 1: tells the client whether `address` is already linked to this account, and if not,
 * which message the wallet must sign to prove ownership.
 */
export async function getWalletLinkStatus(address: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized: Please log in first." };

  const parsed = AddressSchema.safeParse(address);
  if (!parsed.success) return { error: "Invalid Ethereum address format." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { walletAddress: true } });
  if (user?.walletAddress?.toLowerCase() === address.toLowerCase()) return { linked: true as const };

  return { linked: false as const, message: linkMessage(address, session.user.id) };
}

/**
 * Step 2: links the wallet once its signature over the link message checks out.
 */
export async function verifyWalletAddress(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized: Please log in first." };
  }

  const parsed = z.object({
    address: AddressSchema,
    signature: z.string().regex(/^0x[0-9a-fA-F]+$/, "Missing signature."),
  }).safeParse({
    address: formData.get("address"),
    signature: formData.get("signature"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const { signature } = parsed.data;
  const address = parsed.data.address as `0x${string}`;

  const valid = await verifyMessage({
    address,
    message: linkMessage(address, session.user.id),
    signature: signature as `0x${string}`,
  }).catch(() => false);
  if (!valid) {
    return { error: "Signature doesn't match this wallet." };
  }

  try {
    // 1. Check uniqueness: Is this wallet already used by someone else?
    // Case-insensitive: the same address can arrive checksummed or lowercase
    const existing = await prisma.user.findFirst({
      where: { walletAddress: { equals: address, mode: "insensitive" } },
      select: { id: true },
    });

    if (existing && existing.id !== session.user.id) {
      return { error: "This wallet is already linked to another account." };
    }

    // 2. Link it to the current user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { walletAddress: address },
    });

    // The session picks up the new wallet on its next check
    clearAccountStatusCache(session.user.id);

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
