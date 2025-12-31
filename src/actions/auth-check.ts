"use server";

import { prisma } from "@/lib/db";
import * as argon2 from "argon2";

export async function checkLoginRequirement(email: string) {
  if (!email) return { error: "Email required" };

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { 
      twoFactorEnabled: true,
      // We don't check password here to avoid timing attacks or excessive hashing if not needed yet?
      // Actually, we should check password to verify if we should prompt for 2FA.
      // But for UX, prompting for 2FA if the email exists and has 2FA enabled (regardless of password validity)
      // might leak that the user has 2FA enabled.
      // Ideally, we verify password first.
      passwordHash: true
    }
  });

  if (!user || !user.passwordHash) {
    // Return "Standard" login flow (which will fail later) or just false.
    // To mimic generic failure, we say 2FA not required (login will proceed and fail on password)
    return { required: false };
  }

  // We should NOT verify password here if we want to avoid double hashing cost?
  // Argon2 is expensive.
  // But if we don't verify password, we might prompt 2FA for a user even if they entered the wrong password?
  // That's acceptable for UX (Enter Email -> Next -> Enter Password + 2FA).
  // But our UI is Email + Password on one screen.
  
  // So:
  return { required: user.twoFactorEnabled };
}
