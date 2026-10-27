"use server";

/**
 * ARCHITECTURE NOTE:
 * This action manages the "Courtroom" logic.
 * It is responsible for:
 * 1. Fetching the queue of "Pending" reports.
 * 2. Executing verdicts (Dismiss vs. Penalize).
 * 3. Ensuring that a Penalty record is created whenever a user is punished.
 */

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { ReportStatus, PenaltyType, AdminLogType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createAdminLog } from "@/lib/admin-logger";
import { TIMEOUT_MS, SUSPENSION_MS, clearAccountStatusCache } from "@/lib/penalties";

/**
 * Fetches reports that haven't been resolved yet.
 * Includes the reported Post and the User who made the post so moderators have context.
 */
export async function getModerationQueue() {
  await requireStaff();

  return await prisma.report.findMany({
    where: { status: "PENDING" },
    include: {
      // Who filed the report?
      reporter: {
        select: { username: true, id: true }
      },
      // What was reported?
      post: {
        select: { 
          id: true, 
          content: true, 
          mediaUrl: true, 
          authorId: true,
          isLocked: true,
          author: { select: { username: true, role: true, strikeCount: true } },
          channel: { select: { slug: true } }
        }
      },
      // Or was a profile reported directly?
      reportedProfile: {
        select: { username: true, id: true, strikeCount: true, isLocked: true }
      },
      // Or was a message reported?
      message: {
        select: {
          id: true,
          content: true,
          sender: { select: { username: true, role: true, strikeCount: true } }
        }
      },
      // Or was a comment reported?
      comment: {
        select: {
          id: true,
          content: true,
          isLocked: true,
          author: { select: { username: true, role: true, strikeCount: true } }
        }
      },
      // Or was a channel reported?
      channel: {
        select: {
          id: true,
          name: true,
          slug: true,
          isLocked: true,
          creator: { select: { username: true, role: true, strikeCount: true } }
        }
      }
    },
    orderBy: { createdAt: "asc" }, // FIFO: Deal with oldest reports first
    take: 20,
  });
}

/**
 * Applies a verdict to a report.
 * - Dismiss: Just marks report as resolved (False Alarm).
 * - Penalize: Creates a Penalty, potentially bans user, marks report resolved.
 */
export async function resolveReport({
  reportId,
  verdict,
  penaltyType,
  notes,
}: {
  reportId: string;
  verdict: "DISMISS" | "PENALIZE";
  penaltyType?: PenaltyType;
  notes?: string;
}) {
  const session = await requireStaff();

  // 1. Fetch report to identify the target
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { post: true, message: true, comment: true, channel: true }
  });

  if (!report) return { success: false, error: "Report not found." };
  if (report.status !== "PENDING") return { success: false, error: "This report has already been handled." };

  // Determine who is being punished (Post Author OR Profile User OR Message Sender OR Comment Author OR Channel Creator)
  const offenderId = report.reportedProfileId || report.post?.authorId || report.message?.senderId || report.comment?.authorId || report.channel?.creatorId;

  if (verdict === "PENALIZE") {
    if (!offenderId) return { success: false, error: "Target user not found." };

    // Moderators can't penalize staff accounts
    if (session.user.role !== UserRole.ADMIN) {
      const target = await prisma.user.findUnique({ where: { id: offenderId }, select: { role: true } });
      if (target && (target.role === UserRole.ADMIN || target.role === UserRole.MODERATOR)) {
        return { success: false, error: "Only admins can penalize staff accounts." };
      }
    }
  }

  const claimed = await prisma.$transaction(async (tx) => {
    // 2. Claim the report: only one verdict can ever apply to it
    const claim = await tx.report.updateMany({
      where: { id: reportId, status: "PENDING" },
      data: {
        status: verdict === "DISMISS" ? "DISMISSED" : "RESOLVED",
        resolverId: session.user.id,
      },
    });
    if (claim.count === 0) return false;

    if (verdict === "PENALIZE" && offenderId) {
      // A. Create the Penalty Record (Audit Log)
      await tx.penalty.create({
        data: {
          type: penaltyType || "WARNING",
          reason: notes || "Violation of community standards",
          userId: offenderId,
          issuerId: session.user.id,
          reportId: report.id,
          isActive: true,
          expiresAt: penaltyType === "STRIKE_1_TIMEOUT" ? new Date(Date.now() + TIMEOUT_MS)
            : penaltyType === "STRIKE_2_SUSPENSION" ? new Date(Date.now() + SUSPENSION_MS)
            : null,
        }
      });

      // B. Apply Consequences to the User Table
      if (penaltyType === "PERMANENT_BAN") {
        await tx.user.update({
          where: { id: offenderId },
          data: { isBanned: true }
        });
      } else if (penaltyType === "STRIKE_1_TIMEOUT") {
        await tx.user.update({
            where: { id: offenderId },
            data: { strikeCount: { increment: 1 }, mutedUntil: new Date(Date.now() + TIMEOUT_MS) }
        });
      } else if (penaltyType === "STRIKE_2_SUSPENSION") {
        await tx.user.update({
            where: { id: offenderId },
            data: { strikeCount: { increment: 1 }, bannedUntil: new Date(Date.now() + SUSPENSION_MS) }
        });
      }

      // C. If Content Removal is part of penalty, delete the content
      if (penaltyType === "CONTENT_REMOVAL") {
        if (report.postId) {
          await tx.post.delete({ where: { id: report.postId }});
        } else if (report.messageId) {
          await tx.directMessage.delete({ where: { id: report.messageId }});
        } else if (report.commentId) {
          await tx.comment.delete({ where: { id: report.commentId }});
        } else if (report.channelId) {
          await tx.channel.delete({ where: { id: report.channelId }});
        }
      }
    }
    return true;
  });

  if (!claimed) return { success: false, error: "This report has already been handled." };

  // Only after commit, so a rolled-back verdict can't leave a stale cached status
  if (verdict === "PENALIZE" && offenderId) clearAccountStatusCache(offenderId);

  await createAdminLog({
    adminId: session.user.id,
    eventType: AdminLogType.REPORT_RESOLVE,
    targetResource: `Report:${reportId}`,
    details: { verdict, penaltyType, notes }
  });

  revalidatePath("/admin/moderation");
  return { success: true };
}

/**
 * Toggles the 'isLocked' status for a piece of content.
 */
export async function toggleLockContent({
  targetId,
  targetType,
  lockState
}: {
  targetId: string;
  targetType: "POST" | "COMMENT" | "CHANNEL" | "USER";
  lockState: boolean;
}) {
  const session = await requireStaff();

  try {
    switch (targetType) {
      case "POST":
        await prisma.post.update({ where: { id: targetId }, data: { isLocked: lockState } });
        break;
      case "COMMENT":
        await prisma.comment.update({ where: { id: targetId }, data: { isLocked: lockState } });
        break;
      case "CHANNEL":
        await prisma.channel.update({ where: { id: targetId }, data: { isLocked: lockState } });
        break;
      case "USER":
        await prisma.user.update({ where: { id: targetId }, data: { isLocked: lockState } });
        break;
    }

    await createAdminLog({
      adminId: session.user.id,
      eventType: lockState ? AdminLogType.CONTENT_LOCK : AdminLogType.CONTENT_UNLOCK,
      targetResource: `${targetType}:${targetId}`,
      details: { targetType, targetId, lockState }
    });

    revalidatePath("/"); // Aggressive revalidation
    return { success: true };
  } catch (error) {
    console.error("Lock error:", error);
    return { success: false, error: "Failed to toggle lock." };
  }
}