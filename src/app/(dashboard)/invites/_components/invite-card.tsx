"use client";

import { Copy, CheckCircle, User } from "lucide-react";
import { useState } from "react";

export default function InviteCard({ invite }: { invite: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUsed = !!invite.usedAt;

  return (
    <div className={`relative p-6 rounded-2xl border transition-all ${
      isUsed 
        ? "bg-[var(--glass-panel)] border-[var(--glass-border)] opacity-60" 
        : "bg-gradient-to-br from-[var(--glass-card)] to-[var(--accent-primary)]/10 border-[var(--accent-primary)]/50 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
    }`}>
      
      {/* Status Badge */}
      <div className="flex justify-between items-start mb-4">
        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
          isUsed 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-[var(--accent-primary)]/30"
        }`}>
          {isUsed ? "CLAIMED" : "AVAILABLE"}
        </span>
      </div>

      {/* The Code */}
      <div className="text-center py-4">
        <div className="text-2xl font-mono font-bold tracking-widest text-white">
          {invite.code}
        </div>
      </div>

      {/* Footer / Action */}
      <div className="mt-4 pt-4 border-t border-white/5">
        {isUsed ? (
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
               <User size={14} />
            </div>
            <div>
              <p className="text-white">Used by @{invite.usedBy?.username || "Unknown"}</p>
              <p className="text-xs">{new Date(invite.usedAt).toLocaleDateString()}</p>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--glass-panel)] hover:bg-white/10 text-white text-sm font-medium transition-colors"
          >
            {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        )}
      </div>
    </div>
  );
}