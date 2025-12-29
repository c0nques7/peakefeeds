'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

export const ClientTimestamp = ({ date }: { date: string | Date }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null // or return a server-safe fallback like a static date or nothing
  }

  return <span>{formatDistanceToNow(new Date(date), { addSuffix: true })}</span>
}