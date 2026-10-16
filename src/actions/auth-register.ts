"use server";

import { prisma } from "@/lib/db";
import { hash } from "argon2";
import { claimInvite, findUsableInvite } from "@/lib/invites";

class InviteAlreadyClaimed extends Error {}

export async function registerUser(formData: FormData) {
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const inviteCode = formData.get("inviteCode") as string;

  // 1. Basic Validation
  if (!email || !password || !username || !inviteCode) {
    return { error: "All fields are required." };
  }

  // 2. Validate the invite code (it is claimed atomically below)
  const validInvite = await findUsableInvite(inviteCode);
  if (!validInvite) {
    return { error: "That invite code isn't valid or has already been used." };
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
      // A. Create the user
      const newUser = await tx.user.create({
        data: {
          username,
          email: normalizedEmail,
          passwordHash,
        }
      });

      // B. Claim the invite (fails if someone claimed it in the meantime) and mint the
      //    new user's own invites
      if (!(await claimInvite(tx, inviteCode, newUser.id))) {
        throw new InviteAlreadyClaimed();
      }
    });

    return { success: true };
  } catch (err) {
    if (err instanceof InviteAlreadyClaimed) {
      return { error: "That invite code has just been used by someone else." };
    }
    console.error("Registration Error:", err);
    return { error: "Registration failed. Please try again." };
  }
}