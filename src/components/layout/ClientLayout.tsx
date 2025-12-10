'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation' 
import ThemeToggle from '@/components/ThemeToggle'
// 1. Import your HelpBot component
import HelpBot from '@/components/help/HelpBot' 
import styles from './clientlayout.module.css'
import clsx from 'clsx'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)
  const pathname = usePathname()
  
  useEffect(() => {
    setHasMounted(true)
  }, [])
  
  // Logic: Check if we are strictly on the landing page
  const isLanding = pathname === '/';

  return (
    <>
      {/* HYDRATION GUARD: 
         We only wrap the client-specific interactive elements (Toggle & Bot) 
         with the mounted check. {children} renders immediately.
      */}
      {hasMounted && (
        <>
          {/* THEME TOGGLE WRAPPER (Top Right) */}
          <div className={clsx(
              styles.toggleWrapper,
              { [styles.landingMode]: isLanding }
          )}>
            <ThemeToggle />
          </div>

          {/* HELP BOT WRAPPER (Bottom Right) */}
          <div className={styles.botWrapper}>
            <HelpBot />
          </div>
        </>
      )}

      {children}
    </>
  )
}