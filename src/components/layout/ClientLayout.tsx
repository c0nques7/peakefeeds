'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation' 
import ThemeToggle from '@/components/ThemeToggle'
import styles from './clientlayout.module.css'
import clsx from 'clsx'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)
  const pathname = usePathname()
  
  // Hydration fix
  useEffect(() => {
    setHasMounted(true)
  }, [])
  
  if (!hasMounted) {
    return null 
  }

  // Logic: Check if we are strictly on the landing page
  const isLanding = pathname === '/';

  return (
    <>
      {/* THEME TOGGLE WRAPPER 
        - Mobile: Always Visible
        - Desktop: Hidden by default (via CSS), unless 'landingMode' is active
      */}
      <div className={clsx(
          styles.toggleWrapper,
          { [styles.landingMode]: isLanding }
      )}>
        <ThemeToggle />
      </div>

      {children}
    </>
  )
}