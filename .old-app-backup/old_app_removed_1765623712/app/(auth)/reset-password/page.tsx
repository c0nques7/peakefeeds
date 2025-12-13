"use client";

import { completePasswordReset } from "@/actions/auth-reset";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { KeyRound, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <div className="p-8 bg-[var(--glass-card)] rounded-2xl border border-[var(--glass-border)] text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-[var(--text-muted)] mb-6">This password reset link is missing required information.</p>
          <Link href="/forgot-password" className="text-[var(--accent-primary)] hover:underline">Request a new one</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await completePasswordReset(token, email, formData);
      if (result?.error) {
        setError(result.error);
      }
      // Success redirects automatically in the server action
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4 relative overflow-hidden">
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-900/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-[var(--glass-panel)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--glass-border)]">
             <KeyRound className="text-[var(--accent-primary)]" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">for {email}</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-muted)]">New Password</label>
            <input 
              name="password"
              type="password" 
              required 
              minLength={8}
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-muted)]">Confirm Password</label>
            <input 
              name="confirm"
              type="password" 
              required 
              minLength={8}
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] transition-all"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          <button 
            disabled={isPending}
            type="submit" 
            className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="animate-spin" size={18} />}
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}