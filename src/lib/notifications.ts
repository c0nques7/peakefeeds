import { prisma } from "@/lib/db";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  type: NotificationType;
  actorId: string;
  recipientId: string;
  postId?: string;
  commentId?: string;
  ticketId?: string;
  reportId?: string;
}

export async function createNotification({
  type,
  actorId,
  recipientId,
  postId,
  commentId,
  ticketId,
  reportId,
}: CreateNotificationParams) {
  try {
    if (actorId === recipientId) return;

    const existing = await prisma.notification.findFirst({
      where: {
        type,
        actorId,
        userId: recipientId, 
        postId,
        commentId,
        ticketId,
        reportId,
        isRead: false,
      },
    });

    if (existing) return;

    await prisma.notification.create({
      data: {
        type,
        actorId,
        userId: recipientId,
        postId,
        commentId,
        ticketId,
        reportId,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}