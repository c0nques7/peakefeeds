'use server'

import { prisma } from "@/lib/db";
import { z } from "zod";

const WaitlistSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  // 🆕 Accept optional UTM parameters
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
});

export async function subscribeToWaitlist(formData: FormData) {
  const parsed = WaitlistSchema.safeParse({
    email: formData.get("email"),
    source: formData.get("source") || undefined,
    medium: formData.get("medium") || undefined,
    campaign: formData.get("campaign") || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: "Invalid email format." };
  }

  const { email, source, medium, campaign } = parsed.data;

  try {
    const existing = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: true, message: "You are already on the waitlist!" };
    }

    await prisma.waitlist.create({
      data: { 
          email,
          // 🆕 Save attribution data
          source,
          medium,
          campaign
      },
    });

    return { success: true, message: "Success! You're on the list." };

  } catch (error) {
    console.error("Waitlist DB Error:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
}

