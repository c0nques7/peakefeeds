'use client'

import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, Reply, AtSign, Info, ShieldAlert, Flag, Send } from 'lucide-react'
import { markAsRead } from '@/actions/notifications'
import clsx from 'clsx'
import Link from 'next/link'

// Visual Config for each type
const TYPE_CONFIG = {
  LIKE: { icon: Heart, color: "text-pink-500", bg: "bg-pink-500/10", label: "liked your post" },
  COMMENT: { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/10", label: "commented on your post" },
  REPLY: { icon: Reply, color: "text-indigo-500", bg: "bg-indigo-500/10", label: "replied to you" },
  MENTION: { icon: AtSign, color: "text-orange-500", bg: "bg-orange-500/10", label: "mentioned you" },
  SYSTEM: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10", label: "System Alert" },
  TICKET_REPLY: { icon: Info, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Support Update" },
  TICKET_UPDATE: { icon: Info, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "updated your support ticket" },
  MESSAGE: { icon: Send, color: "text-indigo-400", bg: "bg-indigo-400/10", label: "sent you a message" },
  REPORT: { icon: Flag, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "A new report requires review" },
}

export function NotificationItem({ note, mutate }: { note: any, mutate: () => void }) {
  // @ts-ignore
  const config = TYPE_CONFIG[note.type] || TYPE_CONFIG.SYSTEM

  const handleClick = async () => {
    if (!note.isRead) {
      await markAsRead(note.id)
      mutate() 
    }
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (note.ticketId) return <Link href="/messages" onClick={handleClick}>{children}</Link>
    if (note.type === 'MESSAGE') return <Link href="/messages" onClick={handleClick}>{children}</Link>
    if (note.type === 'REPORT') return <Link href="/admin/moderation" onClick={handleClick}>{children}</Link>
    return <div onClick={handleClick}>{children}</div>
  }

  return (
    <Wrapper>
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
                 "{note.post?.content || note.comment?.content}"
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
    </Wrapper>
  )
}