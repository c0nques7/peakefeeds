'use server'

import { prisma } from "@/lib/db" // Ensure this path matches your project
import { Ticket, ChatMessage } from "@/context/SupportContext"

// 1. Fetch all tickets
export async function getTicketsAction() {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { 
        messages: { 
          orderBy: { createdAt: 'asc' } 
        } 
      }
    })

    // Map Prisma result to our Context Type
    return { success: true, data: tickets.map(t => ({
      id: t.id,
      status: t.status as 'open' | 'resolved',
      severity: t.severity,
      unreadAdminCount: 0, // Simplified for now
      messages: t.messages.map(m => ({
        sender: m.sender as 'user' | 'admin' | 'bot',
        text: m.text,
        timestamp: m.createdAt.getTime()
      }))
    })) as Ticket[] }
  } catch (error) {
    console.error("Failed to fetch tickets:", error)
    return { success: false, error: "Failed to load tickets" }
  }
}

// 2. Create a new ticket
export async function createTicketAction(initialMsg: string) {
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        status: 'open',
        severity: 0,
        messages: {
          create: {
            text: initialMsg,
            sender: 'user'
          }
        }
      }
    })
    return { success: true, ticketId: ticket.id }
  } catch (error) {
    return { success: false, error }
  }
}

// 3. Add Message
export async function addMessageAction(ticketId: string, text: string, sender: 'user' | 'admin' | 'bot') {
  try {
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        text,
        sender
      }
    })
    
    // Update timestamp of ticket so it jumps to top
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    })
    
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

// 4. Update Severity
export async function updateSeverityAction(ticketId: string, severity: number) {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { severity }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

// 5. Resolve Ticket
export async function resolveTicketAction(ticketId: string) {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'resolved' }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}