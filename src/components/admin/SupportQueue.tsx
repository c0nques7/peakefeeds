'use client'

import { useState, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { useSupport, Ticket } from '@/context/SupportContext'
import { getAllTicketsAction } from '@/actions/support'
import { getStaffUsers } from '@/actions/admin-users'
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  User as UserIcon,
  Filter,
  MoreVertical,
  UserPlus,
  ArrowLeft,
  Lock,
  StickyNote,
  AlertCircle,
  Eye
} from 'lucide-react'
import { SupportStatus, SupportPriority } from '@prisma/client'
import styles from '@/app/(admin)/admin/admin.module.css'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'



// Support Queue Management Interface

export default function SupportQueue() {
  const { 
    addMessageToTicket, 
    updateTicketStatus, 
    updateTicketPriority, 
    updateTicketAssignee, 
    updateInternalNotes,
    sendMessageToUser 
  } = useSupport()
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [isDM, setIsDM] = useState(false)
  const [isInternalNote, setIsInternalNote] = useState(true) // Default to Internal Note
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<SupportStatus | 'ALL'>('ALL')
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'ALL'>('ALL')

  const { data: tickets = [], mutate: mutateTickets } = useSWR(
    'admin-support-tickets', 
    async () => {
        const res = await getAllTicketsAction()
        // @ts-ignore
        if (res.success) {
          return res.data as Ticket[];
        } else {
          return [];
        }
    },
    { refreshInterval: 10000 }
  )

  const { data: staff = [] } = useSWR('admin-staff-users', async () => {
    const res = await getStaffUsers();
    return res;
  })

  // Filtering Logic
  const filteredTickets = useMemo(() => {
    const filtered = tickets.filter(t => {
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter
      const matchesAssignee = assigneeFilter === 'ALL' || 
        (assigneeFilter === 'unassigned' ? !t.assigneeId : t.assigneeId === assigneeFilter)
      const matchesSearch = !searchQuery || 
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
      
      return matchesStatus && matchesAssignee && matchesSearch
    }).sort((a, b) => {
        // Priority sort
        const priorityMap = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        const aP = priorityMap[a.priority as keyof typeof priorityMap] || 0
        const bP = priorityMap[b.priority as keyof typeof priorityMap] || 0
        if (bP !== aP) return bP - aP
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    })
    return filtered;
  }, [tickets, statusFilter, assigneeFilter, searchQuery])

  const currentTicket = tickets.find(t => t.id === selectedTicketId)
  
  // Logic: Check if assigned
  const isAssigned = !!currentTicket?.assigneeId;

  // Effect: Force switch back to Note mode if ticket becomes unassigned while in DM mode
  useEffect(() => {
    if (!isAssigned && isDM) {
        setIsDM(false);
        setIsInternalNote(true);
    }
  }, [isAssigned, isDM]);

  // Split messages for display
  const messagingFeed = useMemo(() => {
    if (!currentTicket) return [];
    // Display Direct Messages and User-Facing Notes/Messages in the central feed
    return currentTicket.messages.filter(m => m.isDM || !m.isInternal);
  }, [currentTicket]);

  const internalNoteFeed = useMemo(() => {
    if (!currentTicket) return [];
    // Display only Internal Admin Notes in the sidebar feed
    return currentTicket.messages.filter(m => !m.isDM && m.isInternal);
  }, [currentTicket]);

  // Handlers
  const handleSend = async () => {
    if (!currentTicket || !reply.trim()) return
    
    // Prevent sending DM if not assigned
    if (isDM && !isAssigned) {
        toast.error("Please assign this ticket to an admin before messaging the user.");
        return;
    }
    
    let res;
    if (isDM) {
      res = await sendMessageToUser(currentTicket.id, reply)
    } else {
      const newMsg = { 
        sender: 'admin' as const, 
        text: reply, 
        timestamp: Date.now(), 
        isInternal: isInternalNote 
      }
      res = await addMessageToTicket(currentTicket.id, newMsg, isInternalNote)
    }
    
    if (res?.success) {
      setReply('')
      mutateTickets()
      toast.success(isDM ? "Message sent to user" : "Note added to log")
    } else {
      toast.error(res?.error || "Failed to send")
    }
  }

  const handleUpdateStatus = async (status: SupportStatus) => {
    if (!currentTicket) return
    await updateTicketStatus(currentTicket.id, status)
    mutateTickets()
  }

  const handleUpdatePriority = async (priority: SupportPriority) => {
    if (!currentTicket) return
    await updateTicketPriority(currentTicket.id, priority)
    mutateTickets()
  }

  const handleAssign = async (staffId: string | null) => {
    if (!currentTicket) return
    const idToPass = staffId === "" ? null : staffId
    await updateTicketAssignee(currentTicket.id, idToPass)
    mutateTickets()
  }

  const getPriorityColor = (p: SupportPriority) => {
    switch(p) {
      case 'URGENT': return "text-red-500 border-red-500/50 bg-red-500/10";
      case 'HIGH': return "text-orange-500 border-orange-500/50 bg-orange-500/10";
      case 'MEDIUM': return "text-yellow-500 border-yellow-500/50 bg-yellow-500/10";
      case 'LOW': return "text-blue-400 border-blue-500/50 bg-blue-500/10";
      default: return "text-gray-400 border-white/10";
    }
  }

  return (
    <div className={clsx(styles.glassPanel, "h-[calc(100vh-200px)] flex flex-col overflow-hidden")}>
      
      {/* Search & Filters Bar */}
      <div className="p-4 border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input 
            type="text" 
            placeholder="Search tickets..."
            className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
          <Filter size={16} className="text-[var(--text-muted)] flex-shrink-0" />
          <select 
            className="bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select 
            className="bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="ALL">All Staff</option>
            <option value="unassigned">Unassigned</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.username || s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Ticket List (Leftmost) */}
        <div className={clsx(
          "border-r border-[var(--glass-border)] overflow-y-auto bg-slate-50 dark:bg-black/20 w-full lg:w-1/4 transition-all",
          selectedTicketId ? "hidden lg:block" : "block"
        )}>
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              <p className="text-sm">No tickets found.</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={clsx(
                  "p-4 border-b border-slate-200 dark:border-white/5 cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 relative",
                  selectedTicketId === ticket.id ? "bg-black/10 dark:bg-white/10" : "opacity-90 dark:opacity-70"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] text-slate-500 dark:text-white/40">#{ticket.id.slice(-8)}</span>
                  <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase", getPriorityColor(ticket.priority))}>
                    {ticket.priority}
                  </span>
                </div>
                <p className="text-sm text-slate-900 dark:text-white font-medium line-clamp-1 mb-1">
                  {ticket.messages[ticket.messages.length - 1]?.text}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                    <Clock size={10} />
                    <span>{ticket.updatedAt ? formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true }) : 'Just now'}</span>
                  </div>
                  {ticket.assignee && (
                    <div className="flex items-center gap-1 text-[10px] text-pink-400">
                      <UserIcon size={10} />
                      <span>{ticket.assignee.username}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Workspace (Active Ticket View) */}
        <div className={clsx(
          "bg-slate-100 dark:bg-black/40 relative w-full lg:flex-1 flex overflow-hidden",
          selectedTicketId ? "flex" : "hidden lg:flex"
        )}>
          {currentTicket ? (
            <>
              {/* Main Workspace Feed (Messaging) */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-[var(--glass-border)] flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-white/5">
                  <div className="flex gap-4 items-center">
                    <button onClick={() => setSelectedTicketId(null)} className="lg:hidden p-1 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white mr-2"><ArrowLeft size={20}/></button>
                    <div className="flex gap-2 items-center">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Status</label>
                        <select 
                          value={currentTicket.status}
                          onChange={(e) => handleUpdateStatus(e.target.value as SupportStatus)}
                          className="bg-slate-200 dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Priority</label>
                        <select 
                          value={currentTicket.priority}
                          onChange={(e) => handleUpdatePriority(e.target.value as SupportPriority)}
                          className={clsx("bg-slate-200 dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs font-bold", getPriorityColor(currentTicket.priority))}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Assignee</label>
                        <select 
                          value={currentTicket.assigneeId || ''}
                          onChange={(e) => handleAssign(e.target.value || null)}
                          className="bg-slate-200 dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs text-slate-900 dark:text-white max-w-[100px]"
                        >
                          <option value="">Unassigned</option>
                          {staff.map(s => (
                            <option key={s.id} value={s.id}>{s.username || s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                     {currentTicket.status !== 'RESOLVED' && (
                       <button 
                         onClick={() => handleUpdateStatus('RESOLVED')}
                         className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-500/30 px-4 py-1.5 rounded-full hover:bg-emerald-500/10"
                       >
                         <CheckCircle size={14} /> Resolve
                       </button>
                     )}
                  </div>
                </div>

                {/* Chat Log Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                  {messagingFeed.map((msg, i) => {
                    const isAdminDM = msg.isDM;
                    const isUserFacingNote = !msg.isDM && msg.sender === 'admin' && !msg.isInternal;
                    const isBot = msg.sender === 'bot';
                    const isMe = msg.sender === 'admin';
                    
                    return (
                      <div key={i} className={clsx(
                        "flex flex-col max-w-[85%]", 
                        isMe ? "self-end items-end" : "self-start items-start"
                      )}>
                        
                        {/* Label for Admin Actions */}
                        {isAdminDM && (
                           <span className="text-[9px] font-bold text-blue-400/70 uppercase tracking-widest mb-1 flex items-center gap-1">
                             <Send size={10} /> {msg.senderInfo?.username ? `Sent by @${msg.senderInfo.username}` : "Sent DM"}
                           </span>
                        )}
                        {isUserFacingNote && (
                           <span className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest mb-1 flex items-center gap-1">
                             <Eye size={10} /> User-Facing Update
                           </span>
                        )}

                        <div className={clsx(
                          "p-3.5 text-sm shadow-lg relative group transition-all",
                          // Admin DM Style
                          isAdminDM ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm" :
                          // User-Facing Note Style
                          isUserFacingNote ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-100 rounded-xl rounded-tr-sm" :
                          // Bot Style
                          isBot ? "bg-gray-200 dark:bg-gray-800/50 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-white/5 italic rounded-2xl rounded-tl-sm" :
                          // User Style
                          "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-gray-200 border border-slate-200 dark:border-white/10 rounded-2xl rounded-tl-sm shadow-sm"
                        )}>
                           {msg.text}
                        </div>
                        
                        <span className="text-[10px] text-slate-400 dark:text-white/20 mt-1 uppercase font-mono px-1">
                          {msg.sender} • {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-black/40 border-t border-[var(--glass-border)]">
                  <div className="flex items-center gap-4 mb-3">
                    <button 
                      onClick={() => { setIsDM(false); setIsInternalNote(true); }}
                      className={clsx(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all border flex items-center gap-2", 
                        !isDM && isInternalNote 
                          ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]" 
                          : "border-transparent text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <Lock size={12} /> Internal Note
                    </button>
                    <button 
                      onClick={() => { setIsDM(false); setIsInternalNote(false); }}
                      className={clsx(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all border flex items-center gap-2", 
                        !isDM && !isInternalNote 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                          : "border-transparent text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <Eye size={12} /> Public Note
                    </button>
                    <button 
                      onClick={() => isAssigned && setIsDM(true)}
                      disabled={!isAssigned}
                      title={!isAssigned ? "Assign ticket to enable messaging" : ""}
                      className={clsx(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all border flex items-center gap-2", 
                        !isAssigned 
                          ? "opacity-30 cursor-not-allowed border-transparent text-slate-400 dark:text-white"
                          : isDM 
                             ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
                             : "border-transparent text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      {isAssigned ? <Send size={12} /> : <AlertCircle size={12} />} 
                      Direct Message
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      className={clsx(
                        "flex-1 bg-slate-100 dark:bg-black/50 border rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-white/20",
                        isDM 
                          ? "border-blue-500/30 focus:border-blue-500" 
                          : isInternalNote
                            ? "border-yellow-500/30 focus:border-yellow-500"
                            : "border-emerald-500/30 focus:border-emerald-500"
                      )}
                      placeholder={isDM ? "Type a direct message..." : isInternalNote ? "Type an internal note (admin only)..." : "Type a user-facing public note..."}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      disabled={isDM && !isAssigned}
                    />
                    <button 
                      onClick={handleSend}
                      disabled={isDM && !isAssigned}
                      className={clsx(
                        "p-3 rounded-xl text-white transition-all shadow-lg border",
                        isDM 
                           ? "bg-blue-600 hover:bg-blue-500 border-blue-400 shadow-blue-600/20" 
                           : isInternalNote
                             ? "bg-yellow-600 hover:bg-yellow-500 border-yellow-400 shadow-yellow-600/20"
                             : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 shadow-emerald-600/20"
                      )}
                    >
                      {isDM ? <Send size={20} /> : isInternalNote ? <Lock size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace Inner Sidebar (Internal Notes & User Details) */}
              <div className="w-72 border-l border-[var(--glass-border)] bg-slate-50 dark:bg-black/30 flex flex-col overflow-hidden shrink-0">
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
                   <h4 className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-widest">Ticket Context</h4>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                   {/* 1. USER DETAILS */}
                   <div>
                      <label className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 dark:text-white/40 mb-3">
                        <UserPlus size={12} /> User Profile
                      </label>
                      <div className="p-3 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5 space-y-3">
                        {currentTicket.user ? (
                          <>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{currentTicket.user.name || 'Unnamed User'}</p>
                              <p className="text-[10px] text-slate-500 dark:text-white/40">@{currentTicket.user.username}</p>
                            </div>
                            
                            {currentTicket.user.email && (
                              <div>
                                <p className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-white/30 mb-0.5">Email</p>
                                <p className="text-[10px] text-slate-600 dark:text-white/70 font-mono break-all">{currentTicket.user.email}</p>
                              </div>
                            )}

                            {currentTicket.user.walletAddress && (
                              <div>
                                <p className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-white/30 mb-0.5">Wallet</p>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-mono break-all">{currentTicket.user.walletAddress}</p>
                              </div>
                            )}

                            <div>
                               <p className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-white/30 mb-0.5">Joined</p>
                               <p className="text-[10px] text-slate-500 dark:text-white/50">
                                 {new Date(currentTicket.user.createdAt).toLocaleDateString()} 
                                 <span className="opacity-50 ml-1">({formatDistanceToNow(new Date(currentTicket.user.createdAt), { addSuffix: true })})</span>
                               </p>
                            </div>
                          </>
                        ) : (
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">Guest User</p>
                            <p className="text-[10px] text-slate-500 dark:text-white/40">No registered account associated with this ticket.</p>
                          </div>
                        )}
                      </div>
                   </div>

                   {/* 2. STAFF DISCUSSION LOG */}
                   <div className="pt-4 border-t border-[var(--glass-border)]">
                      <label className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 dark:text-white/40 mb-3">
                        <MoreVertical size={12} /> Staff Discussion Log
                      </label>
                      <div className="space-y-3 mt-3">
                         {internalNoteFeed.length === 0 ? (
                            <p className="text-[10px] text-[var(--text-muted)] italic">No staff notes yet.</p>
                         ) : (
                            internalNoteFeed.map((note, idx) => (
                               <div key={idx} className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg text-xs">
                                  <p className="text-slate-700 dark:text-gray-300 leading-relaxed">{note.text}</p>
                                  <div className="mt-2 flex justify-between items-center text-[9px] text-slate-400 dark:text-white/20 font-mono">
                                     <span>{note.senderInfo?.username ? `@${note.senderInfo.username}` : 'Staff Note'}</span>
                                     <span>{formatDistanceToNow(note.timestamp, { addSuffix: true })}</span>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                   </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-30">
              <MessageSquare size={64} className="mb-4 stroke-[1px]" />
              <p className="text-lg font-light tracking-wide">Select a ticket from the queue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}