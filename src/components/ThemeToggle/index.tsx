"use client"

import * as React from "react"
import {useState} from "react"
// 👇 CHANGE THIS IMPORT: Use 'next-themes', NOT '@/lib/ThemeContext'
import { useTheme } from "next-themes" 
import { Moon, Sun } from "lucide-react"

export default function ThemeToggle() { // Or export function ModeToggle()
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by waiting for mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null // Or a skeleton placeholder
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="hidden sm:flex p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors items-center justify-center"
      aria-label="Toggle Theme"
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="h-5 w-5 text-white" />
      ) : (
        <Sun className="h-5 w-5 text-gray-900" />
      )}
    </button>
  )
}

