'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth.config"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { Ticket } from "@/lib/support-types"
import { SupportStatus, SupportPriority, NotificationType, UserRole, AdminLogType, Prisma } from "@prisma/client"
import { createAdminLog } from "@/lib/admin-logger"
import { requireStaff } from "@/lib/rbac"
import { findOrCreateDirectConversation } from "@/lib/conversations"

const isStaffRole = (role?: string | null) => role === UserRole.ADMIN || role === UserRole.MODERATOR
const TICKET_LIST_LIMIT = 200

// --- 1. FETCHING ACTIONS ---

const staffTicketInclude = (messagesTake?: number) => ({
  messages: {
    orderBy: { createdAt: messagesTake ? 'desc' : 'asc' },
    take: messagesTake,
    include: { admin: { select: { id: true, username: true } } }
  },
  directMessages: {
    orderBy: { createdAt: messagesTake ? 'desc' : 'asc' },
    take: messagesTake,
    select: { content: true, createdAt: true, senderId: true, sender: { select: { id: true, username: true } } }
  },
  user: {
    select: { id: true, username: true, name: true, email: true, walletAddress: true, createdAt: true }
  }
} satisfies Prisma.SupportTicketInclude)

type StaffTicketRow = Prisma.SupportTicketGetPayload<{ include: ReturnType<typeof staffTicketInclude> }>
type StaffMember = { id: string; username: string | null; name: string | null }

function toStaffTicket(t: StaffTicketRow, staffMap: Map<string, StaffMember>): Ticket {
  const ticketMsgs = t.messages.map(m => ({
    sender: m.sender as 'user' | 'admin' | 'bot',
    text: m.text,
    timestamp: m.createdAt.getTime(),
    isDM: false,
    isInternal: m.isInternal,
    senderInfo: m.admin ? { username: m.admin.username, id: m.admin.id } : undefined
  }));

  const directMsgs = t.directMessages.map(m => ({
    sender: 'admin' as const,
    text: m.content,
    timestamp: m.createdAt.getTime(),
    isDM: true,
    isInternal: false,
    senderInfo: { username: m.sender.username, id: m.sender.id }
  }));

  return {
    id: t.id,
    status: t.status,
    priority: t.priority,
    severity: t.severity,
    unreadAdminCount: 0, 
    userId: t.userId,
    user: t.user,
    assigneeId: t.assigneeId,
    assignee: t.assigneeId ? staffMap.get(t.assigneeId) : null,
    internalNotes: t.internalNotes,
    updatedAt: t.updatedAt,
    messages: [...ticketMsgs, ...directMsgs].sort((a, b) => a.timestamp - b.timestamp)
  };
}

const getStaffMap = async () => new Map(
  (await prisma.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.MODERATOR] } },
    select: { id: true, username: true, name: true }
  })).map(s => [s.id, s])
);

/**
 * The staff queue. Polled every 10s, so each ticket carries only its latest message (open one
 * with getStaffTicketAction for the thread); `search` matches the ticket id or any message text.
 */
export async function getAllTicketsAction(search?: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isStaffRole(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  const q = search?.trim().slice(0, 200);
  const where: Prisma.SupportTicketWhereInput = q ? {
    OR: [
      { id: { contains: q, mode: 'insensitive' } },
      { messages: { some: { text: { contains: q, mode: 'insensitive' } } } },
      { directMessages: { some: { content: { contains: q, mode: 'insensitive' } } } },
    ]
  } : {};

  try {
    const [tickets, staffMap] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: TICKET_LIST_LIMIT,
        include: staffTicketInclude(1),
      }),
      getStaffMap(),
    ]);

    // Keep only the newest of the ticket's last note/message and last DM
    const data = tickets.map(t => {
      const ticket = toStaffTicket(t, staffMap);
      return { ...ticket, messages: ticket.messages.slice(-1) };
    });
    return { success: true, data };
  } catch (error) {
    console.error("getAllTicketsAction:", error)
    return { success: false, error: "Failed to load tickets" }
  }
}

/** One ticket with its whole thread (notes, replies and DMs), for the staff console. */
export async function getStaffTicketAction(ticketId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isStaffRole(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [ticket, staffMap] = await Promise.all([
      prisma.supportTicket.findUnique({ where: { id: ticketId }, include: staffTicketInclude() }),
      getStaffMap(),
    ]);
    if (!ticket) return { success: false, error: "Ticket not found" };
    return { success: true, data: toStaffTicket(ticket, staffMap) };
  } catch (error) {
    console.error("getStaffTicketAction:", error)
    return { success: false, error: "Failed to load ticket" }
  }
}

export async function getTicketAction(ticketId: string) {
  const session = await getServerSession(authOptions)
  const isStaff = isStaffRole(session?.user?.role)

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { 
        messages: { 
          orderBy: { createdAt: 'asc' },
          include: {
            admin: {
              select: { id: true, username: true }
            }
          }
        }
      }
    })

    if (!ticket) return { success: false, error: "Ticket not found" }

    // Staff see every ticket. Others only see their own; anonymous Help Bot tickets
    // (no userId) stay readable by whoever holds the ticket id.
    if (!isStaff && ticket.userId && ticket.userId !== session?.user?.id) {
      return { success: false, error: "Ticket not found" }
    }

    let assignee = null;
    if (ticket.assigneeId) {
      assignee = await prisma.user.findUnique({
        where: { id: ticket.assigneeId },
        select: { id: true, username: true, name: true }
      });
    }

    const mappedTicket: Ticket = {
      id: ticket.id,
      status: ticket.status,
      priority: ticket.priority,
      severity: ticket.severity,
      unreadAdminCount: 0,
      userId: ticket.userId,
      assigneeId: ticket.assigneeId,
      assignee: assignee,
      internalNotes: isStaff ? ticket.internalNotes : null,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages.filter(m => isStaff || !m.isInternal).map(m => ({
        sender: m.sender as 'user' | 'admin' | 'bot',
        text: m.text,
        timestamp: m.createdAt.getTime(),
        isInternal: m.isInternal,
        senderInfo: m.admin ? {
          username: m.admin.username,
          id: m.admin.id
        } : undefined
      }))
    }

    return { success: true, data: mappedTicket }
  } catch (error) {
    return { success: false, error: "Failed to load ticket" }
  }
}

// --- 2. MUTATION ACTIONS ---

// Ticket text limits, and creation caps checked against the database (works across instances).
// Anonymous Help Bot tickets share one site-wide cap since we can't tell visitors apart.
const TICKET_TEXT_MAX = 2000
const TICKETS_PER_USER_PER_HOUR = 5
const ANONYMOUS_TICKETS_PER_HOUR = 30
const HOUR_MS = 60 * 60 * 1000

function cleanTicketText(text: unknown): string | null {
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  return trimmed.length > 0 && trimmed.length <= TICKET_TEXT_MAX ? trimmed : null
}

export async function createTicketAction(initialMsg: string) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null 

  const text = cleanTicketText(initialMsg)
  if (!text) return { success: false, error: `Please describe the issue in 1-${TICKET_TEXT_MAX} characters.` }

  try {
    const recent = await prisma.supportTicket.count({
      where: { userId, createdAt: { gt: new Date(Date.now() - HOUR_MS) } }
    })
    if (recent >= (userId ? TICKETS_PER_USER_PER_HOUR : ANONYMOUS_TICKETS_PER_HOUR)) {
      return { success: false, error: userId
        ? "You've opened several tickets recently. Please add to an existing one in Messages."
        : "Support is busy right now. Please sign in or try again later." }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        status: SupportStatus.OPEN,
        priority: SupportPriority.LOW,
        severity: 0,
        userId: userId,
        messages: {
          create: {
            text,
            sender: 'user',
            isInternal: false
          }
        }
      }
    })

    if (userId) { revalidatePath('/messages') }
    revalidatePath('/admin/support')

    return { success: true, ticketId: ticket.id }
  } catch (error) {
    console.error("createTicketAction:", error)
    return { success: false, error: "Failed to create ticket" }
  }
}

export async function addMessageAction(ticketId: string, rawText: string, sender: 'user' | 'admin' | 'bot', isInternal: boolean = false) {
  const session = await getServerSession(authOptions);

  const text = cleanTicketText(rawText)
  if (!text) return { success: false, error: `Messages must be 1-${TICKET_TEXT_MAX} characters.` }

  if (sender === 'admin' || sender === 'bot') {
    await requireStaff();
  } else {
    // Users can only post to their own ticket, and never as an internal note
    const owner = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { userId: true } });
    if (!owner) return { success: false, error: "Ticket not found" };
    if (owner.userId && owner.userId !== session?.user?.id) return { success: false, error: "Unauthorized" };
    isInternal = false;
  }

  const adminId = (sender === 'admin' || sender === 'bot') ? session?.user?.id : null;

  try {
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        text,
        sender,
        isInternal,
        adminId
      }
    })

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
      include: { user: true }
    })

    if (ticket.userId && !isInternal && (sender === 'admin' || sender === 'bot')) {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: NotificationType.TICKET_UPDATE,
          ticketId: ticket.id,
        }
      })
    }
    
    // Log Admin Action
    if (adminId) {
      await createAdminLog({
        adminId,
        eventType: AdminLogType.SUPPORT_TICKET,
        targetResource: `Ticket ${ticketId}`,
        details: { 
          action: isInternal ? 'INTERNAL_NOTE' : 'REPLY', 
          ticketId, 
          textSnippet: text.substring(0, 50) 
        }
      })
    }

    revalidatePath('/messages')
    revalidatePath('/admin/support')

    return { success: true }
  } catch (error) {
    console.error("addMessageAction:", error)
    return { success: false, error: "Failed to send message" }
  }
}

export async function updateSeverityAction(ticketId: string, severity: number) {
  await requireStaff()
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { severity }
    })
    revalidatePath('/admin/support')
    return { success: true }
  } catch (error) {
    console.error("updateSeverityAction:", error)
    return { success: false, error: "Failed to update severity" }
  }
}

export async function resolveTicketAction(ticketId: string) {
  await requireStaff()
  const session = await getServerSession(authOptions)
  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: SupportStatus.RESOLVED },
      include: { user: true }
    })

    if (ticket.userId) {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: NotificationType.TICKET_UPDATE,
          ticketId: ticket.id,
        }
      })
    }

    if (session?.user?.id) {
      await createAdminLog({
        adminId: session.user.id,
        eventType: AdminLogType.SUPPORT_TICKET,
        targetResource: `Ticket ${ticketId}`,
        details: { action: 'RESOLVE', ticketId }
      })
    }

    revalidatePath('/messages')
    revalidatePath('/admin/support')

    return { success: true }
  } catch (error) {
    console.error("resolveTicketAction:", error)
    return { success: false, error: "Failed to resolve ticket" }
  }
}

export async function updateTicketStatusAction(ticketId: string, status: SupportStatus) {
  await requireStaff()
  const session = await getServerSession(authOptions)
  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
      include: { user: true }
    })

    if (ticket.userId) {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: NotificationType.TICKET_UPDATE,
          ticketId: ticket.id,
        }
      })
    }

    if (session?.user?.id) {
      await createAdminLog({
        adminId: session.user.id,
        eventType: AdminLogType.SUPPORT_TICKET,
        targetResource: `Ticket ${ticketId}`,
        details: { action: 'UPDATE_STATUS', status, ticketId }
      })
    }

    revalidatePath('/admin/support')
    return { success: true }
  } catch (error) {
    console.error("updateTicketStatusAction:", error)
    return { success: false, error: "Failed to update status" }
  }
}

export async function updateTicketPriorityAction(ticketId: string, priority: SupportPriority) {
  await requireStaff()
  const session = await getServerSession(authOptions)
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { priority }
    })

    if (session?.user?.id) {
      await createAdminLog({
        adminId: session.user.id,
        eventType: AdminLogType.SUPPORT_TICKET,
        targetResource: `Ticket ${ticketId}`,
        details: { action: 'UPDATE_PRIORITY', priority, ticketId }
      })
    }

    revalidatePath('/admin/support')
    return { success: true }
  } catch (error) {
    console.error("updateTicketPriorityAction:", error)
    return { success: false, error: "Failed to update priority" }
  }
}

export async function updateTicketAssigneeAction(ticketId: string, assigneeId: string | null) {
  await requireStaff()
  const session = await getServerSession(authOptions)
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assigneeId }
    })

    if (session?.user?.id) {
      await createAdminLog({
        adminId: session.user.id,
        eventType: AdminLogType.SUPPORT_TICKET,
        targetResource: `Ticket ${ticketId}`,
        details: { action: 'UPDATE_ASSIGNEE', assigneeId, ticketId }
      })
    }

    revalidatePath('/admin/support')
    return { success: true }
  } catch (error) {
    console.error("updateTicketAssigneeAction:", error)
    return { success: false, error: "Failed to update assignee" }
  }
}

export async function updateInternalNotesAction(ticketId: string, internalNotes: string) {
  await requireStaff()
  const session = await getServerSession(authOptions)
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { internalNotes }
    })

    if (session?.user?.id) {
      await createAdminLog({
        adminId: session.user.id,
        eventType: AdminLogType.SUPPORT_TICKET,
        targetResource: `Ticket ${ticketId}`,
        details: { action: 'UPDATE_INTERNAL_NOTES', ticketId }
      })
    }

    revalidatePath('/admin/support')
    return { success: true }
  } catch (error) {
    console.error("updateInternalNotesAction:", error)
    return { success: false, error: "Failed to save notes" }
  }
}

export async function sendMessageToUserAction(ticketId: string, text: string) {
  await requireStaff()
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, error: "Not authenticated" }

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      // FIX: Added 'id: true' to the select block
      select: { id: true, userId: true, assigneeId: true }
    })

    if (!ticket || !ticket.userId) return { success: false, error: "User not found for this ticket" }
    if (!ticket.assigneeId) return { success: false, error: "Ticket must be assigned before messaging" }

    const conversation = await findOrCreateDirectConversation(session.user.id, ticket.userId)

    await prisma.directMessage.create({
      data: {
        content: text,
        senderId: session.user.id,
        conversationId: conversation.id,
        ticketId: ticket.id
      }
    })

    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        actorId: session.user.id,
        type: NotificationType.MESSAGE,
        ticketId: ticket.id
      }
    })

    if (session?.user?.id) {
      await createAdminLog({
        adminId: session.user.id,
        eventType: AdminLogType.SUPPORT_TICKET,
        targetResource: `Ticket ${ticketId}`,
        details: { action: 'SEND_DM', ticketId, textSnippet: text.substring(0, 50) }
      })
    }

    revalidatePath('/messages')
    revalidatePath('/admin/support')
    return { success: true }
  } catch (error) {
    console.error("sendMessageToUserAction:", error)
    return { success: false, error: "Failed to send message" }
  }
}
