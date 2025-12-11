'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth.config"
import { prisma } from "@/lib/db"
import { createNotification } from "@/lib/notifications"
import { addMessageAction } from "@/actions/support" // Reuse existing support logic
import { revalidatePath } from "next/cache"

// --- TYPES ---
// A unified type so the UI doesn't know the difference
type UnifiedConversation = {
  id: string;
  type: 'DM' | 'TICKET';
  lastMessageAt: Date;
  participants: { id: string; username: string; image: string | null }[];
  messages: { content: string; createdAt: Date; senderId: string }[];
}

// 1. GET UNIFIED INBOX (DMs + Tickets)
export async function getConversations() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    // A. Fetch DMs
    const dms = await prisma.conversation.findMany({
      where: {
        participants: { some: { id: session.user.id } }
      },
      include: {
        participants: { select: { id: true, username: true, image: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } }
      }
    })

    // B. Fetch Tickets
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      include: {
        messages: { take: 1, orderBy: { createdAt: 'desc' } }
      }
    })

    // C. Normalize DMs
    const formattedDMs: UnifiedConversation[] = dms.map(dm => ({
      id: dm.id,
      type: 'DM',
      lastMessageAt: dm.lastMessageAt,
      participants: dm.participants.map(p => ({
         id: p.id, 
         username: p.username || 'User', 
         image: p.image 
      })),
      messages: dm.messages.map(m => ({ 
         content: m.content, 
         createdAt: m.createdAt,
         senderId: m.senderId 
      }))
    }))

    // D. Normalize Tickets (Make them look like DMs)
    const formattedTickets: UnifiedConversation[] = tickets.map(t => ({
      id: t.id,
      type: 'TICKET',
      lastMessageAt: t.updatedAt,
      // Create a "Fake" Participant for the Support Bot/Admin
      participants: [
        { id: session.user.id, username: 'Me', image: null }, // User
        { id: 'support-system', username: 'Peake Support', image: null } // System
      ],
      messages: t.messages.map(m => ({ 
         content: m.text, // Map 'text' to 'content'
         createdAt: m.createdAt,
         senderId: m.sender === 'user' ? session.user.id! : 'support-system'
      }))
    }))

    // E. Merge & Sort by Recency
    const unifiedList = [...formattedDMs, ...formattedTickets].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )

    return { success: true, data: unifiedList }

  } catch (error) {
    console.error(error)
    return { error: "Failed to load inbox" }
  }
}

// 2. GET MESSAGES (Router)
export async function getMessages(conversationId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    // STRATEGY: Try finding a Ticket first (since we know the ID format is generic), 
    // then fall back to Conversation.
    
    // A. Check if it's a Support Ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    })

    if (ticket) {
      // Security Check: Does user own this ticket?
      if (ticket.userId !== session.user.id) return { error: "Unauthorized ticket access" }

      return {
        success: true,
        type: 'TICKET',
        // Normalize Ticket Messages to DM structure
        data: ticket.messages.map(m => ({
          id: m.id,
          content: m.text,
          createdAt: m.createdAt,
          senderId: m.sender === 'user' ? session.user.id : 'support-system',
          sender: { 
             id: m.sender === 'user' ? session.user.id : 'support-system',
             username: m.sender === 'user' ? 'Me' : (m.sender === 'bot' ? 'Help Bot' : 'Support Agent'),
             image: null 
          }
        })),
        // Fake participants so the UI Header works
        participants: [
           { id: session.user.id, username: session.user.username },
           { id: 'support-system', username: 'Peake Support (Ticket #' + ticket.id.slice(-4) + ')', image: null }
        ]
      }
    }

    // B. If not Ticket, Check DM Conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true }
    })

    if (conversation && conversation.participants.some(p => p.id === session.user.id)) {
       const messages = await prisma.directMessage.findMany({
         where: { conversationId },
         orderBy: { createdAt: 'asc' },
         include: {
           sender: { select: { id: true, username: true, image: true } }
         }
       })
       
       return { success: true, type: 'DM', data: messages, participants: conversation.participants }
    }

    return { error: "Conversation not found" }

  } catch (error) {
    return { error: "Failed to load messages" }
  }
}

// 3. SEND MESSAGE (Router)
export async function sendMessage(id: string, content: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    // A. Try sending to Ticket (using existing support action)
    // We check if the ID exists in the ticket table first
    const ticketCount = await prisma.supportTicket.count({ where: { id } })
    
    if (ticketCount > 0) {
       // Reuse the logic from actions/support.ts to ensure consistency
       // This handles the timestamp update and sender tagging
       await addMessageAction(id, content, 'user')
       revalidatePath(`/messages/${id}`)
       return { success: true }
    }

    // B. Send DM (Standard)
    const message = await prisma.directMessage.create({
      data: {
        content,
        conversationId: id,
        senderId: session.user.id
      }
    })

    // Update timestamp
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() }
    })

    // Notify Recipient
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { participants: true }
    })

    if (conversation) {
      const recipient = conversation.participants.find(p => p.id !== session.user.id)
      if (recipient) {
        await createNotification({
          type: 'MESSAGE',
          actorId: session.user.id,
          recipientId: recipient.id,
        })
      }
    }

    revalidatePath(`/messages/${id}`)
    return { success: true, message }

  } catch (error) {
    return { error: "Failed to send message" }
  }
}

// 4. START CONVERSATION (Unchanged)
export async function startConversation(recipientId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Unauthorized" }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: session.user.id } } },
        { participants: { some: { id: recipientId } } }
      ]
    }
  })

  if (existing) {
    return { success: true, conversationId: existing.id }
  }

  const newConvo = await prisma.conversation.create({
    data: {
      participants: {
        connect: [
          { id: session.user.id },
          { id: recipientId }
        ]
      }
    }
  })

  return { success: true, conversationId: newConvo.id }
}