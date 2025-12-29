"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { Resend } from 'resend';
import { render } from "@react-email/render";
import { ActivationEmail } from "@/components/emails/ActivationEmail"; // 🟢 Ensure this matches filename

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY.trim()) 
  : null;

export async function getPendingWaitlist(limit = 100) {
  await requireStaff();
  return await prisma.waitlist.findMany({
    where: { status: "PENDING" },
    orderBy: { joinedAt: "asc" },
    take: limit,
  });
}

export async function activateWaitlistUsers(waitlistIds: string[]) {
  await requireStaff();

  if (waitlistIds.length === 0) return { success: false, error: "No users selected" };

  const targets = await prisma.waitlist.findMany({
    where: { id: { in: waitlistIds } },
    select: { id: true, email: true }
  });

  const emailsToSend: { email: string; code: string }[] = [];

  // 1. Generate Codes & Update DB
  await prisma.$transaction(async (tx) => {
    for (const user of targets) {
      const code = `PEAKE-${randomBytes(3).toString("hex").toUpperCase()}`;
      
      await tx.inviteCode.create({
        data: { code: code } // System issued
      });

      await tx.waitlist.update({
        where: { id: user.id },
        data: { status: "INVITED" }
      });
      
      emailsToSend.push({ email: user.email, code });
    }
  });

  // 2. Send Emails
  if (resend) {
    const registerLink = `${process.env.NEXTAUTH_URL}/register`;
    console.log(`[Resend] Attempting to send ${emailsToSend.length} activation emails...`);

    await Promise.all(emailsToSend.map(async (item) => {
      try {
        const emailHtml = await render(
          // 🟢 Render the React Component
          ActivationEmail({ inviteCode: item.code, registerLink }) as React.ReactElement
        );

        const data = await resend.emails.send({
          from: 'Peake Feeds <onboarding@resend.dev>',
          to: item.email,
          subject: "You're In! Welcome to Peake Feeds",
          html: emailHtml,
        });
        
        if (data.error) console.error(`[Resend] Error for ${item.email}:`, data.error);
        else console.log(`[Resend] Sent to ${item.email} (ID: ${data.data?.id})`);
        
      } catch (err) {
        console.error(`[Resend] Failed execution for ${item.email}`, err);
      }
    }));
  } else {
    console.warn("[Resend] API Key missing. Emails skipped.");
  }

  revalidatePath("/admin/waitlist");
  return { success: true, count: targets.length };
}