'use client'

import { Toaster } from 'sonner'
import { useTheme } from 'next-themes'

// The one toast host for the app. Top-centre keeps toasts clear of the phone tab bar and the
// Help button; the offset keeps them below the notch when the page runs edge to edge.
export function AppToaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      position="top-center"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      closeButton
    />
  )
}
