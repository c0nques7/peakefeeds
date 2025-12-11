'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './HelpBot.module.css'
import clsx from 'clsx'
import useSWR from 'swr' // 1. Import SWR
import { useSupport } from '@/context/SupportContext'
import { getTicketAction } from '@/actions/support' // 2. Import User Fetcher
import { Ticket } from '@/context/SupportContext'

const FAQ_DATA = [
    { q: "How do I connect my cryptocurrency wallet?", a: "Click the 'Connect Wallet' button in the top navigation bar. We currently support MetaMask, Coinbase Wallet, and WalletConnect." },
    { q: "How do I create a post?", a: "Once your wallet is connected, click the '+' icon in the dashboard. You can add text, images, and tags before publishing." },
    { q: "Is there a gas fee to post?", a: "No, creating a standard post is gas-less (off-chain). Only NFT minting requires a transaction fee." },
    { q: "How do I switch between Light and Dark mode?", a: "You can toggle the theme using the sun/moon icon located in the top right corner of your screen." },
    { q: "Where can I view my profile?", a: "Click on your wallet address or avatar in the navigation bar to view your past posts and settings." },
  ]

type Message = {
  id: number;
  type: 'bot' | 'user' | 'admin';
  text: string;
  action?: 'show_faqs' | 'show_return_menu'; 
}

export default function HelpBot() {
  // 3. REMOVED 'tickets' from context. We only get actions now.
  const { createTicket, addMessageToTicket } = useSupport()
  
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isTicketMode, setIsTicketMode] = useState(false)
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, type: 'bot', text: "Hi! I'm the Help Bot. Click an FAQ below or type 'human' to speak to an admin.", action: 'show_faqs' }
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 4. LOCAL POLLING: Only poll if we have an Active Ticket ID
  const { data: ticketData } = useSWR(
    activeTicketId ? `ticket-${activeTicketId}` : null, // Conditional Fetch key
    async () => {
        if(!activeTicketId) return null;
        const res = await getTicketAction(activeTicketId);
        // @ts-ignore
        return res.success ? res.data as Ticket : null;
    },
    { refreshInterval: 5000 } // Poll every 5s
  );

  // 5. LISTENER: Watch SWR Data (instead of Context)
  useEffect(() => {
    if (!ticketData) return;
    
    // Check for new messages from Admin
    const lastMsg = ticketData.messages[ticketData.messages.length - 1];
    if (lastMsg && lastMsg.sender === 'admin') {
         // Dedupe logic
         const alreadyExists = messages.some(m => m.text === lastMsg.text && m.type === 'admin')
         if (!alreadyExists) {
             setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'admin',
                text: lastMsg.text
             }])
         }
    }
  }, [ticketData, messages]);

  // --- HANDLERS ---
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  useEffect(() => scrollToBottom(), [messages, isOpen])

  const handleFAQClick = (faqIndex: number) => {
    const faq = FAQ_DATA[faqIndex]
    const userMsg: Message = { id: Date.now(), type: 'user', text: faq.q }
    const botMsg: Message = { id: Date.now() + 1, type: 'bot', text: faq.a, action: 'show_return_menu' }
    setMessages(prev => [...prev, userMsg, botMsg])
  }

  const handleReturnToMenu = () => {
    const userMsg: Message = { id: Date.now(), type: 'user', text: "Main Menu" }
    const botMsg: Message = { id: Date.now() + 1, type: 'bot', text: "Here are the main help topics:", action: 'show_faqs' }
    setMessages(prev => [...prev, userMsg, botMsg])
  }

  const handleSend = async () => {
    if (!input.trim()) return
    const userText = input.trim()
    
    // Optimistic UI Update
    const newMsg: Message = { id: Date.now(), type: 'user', text: userText }
    setMessages(prev => [...prev, newMsg])
    setInput('')

    if (activeTicketId) {
      // --- ALREADY IN TICKET MODE ---
      await addMessageToTicket(activeTicketId, { 
        sender: 'user', 
        text: userText, 
        timestamp: Date.now() 
      })
      return
    }

    if (isTicketMode) {
      // --- CREATING FIRST TICKET ---
      const newTicketId = await createTicket(userText)
      
      if (newTicketId) {
        setActiveTicketId(newTicketId) // Triggers SWR polling
        
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          type: 'bot', 
          text: "✅ Connected! An admin has been notified. You can continue typing here." 
        }])
        setIsTicketMode(false) 
      } else {
        setMessages(prev => [...prev, { 
            id: Date.now() + 1, 
            type: 'bot', 
            text: "❌ Error connecting to support. Please try again later." 
          }])
      }
    
    } else {
      // --- NORMAL BOT MODE ---
      const lowerText = userText.toLowerCase()
      const humanKeywords = ['human', 'person', 'support', 'admin', 'agent', 'help']

      if (humanKeywords.some(kw => lowerText.includes(kw))) {
        setIsTicketMode(true)
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            id: Date.now() + 1, 
            type: 'bot', 
            text: "I can connect you to a human. Please describe your issue in the next message." 
          }])
        }, 500)
      } else {
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            id: Date.now() + 1, 
            type: 'bot', 
            text: "I didn't quite catch that. Try asking properly, or use the menu below.",
            action: 'show_return_menu'
          }])
        }, 500)
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={clsx(styles.chatWindow, { [styles.open]: isOpen })}>
        <div className={styles.header}>
            <div className={styles.botInfo}>
                <div className={styles.avatar}>🤖</div>
                <div className={styles.headerText}>
                  <span className={styles.botName}>Help Bot</span>
                  <span className={styles.status}>Online</span>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className={styles.closeButton}>✕</button>
        </div>
        
        <div className={styles.body}>
          {messages.map((msg) => (
            <div key={msg.id} className={clsx(styles.messageRow, styles[msg.type])}>
              <div className={styles.bubble}>
                {msg.text}
                {msg.action === 'show_faqs' && (
                  <div className={styles.faqList}>
                    {FAQ_DATA.map((faq, i) => (
                      <button key={i} className={styles.faqChip} onClick={() => handleFAQClick(i)}>{faq.q}</button>
                    ))}
                  </div>
                )}
                {msg.action === 'show_return_menu' && (
                  <div className={styles.actionArea}>
                    <button className={styles.menuButton} onClick={handleReturnToMenu}>↩ Return to Main Menu</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <input 
            type="text" 
            className={styles.input}
            placeholder={activeTicketId ? "Message the admin..." : "Type 'human' for support..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className={styles.sendButton} onClick={handleSend} disabled={!input}>➤</button>
        </div>
      </div>
      <button className={clsx(styles.triggerButton, { [styles.hidden]: isOpen })} onClick={() => setIsOpen(true)}>
        <span className={styles.icon}>?</span>
        <span className={styles.label}>Help</span>
      </button>
    </div>
  )
}