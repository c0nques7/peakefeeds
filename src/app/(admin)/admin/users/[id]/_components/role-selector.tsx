"use client";

import { UserRole } from "@prisma/client";
import { updateUserRole } from "@/actions/admin-user-detail"; // 🟢 Uses absolute path, so this is safe
import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

export function UserRoleSelector({ 
  userId, 
  currentRole 
}: { 
  userId: string; 
  currentRole: UserRole 
}) {
  const [role, setRole] = useState(currentRole);
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (newRole: UserRole) => {
    setRole(newRole);
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 2000); 
      } catch (error) {
        setRole(currentRole);
        alert("Failed to update role. You might not have permission.");
      }
    });
  };

  return (
    <div className="relative">
      <select
        disabled={isPending}
        value={role}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        className="w-full px-4 py-2 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:border-[var(--accent-primary)] hover:bg-[var(--glass-card-hover)] transition-all"
      >
        {Object.values(UserRole).map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-2.5 pointer-events-none text-[var(--accent-primary)]">
        {isPending ? <Loader2 size={16} className="animate-spin" /> : 
         isSuccess ? <Check size={16} className="text-emerald-400" /> : 
         <span className="text-[var(--text-muted)] text-xs">▼</span>}
      </div>
    </div>
  );
}