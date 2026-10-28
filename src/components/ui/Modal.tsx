'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';

/**
 * A modal on the native <dialog>: showModal() puts it in the top layer, traps focus, makes the
 * page behind it inert and closes on Escape; a click on the backdrop closes it too.
 * Pass `labelledBy` (the id of its heading) so screen readers announce what it is.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      // Escape: let the parent decide (it owns `open`)
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      // The dialog box is the panel's padding-free frame, so a click on it is a click on the backdrop
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className={clsx(
        'm-auto w-[calc(100%-2rem)] max-w-md overflow-visible bg-transparent p-0 text-inherit',
        'backdrop:bg-black/80 backdrop:backdrop-blur-sm',
        className
      )}
    >
      {open && (
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-[var(--glass-card)] p-6 shadow-2xl">
          {children}
        </div>
      )}
    </dialog>
  );
}
