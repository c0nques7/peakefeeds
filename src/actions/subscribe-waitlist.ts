'use server'

import { prisma } from "@/lib/db";
import { z } from "zod";
import { Resend } from 'resend';
import { WelcomeEmail } from "@/components/emails/WelcomeEmail";
import { render } from "@react-email/render";

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

const WaitlistSchema = z.object({
  email: z.email("Invalid email address").max(255),
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
      data: { email, source, medium, campaign },
    });

    // 📧 SEND EMAIL
    if (resend) {
      // 2. Manually Render the Email to HTML String
      const emailHtml = await render(WelcomeEmail({ userEmail: email }) as React.ReactElement);

      await resend.emails.send({
        from: 'Peake Feeds <onboarding@resend.dev>', 
        to: email,
        subject: 'Welcome to the Truth Layer',
        // 3. Pass as HTML instead of 'react' property
        html: emailHtml, 
      });
    }

    return { success: true, message: "Success! Check your email." };

  } catch (error) {
    console.error("Waitlist/Email Error:", error);
    return { success: true, message: "You're on the list!" };
  }
}