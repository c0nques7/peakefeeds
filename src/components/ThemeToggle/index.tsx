"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import clsx from "clsx"

// The one theme switch. `icon` is a round button for pages without navigation (landing, auth);
// `row` is a labelled row for the sidebar and Settings.
export default function ThemeToggle({ variant = "icon", className }: { variant?: "icon" | "row"; className?: string }) {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // The theme is only known in the browser, so render a same-sized placeholder until then
  React.useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"
  const next = isDark ? "light" : "dark"
  const label = mounted ? `Switch to ${next} theme` : "Switch theme"
  const Icon = isDark ? Sun : Moon

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className={clsx(
          "flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 h-10 text-sm font-medium",
          "text-[var(--text-secondary)] hover:bg-[var(--glass-card-hover)] hover:text-[var(--text-primary)] transition-colors",
          className
        )}
        aria-label={label}
      >
        {mounted ? <Icon size={18} aria-hidden="true" /> : <span className="w-[18px]" />}
        <span>{mounted ? (isDark ? "Light theme" : "Dark theme") : "Theme"}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={clsx(
        "flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--glass-border)]",
        "bg-[var(--glass-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-card-hover)] transition-colors",
        className
      )}
      aria-label={label}
      title={label}
    >
      {mounted && <Icon size={18} aria-hidden="true" />}
    </button>
  )
}
