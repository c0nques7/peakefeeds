import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="animate-spin text-[var(--accent-primary)]" size={32} aria-hidden="true" />
    </div>
  );
}
