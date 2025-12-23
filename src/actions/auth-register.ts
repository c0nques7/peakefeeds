"use server";

import { prisma } from "@/lib/db";
import { hash } from "argon2";
import { randomBytes } from "crypto";

export async function registerUser(formData: FormData) {
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const inviteCode = formData.get("inviteCode") as string;

  // 1. Basic Validation
  if (!email || !password || !username || !inviteCode) {
    return { error: "All fields are required." };
  }

  // 2. 🛡️ THE VELVET ROPE: Validate Invite Code
  // We check if it exists AND is unused (usedAt is null)
  const validInvite = await prisma.inviteCode.findUnique({
    where: { code: inviteCode.trim().toUpperCase() }
  });

  if (!validInvite) {
    return { error: "Invalid invite code." };
  }
  if (validInvite.usedAt) {
    return { error: "This invite code has already been claimed." };
  }

  // 3. Check for existing users
  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        { username: username }
      ]
    }
  });

  if (existingUser) {
    return { error: "Email or Username already taken." };
  }

  // 4. Create User & Consume Invite & Mint New Invites
  const passwordHash = await hash(password);

  try {
    await prisma.$transaction(async (tx) => {
      // A. Create the User
      const newUser = await tx.user.create({
        data: {
          username,
          email: normalizedEmail,
          passwordHash,
          // Link the user to the invite code (Tracking who invited them)
          inviteUsed: {
            connect: { id: validInvite.id }
          }
        }
      });

      // B. Mark the Incoming Invite as Used
      await tx.inviteCode.update({
        where: { id: validInvite.id },
        data: {
          usedAt: new Date(),
          usedById: newUser.id
        }
      });

      // C. 🚀 THE GROWTH ENGINE: Mint 3 Golden Tickets
      // We automatically generate 3 unique codes for this new user to share.
      // This turns every new user into a potential multiplier.
      for (let i = 0; i < 3; i++) {
        const code = `PEAKE-${randomBytes(3).toString("hex").toUpperCase()}`;
        await tx.inviteCode.create({
          data: {
            code: code,
            issuerId: newUser.id, // This user owns these codes
          }
        });
      }
    });

    return { success: true };
  } catch (err) {
    console.error("Registration Error:", err);
    return { error: "Registration failed. Please try again." };
  }
}