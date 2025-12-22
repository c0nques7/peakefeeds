'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { getConversations, getMessages, sendMessage } from '@/actions/messaging'
import { Send, Search, ArrowLeft, Loader2, User as UserIcon, Flag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import ReportMessageModal from './ReportMessageModal'

export default function MessagingUI() {
  const { data: session } = useSession()
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null)
  const [inputText, setInputText] = useState("")
  
  // Mobile View State ('LIST' or 'CHAT')
  const [mobileView, setMobileView] = useState<'LIST' | 'CHAT'>('LIST')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Reporting State
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [messageToReport, setMessageToReport] = useState<string | null>(null)

  // 1. POLL INBOX (List of conversations)
  const { data: conversationsRes, mutate: mutateInbox } = useSWR(
    'conversations', 
    getConversations, 
    { refreshInterval: 5000 }
  )
  const conversations = conversationsRes?.success ? conversationsRes.data : []

  // 2. POLL MESSAGES (Active Chat)
  const { data: messagesRes, mutate: mutateChat } = useSWR(
    selectedConvoId ? `messages-${selectedConvoId}` : null,
    () => getMessages(selectedConvoId!),
    { refreshInterval: 3000 }
  )
  
  const messages = messagesRes?.success ? messagesRes.data : []
  const participants = messagesRes?.success ? messagesRes.participants : []
  
  // Helper: Find the "Other" user in the chat
  const getOtherParticipant = (convoParams: any[]) => {
     return convoParams.find((p: any) => p.id !== session?.user?.id) || { username: 'Unknown', image: null }
  }

  // Scroll to bottom on new message
  useEffect(() => {
    if (mobileView === 'CHAT') {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, mobileView])

  const handleSend = async () => {
    if (!selectedConvoId || !inputText.trim()) return

    const tempText = inputText
    setInputText("") // Optimistic clear

    // Optimistic UI Update (Optional, but makes it snappy)
    await sendMessage(selectedConvoId, tempText)
    mutateChat() // Refresh messages
    mutateInbox() // Refresh inbox (to move thread to top)
  }

  const handleSelectConversation = (id: string) => {
    setSelectedConvoId(id)
    setMobileView('CHAT')
  }

  return (
    <div className="flex h-[calc(100vh-80px)] md:h-[600px] w-full max-w-6xl mx-auto md:border md:border-[var(--glass-border)] md:rounded-2xl overflow-hidden bg-[var(--glass-panel)]">
      
      {/* --- LEFT PANE: INBOX LIST --- */}
      <div className={clsx(
        "w-full md:w-1/3 border-r border-[var(--glass-border)] flex flex-col transition-all duration-300",
        mobileView === 'CHAT' ? "hidden md:flex" : "flex"
      )}>
         <div className="p-4 border-b border-[var(--glass-border)] bg-white/5 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Messages</h2>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={16} />
                <input 
                  placeholder="Search inbox..." 
                  className="w-full bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                />
            </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar">
            {conversations?.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)] text-sm">
                    No conversations yet. <br/> Visit a profile to start chatting.
                </div>
            ) : (
                conversations?.map((convo: any) => {
                    const otherUser = getOtherParticipant(convo.participants)
                    const isSelected = selectedConvoId === convo.id
                    const lastMsg = convo.messages[0]

                    return (
                        <div 
                           key={convo.id}
                           onClick={() => handleSelectConversation(convo.id)}
                           className={clsx(
                             "p-4 border-b border-[var(--glass-border)] cursor-pointer transition-colors hover:bg-white/5",
                             isSelected && "bg-[var(--accent-primary)]/10 border-l-4 border-l-[var(--accent-primary)]"
                           )}
                        >
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {otherUser.image ? (
                                        <img src={otherUser.image} alt={otherUser.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white font-bold">{otherUser.username?.[0]}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-bold text-[var(--text-primary)] truncate">{otherUser.username}</span>
                                        <span className="text-[10px] text-[var(--text-muted)]">
                                            {lastMsg ? formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false }) : ''}
                                        </span>
                                    </div>
                                    <p className={clsx("text-sm truncate", isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                                        {lastMsg ? lastMsg.content : <span className="italic">Draft</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })
            )}
         </div>
      </div>

      {/* --- RIGHT PANE: CHAT WINDOW --- */}
      <div className={clsx(
        "w-full md:w-2/3 flex flex-col bg-black/20",
        mobileView === 'LIST' ? "hidden md:flex" : "flex"
      )}>
         {selectedConvoId ? (
            <>
                {/* Header */}
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center gap-3 bg-white/5 backdrop-blur-sm">
                    <button 
                      onClick={() => setMobileView('LIST')} 
                      className="md:hidden p-2 -ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    
                    {/* Active User Info */}
                    {(() => {
                        const otherUser = getOtherParticipant(participants)
                        return (
                            <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden">
                                    {otherUser.image ? <img src={otherUser.image} className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-white"/>}
                                 </div>
                                 <span className="font-bold text-lg text-[var(--text-primary)]">{otherUser.username}</span>
                            </div>
                        )
                    })()}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages?.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                            <p>This is the start of your conversation.</p>
                        </div>
                    )}
                    
                    {messages?.map((msg: any) => {
                        const isMe = msg.senderId === session?.user?.id
                        return (
                            <div key={msg.id} className={clsx("flex items-end gap-2 group", isMe ? "justify-end" : "justify-start")}>
                                {!isMe && (
                                    <button 
                                        onClick={() => { setMessageToReport(msg.id); setReportModalOpen(true); }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-muted)] hover:text-red-400 transition-all"
                                        title="Report Message"
                                    >
                                        <Flag size={14} />
                                    </button>
                                )}
                                <div className={clsx(
                                    "max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed",
                                    isMe 
                                      ? "bg-[var(--accent-primary)] text-white rounded-tr-sm" 
                                      : "bg-[var(--glass-card)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded-tl-sm"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-[var(--glass-border)] bg-white/5">
                    <div className="flex gap-2">
                        <input 
                           value={inputText}
                           onChange={(e) => setInputText(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                           placeholder="Write a message..."
                           className="flex-1 bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-full px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                        />
                        <button 
                           onClick={handleSend}
                           disabled={!inputText.trim()}
                           className="w-11 h-11 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </>
         ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Send size={32} />
                </div>
                <h3 className="text-lg font-bold">Your Messages</h3>
                <p className="text-sm">Select a conversation to start chatting.</p>
            </div>
         )}
      </div>

      <ReportMessageModal 
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        messageId={messageToReport}
      />
    </div>
  )
}