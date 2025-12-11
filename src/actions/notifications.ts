'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth.config" // Matches your existing project structure
import { prisma } from "@/lib/db" // Matches your existing DB import

// FETCH: Get recent notifications
export async function getNotifications(limit = 20) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { username: true, image: true } },
        post: { select: { content: true } },
        comment: { select: { content: true } },
        ticket: { select: { id: true, status: true } }
      }
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false }
    })

    return { success: true, data: notifications, unreadCount }
  } catch (error) {
    return { error: "Failed to load notifications" }
  }
}

// UPDATE: Mark single item as read
export async function markAsRead(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return

  await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  })
}

// UPDATE: Mark ALL as read
export async function markAllRead() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return
  
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true }
    })
}