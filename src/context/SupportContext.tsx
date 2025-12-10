'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import useSWR from 'swr' // Smart polling library
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
  refreshTickets: () => void;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined)

export function SupportProvider({ children }: { children: ReactNode }) {
  
  // 1. SMART POLLING WITH SWR
  // Key: 'support-tickets' (unique identifier for caching)
  // Fetcher: Your server action
  const { data: tickets = [], mutate, isLoading } = useSWR(
    'support-tickets', 
    async () => {
      const res = await getTicketsAction()
      return res.success && res.data ? res.data : []
    },
    {
      refreshInterval: 10000, // Poll every 10 seconds (Safe for DB)
      revalidateOnFocus: true, // Instant refresh when admin tabs back in
      dedupingInterval: 2000,  // Prevent duplicate calls
      fallbackData: [],        // Initial safe state
    }
  )

  // 2. ACTIONS (With Optimistic UI Updates)

  const createTicket = async (initialMsg: string) => {
    // Call DB
    const res = await createTicketAction(initialMsg)
    
    if (res.success && res.ticketId) {
       // Force re-fetch immediately to see the new ticket
       await mutate() 
       return res.ticketId
    }
    return null
  }

  const addMessageToTicket = async (ticketId: string, msg: ChatMessage) => {
    // OPTIMISTIC UPDATE: Update UI immediately before DB confirms
    await mutate(async (currentTickets: Ticket[] = []) => {
        return currentTickets.map(t => {
            if (t.id !== ticketId) return t;
            return { 
                ...t, 
                messages: [...t.messages, msg],
                // If user sent it, locally increment badge so they see it instantly
                unreadAdminCount: msg.sender === 'user' ? t.unreadAdminCount + 1 : 0
            };
        });
    }, false); // false = do NOT revalidate (fetch DB) yet, wait for our explicit call

    // Call DB
    await addMessageAction(ticketId, msg.text, msg.sender)
    
    // Re-fetch to confirm sync with server
    mutate() 
  }

  const resolveTicket = async (ticketId: string) => {
    // Optimistic
    mutate(
      (current) => current?.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t), 
      false
    )
    
    await resolveTicketAction(ticketId)
    mutate() // Re-sync
  }

  const setTicketSeverity = async (ticketId: string, level: number) => {
    // Optimistic
    mutate(
      (current) => current?.map(t => t.id === ticketId ? { ...t, severity: level } : t), 
      false
    )

    await updateSeverityAction(ticketId, level)
    mutate() // Re-sync
  }

  return (
    <SupportContext.Provider value={{ 
      tickets, 
      isLoading, 
      createTicket, 
      addMessageToTicket, 
      resolveTicket, 
      setTicketSeverity,
      refreshTickets: () => mutate() // Allows manual refresh button
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