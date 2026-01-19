import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4 relative overflow-hidden">
      
      {/* 2. THE CARD CONTAINER */}
      <div className="w-full max-w-md bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-lg p-8 shadow-[var(--glass-shadow)] relative z-10">
        
        {/* Optional: Global Back Button for all auth pages */}
        <div className="mb-6">
           <Link href="/home" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors w-fit">
             <ArrowLeft size={16} /> Back to PeakeFeeds
           </Link>
        </div>

        {children}
      </div>

    </div>
  );
}