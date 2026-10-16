'use client';

import clsx from 'clsx';
import { useId, type ComponentProps, type ReactNode } from 'react';

import { inputClasses, textareaClasses, labelClasses } from './fieldStyles';

// Form fields: always a visible label (placeholders vanish once someone types), plus optional hint/error.
type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  /** Visually hide the label but keep it for screen readers */
  hideLabel?: boolean;
};

function FieldShell({ id, label, hint, error, hideLabel, className, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={clsx(labelClasses, hideLabel && 'sr-only')}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-[var(--status-error)]">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({ label, hint, error, hideLabel, className, id, ...input }: FieldProps & ComponentProps<'input'>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={inputClasses}
        {...input}
      />
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, hideLabel, className, id, ...textarea }: FieldProps & ComponentProps<'textarea'>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={textareaClasses}
        {...textarea}
      />
    </FieldShell>
  );
}
