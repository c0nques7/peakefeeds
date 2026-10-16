"use client"

import { useState, useTransition, useEffect } from "react"
import { Loader2, Check } from "lucide-react"
import Link from "next/link"
import { requestPasswordReset } from '@/actions/auth-reset'
import { Button, TextField } from '@/components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    startTransition(async () => {
      const form = new FormData()
      form.append('email', email)
      const res = await requestPasswordReset(form)
      if (res?.success) {
        setMessage('If an account exists for this email, a password reset link has been sent.')
        // Start a short client-side cooldown to prevent repeat submissions
        const COOLDOWN = 60 // seconds
        setCooldownSeconds(COOLDOWN)
      } else if (res?.error) {
        setMessage(res.error)
      } else {
        setMessage('If an account exists for this email, a password reset link has been sent.')
        const COOLDOWN = 60 // seconds
        setCooldownSeconds(COOLDOWN)
      }
    })
  }

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const t = setInterval(() => {
      setCooldownSeconds((s) => {
        if (s <= 1) {
          clearInterval(t)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [cooldownSeconds])

  // The auth layout already provides the card, so this page renders only its content
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Reset your password</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Enter your account email and we&apos;ll send you a reset link.</p>
      </div>

      {message && (
        <div role="status" className="flex items-start gap-2 p-3 mb-5 rounded-[var(--radius-control)] bg-[var(--status-success-bg)] text-[var(--status-success)] text-sm">
          <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={isPending || cooldownSeconds > 0}
          icon={isPending ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : undefined}
        >
          {cooldownSeconds > 0 ? `You can send another link in ${cooldownSeconds}s` : 'Send reset link'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--text-muted)] border-t border-[var(--glass-border)] pt-5">
        Remembered it? <Link href="/login" className="text-[var(--accent-primary)] font-bold hover:underline">Log in</Link>
      </div>
    </>
  )
}
