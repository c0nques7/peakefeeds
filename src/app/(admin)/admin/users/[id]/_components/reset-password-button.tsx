"use client";

import { sendManualPasswordReset } from "@/actions/admin-user-detail";
import { useTransition, useState } from "react";
import { KeyRound, Check, Loader2 } from "lucide-react";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const handleReset = () => {
    if (!confirm("Generate a password reset link for this user?")) return;
    startTransition(async () => {
      try {
        const result = await sendManualPasswordReset(userId);
        if (result.success) setSent(true);
      } catch (err) { alert("Failed to generate reset link."); }
    });
  };

  return (
    <button onClick={handleReset} disabled={isPending || sent} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-sm font-medium ${sent ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-[var(--glass-panel)] border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-card-hover)]"}`}>
      <div className="flex items-center gap-2">
        <KeyRound size={16} /> <span>{sent ? "Reset Link Generated" : "Send Password Reset"}</span>
      </div>
      {isPending && <Loader2 size={16} className="animate-spin" />}
      {sent && <Check size={16} />}
    </button>
  );
}