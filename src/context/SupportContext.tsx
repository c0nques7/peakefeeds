'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  getTicketsAction, 
  createTicketAction, 
  addMessageAction, 
  updateSeverityAction, 
  resolveTicketAction 
} from '@/actions/support'

// --- TYPES ---
export type ChatMessage = {
  sender: 'user' | 'admin' | 'bot';
  text: string;
  timestamp: number;
}

export type Ticket = {
  id: string;
  status: 'open' | 'resolved';
  severity: number;
  messages: ChatMessage[];
  unreadAdminCount: number;
}

interface SupportContextType {
  tickets: Ticket[];
  isLoading: boolean;
  createTicket: (initialMsg: string) => Promise<string | null>;
  addMessageToTicket: (ticketId: string, msg: ChatMessage) => Promise<void>;
  resolveTicket: (ticketId: string) => Promise<void>;
  setTicketSeverity: (ticketId: string, level: number) => Promise<void>;
  refreshTickets: () => void; // Manual refresh button
}

const SupportContext = createContext<SupportContextType | undefined>(undefined)

export function SupportProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 1. LOAD TICKETS FROM DB
  const fetchTickets = async () => {
    const res = await getTicketsAction()
    if (res.success && res.data) {
      setTickets(res.data)
    }
    setIsLoading(false)
  }

  // Initial Load
  useEffect(() => {
    fetchTickets()
  }, [])

  // 2. ACTIONS (Updated to be Async)
  
  const createTicket = async (initialMsg: string) => {
    // Optimistic UI Update
    const tempId = Math.random().toString(36).substr(2, 9)
    const newTicket: Ticket = {
      id: tempId, 
      status: 'open', severity: 0, unreadAdminCount: 0,
      messages: [{ sender: 'user', text: initialMsg, timestamp: Date.now() }]
    }
    setTickets(prev => [newTicket, ...prev])

    // DB Call
    const res = await createTicketAction(initialMsg)
    if (res.success && res.ticketId) {
       // Replace temp ID with real ID
       setTickets(prev => prev.map(t => t.id === tempId ? { ...t, id: res.ticketId! } : t))
       return res.ticketId
    }
    return null
  }

  const addMessageToTicket = async (ticketId: string, msg: ChatMessage) => {
    // Optimistic Update
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t
      return { ...t, messages: [...t.messages, msg] }
    }))

    // DB Call
    await addMessageAction(ticketId, msg.text, msg.sender)
  }

  const resolveTicket = async (ticketId: string) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t))
    await resolveTicketAction(ticketId)
  }

  const setTicketSeverity = async (ticketId: string, level: number) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, severity: level } : t))
    await updateSeverityAction(ticketId, level)
  }

  return (
    <SupportContext.Provider value={{ 
      tickets, 
      isLoading, 
      createTicket, 
      addMessageToTicket, 
      resolveTicket, 
      setTicketSeverity,
      refreshTickets: fetchTickets 
    }}>
      {children}
    </SupportContext.Provider>
  )
}

export function useSupport() {
  const context = useContext(SupportContext)
  if (!context) throw new Error("useSupport must be used within a SupportProvider")
  return context
}