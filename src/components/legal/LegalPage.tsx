import Link from 'next/link';
import { ArrowLeft, Mountain } from 'lucide-react';
import type { ReactNode } from 'react';

// Shared frame for the Terms and Privacy pages: readable column, plain headings, no app chrome.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-(--bg-app) px-4 py-12 sm:py-16">
      <article className="mx-auto max-w-[68ch]">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-(--text-primary)" aria-label="PeakeFeeds home">
            <span className="grid h-8 w-8 place-items-center rounded-(--radius-control) bg-(--accent-primary) text-(--btn-primary-text)">
              <Mountain size={16} fill="currentColor" aria-hidden="true" />
            </span>
            <span className="font-extrabold tracking-tight">PeakeFeeds</span>
          </Link>
          <Link href="/" className="mr-12 flex items-center gap-1.5 text-sm text-(--text-muted) hover:text-(--text-primary)">
            <ArrowLeft size={14} aria-hidden="true" /> Back
          </Link>
        </div>

        <header className="mb-8 border-b border-(--glass-border) pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-(--text-primary)">{title}</h1>
          <p className="mt-2 text-sm text-(--text-muted)">Last updated {updated}</p>
        </header>

        <div className="legal-prose flex flex-col gap-4 text-[15px] leading-7 text-(--text-secondary) [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-(--text-primary) [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_a]:text-(--accent-primary) [&_a]:underline [&_strong]:text-(--text-primary)">
          {children}
        </div>
      </article>
    </main>
  );
}
