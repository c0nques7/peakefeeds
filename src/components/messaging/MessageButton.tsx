'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Loader2 } from 'lucide-react'
import { startConversation } from '@/actions/messaging'
import { toast } from 'sonner' // Optional feedback
import { buttonClasses } from '@/components/ui';

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
      className={buttonClasses({ variant: 'secondary' })}
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <MessageCircle size={16} aria-hidden="true" />}
      Message
    </button>
  )
}