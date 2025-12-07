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
import { ReportStatus, PenaltyType } from "@prisma/client";
import { revalidatePath } from "next/cache";

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
          author: { select: { username: true, role: true, strikeCount: true } }
        }
      },
      // Or was a profile reported directly?
      reportedProfile: {
        select: { username: true, id: true, strikeCount: true }
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

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch report to identify the target
    const report = await tx.report.findUnique({
      where: { id: reportId },
      include: { post: true }
    });

    if (!report) throw new Error("Report not found");

    // Determine who is being punished (Post Author OR Profile User)
    const offenderId = report.reportedProfileId || report.post?.authorId;

    if (verdict === "PENALIZE") {
      if (!offenderId) throw new Error("Target user not found.");

      // A. Create the Penalty Record (Audit Log)
      await tx.penalty.create({
        data: {
          type: penaltyType || "WARNING",
          reason: notes || "Violation of community standards",
          userId: offenderId,
          issuerId: session.user.id,
          reportId: report.id,
          isActive: true
        }
      });

      // B. Apply Consequences to the User Table
      if (penaltyType === "PERMANENT_BAN") {
        await tx.user.update({
          where: { id: offenderId },
          data: { isBanned: true }
        });
      } else if (["STRIKE_1_TIMEOUT", "STRIKE_2_SUSPENSION"].includes(penaltyType!)) {
        await tx.user.update({
            where: { id: offenderId },
            data: { strikeCount: { increment: 1 } }
        });
      }
      
      // C. If Content Removal is part of penalty, delete the post
      if (penaltyType === "CONTENT_REMOVAL" && report.postId) {
        await tx.post.delete({ where: { id: report.postId }});
      }
    }

    // 2. Mark Report as Resolved
    await tx.report.update({
      where: { id: reportId },
      data: {
        status: verdict === "DISMISS" ? "DISMISSED" : "RESOLVED",
        resolverId: session.user.id,
      },
    });

    revalidatePath("/admin/moderation");
    return { success: true };
  });
}