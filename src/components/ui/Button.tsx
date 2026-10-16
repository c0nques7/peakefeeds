import Link from 'next/link';
import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

// The one button for the whole app. Colours come only from the theme variables in globals.css.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none ' +
  'rounded-[var(--radius-control)] border transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--btn-primary)] text-[var(--btn-primary-text)] border-transparent hover:bg-[var(--btn-primary-hover)]',
  secondary:
    'bg-[var(--glass-card)] text-[var(--text-primary)] border-[var(--glass-border)] hover:bg-[var(--glass-card-hover)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-card-hover)] hover:text-[var(--text-primary)]',
  danger:
    'bg-[var(--status-error-bg)] text-[var(--status-error)] border-transparent hover:brightness-95',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function buttonClasses({ variant = 'primary', size = 'md', fullWidth, className }: Omit<Common, 'icon' | 'children'> = {}) {
  return clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className);
}

export function Button({ variant, size, fullWidth, icon, className, children, type = 'button', ...rest }: Common & ComponentProps<'button'>) {
  return (
    <button type={type} className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, fullWidth, icon, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
