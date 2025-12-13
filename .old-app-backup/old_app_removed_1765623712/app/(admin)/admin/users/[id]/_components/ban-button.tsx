"use client";

import { toggleBan } from "@/actions/admin-user-detail";
import { useTransition } from "react";
import { Gavel, Undo2, Loader2 } from "lucide-react";

export function BanButton({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const willBan = !isBanned;
    if (willBan && !confirm("Are you sure you want to BAN this user?")) return;
    startTransition(async () => { await toggleBan(userId, willBan); });
  };

  if (isBanned) {
    return (
      <button onClick={handleToggle} disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-medium text-sm">
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />} Unban User
      </button>
    );
  }

  return (
    <button onClick={handleToggle} disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all font-medium text-sm">
      {isPending ? <Loader2 size={16} className="animate-spin" /> : <Gavel size={16} />} Ban User
    </button>
  );
}