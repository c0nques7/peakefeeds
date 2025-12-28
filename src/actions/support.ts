'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth.config"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { Ticket } from "@/context/SupportContext"
import { SupportStatus, SupportPriority, NotificationType, UserRole, AdminLogType } from "@prisma/client"
import { createAdminLog } from "@/lib/admin-logger"

// --- 1. FETCHING ACTIONS ---

export async function getAllTicketsAction() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MODERATOR)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [tickets, staff] = await Promise.all([
      prisma.supportTicket.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { 
          messages: { 
            orderBy: { createdAt: 'asc' },
            include: {
              admin: {
                select: { id: true, username: true }
              }
            }
          },
          directMessages: {
            orderBy: { createdAt: 'asc' },
            select: { 
              content: true, 
              createdAt: true, 
              senderId: true,
              sender: {
                select: { id: true, username: true }
              }
            }
          },
          user: {
            select: { 
              id: true, 
              username: true, 
              name: true,
              email: true,
              walletAddress: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.user.findMany({
        where: { role: { in: [UserRole.ADMIN, UserRole.MODERATOR] } },
        select: { id: true, username: true, name: true }
      })
    ]);

    const staffMap = new Map(staff.map(s => [s.id, s]));

    const mappedTickets: Ticket[] = tickets.map(t => {
      const ticketMsgs = t.messages.map(m => ({
        sender: m.sender as 'user' | 'admin' | 'bot',
        text: m.text,
        timestamp: m.createdAt.getTime(),
        isDM: false,
        isInternal: m.isInternal,
        senderInfo: m.admin ? {
          username: m.admin.username,
          id: m.admin.id
        } : undefined
      }));

      const directMsgs = t.directMessages.map(m => ({
        sender: 'admin' as const,
        text: m.content,
        timestamp: m.createdAt.getTime(),
        isDM: true,
        isInternal: false,
        senderInfo: {
          username: m.sender.username,
          id: m.sender.id
        }
      }));

      const allMessages = [...ticketMsgs, ...directMsgs].sort((a, b) => a.timestamp - b.timestamp);

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
        messages: allMessages
      };
    });

    return { success: true, data: mappedTickets };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load tickets" }
  }
}

export async function getTicketAction(ticketId: string) {
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
      internalNotes: ticket.internalNotes,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages.map(m => ({
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

export async function createTicketAction(initialMsg: string) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null 

  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        status: SupportStatus.OPEN,
        priority: SupportPriority.LOW,
        severity: 0,
        userId: userId,
        messages: {
          create: {
            text: initialMsg,
            sender: 'user',
            isInternal: false
          }
        }
      }
    })

    if (userId) { revalidatePath('/messages') }
    revalidatePath('/admin/support')

    return { success: true, ticketId: ticket.id }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create ticket" }
  }
}

export async function addMessageAction(ticketId: string, text: string, sender: 'user' | 'admin' | 'bot', isInternal: boolean = false) {
  const session = await getServerSession(authOptions);
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

    revalidatePath(`/messages/${ticketId}`)
    revalidatePath('/messages')
    revalidatePath('/admin/support')

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

export async function updateSeverityAction(ticketId: string, severity: number) {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { severity }
    })
    revalidatePath('/admin/support')
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

export async function resolveTicketAction(ticketId: string) {
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
    return { success: false, error }
  }
}

export async function updateTicketStatusAction(ticketId: string, status: SupportStatus) {
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
    return { success: false, error }
  }
}

export async function updateTicketPriorityAction(ticketId: string, priority: SupportPriority) {
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
    return { success: false, error }
  }
}

export async function updateTicketAssigneeAction(ticketId: string, assigneeId: string | null) {
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
    return { success: false, error }
  }
}

export async function updateInternalNotesAction(ticketId: string, internalNotes: string) {
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
    return { success: false, error }
  }
}

export async function sendMessageToUserAction(ticketId: string, text: string) {
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

    let conversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            id: { in: [session.user.id, ticket.userId] }
          }
        }
      }
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: session.user.id }, { id: ticket.userId }]
          }
        }
      })
    }

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
    return { success: false, error }
  }
}
