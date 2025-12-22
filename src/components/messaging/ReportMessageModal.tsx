'use client'

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { reportMessage } from '@/actions/report-message';

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HATE_SPEECH', label: 'Hate Speech' },
  { value: 'VIOLENCE', label: 'Violence' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'COPYRIGHT_INFRINGEMENT', label: 'Copyright Infringement' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'OTHER', label: 'Other' },
];

interface ReportMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string | null;
}

export default function ReportMessageModal({ isOpen, onClose, messageId }: ReportMessageModalProps) {
  const [reason, setReason] = useState<string>('SPAM');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !messageId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('messageId', messageId);
    formData.append('reason', reason);
    formData.append('details', details);

    try {
      const result = await reportMessage({}, formData);
      if (result.success) {
        toast.success("Report submitted.");
        onClose();
        setDetails('');
        setReason('SPAM');
      } else {
        toast.error(result.message || "Failed to submit report.");
      }
    } catch (error) {
      toast.error("An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mb-3 text-red-400 border border-red-500/30">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Report Message</h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Help us keep the community safe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-2">Reason</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors appearance-none"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-2">Details (Optional)</label>
            <textarea 
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Provide more context..."
              className="w-full bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Submit Report"}
          </button>
        </form>

      </div>
    </div>,
    document.body
  );
}
