"use client";

import { useState, useTransition } from "react";
import { createUser } from "@/actions/admin-users";
import { UserRole } from "@prisma/client";
import { Plus, X, Loader2, UserPlus, Ticket } from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css"; // Admin CSS

export function CreateUserButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await createUser(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-violet-600 text-[var(--text-primary)] rounded-lg font-bold text-sm transition-colors shadow-lg shadow-violet-500/20"
      >
        <Plus size={18} />
        Create User
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`${styles.glassPanel} w-full max-w-md relative animate-in zoom-in-95 duration-200`}>
            
            <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center">
              <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <UserPlus className="text-[var(--accent-primary)]" />
                New User
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X size={20} />
              </button>
            </div>

            <form action={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Email</label>
                <input name="email" type="email" required className="w-full px-4 py-2 rounded bg-[var(--bg-app)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none" placeholder="user@example.com" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Username</label>
                <input name="username" type="text" required className="w-full px-4 py-2 rounded bg-[var(--bg-app)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none" placeholder="username" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Temporary Password</label>
                <input name="password" type="password" required className="w-full px-4 py-2 rounded bg-[var(--bg-app)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none" placeholder="••••••••" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Role</label>
                <select name="role" className="w-full px-4 py-2 rounded bg-[var(--bg-app)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none cursor-pointer">
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* 🟢 NEW CHECKBOX SECTION */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-panel)] cursor-pointer hover:bg-[var(--glass-card-hover)] transition-colors">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      name="generateInvites" 
                      defaultChecked 
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-500 bg-slate-900 transition-all checked:border-[var(--accent-primary)] checked:bg-[var(--accent-primary)]"
                    />
                    <Ticket size={12} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--text-primary)] opacity-0 peer-checked:opacity-100" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--text-primary)]">Generate Invite Codes</span>
                    <span className="text-xs text-[var(--text-muted)]">User will receive 3 invites to share.</span>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2 rounded border border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="flex-1 py-2 rounded bg-[var(--accent-primary)] text-[var(--text-primary)] font-bold hover:bg-violet-600 transition-colors flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="animate-spin" size={16} />}
                  Create
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}