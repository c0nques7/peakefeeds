'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { 
  createTicketAction, 
  addMessageAction, 
  updateSeverityAction, 
  resolveTicketAction 
} from '@/actions/support'

// --- TYPES ---
// We keep the types here so they can be imported by HelpBot/AdminConsole
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
  updatedAt?: Date;
}

// ⚠️ Note: 'tickets' and 'isLoading' are removed. 
// Components will fetch their own data via SWR.
interface SupportContextType {
  createTicket: (initialMsg: string) => Promise<string | null>;
  addMessageToTicket: (ticketId: string, msg: ChatMessage) => Promise<void>;
  resolveTicket: (ticketId: string) => Promise<void>;
  setTicketSeverity: (ticketId: string, level: number) => Promise<void>;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined)

export function SupportProvider({ children }: { children: ReactNode }) {
  
  // --- ACTIONS ---
  // These are lightweight wrappers around the Server Actions.
  // We no longer handle state or SWR mutation here.

  const createTicket = async (initialMsg: string) => {
    const res = await createTicketAction(initialMsg)
    return res.success && res.ticketId ? res.ticketId : null
  }

  const addMessageToTicket = async (ticketId: string, msg: ChatMessage) => {
    await addMessageAction(ticketId, msg.text, msg.sender)
  }

  const resolveTicket = async (ticketId: string) => {
    await resolveTicketAction(ticketId)
  }

  const setTicketSeverity = async (ticketId: string, level: number) => {
    await updateSeverityAction(ticketId, level)
  }

  return (
    <SupportContext.Provider value={{ 
      createTicket, 
      addMessageToTicket, 
      resolveTicket, 
      setTicketSeverity
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