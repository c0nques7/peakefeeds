import clsx from 'clsx';

// Shared form-control classes, in a plain module so server components can use them too.
const control =
  'w-full rounded-[var(--radius-control)] bg-[var(--input-bg)] border border-[var(--glass-border)] ' +
  'text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors ' +
  'focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] ' +
  'disabled:opacity-60 aria-[invalid=true]:border-[var(--status-error)]';

export const inputClasses = clsx(control, 'h-11 px-3.5 text-sm');
export const textareaClasses = clsx(control, 'min-h-[96px] px-3.5 py-2.5 text-sm resize-y');
export const labelClasses = 'text-sm font-medium text-[var(--text-secondary)]';
