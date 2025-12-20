'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow, isValid } from 'date-fns'

interface LiveTimestampProps {
  date: Date | string | number
  className?: string
}

export function LiveTimestamp({ date, className }: LiveTimestampProps) {
  const [timeAgo, setTimeAgo] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const updateTime = () => {
      // 🟢 Convert and Validate the Date
      const d = typeof date === 'string' ? new Date(date) : new Date(date as any)
      
      if (!date || !isValid(d)) {
        console.warn("LiveTimestamp received an invalid date:", date)
        setTimeAgo('...') // Fallback text while loading or if invalid
        return
      }

      setTimeAgo(formatDistanceToNow(d, { addSuffix: true }))
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [date])

  // Prevents Hydration Mismatch: render a static version or null on server
  if (!mounted) {
    return <span className={className}>...</span>
  }

  return <span className={className}>{timeAgo}</span>
}

