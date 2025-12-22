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
  { q: "How do I connect my wallet?", a: "Click 'Connect Wallet' in the top nav. We use Reown AppKit to support MetaMask, Coinbase Wallet, and others. Your wallet is used for identity and signing content." },
  { q: "What is the 'Truth Layer'?", a: "The Truth Layer is our verification system. When you post, you sign a hash of your content with your wallet. This proves you are the author and that the content hasn't been tampered with." },
  { q: "Is there a gas fee for posting?", a: "Standard posts are gasless and stored in our database with your signature. If you choose to 'Anchor' a post on the Optimism blockchain for permanent proof, a small gas fee is required." },
  { q: "How can I anchor a post for free?", a: "You can watch a short ad from our partners (like HypeLab). Upon completion, our system sponsors the gas fee to anchor your post's hash on the Optimism network." },
  { q: "What's the difference between Home and Discover?", a: "Home shows a personalized feed from channels you subscribe to. Discover helps you find new trending channels and public posts across the platform." },
  { q: "How do channels work?", a: "Channels are community spaces. You can create your own channel, subscribe to others, and manage moderation if you are an owner or moderator." },
  { q: "How do I report content?", a: "Click the 'Report' flag on any post or profile. Our moderation team reviews these reports in the 'Courtroom' and issues warnings or bans for violations." },
  { q: "How do I message another user?", a: "You can send Direct Messages (DMs) to other users. Your inbox is unified, meaning it also includes any active support tickets you've opened." },
  { q: "What data is stored on-chain?", a: "Only the cryptographic hash of your content and your wallet address are stored on-chain. This protects your privacy while ensuring content integrity." },
  { q: "I'm a developer: where can I find documentation?", a: "Technical documentation is located in the `docs/` folder of the repository. It covers our architecture, Truth Layer protocol, and setup instructions." },
]

export default function HelpBot() {
  const { createTicket } = useSupport()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isTicketMode, setIsTicketMode] = useState(false)
  
  // Track the ticket ID locally to trigger polling
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, type: 'bot', text: "Hi! I'm the Help Bot. What can I help you with? Example: 'How do I connect my wallet?' You can also type 'human' to speak to an agent.", action: 'show_faqs' }
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
      // SCENARIO B: Normal Bot Interaction — try to answer from FAQ by keyword matching
      const lowerText = userText.toLowerCase()
      // If user explicitly asks for human support, switch to ticket mode
      if (['human', 'support', 'admin', 'help'].some(kw => lowerText.includes(kw))) {
        setIsTicketMode(true)
        setTimeout(() => setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: "Please describe your issue below to open a ticket." }]), 500)
        return
      }

      // Simple keyword matching against FAQ_DATA
      const words = lowerText.split(/\W+/).filter(Boolean)
      let matched: typeof FAQ_DATA[0] | null = null
      outer: for (const faq of FAQ_DATA) {
        const hay = (faq.q + ' ' + faq.a).toLowerCase()
        for (const w of words) {
          if (w.length < 3) continue
          if (hay.includes(w)) {
            matched = faq
            break outer
          }
        }
      }

      if (matched) {
        setTimeout(() => setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: matched!.a }]), 400)
      } else {
        // No good match — ask the user to clarify in free text (keep it open-ended)
        setTimeout(() => setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: "I didn't find a direct match. Please describe the issue in your own words (for example: 'I'm seeing a 404 on a profile'). If you'd rather talk to a human, type 'human'." }]), 400)
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
                  <h2 className={styles.botName}>Help Bot</h2>
                  <span className={styles.status}>
                    {ticketData ? <span className="text-green-400">● Ticket Active</span> : 'Online'}
                  </span>
                </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className={styles.closeButton}
              aria-label="Close help chat"
            >
              <X size={18}/>
            </button>
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
                        {/* Conversation-driven: render bot text only. User guides the interaction. */}
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
                  <button 
                    className={styles.sendButton} 
                    onClick={handleSend} 
                    disabled={!input}
                    aria-label="Send message"
                  >
                    <Send size={14}/>
                  </button>
                </div>
            </>
        )}
      </div>
    </div>
  )
}