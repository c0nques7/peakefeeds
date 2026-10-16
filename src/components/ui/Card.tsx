import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

// A raised panel. Use it for a block that stands on its own (a form, a post, a settings group),
// not as a wrapper around every section.
export function Card({ padded = true, className, ...rest }: { padded?: boolean } & ComponentProps<'div'>) {
  return (
    <div
      className={clsx(
        'rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-[var(--glass-card)] shadow-[var(--glass-shadow)]',
        padded && 'p-5 sm:p-6',
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
