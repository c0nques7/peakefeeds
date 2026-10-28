'use client' // Error boundaries must be Client Components

import './globals.css';

// Replaces the root layout when it fails, so it brings its own <html> and <body>
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg-app)] px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">PeakeFeeds hit a problem</h1>
          <p className="max-w-md text-[var(--text-muted)]">
            Something went wrong loading the site. Try again, or come back in a moment.
          </p>
          {error.digest && <p className="text-xs text-[var(--text-muted)]">Reference: {error.digest}</p>}
          <button
            onClick={() => retry()}
            className="rounded-[var(--radius-control)] bg-[var(--accent-primary)] px-4 py-2 font-semibold text-[var(--btn-primary-text)]"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
