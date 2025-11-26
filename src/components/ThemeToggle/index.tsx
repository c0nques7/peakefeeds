'use client'

import { useTheme } from '@/lib/ThemeContext'
import { Moon, Sun } from 'lucide-react'
// ⚠️ ENSURE THIS IMPORT PATH IS CORRECT AND THE CSS FILE IS IN PLACE
import styles from './ThemeToggle.module.css' 

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  if (!theme) return null

  return (
    <button 
      onClick={toggleTheme} 
      className={styles.toggleBtn}
      aria-label="Toggle Theme"
    >
      <div className={styles.iconWrapper}>
        {theme === 'light' ? (
          <Moon size={20} className="text-slate-600" />
        ) : (
          <Sun size={20} className="text-yellow-300" />
        )}
      </div>
    </button>
  )
}
