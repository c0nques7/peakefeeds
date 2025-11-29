'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
// 1. Imported Home icon, Removed LayoutGrid
import { Compass, LogOut, User, Mountain, Home } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle' 

interface SidebarProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const navItems = [
    // 2. NEW: Home Button (Top Priority)
    { label: 'Home', href: '/home', icon: Home },
    // 3. Discover (Global Feed)
    { label: 'Discover', href: '/all', icon: Compass },
    // 4. Profile
    { label: 'Profile', href: `/profile/${user?.username || ''}`, icon: User },
  ]

  return (
    <div className="h-full flex flex-col p-4 border-r border-[var(--glass-border)] bg-[var(--glass-panel)] backdrop-blur-xl">
      
      {/* LOGO AREA */}
      <div className="mb-8 px-4 py-2 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg">
          <Mountain size={18} fill="currentColor" />
        </div>
        <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
          PeakeFeeds
        </span>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                active 
                  ? "bg-[var(--accent-primary)] text-white shadow-md" 
                  : "text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={20} className={clsx(active ? "text-white" : "group-hover:text-[var(--accent-primary)]")} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* FOOTER AREA (Toggle + User) */}
      <div className="mt-auto space-y-4">
        
        {/* THEME TOGGLE ROW */}
        <div className="px-4 py-3 rounded-xl bg-[var(--glass-card)] border border-[var(--glass-border)] flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-muted)]">Theme</span>
            <ThemeToggle />
        </div>

        {/* USER PROFILE SNIPPET */}
        <div className="pt-4 border-t border-[var(--glass-border)]">
            <div className="flex items-center gap-3 px-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-secondary)] flex items-center justify-center text-white font-bold shadow-sm">
                    {user?.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                        @{user?.username || 'User'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                        {user?.email}
                    </p>
                </div>
            </div>
            
            <Link 
                href="/api/auth/signout"
                className="flex items-center gap-2 px-2 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
            >
                <LogOut size={14} />
                Sign Out
            </Link>
        </div>
      </div>

    </div>
  )
}