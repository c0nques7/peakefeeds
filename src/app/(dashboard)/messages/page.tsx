import MessagingUI from '@/components/messaging/MessagingUI'
import { PageHeader } from '@/components/ui'

export default function MessagesPage() {
  return (
    <div className="w-full">
      <PageHeader title="Messages" className="mb-4" />
      <MessagingUI />
    </div>
  )
}
