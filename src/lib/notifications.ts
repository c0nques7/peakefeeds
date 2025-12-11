import { prisma } from "@/lib/db";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  type: NotificationType;
  actorId: string;
  recipientId: string;
  postId?: string;
  commentId?: string;
  ticketId?: string;
}

export async function createNotification({
  type,
  actorId,
  recipientId,
  postId,
  commentId,
  ticketId,
}: CreateNotificationParams) {
  try {
    // 1. SELF-ACTION CHECK: Don't notify if user likes their own post
    if (actorId === recipientId) return;

    // 2. DUPLICATE CHECK: Prevent spamming (e.g., toggling Like on/off)
    // We check if a similar notification exists from this user on this item recently.
    const existing = await prisma.notification.findFirst({
      where: {
        type,
        actorId,
        recipientId,
        postId,
        commentId,
        ticketId,
        isRead: false, // Only check unread ones to avoid spam
      },
    });

    if (existing) return; // Skip if already notified

    // 3. CREATE
    await prisma.notification.create({
      data: {
        type,
        actorId,
        userId: recipientId, // The recipient
        postId,
        commentId,
        ticketId,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    // We intentionally swallow the error so it doesn't crash the main action (Like/Comment)
  }
}