"use client"

import { useState, useTransition } from "react"
import { Mail, Loader2, Check } from "lucide-react"
import Link from "next/link"
import { requestPasswordReset } from '@/actions/auth-reset'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    startTransition(async () => {
      const form = new FormData()
      form.append('email', email)
      const res = await requestPasswordReset(form)
      if (res?.success) {
        setMessage('If an account exists for this email, a password reset link has been sent.')
      } else if (res?.error) {
        setMessage(res.error)
      } else {
        setMessage('If an account exists for this email, a password reset link has been sent.')
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4">
      <div className="w-full max-w-md bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-[var(--glass-panel)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--glass-border)]">
            <Mail className="text-[var(--accent-primary)]" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Enter your account email and we'll send a reset link.</p>
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 text-center mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-muted)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full mt-2 px-4 py-2 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="animate-spin" size={16} />}
            Send reset link
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[var(--text-muted)]">
          <Link href="/signin" className="text-[var(--accent-primary)] hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
