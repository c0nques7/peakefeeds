"use server";

/**
 * ARCHITECTURE NOTE:
 * This file contains "Server Actions". These are async functions that run
 * exclusively on the server but can be called directly from Client Components.
 * * We use them here to:
 * 1. Fetch sensitive user data (including audit logs).
 * 2. Mutate user states (Role changes, Bans).
 * 3. Handle sensitive logic (Password Reset Token generation).
 */

import { prisma } from "@/lib/db"; 
import { requireStaff, requireRole } from "@/lib/rbac";
import { UserRole, PenaltyType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

/**
 * Fetches the specific user profile + their administrative history.
 * Used by: src/app/(admin)/admin/users/[id]/page.tsx
 */
export async function getUserDetails(userId: string) {
  // Security: Only Staff (Mods/Admins) can view this data.
  await requireStaff();

  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      // Get counts for quick stats
      _count: {
        select: { 
          posts: true, 
          reportsAgainst: true, 
          penaltiesReceived: true 
        }
      },
      // Fetch recent penalty history (e.g., previous bans/warnings)
      penaltiesReceived: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });
}

/**
 * Updates a user's role (e.g., Standard -> Moderator).
 * Security: RESTRICTED TO ADMINS ONLY. Moderators cannot promote users.
 */
export async function updateUserRole(userId: string, newRole: UserRole) {
  await requireRole(["ADMIN"]);

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole }
  });

  // Next.js Caching: Clear the cache for this user's page so the UI updates immediately.
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

/**
 * The "Kill Switch". Bans or Unbans a user.
 * Wraps the operation in a transaction to ensure the Audit Log (Penalty) 
 * is always created if the Ban succeeds.
 */
export async function toggleBan(userId: string, shouldBan: boolean, reason?: string) {
  const session = await requireStaff();

  await prisma.$transaction(async (tx) => {
    // 1. Update the User's "isBanned" flag
    await tx.user.update({
      where: { id: userId },
      data: { isBanned: shouldBan }
    });

    // 2. If we are banning, create a permanent record in the Penalty table
    if (shouldBan) {
      await tx.penalty.create({
        data: {
          type: "PERMANENT_BAN",
          reason: reason || "Admin Manual Ban",
          userId: userId,
          issuerId: session.user.id, // Track WHO banned them
          isActive: true
        }
      });
    }
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

/**
 * Generates a secure token for password resets.
 * In production, this would trigger an email. currently logs to console.
 */
export async function sendManualPasswordReset(userId: string) {
  await requireStaff();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });

  if (!user || !user.email) {
    throw new Error("User has no email address.");
  }

  // 1. Cryptographically secure token generation
  const token = randomBytes(32).toString("hex");
  const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour expiration

  // 2. Store token in DB (NextAuth standard table)
  // We use upsert to replace any existing valid tokens for this user
  await prisma.verificationToken.upsert({
    where: {
      identifier_token: {
        identifier: user.email,
        token: token,
      }
    },
    update: { token, expires },
    create: {
      identifier: user.email,
      token,
      expires
    }
  });

  // 3. Construct the link
  // Note: Ensure NEXTAUTH_URL is set in .env
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${user.email}`;
  
  // LOGGING FOR DEV
  console.log("------------------------------------------------");
  console.log(`[ADMIN ACTION] Password Reset Link generated for ${user.email}:`);
  console.log(resetLink);
  console.log("------------------------------------------------");

  return { success: true, message: "Reset link generated (Check Server Logs)" };
}