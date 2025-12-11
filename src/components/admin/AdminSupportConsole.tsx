'use client'

import { useState } from 'react'
import useSWR from 'swr' // 1. Import SWR
import { useSupport, Ticket } from '@/context/SupportContext'
import { getAllTicketsAction } from '@/actions/support' // 2. Import Admin Action
import { MessageSquare, Send, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import styles from '@/app/(admin)/admin/admin.module.css'
import clsx from 'clsx'

export default function AdminSupportConsole() {
  // 3. Removed 'tickets' from context. We only get actions now.
  const { addMessageToTicket, resolveTicket, setTicketSeverity } = useSupport()
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  // 4. LOCAL POLLING: Only runs when this component is mounted!
  const { data: tickets = [], mutate } = useSWR(
    'admin-all-tickets', 
    async () => {
        const res = await getAllTicketsAction()
        // @ts-ignore - Fixing serialization mismatch (Date vs String)
        return res.success ? res.data as Ticket[] : []
    },
    { 
      refreshInterval: 10000, // Poll every 10s
      revalidateOnFocus: true
    }
  )

  // Sort: Critical (High Severity) first, then by recency
  const activeTickets = tickets
    .filter(t => t.status === 'open' || t.id === selectedTicketId)
    .sort((a, b) => b.severity - a.severity)

  const currentTicket = tickets.find(t => t.id === selectedTicketId)

  // 5. HELPER: Optimistic Updates using 'mutate'
  // This updates the UI instantly without waiting for the DB
  const handleSend = async () => {
    if (!currentTicket || !reply.trim()) return
    
    const newMsg = { sender: 'admin', text: reply, timestamp: Date.now() }

    // @ts-ignore
    await mutate(current => current?.map(t => {
        if(t.id !== currentTicket.id) return t;
        // @ts-ignore
        return { ...t, messages: [...t.messages, newMsg] }
    }), false)
    
    // API Call
    // @ts-ignore
    await addMessageToTicket(currentTicket.id, newMsg)
    setReply('')
    mutate() // Re-sync with DB
  }

  const handleResolve = async () => {
     if(!currentTicket) return;
     // Optimistic
     mutate(curr => curr?.map(t => t.id === currentTicket.id ? {...t, status: 'resolved'} : t), false);
     await resolveTicket(currentTicket.id);
     mutate();
  }

  const handleSeverity = async (level: number) => {
     if(!currentTicket) return;
     mutate(curr => curr?.map(t => t.id === currentTicket.id ? {...t, severity: level} : t), false);
     await setTicketSeverity(currentTicket.id, level);
     mutate();
  }

  const getSeverityColor = (level: number) => {
    if (level >= 4) return "text-red-500 border-red-500/50 bg-red-500/10";
    if (level >= 2) return "text-orange-400 border-orange-500/50 bg-orange-500/10";
    return "text-blue-400 border-blue-500/50 bg-blue-500/10";
  }

  // --- RENDER ---
  return (
    <div className={clsx(styles.glassPanel, "h-[600px] flex flex-col overflow-hidden")}>
      
      {/* Header */}
      <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Live Support Command</h3>
            <p className="text-xs text-[var(--text-muted)]">Real-time connection to Help Bot.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-xs font-mono text-emerald-400 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
             SYSTEM ONLINE
           </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: Ticket List */}
        <div className="w-1/3 border-r border-[var(--glass-border)] overflow-y-auto bg-black/20">
          {activeTickets.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              <p className="text-sm">No active tickets.</p>
            </div>
          ) : (
            activeTickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={clsx(
                  "p-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 relative",
                  selectedTicketId === ticket.id ? "bg-white/10" : "opacity-70"
                )}
              >
                {/* Active Indicator */}
                {selectedTicketId === ticket.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500"></div>
                )}

                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white/60">#{ticket.id}</span>
                    {ticket.severity > 0 && (
                       <span className={clsx("text-[10px] px-1.5 rounded border", getSeverityColor(ticket.severity))}>
                         Lvl {ticket.severity}
                       </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-white line-clamp-1 mb-1">
                  {ticket.messages[ticket.messages.length - 1]?.text}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <Clock size={10} />
                  {/* Handle Date object or Timestamp number safely */}
                  <span>{new Date(ticket.messages[ticket.messages.length - 1]?.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT: Chat Area */}
        <div className="flex-1 flex flex-col bg-black/40">
          {currentTicket ? (
            <>
              {/* Toolbar */}
              <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                
                {/* SEVERITY CONTROLS */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">Severity:</span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleSeverity(level)}
                        className={clsx(
                          "w-6 h-6 text-xs rounded border transition-all flex items-center justify-center font-mono",
                          currentTicket.severity === level 
                            ? getSeverityColor(level) 
                            : "border-white/10 text-[var(--text-muted)] hover:border-white/30"
                        )}
                        title={`Set Priority Level ${level}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {currentTicket.status !== 'resolved' && (
                  <button 
                    onClick={handleResolve}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-500/30 px-3 py-1 rounded-full hover:bg-emerald-500/10"
                  >
                    <CheckCircle size={14} /> Mark Resolved
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentTicket.messages.map((msg, i) => (
                  <div key={i} className={clsx("flex flex-col max-w-[80%]", msg.sender === 'admin' ? "self-end items-end" : "self-start items-start")}>
                    <div className={clsx(
                      "p-3 rounded-xl text-sm shadow-md",
                      msg.sender === 'admin' 
                        ? "bg-pink-600 text-white rounded-br-none" 
                        : "bg-[#1a1a1a] text-gray-200 rounded-bl-none border border-white/10"
                    )}>
                      {msg.text}
                    </div>
                    {/* @ts-ignore */}
                    <span className="text-[10px] text-white/30 mt-1 uppercase tracking-wider">{msg.sender}</span>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                    placeholder="Type your reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button 
                    onClick={handleSend}
                    className="p-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors shadow-lg shadow-pink-600/20"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
              <MessageSquare size={48} className="mb-4" />
              <p>Select a ticket to begin triage</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}