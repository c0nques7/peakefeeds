'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

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
      <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mb-3 text-red-400 border border-red-500/30">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Administrative Deletion</h2>
          <p className="text-zinc-400 text-sm mt-1">
            You are deleting content authored by another user. Please specify a reason for this action.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Reason for Deletion *</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors appearance-none"
            >
              <option value="" disabled>Select a reason...</option>
              {DELETION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Internal Comments (Optional)</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Additional context for the log..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              disabled={isDeleting || !reason}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={18} /> : "Delete Forever"}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-full bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-all"
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
