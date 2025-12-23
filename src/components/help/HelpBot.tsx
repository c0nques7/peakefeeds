'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr' 
import clsx from 'clsx'
import Link from 'next/link' // 🆕 Import Link
import { useSupport } from '@/context/SupportContext'
import { getTicketAction } from '@/actions/support' 
import { ExternalLink, Ticket, MessageCircle, Send, X, HelpCircle } from 'lucide-react' // 🆕 Icons
import styles from './HelpBot.module.css'
import { SupportStatus } from '@prisma/client'


// Type Definitions
type TicketData = {
  id: string;
  status: SupportStatus;
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
  { q: "How do I connect my wallet?", a: "Click 'Connect Wallet' in the top nav. We support MetaMask and Coinbase Wallet; only connect wallets you trust." },
  { q: "How do I create a post?", a: "Open the Create Post form in the dashboard or channel feed, write your post, then submit. Link/media previews are detected automatically." },
  { q: "Is there a gas fee for posting?", a: "No — standard posts are gas-less. Blockchain transactions (e.g., NFT minting) will require gas." },
  { q: "What's the difference between Home and Discover?", a: "Home shows posts from channels and people you follow. Discover surfaces trending channels and public posts you may like." },
  { q: "How do channels work?", a: "Channels group related posts. You can follow or subscribe to channels; channel creators can manage moderation and verification settings." },
  { q: "How do I verify my account or post?", a: "Use the Verify Wallet flow to link a wallet. Posts and users may be verified via wallet, ad providers, or manual review — verification badges appear on profiles and posts." },
  { q: "What are ad verification badges and overlays?", a: "Ad verification shows that a piece of media was validated by a supported ad provider. Use the ad-overlay test page to preview overlays for verified media." },
  { q: "How do reactions and comments work?", a: "React or reply on any post using the UI buttons. You must be signed in to create reactions or comments; some demo contexts disable writes." },
  { q: "How do I message another user?", a: "Open Messages from the dashboard to send or receive direct messages. Messages are available in your unified inbox after opening a support ticket or messaging other users." },
  { q: "I see a 404 on a profile or channel page — what now?", a: "Confirm the username or channel slug. If it still 404s, the resource may be unpublished or deleted; try refreshing or contacting support via the Help Bot." },
  { q: "How do I report content or request help?", a: "Open the Help Bot and type 'human' or choose 'Contact support' to create a support ticket. Include steps to reproduce and affected URLs for faster help." },
  { q: "What data is stored and how are wallets handled?", a: "We store posts, profiles, and verification metadata in our database. Wallet connections are used for verification and never ask for private keys; only sign requests you trust." },
  { q: "I'm a developer: where is the server logic?", a: "Server actions live in `src/actions/`, shared utilities in `src/lib/`, and UI components in `src/components/`. The app uses Prisma for DB access and Next.js App Router server actions." },
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
                  <button className={styles.sendButton} onClick={handleSend} disabled={!input}><Send size={14}/></button>
                </div>
            </>
        )}
      </div>
    </div>
  )
}