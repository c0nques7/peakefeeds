import { ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

interface VerificationBadgeProps {
  txHash?: string; // If present, it's verified
  isPending?: boolean; // For optimistic UI updates immediately after ad watch
}

export function VerificationBadge({ txHash, isPending }: VerificationBadgeProps) {
  if (isPending) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs animate-pulse">
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce" />
        <span>Anchoring...</span>
      </div>
    );
  }

  if (!txHash) return null;

  return (
    <Link 
      href={`https://sepolia-optimism.etherscan.io/tx/${txHash}`}
      target="_blank"
      onClick={(e) => e.stopPropagation()} // Prevent flipping the card if placed on front
      className="group relative flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 hover:border-teal-400/50 transition-all cursor-pointer overflow-hidden"
    >
      {/* "Breathing" Glow Effect */}
      <div className="absolute inset-0 bg-teal-400/10 blur-md group-hover:bg-teal-400/20 transition-all" />

      <ShieldCheck size={14} className="relative z-10" />
      <span className="text-xs font-bold relative z-10">Verified</span>
      <ExternalLink size={10} className="relative z-10 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
    </Link>
  );
}

