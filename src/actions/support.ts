'use server'

import { getServerSession } from "next-auth" // 🆕
import { authOptions } from "@/lib/auth.config" // 🆕
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache" // 🆕
import { Ticket } from "@/context/SupportContext"

// --- 1. FETCHING ACTIONS ---

// ADMIN ONLY: Fetch ALL tickets for the dashboard
export async function getAllTicketsAction() {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { 
        messages: { 
          orderBy: { createdAt: 'asc' } 
        } 
      }
    })

    return { success: true, data: tickets.map(t => ({
      id: t.id,
      status: t.status as 'open' | 'resolved',
      severity: t.severity,
      unreadAdminCount: 0, 
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

// USER ONLY: Fetch a SINGLE ticket (For HelpBot polling)
export async function getTicketAction(ticketId: string) {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { 
        messages: { 
          orderBy: { createdAt: 'asc' } 
        } 
      }
    })
    
    if (!ticket) return { success: false, error: "Ticket not found" }
    
    const mappedTicket: Ticket = {
      id: ticket.id,
      status: ticket.status as 'open' | 'resolved',
      severity: ticket.severity,
      unreadAdminCount: 0,
      messages: ticket.messages.map(m => ({
        sender: m.sender as 'user' | 'admin' | 'bot',
        text: m.text,
        timestamp: m.createdAt.getTime()
      }))
    }
    
    return { success: true, data: mappedTicket }
  } catch (error) {
    return { success: false, error: "Failed to load ticket" }
  }
}


// --- 2. MUTATION ACTIONS ---

export async function createTicketAction(initialMsg: string) {
  // 🆕 1. GET SESSION
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null 

  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        status: 'open',
        severity: 0,
        userId: userId, // 👈 CRITICAL FIX: Link the ticket to the user
        messages: {
          create: {
            text: initialMsg,
            sender: 'user'
          }
        }
      }
    })

    // 🆕 2. REVALIDATE
    if (userId) {
        revalidatePath('/messages') // Update the User's Inbox
    }
    revalidatePath('/admin/support') // Update Admin Console

    return { success: true, ticketId: ticket.id }
  } catch (error) {
    return { success: false, error }
  }
}

export async function addMessageAction(ticketId: string, text: string, sender: 'user' | 'admin' | 'bot') {
  try {
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        text,
        sender
      }
    })
    
    // Update timestamp so it jumps to top of Admin list AND User Inbox
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    })
    
    // 🆕 REVALIDATE
    revalidatePath(`/messages/${ticketId}`)
    revalidatePath('/messages') // Refresh the list order
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
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'resolved' }
    })
    
    // 🆕 REVALIDATE
    revalidatePath('/messages')
    revalidatePath('/admin/support')
    
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}