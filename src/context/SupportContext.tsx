'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { $Enums } from '@prisma/client'
import { 
  createTicketAction, 
  addMessageAction, 
  updateSeverityAction, 
  resolveTicketAction,
  updateTicketStatusAction,
  updateTicketPriorityAction,
  updateTicketAssigneeAction,
  updateInternalNotesAction,
  sendMessageToUserAction
} from '@/actions/support'

const { SupportStatus, SupportPriority } = $Enums;

// --- TYPES ---
// We keep the types here so they can be imported by HelpBot/AdminConsole
export type ChatMessage = {
  sender: 'user' | 'admin' | 'bot';
  text: string;
  timestamp: number; 
  isDM?: boolean;
  isInternal?: boolean;
  senderInfo?: {
    username: string | null;
    id: string;
  };
}

export type Ticket = {
  id: string;
  status: SupportStatus;
  priority: SupportPriority;
  severity: number;
  messages: ChatMessage[];
  unreadAdminCount: number;
  updatedAt?: Date;
  userId?: string | null;
  assigneeId?: string | null;
  assignee?: {
    id: string;
    username: string | null;
    name: string | null;
  } | null;
  internalNotes?: string | null;
}

// ⚠️ Note: 'tickets' and 'isLoading' are removed. 
// Components will fetch their own data via SWR.
interface SupportContextType {
  createTicket: (initialMsg: string) => Promise<string | null>;
  addMessageToTicket: (ticketId: string, msg: ChatMessage, isInternal?: boolean) => Promise<{success: boolean, error?: any}>;
  resolveTicket: (ticketId: string) => Promise<void>;
  setTicketSeverity: (ticketId: string, level: number) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: SupportStatus) => Promise<void>;
  updateTicketPriority: (ticketId: string, priority: SupportPriority) => Promise<void>;
  updateTicketAssignee: (ticketId: string, assigneeId: string | null) => Promise<void>;
  updateInternalNotes: (ticketId: string, notes: string) => Promise<void>;
  sendMessageToUser: (ticketId: string, text: string) => Promise<{success: boolean, error?: any}>;
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

  const addMessageToTicket = async (ticketId: string, msg: ChatMessage, isInternal: boolean = false) => {
    return await addMessageAction(ticketId, msg.text, msg.sender, isInternal)
  }

  const resolveTicket = async (ticketId: string) => {
    await resolveTicketAction(ticketId)
  }

  const setTicketSeverity = async (ticketId: string, level: number) => {
    await updateSeverityAction(ticketId, level)
  }

  const updateTicketStatus = async (ticketId: string, status: SupportStatus) => {
    await updateTicketStatusAction(ticketId, status)
  }

  const updateTicketPriority = async (ticketId: string, priority: SupportPriority) => {
    await updateTicketPriorityAction(ticketId, priority)
  }

  const updateTicketAssignee = async (ticketId: string, assigneeId: string | null) => {
    await updateTicketAssigneeAction(ticketId, assigneeId)
  }

  const updateInternalNotes = async (ticketId: string, notes: string) => {
    await updateInternalNotesAction(ticketId, notes)
  }

  const sendMessageToUser = async (ticketId: string, text: string) => {
    return await sendMessageToUserAction(ticketId, text)
  }

  return (
    <SupportContext.Provider value={{ 
      createTicket, 
      addMessageToTicket, 
      resolveTicket, 
      setTicketSeverity,
      updateTicketStatus,
      updateTicketPriority,
      updateTicketAssignee,
      updateInternalNotes,
      sendMessageToUser
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