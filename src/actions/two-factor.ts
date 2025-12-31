"use server";

import { prisma } from "@/lib/db";
import { authenticator } from "otplib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";

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

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("2FA Verification Error:", error);
    return { success: false, error: "Verification failed" };
  }
}

export async function disableTwoFactor(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.id !== userId) {
    throw new Error("Unauthorized");
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
