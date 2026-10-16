import { NotificationFeed } from '@/components/notifications/NotificationFeed'
import { PageHeader } from '@/components/ui'

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Activity" description="Replies, reactions, messages and updates that involve you." />
      <NotificationFeed fullPage={true} />
    </div>
  )
}
