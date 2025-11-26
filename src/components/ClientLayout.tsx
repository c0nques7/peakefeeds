'use client'

import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)
  
  // This useEffect ensures the component only renders its contents 
  // *after* the client environment (and the context provider) is initialized.
  useEffect(() => {
    setHasMounted(true)
  }, [])
  
  // During the first server render / initial client pass, render nothing 
  // to avoid the crash caused by calling useTheme() too early.
  if (!hasMounted) {
    return null 
  }

  // After the client mounts, render the actual content
  return (
    <>
      {/* Now, ThemeToggle is guaranteed to run after the ThemeProvider is ready */}
      <ThemeToggle />
      {children}
    </>
  )
}
