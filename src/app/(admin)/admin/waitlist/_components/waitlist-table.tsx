"use client";

import { useState, useTransition } from "react";
import { activateWaitlistUsers } from "@/actions/admin-waitlist";
import { Loader2, Send, CheckSquare, Square } from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css";

// Basic type for the data we get from Prisma
type WaitlistUser = {
  id: string;
  email: string;
  joinedAt: Date;
  source: string | null;
};

export function WaitlistTable({ initialData }: { initialData: WaitlistUser[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Handle individual checkbox toggle
  const toggleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Handle "Select All"
  const toggleAll = () => {
    if (selected.length === initialData.length) {
      setSelected([]);
    } else {
      setSelected(initialData.map(u => u.id));
    }
  };

  // The Big Red Button Action
  const handleActivate = () => {
    if (!confirm(`Are you sure you want to activate ${selected.length} users? This will generate codes and log emails.`)) return;

    startTransition(async () => {
      await activateWaitlistUsers(selected);
      setSelected([]); // Clear selection on success
    });
  };

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex justify-between items-center bg-[var(--glass-panel)] p-4 rounded-xl border border-[var(--glass-border)]">
        <div className="text-sm text-[var(--text-muted)]">
          <span className="font-bold text-slate-900 dark:text-white">{selected.length}</span> users selected
        </div>
        <button
          onClick={handleActivate}
          disabled={selected.length === 0 || isPending}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
            selected.length > 0 
              ? "bg-[var(--accent-primary)] text-white hover:opacity-90 shadow-[0_0_15px_rgba(124,58,237,0.5)]" 
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
          }`}
        >
          {isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          {isPending ? "Processing..." : "Activate Selected"}
        </button>
      </div>

      {/* TABLE */}
      <div className={styles.glassPanel}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
            <thead>
              <tr>
                <th className={`p-4 ${styles.tableHeader} w-12 text-center`}>
                  <button onClick={toggleAll} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                    {selected.length === initialData.length && initialData.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className={`p-4 ${styles.tableHeader}`}>Email Address</th>
                <th className={`p-4 ${styles.tableHeader}`}>Joined</th>
                <th className={`p-4 ${styles.tableHeader}`}>Attribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]">
              {initialData.map((user) => (
                <tr key={user.id} className={styles.tableRow}>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleSelect(user.id)} 
                      className={`${selected.includes(user.id) ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"} hover:text-slate-900 dark:hover:text-white transition-colors`}
                    >
                      {selected.includes(user.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="p-4 text-slate-900 dark:text-white font-mono text-sm">{user.email}</td>
                  <td className="p-4 text-[var(--text-muted)] text-sm">
                    {new Date(user.joinedAt).toLocaleDateString()} <span className="text-xs opacity-50">({new Date(user.joinedAt).toLocaleTimeString()})</span>
                  </td>
                  <td className="p-4">
                    {user.source ? (
                      <span className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        {user.source}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] italic">Direct</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {initialData.length === 0 && (
                  <tr>
                      <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                          No pending users found. The waitlist is clear!
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}