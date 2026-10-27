"use server";

import { prisma } from "@/lib/db";
import { hash } from "argon2";
import { claimInvite, findUsableInvite } from "@/lib/invites";
import { z } from "zod";
import { EmailSchema, PasswordSchema, UsernameSchema, firstError } from "@/lib/credentials";

class InviteAlreadyClaimed extends Error {}

const RegisterSchema = z.object({
  username: UsernameSchema,
  email: EmailSchema,
  password: PasswordSchema,
  inviteCode: z.string().trim().min(1, "All fields are required."),
});

export async function registerUser(formData: FormData) {
  // 1. Basic Validation
  const parsed = RegisterSchema.safeParse({
    username: formData.get("username") ?? "",
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    inviteCode: formData.get("inviteCode") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { username, email: normalizedEmail, password, inviteCode } = parsed.data;

  // 2. Validate the invite code (it is claimed atomically below)
  const validInvite = await findUsableInvite(inviteCode);
  if (!validInvite) {
    return { error: "That invite code isn't valid or has already been used." };
  }

  // 3. Check for existing users (usernames are unique regardless of case)
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: normalizedEmail, mode: 'insensitive' } },
        { username: { equals: username, mode: 'insensitive' } }
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