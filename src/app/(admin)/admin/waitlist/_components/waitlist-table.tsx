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
      <div className="flex justify-between items-center bg-(--glass-panel) p-4 rounded-xl border border-(--glass-border)">
        <div className="text-sm text-(--text-muted)">
          <span className="font-bold text-(--text-primary)">{selected.length}</span> users selected
        </div>
        <button
          onClick={handleActivate}
          disabled={selected.length === 0 || isPending}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
            selected.length > 0 
              ? "bg-(--btn-primary) text-(--btn-primary-text) hover:bg-(--btn-primary-hover)" 
              : "bg-(--glass-card-hover) text-(--text-muted) cursor-not-allowed"
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
                  <button onClick={toggleAll} className="hover:text-(--text-primary) transition-colors">
                    {selected.length === initialData.length && initialData.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className={`p-4 ${styles.tableHeader}`}>Email Address</th>
                <th className={`p-4 ${styles.tableHeader}`}>Joined</th>
                <th className={`p-4 ${styles.tableHeader}`}>Attribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--glass-border)">
              {initialData.map((user) => (
                <tr key={user.id} className={styles.tableRow}>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleSelect(user.id)} 
                      className={`${selected.includes(user.id) ? "text-(--accent-primary)" : "text-(--text-muted)"} hover:text-(--text-primary) transition-colors`}
                    >
                      {selected.includes(user.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="p-4 text-(--text-primary) font-mono text-sm">{user.email}</td>
                  <td className="p-4 text-(--text-muted) text-sm">
                    {new Date(user.joinedAt).toLocaleDateString()} <span className="text-xs opacity-50">({new Date(user.joinedAt).toLocaleTimeString()})</span>
                  </td>
                  <td className="p-4">
                    {user.source ? (
                      <span className="px-2 py-1 rounded-md bg-(--glass-card-hover) text-xs text-(--text-secondary) border border-(--glass-border)">
                        {user.source}
                      </span>
                    ) : (
                      <span className="text-xs text-(--text-muted) italic">Direct</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {initialData.length === 0 && (
                  <tr>
                      <td colSpan={4} className="p-8 text-center text-(--text-muted)">
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