import clsx from 'clsx';
import type { ReactNode } from 'react';

// The header every page starts with: one title, an optional one-line description, optional actions.
export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Optional small link above the title, e.g. "Back to channel" */
  back?: ReactNode;
  className?: string;
}) {
  return (
    <header className={clsx('mb-6 flex flex-col gap-2', className)}>
      {back && <div className="text-sm text-[var(--text-muted)]">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">{title}</h1>
          {description && <p className="mt-1 text-sm text-[var(--text-muted)] max-w-prose">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
