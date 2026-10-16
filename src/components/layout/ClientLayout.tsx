'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import HelpBot from '@/components/help/HelpBot'
import styles from './clientlayout.module.css'
import clsx from 'clsx'

// Pages with no navigation of their own get the theme toggle in the corner.
// The landing page renders its own toggle; app and admin pages have one in their sidebar or Settings.
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/signin']

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const isAuthPage = AUTH_PATHS.some(p => pathname.startsWith(p))
  const isLanding = pathname === '/'
  const isAdmin = pathname.startsWith('/admin')
  // App pages show the bottom tab bar on phones, so Help has to sit above it
  const hasTabBar = !isAuthPage && !isLanding && !isAdmin

  return (
    <>
      {hasMounted && (
        <>
          {isAuthPage && (
            <div className={styles.toggleWrapper}>
              <ThemeToggle />
            </div>
          )}

          <div className={clsx(styles.botWrapper, hasTabBar && styles.aboveTabBar)}>
            <HelpBot />
          </div>
        </>
      )}

      {children}
    </>
  )
}
