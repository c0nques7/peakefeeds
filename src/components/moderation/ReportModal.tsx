'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, AlertTriangle, CheckCircle2, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { submitReport } from '@/actions/report-actions';
import { blockUser } from '@/actions/block-user';
import { ReportTargetType } from '@prisma/client';

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HATE_SPEECH', label: 'Hate Speech' },
  { value: 'VIOLENCE', label: 'Violence' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'COPYRIGHT_INFRINGEMENT', label: 'Copyright Infringement' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'TRADEMARK_VIOLATION', label: 'Trademark Violation' },
  { value: 'OTHER', label: 'Other' },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string | null;
  targetType: ReportTargetType;
  title?: string;
}

export default function ReportModal({ isOpen, onClose, targetId, targetType, title }: ReportModalProps) {
  const [reason, setReason] = useState<string>('SPAM');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBlockPrompt, setShowBlockPrompt] = useState(false);
  const [reportedUserId, setReportedUserId] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const resetForm = () => {
    setDetails('');
    setReason('SPAM');
    setShowBlockPrompt(false);
    setShowSuccess(false);
    setReportId(null);
    setReportedUserId(null);
    setIsSubmitting(false);
    setIsBlocking(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  // Reset form whenever it opens or the target changes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, targetId]);

  if (!isOpen || !targetId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('targetId', targetId);
    formData.append('targetType', targetType);
    formData.append('reason', reason);
    formData.append('details', details);

    try {
      const result = await submitReport({}, formData);
      if (result.success) {
        setReportId(result.reportId || null);
        setReportedUserId(result.reportedUserId || null);
        setShowSuccess(true);
      } else {
        toast.error(result.message || "Failed to submit report.");
      }
    } catch (error) {
      toast.error("An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    if (!reportedUserId) return;
    setIsBlocking(true);

    const formData = new FormData();
    formData.append('userIdToBlock', reportedUserId);

    try {
      const result = await blockUser({}, formData);
      if (result.success) {
        toast.success("User blocked.");
        handleClose();
      } else {
        toast.error(result.message || "Failed to block user.");
      }
    } catch (error) {
      toast.error("An error occurred while blocking.");
    } finally {
      setIsBlocking(false);
    }
  };

  const displayTitle = title || `Report ${targetType.charAt(0) + targetType.slice(1).toLowerCase()}`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-full max-w-md bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition-colors touch-manipulation p-2 -m-2"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {showSuccess ? (
          <div className="text-center py-4 animate-in zoom-in-95 duration-300">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Report Successful</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              Thank you for helping us keep PeakeFeeds safe. Our moderators will review this shortly.
            </p>
            
            <div className="bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-2xl p-4 mb-8 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest">
                <Ticket size={12} /> Ticket ID
              </div>
              <code className="text-[var(--accent-primary)] font-mono text-lg font-bold select-all">
                {reportId || 'PENDING'}
              </code>
            </div>

            <div className="flex flex-col gap-3">
              {reportedUserId && (
                <button 
                  onClick={() => { setShowSuccess(false); setShowBlockPrompt(true); }}
                  className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 active:bg-zinc-300 transition-all flex items-center justify-center gap-2 touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Next: Security Options
                </button>
              )}
              <button 
                onClick={handleClose}
                className="w-full bg-[var(--glass-panel)] text-[var(--text-primary)] font-bold py-3 rounded-xl hover:bg-[var(--glass-panel-hover)] active:opacity-80 transition-all touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : !showBlockPrompt ? (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mb-3 text-red-400 border border-red-500/30">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{displayTitle}</h2>
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
                className="w-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Submit Report"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/20 mb-3 text-orange-400 border border-orange-500/30">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Block User?</h2>
            <p className="text-[var(--text-muted)] text-sm mt-2 mb-6">
              Would you also like to block the user associated with this {targetType.toLowerCase()}? They will no longer be able to interact with you.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleBlock}
                disabled={isBlocking}
                className="w-full bg-white text-black hover:bg-zinc-200 active:bg-zinc-300 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isBlocking ? <Loader2 className="animate-spin" size={18} /> : "Yes, Block User"}
              </button>
              <button 
                onClick={handleClose}
                disabled={isBlocking}
                className="w-full bg-[var(--glass-panel)] hover:bg-[var(--glass-panel-hover)] active:opacity-80 text-[var(--text-primary)] font-bold py-3 rounded-xl transition-all disabled:opacity-50 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                No, just close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}