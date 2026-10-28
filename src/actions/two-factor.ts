"use server";

import { prisma } from "@/lib/db";
import { authenticator } from "otplib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { checkTwoFactorCode } from "@/lib/two-factor-guard";

export async function generateTwoFactorSecret(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.id !== userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const secret = authenticator.generateSecret();
  // Use email or username for the label
  const accountName = user.email || user.username || "User";
  const otpauth = authenticator.keyuri(accountName, "PeakeFeeds", secret);

  return { secret, otpauth };
}

export async function verifyAndEnableTwoFactor(userId: string, token: string, secret: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.id !== userId) {
    throw new Error("Unauthorized");
  }

  try {
    const isValid = authenticator.verify({ token, secret });
    if (!isValid) return { success: false, error: "Invalid token" };

    // Replacing an active secret would let a hijacked session take over 2FA; turn it off first
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } });
    if (current?.twoFactorEnabled) return { success: false, error: "Two-factor authentication is already on." };

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorFailures: 0,
        twoFactorLockedUntil: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("2FA Verification Error:", error);
    return { success: false, error: "Verification failed" };
  }
}

/** Turning 2FA off needs a current code, so a stolen session alone can't remove it. */
export async function disableTwoFactor(userId: string, token: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.id !== userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) return { success: true };

  const check = await checkTwoFactorCode(userId, token);
  if (check === 'locked') {
    return { success: false, error: "Too many wrong codes. Try again in 15 minutes." };
  }
  if (check !== 'ok') {
    return { success: false, error: "Enter the current 6-digit code from your authenticator app." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  return { success: true };
}

export async function getTwoFactorStatus(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.id !== userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { twoFactorEnabled: true }
  });

  return { isEnabled: user?.twoFactorEnabled ?? false };
}
