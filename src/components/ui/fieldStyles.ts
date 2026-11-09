import clsx from 'clsx';

// Shared form-control classes, in a plain module so server components can use them too.
const control =
  'w-full rounded-(--radius-control) bg-(--input-bg) border border-(--glass-border) ' +
  'text-(--text-primary) placeholder:text-(--text-muted) transition-colors ' +
  'focus:outline-hidden focus:border-(--accent-primary) focus:ring-1 focus:ring-(--accent-primary) ' +
  'disabled:opacity-60 aria-invalid:border-(--status-error)';

export const inputClasses = clsx(control, 'h-11 px-3.5 text-sm');
export const textareaClasses = clsx(control, 'min-h-[96px] px-3.5 py-2.5 text-sm resize-y');
export const labelClasses = 'text-sm font-medium text-(--text-secondary)';
