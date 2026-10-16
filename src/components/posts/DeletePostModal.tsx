'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { buttonClasses } from '@/components/ui';

const DELETION_REASONS = [
  { value: 'SPAM', label: 'Spam / Automated Content' },
  { value: 'HATE_SPEECH', label: 'Hate Speech / Harassment' },
  { value: 'VIOLENCE', label: 'Violence / Gore' },
  { value: 'MISINFORMATION', label: 'Misinformation / Fake News' },
  { value: 'ILLEGAL_CONTENT', label: 'Illegal Content / Activity' },
  { value: 'NOT_VERIFIED', label: 'Unverified content in a strictly verified channel' },
  { value: 'OFF_TOPIC', label: 'Off-topic / Low Quality' },
  { value: 'OTHER', label: 'Other (Specify in comments)' },
];

interface DeletePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comments: string) => void;
  isDeleting: boolean;
}

export default function DeletePostModal({ isOpen, onClose, onConfirm, isDeleting }: DeletePostModalProps) {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    onConfirm(reason, comments);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-[var(--radius-card)] p-6 shadow-2xl relative overflow-hidden">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--status-error-bg)] mb-3 text-[var(--status-error)]">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Delete this post?</h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            You are deleting content authored by another user. Please specify a reason for this action.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Reason (required)</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-[var(--radius-control)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--status-error)] transition-colors appearance-none"
            >
              <option value="" disabled>Select a reason...</option>
              {DELETION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Internal note (optional)</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Additional context for the log..."
              className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-[var(--radius-control)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--status-error)] transition-colors resize-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              disabled={isDeleting || !reason}
              className={buttonClasses({ variant: 'danger', size: 'lg', fullWidth: true })}
            >
              {isDeleting ? <Loader2 className="animate-spin" size={18} aria-label="Deleting" /> : "Delete permanently"}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className={buttonClasses({ variant: 'secondary', size: 'lg', fullWidth: true })}
            >
              Cancel
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}
