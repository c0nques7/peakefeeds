import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// One card for every sign-in page; pages render only their content inside it.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4 py-16">
      <div className="w-full max-w-md bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-[var(--radius-card)] p-6 sm:p-8 shadow-[var(--glass-shadow)]">
        <div className="mb-6">
          <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors w-fit">
            <ArrowLeft size={16} aria-hidden="true" /> Back to PeakeFeeds
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
