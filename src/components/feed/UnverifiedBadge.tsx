import { AlertCircle } from "lucide-react";

export function UnverifiedBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800/50 border border-zinc-700 text-zinc-500 text-xs">
      <AlertCircle size={12} />
      <span>Unverified</span>
    </div>
  );
}

