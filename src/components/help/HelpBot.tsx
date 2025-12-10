'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './HelpBot.module.css'
import clsx from 'clsx'

// --- CONSTANTS ---
const FAQ_DATA = [
  { q: "How do I connect my cryptocurrency wallet?", a: "Click the 'Connect Wallet' button in the top navigation bar. We currently support MetaMask, Coinbase Wallet, and WalletConnect." },
  { q: "How do I create a post?", a: "Once your wallet is connected, click the '+' icon in the dashboard. You can add text, images, and tags before publishing." },
  { q: "Is there a gas fee to post?", a: "No, creating a standard post is gas-less (off-chain). Only NFT minting requires a transaction fee." },
  { q: "How do I switch between Light and Dark mode?", a: "You can toggle the theme using the sun/moon icon located in the top right corner of your screen." },
  { q: "Where can I view my profile?", a: "Click on your wallet address or avatar in the navigation bar to view your past posts and settings." },
]

type Message = {
  id: number;
  type: 'bot' | 'user';
  text: string;
  // New: Allows us to attach UI actions to specific messages
  action?: 'show_faqs' | 'show_return_menu'; 
}

export default function HelpBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isTicketMode, setIsTicketMode] = useState(false)
  
  // Initial State: Greeting + FAQ List
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      type: 'bot', 
      text: "Hi! I'm the Help Bot. Click an FAQ below or type 'human' to speak to an admin.",
      action: 'show_faqs' 
    }
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isOpen])

  // --- ACTIONS ---

  const handleFAQClick = (faqIndex: number) => {
    const faq = FAQ_DATA[faqIndex]
    
    // 1. User selects question
    const userMsg: Message = { id: Date.now(), type: 'user', text: faq.q }
    
    // 2. Bot answers + offers Main Menu option
    const botMsg: Message = { 
      id: Date.now() + 1, 
      type: 'bot', 
      text: faq.a,
      action: 'show_return_menu' // Give them a way back
    }
    
    setMessages(prev => [...prev, userMsg, botMsg])
  }

  const handleReturnToMenu = () => {
    const userMsg: Message = { id: Date.now(), type: 'user', text: "Main Menu" }
    const botMsg: Message = { 
      id: Date.now() + 1, 
      type: 'bot', 
      text: "Here are the main help topics:",
      action: 'show_faqs' // Trigger the list again
    }
    setMessages(prev => [...prev, userMsg, botMsg])
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userText = input.trim()
    const newMsg: Message = { id: Date.now(), type: 'user', text: userText }
    
    setMessages(prev => [...prev, newMsg])
    setInput('')

    if (isTicketMode) {
      // --- TICKET FLOW ---
      await submitTicketToAdmin(userText)
      
      const successMsg: Message = { 
        id: Date.now() + 1, 
        type: 'bot', 
        text: "✅ Ticket created! An admin has received your message." 
      }

      // New: The Follow-up Question
      const followUpMsg: Message = {
        id: Date.now() + 2,
        type: 'bot',
        text: "Is there anything else I can help with? You can ask another question below, or return to the main menu.",
        action: 'show_return_menu'
      }

      setMessages(prev => [...prev, successMsg, followUpMsg])
      setIsTicketMode(false)
    
    } else {
      // --- NORMAL FLOW ---
      const lowerText = userText.toLowerCase()
      const humanKeywords = ['human', 'person', 'support', 'admin', 'agent', 'help']

      if (humanKeywords.some(kw => lowerText.includes(kw))) {
        setIsTicketMode(true)
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            id: Date.now() + 1, 
            type: 'bot', 
            text: "I can connect you to a human. Please describe your issue in the next message, and I'll forward it to the Admin Command Center." 
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

  const submitTicketToAdmin = (issue: string) => {
    return new Promise(resolve => {
      console.log(`[ADMIN COMMAND CENTER] New Ticket Received: ${issue}`)
      setTimeout(resolve, 1000)
    })
  }

  return (
    <div className={styles.container}>
      
      {/* CHAT WINDOW */}
      <div className={clsx(styles.chatWindow, { [styles.open]: isOpen })}>
        
        {/* Header */}
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

        {/* Chat Body */}
        <div className={styles.body}>
          {messages.map((msg) => (
            <div key={msg.id} className={clsx(styles.messageRow, styles[msg.type])}>
              <div className={styles.bubble}>
                {msg.text}

                {/* ACTION: Show FAQ List */}
                {msg.action === 'show_faqs' && (
                  <div className={styles.faqList}>
                    {FAQ_DATA.map((faq, i) => (
                      <button key={i} className={styles.faqChip} onClick={() => handleFAQClick(i)}>
                        {faq.q}
                      </button>
                    ))}
                  </div>
                )}

                {/* ACTION: Show 'Return to Menu' Button */}
                {msg.action === 'show_return_menu' && (
                  <div className={styles.actionArea}>
                    <button className={styles.menuButton} onClick={handleReturnToMenu}>
                      ↩ Return to Main Menu
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={styles.inputArea}>
          <input 
            type="text" 
            className={styles.input}
            placeholder={isTicketMode ? "Describe your issue..." : "Type 'human' for support..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className={styles.sendButton} onClick={handleSend} disabled={!input}>
            ➤
          </button>
        </div>
      </div>

      {/* TRIGGER BUTTON */}
      <button 
        className={clsx(styles.triggerButton, { [styles.hidden]: isOpen })}
        onClick={() => setIsOpen(true)}
      >
        <span className={styles.icon}>?</span>
        <span className={styles.label}>Help</span>
      </button>

    </div>
  )
}