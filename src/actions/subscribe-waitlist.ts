'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const WaitlistSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
});

export async function subscribeToWaitlist(formData: FormData) {
  const parsed = WaitlistSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, message: "Invalid email format." };
  }

  const { email } = parsed.data;

  try {
    // 1. Check if user is already subscribed
    const existing = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: true, message: "You are already on the waitlist!" };
    }

    // 2. Save new email
    await prisma.waitlist.create({
      data: { email },
    });

    // 3. Optional: Revalidate the page if needed, but not strictly necessary for landing.
    return { success: true, message: "Success! You're on the list." };

  } catch (error) {
    console.error("Waitlist DB Error:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
}

// ⚠️ NOTE: You must add the Waitlist model to your schema.prisma:
/*
model Waitlist {
  id        String   @id @default(cuid())
  email     String   @unique
  joinedAt  DateTime @default(now())
}
*/