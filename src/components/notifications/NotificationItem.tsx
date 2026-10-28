'use client'

import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, Reply, AtSign, Info, ShieldAlert, Flag, Send } from 'lucide-react'
import { markAsRead } from '@/actions/notifications'
import clsx from 'clsx'
import Link from 'next/link'

// Visual Config for each type
const TYPE_CONFIG = {
  LIKE: { icon: Heart, color: "text-[var(--status-error)]", bg: "bg-[var(--status-error-bg)]", label: "liked your post" },
  COMMENT: { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/10", label: "commented on your post" },
  REPLY: { icon: Reply, color: "text-[var(--accent-primary)]", bg: "bg-[var(--status-info-bg)]", label: "replied to you" },
  MENTION: { icon: AtSign, color: "text-orange-500", bg: "bg-orange-500/10", label: "mentioned you" },
  SYSTEM: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10", label: "System Alert" },
  TICKET_REPLY: { icon: Info, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Support Update" },
  TICKET_UPDATE: { icon: Info, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "updated your support ticket" },
  MESSAGE: { icon: Send, color: "text-[var(--accent-primary)]", bg: "bg-[var(--status-info-bg)]", label: "sent you a message" },
  REPORT: { icon: Flag, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "A new report requires review" },
}

export function NotificationItem({ note, mutate }: { note: any, mutate: () => void }) {
  const config = TYPE_CONFIG[note.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.SYSTEM

  const handleClick = async () => {
    if (!note.isRead) {
      await markAsRead(note.id)
      mutate() 
    }
  }

  // Computed rather than a component defined during render, which would remount
  // the item (and lose its state) on every refresh of the feed
  const href = note.ticketId || note.type === 'MESSAGE' ? '/messages'
    : note.type === 'REPORT' ? '/admin/moderation'
    : null

  const content = (
      <div 
        className={clsx(
          "flex gap-3 p-3 rounded-xl transition-all cursor-pointer border mb-2",
          note.isRead 
            ? "border-transparent hover:bg-white/5 opacity-70" 
            : "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5"
        )}
      >
        <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", config.bg, config.color)}>
          <config.icon size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-primary)] leading-snug">
            <span className="font-bold">{note.actor?.username || "System"}</span> {config.label}
          </p>
          
          {(note.post?.content || note.comment?.content) && (
               <p className="text-xs text-[var(--text-muted)] truncate mt-1 italic opacity-80">
                 &quot;{note.post?.content || note.comment?.content}&quot;
               </p>
          )}

          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            {formatDistanceToNow(new Date(note.createdAt))} ago
          </p>
        </div>

        {!note.isRead && (
          <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] mt-2 flex-shrink-0" />
        )}
      </div>
  )

  return href
    ? <Link href={href} onClick={handleClick}>{content}</Link>
    : <div onClick={handleClick}>{content}</div>
}
