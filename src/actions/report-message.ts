'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { ReportReason, ReportTargetType } from '@prisma/client';

const ReportMessageSchema = z.object({
  messageId: z.string().min(1),
  reason: z.nativeEnum(ReportReason),
  details: z.string().optional(),
});

export type ReportMessageState = {
  errors?: {
    messageId?: string[];
    reason?: string[];
    details?: string[];
    _form?: string[];
  };
  message?: string | null;
  success?: boolean;
}

export async function reportMessage(
  prevState: ReportMessageState,
  formData: FormData
): Promise<ReportMessageState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { message: "You must be signed in to report a message." };
  }

  const validatedFields = ReportMessageSchema.safeParse({
    messageId: formData.get('messageId'),
    reason: formData.get('reason'),
    details: formData.get('details'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid report data.",
    };
  }

  const { messageId, reason, details } = validatedFields.data;

  try {
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true }
    });

    if (!message) {
      return { message: "Message not found." };
    }

    // Check if already reported by this user (optional, but good practice)
    // For now, allow multiple reports or rely on UI to prevent spamming

    await prisma.report.create({
      data: {
        reason,
        details,
        status: "PENDING",
        targetType: ReportTargetType.MESSAGE,
        reporterId: session.user.id,
        reportedProfileId: message.senderId, // The sender is the one being reported
        messageId: messageId,
      },
    });

    return { success: true, message: "Report submitted successfully." };
  } catch (error) {
    console.error("Failed to submit report:", error);
    return { message: "Database Error: Could not submit report." };
  }
}
