'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { 
  ReportReason, 
  ReportTargetType, 
  UserRole, 
  NotificationType,
  Report as PrismaReport // Alias the type to avoid collision with DOM Report
} from '@prisma/client';

const SubmitReportSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.nativeEnum(ReportTargetType),
  reason: z.nativeEnum(ReportReason),
  details: z.string().optional().nullable(),
});

export type ReportState = {
  errors?: {
    targetId?: string[];
    targetType?: string[];
    reason?: string[];
    details?: string[];
    _form?: string[];
  };
  message?: string | null;
  success?: boolean;
  reportedUserId?: string;
  reportId?: string;
}

export async function submitReport(
  prevState: ReportState,
  formData: FormData
): Promise<ReportState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, message: "You must be signed in to submit a report." };
  }

  const validatedFields = SubmitReportSchema.safeParse({
    targetId: formData.get('targetId'),
    targetType: formData.get('targetType'),
    reason: formData.get('reason'),
    details: formData.get('details'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid report data.",
    };
  }

  const { targetId, targetType, reason, details } = validatedFields.data;

  try {
    let reportedUserId: string | undefined;
    let reportData: any = {
      reason,
      details: details || null,
      status: "PENDING",
      targetType,
      reporterId: session.user.id,
    };

    // 1. Resolve target details
    switch (targetType) {
      case ReportTargetType.MESSAGE:
        const message = await prisma.directMessage.findUnique({
          where: { id: targetId },
          select: { senderId: true }
        });
        if (!message) return { success: false, message: "Message not found." };
        reportedUserId = message.senderId;
        reportData.messageId = targetId;
        reportData.reportedProfileId = message.senderId;
        break;

      case ReportTargetType.POST:
        const post = await prisma.post.findUnique({
          where: { id: targetId },
          select: { authorId: true }
        });
        if (!post) return { success: false, message: "Post not found." };
        reportedUserId = post.authorId;
        reportData.postId = targetId;
        reportData.reportedProfileId = post.authorId;
        break;

      case ReportTargetType.COMMENT:
        const comment = await prisma.comment.findUnique({
          where: { id: targetId },
          select: { authorId: true }
        });
        if (!comment) return { success: false, message: "Comment not found." };
        reportedUserId = comment.authorId;
        reportData.commentId = targetId;
        reportData.reportedProfileId = comment.authorId;
        break;

      case ReportTargetType.USER:
        const user = await prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true }
        });
        if (!user) return { success: false, message: "User not found." };
        reportedUserId = user.id;
        reportData.reportedProfileId = targetId;
        break;

      case ReportTargetType.CHANNEL:
        const channel = await prisma.channel.findUnique({
          where: { id: targetId },
          select: { creatorId: true }
        });
        if (!channel) return { success: false, message: "Channel not found." };
        reportedUserId = channel.creatorId;
        reportData.channelId = targetId;
        reportData.reportedProfileId = channel.creatorId;
        break;

      case ReportTargetType.ADVERTISEMENT:
        reportData.adId = targetId;
        break;
    }

    // 2. Create the record in DB 
    // We use the lowercase 'report' property on the prisma instance
    const newReport: PrismaReport = await prisma.report.create({
      data: reportData,
    });

    // 3. Handle Notifications
    const adminsAndMods = await prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.MODERATOR] } },
      select: { id: true }
    });

    if (adminsAndMods.length > 0) {
      await prisma.notification.createMany({
        data: adminsAndMods.map(admin => ({
          userId: admin.id,
          actorId: session.user.id,
          type: NotificationType.REPORT,
          reportId: newReport.id,
        }))
      });
    }

    return { 
      success: true, 
      message: "Report submitted successfully.",
      reportedUserId,
      reportId: newReport.id
    };

  } catch (error: any) {
    console.error("REPORT_SUBMISSION_ERROR:", error);
    
    // IMPORTANT: Even if the DB fails (e.g., column missing), 
    // returning success: false allows the client-side code to 
    // actually finish the request and close the modal.
    return { 
      success: false, 
      message: error.code === 'P2022' 
        ? "System Error: Database schema mismatch. Please run 'npx prisma db push'." 
        : "Failed to submit report. Please try again." 
    };
  }
}