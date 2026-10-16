'use client'

import useSWR from 'swr'
import { getNotifications, markAllRead } from '@/actions/notifications'
import { NotificationItem } from './NotificationItem'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui'

export function NotificationFeed({ fullPage = false }: { fullPage?: boolean }) {
  const limit = fullPage ? 50 : 10
  const { data, mutate, isLoading } = useSWR('notifications', () => getNotifications(limit), { refreshInterval: 10000 })
  
  const notifications = data?.data || []
  const unreadCount = data?.unreadCount || 0
  const hasNotifications = notifications.length > 0

  return (
    <div className="flex flex-col h-full">
      
      {/* Header: the full page already has its own title, so it only shows the unread count and action */}
      <div className={fullPage ? "flex items-center justify-between mb-3 min-h-8" : "flex items-center justify-between mb-4 px-2"}>
        {fullPage ? (
          <span className="text-sm text-[var(--text-muted)]">{unreadCount > 0 ? `${unreadCount} unread` : ''}</span>
        ) : (
          <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Bell size={18} className={unreadCount > 0 ? "text-[var(--accent-primary)]" : ""} aria-hidden="true" />
            Activity
            {unreadCount > 0 && <span className="bg-[var(--btn-primary)] text-[var(--btn-primary-text)] text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
          </h2>
        )}

        {unreadCount > 0 && (
          <button 
            onClick={async () => { await markAllRead(); mutate(); }} 
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex items-center gap-1 transition-colors"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && notifications.length === 0 && (
        <div className="flex justify-center p-8 text-[var(--text-muted)]">
            <Loader2 className="animate-spin" />
        </div>
      )}

      {/* List */}
      <div className={fullPage ? "space-y-0" : "space-y-1 overflow-y-auto flex-1 px-1 custom-scrollbar"}>
        {hasNotifications ? (
          notifications.map((note: any) => (
            <NotificationItem key={note.id} note={note} mutate={mutate} />
          ))
        ) : (
          !isLoading && (
            fullPage ? (
              <EmptyState
                icon={<Bell size={22} aria-hidden="true" />}
                title="No activity yet"
                description="When someone replies, reacts or messages you, it shows up here."
              />
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                No recent activity.
              </div>
            )
          )
        )}
      </div>

      {/* Footer Link (Only shown in sidebar widget) */}
      {!fullPage && hasNotifications && (
        <Link href="/notifications" className="block text-center text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-4 py-2 border-t border-[var(--glass-border)] transition-colors">
          View Full History
        </Link>
      )}
    </div>
  )
}