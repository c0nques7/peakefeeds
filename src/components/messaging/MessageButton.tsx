'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Loader2 } from 'lucide-react'
import { startConversation } from '@/actions/messaging'
import { toast } from 'sonner' // Optional feedback

export default function MessageButton({ recipientId }: { recipientId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleMessageClick = async () => {
    setIsLoading(true)
    try {
      const res = await startConversation(recipientId)
      
      if (res.success && res.conversationId) {
        router.push('/messages') // Or `/messages/${res.conversationId}` if we build dynamic routing
      } else {
        toast.error("Could not start chat")
      }
    } catch (e) {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleMessageClick}
      disabled={isLoading}
      className="p-3 rounded-full bg-[var(--glass-panel)] border border-[var(--glass-border)] hover:bg-[var(--glass-card-hover)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-all disabled:opacity-50"
      title="Send Message"
    >
      {isLoading ? <Loader2 size={20} className="animate-spin" /> : <MessageCircle size={20} />}
    </button>
  )
}