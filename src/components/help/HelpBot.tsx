'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr' 
import clsx from 'clsx'
import Link from 'next/link' // 🆕 Import Link
import { useSupport } from '@/context/SupportContext'
import { getTicketAction } from '@/actions/support' 
import { ExternalLink, Ticket, MessageCircle, Send, X, HelpCircle } from 'lucide-react' // 🆕 Icons
import styles from './HelpBot.module.css'

// Type Definitions
type TicketData = {
  id: string;
  status: string;
  messages: {
    id: string;
    text: string;
    sender: string;
    createdAt: Date;
  }[];
}

type Message = {
  id: number;
  type: 'bot' | 'user' | 'admin';
  text: string;
  action?: 'show_faqs' | 'show_return_menu'; 
}

const FAQ_DATA = [
    { q: "How do I connect my wallet?", a: "Click 'Connect Wallet' in the top nav. We support MetaMask and Coinbase." },
    { q: "How do I create a post?", a: "Click the '+' icon in the dashboard after connecting your wallet." },
    { q: "Is there a gas fee?", a: "No, standard posting is gas-less. Only NFT minting costs gas." },
]

export default function HelpBot() {
  const { createTicket } = useSupport()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isTicketMode, setIsTicketMode] = useState(false)
  
  // Track the ticket ID locally to trigger polling
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, type: 'bot', text: "Hi! I'm the Help Bot. Click an FAQ below or type 'human' to speak to an admin.", action: 'show_faqs' }
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 🔄 SMART POLLING
  const { data: ticketData } = useSWR(
    activeTicketId ? `ticket-${activeTicketId}` : null,
    async () => {
        if(!activeTicketId) return null;
        const res = await getTicketAction(activeTicketId);
        return res.success ? (res.data as unknown as TicketData) : null;
    },
    { refreshInterval: 5000 }
  );

  // --- HANDLERS ---
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  useEffect(() => scrollToBottom(), [messages, isOpen])

  const handleSend = async () => {
    if (!input.trim()) return
    const userText = input.trim()
    
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: userText }])
    setInput('')

    // SCENARIO A: Creating the ticket (User confirmed "Yes I need a human")
    if (isTicketMode) {
      const newTicketId = await createTicket(userText)
      
      if (newTicketId) {
        setActiveTicketId(newTicketId) // 🟢 Triggers SWR and "Active" State
        setIsTicketMode(false) 
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: "❌ Error. Please try again later." }])
      }
    
    } else {
      // SCENARIO B: Normal Bot Interaction
      const lowerText = userText.toLowerCase()
      if (['human', 'support', 'admin', 'help'].some(kw => lowerText.includes(kw))) {
        setIsTicketMode(true)
        setTimeout(() => setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: "Please describe your issue below to open a ticket." }]), 500)
      } else {
        setTimeout(() => setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: "I didn't catch that. Try using the menu.", action: 'show_return_menu' }]), 500)
      }
    }
  }

  // --- RENDER ---
  return (
    <div className={styles.container}>
      
      <button 
        className={clsx(styles.triggerButton, { [styles.hidden]: isOpen })} 
        onClick={() => setIsOpen(true)}
      >
        <HelpCircle size={20} />
        <span className="font-bold">Help</span>
      </button>

      <div className={clsx(styles.chatWindow, { [styles.open]: isOpen })}>
        
        {/* HEADER */}
        <div className={styles.header}>
            <div className={styles.botInfo}>
                <div className={styles.icon}>🤖</div>
                <div className={styles.headerText}>
                  <span className={styles.botName}>Help Bot</span>
                  <span className={styles.status}>
                    {ticketData ? <span className="text-green-400">● Ticket Active</span> : 'Online'}
                  </span>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className={styles.closeButton}><X size={18}/></button>
        </div>
        
        {/* 🟢 CONDITIONAL BODY: If Ticket exists, show Redirect Card */}
        {ticketData ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-50/50">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm animate-in zoom-in duration-300">
                    <Ticket size={32} />
                </div>
                
                <h3 className="font-bold text-lg text-gray-800 mb-2">Ticket #{ticketData.id.slice(-4)} Created</h3>
                
                <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-[240px]">
                    An agent has been notified. Please continue this conversation in your unified inbox.
                </p>

                <Link 
                    href="/messages" 
                    onClick={() => setIsOpen(false)}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                >
                    <span>Go to Messages</span>
                    <ExternalLink size={16} />
                </Link>

                <div className="mt-6 pt-4 border-t border-gray-100 w-full text-xs text-gray-400">
                     Status: <span className="font-mono text-emerald-600 font-bold uppercase">{ticketData.status}</span>
                </div>
            </div>
        ) : (
            /* 🔵 STANDARD BOT BODY */
            <>
                <div className={styles.body}>
                  {messages.map((msg) => (
                    <div key={msg.id} className={clsx(styles.messageRow, styles[msg.type])}>
                      <div className={styles.bubble}>
                        {msg.text}
                        {/* Interactive Chips */}
                        {msg.action === 'show_faqs' && (
                          <div className={styles.faqList}>
                            {FAQ_DATA.map((faq, i) => (
                              <button key={i} className={styles.faqChip} onClick={() => {
                                  setMessages(p => [...p, { id: Date.now(), type: 'user', text: faq.q }, { id: Date.now()+1, type: 'bot', text: faq.a, action: 'show_return_menu' }])
                              }}>{faq.q}</button>
                            ))}
                          </div>
                        )}
                        {msg.action === 'show_return_menu' && (
                          <div className={styles.actionArea}>
                            <button className={styles.menuButton} onClick={() => {
                                setMessages(p => [...p, { id: Date.now(), type: 'user', text: "Main Menu" }, { id: Date.now()+1, type: 'bot', text: "Main topics:", action: 'show_faqs' }])
                            }}>↩ Main Menu</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className={styles.inputArea}>
                  <input 
                    className={styles.input}
                    placeholder={isTicketMode ? "Describe issue..." : "Type 'human' for support..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button className={styles.sendButton} onClick={handleSend} disabled={!input}><Send size={14}/></button>
                </div>
            </>
        )}
      </div>
    </div>
  )
}