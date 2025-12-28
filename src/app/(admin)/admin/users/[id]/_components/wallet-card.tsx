"use client";

import { useState, useTransition } from "react";
import { disconnectWallet } from "@/actions/admin-user-detail";
import { Wallet, Unlink, Loader2, CheckCircle } from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css";
import { toast } from "sonner";

export function WalletCard({ 
  userId, 
  walletAddress 
}: { 
  userId: string; 
  walletAddress: string | null 
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await disconnectWallet(userId);
      if (result.success) {
        toast.success("Wallet disconnected successfully");
        setShowConfirm(false);
      } else {
        toast.error("Failed to disconnect wallet");
      }
    });
  };

  return (
    <div className={styles.glassPanel}>
      <div className="p-4 border-b border-[var(--glass-border)]">
        <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Wallet size={18} className="text-emerald-400" />
          Web3 Connection
        </h3>
      </div>
      <div className="p-6 space-y-4">
        {walletAddress ? (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Connected Address</label>
              <div className="font-mono text-xs p-3 bg-black/20 rounded border border-[var(--glass-border)] break-all text-[var(--text-primary)]">
                {walletAddress}
              </div>
            </div>

            {showConfirm ? (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 space-y-3">
                <p className="text-xs text-red-400 font-medium">
                  Are you sure you want to disconnect this wallet? The user will need to re-verify it.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisconnect}
                    disabled={isPending}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                    Yes, Disconnect
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-1.5 bg-[var(--glass-panel)] text-[var(--text-muted)] text-xs font-bold rounded border border-[var(--glass-border)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium border border-red-500/20 transition-all"
              >
                <Unlink size={16} />
                Disconnect Wallet
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-4 text-[var(--text-muted)]">
            <Wallet size={32} className="opacity-20 mb-2" />
            <p className="text-sm">No wallet connected</p>
          </div>
        )}
      </div>
    </div>
  );
}
