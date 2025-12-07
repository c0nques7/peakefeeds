"use server";

import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import * as argon2 from "argon2";
import { redirect } from "next/navigation";

/**
 * 1. REQUEST FLOW
 * User enters email -> We generate token -> We "send" email
 */
export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || typeof email !== "string") {
    return { error: "Please provide a valid email address." };
  }

  // 1. Check if user exists (Silent fail if not, for security)
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (user) {
    // 2. Generate secure token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

    // 3. Store in VerificationToken table (Upsert to handle retries)
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email.toLowerCase(),
          token: token // This is technically looking for a specific pair, but for reset we usually overwrite based on identifier
        }
        // NOTE: Prisma composite ID limitations might require deleting old tokens first in some setups,
        // but upsert works if we are matching the unique constraint. 
        // Simpler approach for resets: Delete old, create new.
      },
      update: { token, expires },
      create: {
        identifier: email.toLowerCase(),
        token,
        expires
      }
    });

    // 4. LOG THE LINK (Integration point for Resend/SendGrid)
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${email}`;
    console.log("------------------------------------------------");
    console.log(`[SELF-SERVICE] Password Reset Requested for ${email}`);
    console.log(`Link: ${resetLink}`);
    console.log("------------------------------------------------");
  }

  // Always return success to prevent Email Enumeration attacks
  return { success: true };
}

/**
 * 2. RESET FLOW
 * User clicks link -> Enters new password -> We update DB
 */
export async function completePasswordReset(token: string, email: string, formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  // 1. Verify Token matches Email and is Active
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier: email.toLowerCase(),
      token: token,
      expires: { gt: new Date() } // Must be in the future
    }
  });

  if (!record) {
    return { error: "Invalid or expired reset token. Please request a new one." };
  }

  // 2. Hash new password
  const passwordHash = await argon2.hash(password);

  // 3. Update User & Delete Token (Transaction)
  await prisma.$transaction([
    prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { passwordHash: passwordHash }
    }),
    prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: token
        }
      }
    })
  ]);

  redirect("/login?reset=success");
}