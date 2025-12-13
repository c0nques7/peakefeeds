"use client";

import { triggerManualEmail } from "@/actions/admin-user-detail";
import { useTransition } from "react";
import { Mail, Loader2, Send } from "lucide-react";

export function EmailTriggers({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleSend = (type: "WELCOME" | "ACTIVATION" | "ADMIN_WELCOME", label: string) => {
    if (!confirm(`Are you sure you want to send the "${label}" to this user?`)) return;

    startTransition(async () => {
      const res = await triggerManualEmail(userId, type);
      if (res.error) {
        alert("Error: " + res.error);
      } else {
        alert(`"${label}" sent successfully.`);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => handleSend("WELCOME", "Waitlist Welcome")}
        disabled={isPending}
        className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] text-sm text-[var(--text-muted)] hover:text-white transition-all border border-[var(--glass-border)]"
      >
        <span className="flex items-center gap-2">
          <Mail size={16} className="text-blue-400" />
          <span>Send Waitlist Welcome</span>
        </span>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} className="opacity-50" />}
      </button>

      <button
        onClick={() => handleSend("ACTIVATION", "Activation (Invite)")}
        disabled={isPending}
        className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] text-sm text-[var(--text-muted)] hover:text-white transition-all border border-[var(--glass-border)]"
      >
        <span className="flex items-center gap-2">
          <Mail size={16} className="text-purple-400" />
          <span>Send Activation (Invite Code)</span>
        </span>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} className="opacity-50" />}
      </button>

      <button
        onClick={() => handleSend("ADMIN_WELCOME", "Admin Credentials")}
        disabled={isPending}
        className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] text-sm text-[var(--text-muted)] hover:text-white transition-all border border-[var(--glass-border)]"
      >
        <span className="flex items-center gap-2">
          <Mail size={16} className="text-emerald-400" />
          <span>Resend Admin Welcome</span>
        </span>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} className="opacity-50" />}
      </button>
    </div>
  );
}