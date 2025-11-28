'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import Image from 'next/image'

export default function ThemeLogo() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Wait for client to mount so we know the theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Default to Dark logo during server render to prevent layout shift/flash
  // (Assuming Landing Page defaults to dark aesthetic)
  if (!mounted) {
    return (
      <Image 
        src="/peake-logo-dark.png" 
        alt="PeakeFeeds Logo" 
        width={40} 
        height={40} 
        className="rounded-lg"
      />
    )
  }

  return (
    <Image 
      // 🔄 DYNAMIC SOURCE: Swaps based on theme
      src={resolvedTheme === 'light' ? '/peake-logo-light.png' : '/peake-logo-dark.png'} 
      alt="PeakeFeeds Logo" 
      width={40} 
      height={40} 
      className="rounded-lg transition-opacity duration-300"
    />
  )
}