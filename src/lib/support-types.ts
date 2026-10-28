import { SupportStatus, SupportPriority } from '@prisma/client'

// Shapes shared by the support actions, the Help Bot and the staff support queue
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
  user?: {
    id: string;
    username: string | null;
    name: string | null;
    email: string | null;
    walletAddress: string | null;
    createdAt: Date;
  } | null;
  internalNotes?: string | null;
}
