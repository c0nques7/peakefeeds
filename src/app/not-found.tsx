import Link from 'next/link';
import { Compass, Home, Mountain } from 'lucide-react';
import { ButtonLink } from '@/components/ui';

export const metadata = { title: 'Page not found · PeakeFeeds' };

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--bg-app)] px-4 py-16 text-center">
      <Link href="/" className="flex items-center gap-2 text-[var(--text-primary)]" aria-label="PeakeFeeds home">
        <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] bg-[var(--accent-primary)] text-[var(--btn-primary-text)]">
          <Mountain size={18} fill="currentColor" aria-hidden="true" />
        </span>
        <span className="text-lg font-extrabold tracking-tight">PeakeFeeds</span>
      </Link>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">404</p>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">We couldn&apos;t find that page</h1>
        <p className="max-w-md text-[var(--text-muted)]">
          The link may be mistyped, or the post, channel or profile may have been removed.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <ButtonLink href="/home" icon={<Home size={16} aria-hidden="true" />}>Go to your feed</ButtonLink>
        <ButtonLink href="/discover" variant="secondary" icon={<Compass size={16} aria-hidden="true" />}>Discover</ButtonLink>
      </div>
    </main>
  );
}
