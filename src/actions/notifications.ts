import { prisma } from "@/lib/db"; // Ensure this matches your actual db import path (could be "@/lib/prisma")
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
    // 1. SELF-ACTION CHECK: Don't notify if user interacts with their own content
    if (actorId === recipientId) return;

    // 2. DUPLICATE CHECK: Prevent spamming
    const existing = await prisma.notification.findFirst({
      where: {
        type,
        actorId,
        userId: recipientId, // 🟢 FIX: Map 'recipientId' to the DB field 'userId'
        postId,
        commentId,
        ticketId,
        isRead: false, 
      },
    });

    if (existing) return; 

    // 3. CREATE
    await prisma.notification.create({
      data: {
        type,
        actorId,
        userId: recipientId, // 🟢 This was already correct
        postId,
        commentId,
        ticketId,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}