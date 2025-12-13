import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4 relative overflow-hidden">
      
      {/* 1. SHARED BACKGROUND EFFECTS */}
      {/* Top Left Orb */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      {/* Bottom Right Orb */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-900/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />

      {/* 2. THE GLASS CARD CONTAINER */}
      <div className="w-full max-w-md bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        
        {/* Optional: Global Back Button for all auth pages */}
        <div className="mb-6">
           <Link href="/home" className="text-sm text-[var(--text-muted)] hover:text-white flex items-center gap-2 transition-colors w-fit">
             <ArrowLeft size={16} /> Back to PeakeFeeds
           </Link>
        </div>

        {children}
      </div>

    </div>
  );
}