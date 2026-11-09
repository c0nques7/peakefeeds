import clsx from 'clsx';
import type { ReactNode } from 'react';

// What a list shows when it has nothing in it: what will appear here, and how to get started.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center text-center gap-3 px-6 py-12 rounded-(--radius-card)',
        'border border-dashed border-(--glass-border) bg-(--glass-card)',
        className
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-(--radius-control) bg-(--glass-card-hover) text-(--text-muted)">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-(--text-primary)">{title}</h2>
      {description && <p className="max-w-sm text-sm text-(--text-muted)">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
