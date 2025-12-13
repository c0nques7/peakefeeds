import { NotificationFeed } from '@/components/notifications/NotificationFeed'

export default function NotificationsPage() {
  return (
    <div className="max-w-2xl mx-auto pt-6 px-4 pb-24">
       <div className="mb-6">
         <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notifications</h1>
         <p className="text-sm text-[var(--text-muted)]">Stay updated with your community interactions.</p>
       </div>
       
       <NotificationFeed fullPage={true} />
    </div>
  )
}