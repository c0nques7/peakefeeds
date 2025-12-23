"use client";

import { useState, useTransition } from "react";
import { resolveReport, toggleLockContent } from "@/actions/admin-moderation";
import { PenaltyType } from "@prisma/client";
import { Check, AlertTriangle, Loader2, ShieldAlert, Lock, Unlock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
// Go up 4 levels: _components -> moderation -> admin -> (admin) -> app
import styles from "@/app/(admin)/admin/admin.module.css"; 

// Define a type that matches the shape returned by our Server Action
type ReportData = {
  id: string;
  reason: string;
  details: string | null;
  createdAt: Date;
  post?: {
    id: string;
    content: string;
    mediaUrl: string | null;
    isLocked?: boolean;
    author: { username: string | null; strikeCount: number };
    channel: { slug: string };
  } | null;
  message?: {
    id: string;
    content: string;
    sender: { username: string | null; strikeCount: number };
  } | null;
  comment?: {
    id: string;
    content: string;
    isLocked?: boolean;
    author: { username: string | null; strikeCount: number };
  } | null;
  channel?: {
    id: string;
    name: string;
    slug: string;
    isLocked?: boolean;
    creator: { username: string | null; strikeCount: number };
  } | null;
  reportedProfile?: {
    id: string;
    username: string | null;
    strikeCount: number;
    isLocked?: boolean;
  } | null;
  adId?: string | null;
  reporter: { username: string | null };
};

export function ModerationCard({ report }: { report: ReportData }) {
  const [isPending, startTransition] = useTransition();
  const [showPenaltyOptions, setShowPenaltyOptions] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  // ACTION: Dismiss (False Alarm)
  const handleDismiss = () => {
    startTransition(async () => {
      await resolveReport({ reportId: report.id, verdict: "DISMISS" });
    });
  };

  // ACTION: Lock Content
  const handleToggleLock = async () => {
    let targetId = '';
    let targetType: "POST" | "COMMENT" | "CHANNEL" | "USER" = "POST";
    let isCurrentlyLocked = false;

    if (report.post) {
      targetId = report.post.id;
      targetType = "POST";
      isCurrentlyLocked = !!report.post.isLocked;
    } else if (report.comment) {
      targetId = report.comment.id;
      targetType = "COMMENT";
      isCurrentlyLocked = !!report.comment.isLocked;
    } else if (report.channel) {
      targetId = report.channel.id;
      targetType = "CHANNEL";
      isCurrentlyLocked = !!report.channel.isLocked;
    } else if (report.reportedProfile) {
      targetId = report.reportedProfile.id;
      targetType = "USER";
      isCurrentlyLocked = !!report.reportedProfile.isLocked;
    }

    if (!targetId) return;

    setIsLocking(true);
    try {
      const res = await toggleLockContent({
        targetId,
        targetType,
        lockState: !isCurrentlyLocked
      });
      if (res.success) {
        toast.success(isCurrentlyLocked ? "Content unlocked" : "Content locked for review");
      } else {
        toast.error(res.error || "Failed to toggle lock");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsLocking(false);
    }
  };

  // ACTION: Punish
  const handlePenalize = (type: PenaltyType) => {
    if (!confirm(`Apply penalty: ${type}?`)) return;
    startTransition(async () => {
      await resolveReport({ 
        reportId: report.id, 
        verdict: "PENALIZE", 
        penaltyType: type 
      });
    });
  };

  if (isPending) {
    return (
      <div className={`${styles.glassPanel} p-8 flex items-center justify-center opacity-50 min-h-[300px]`}>
        <Loader2 className="animate-spin text-[var(--accent-primary)]" size={32} />
      </div>
    );
  }

  return (
    <div className={`${styles.glassPanel} flex flex-col h-full`}>
      {/* HEADER: The Accusation */}
      <div className="p-4 border-b border-[var(--glass-border)] flex justify-between items-start bg-red-500/5">
        <div>
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
            Reported for {report.reason.replace("_", " ")}
          </span>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            by @{report.reporter.username || "Anon"} • {new Date(report.createdAt).toLocaleDateString()}
          </p>
          {report.details && (
             <p className="mt-2 text-sm text-white italic border-l-2 border-red-500/30 pl-2">"{report.details}"</p>
          )}
        </div>
        <ShieldAlert className="text-red-400/50" size={20} />
      </div>

      {/* BODY: The Evidence (Reported Content) */}
      <div className="p-6 flex-1">
        {report.post ? (
          <div className="bg-[var(--bg-app)] p-4 rounded-lg border border-[var(--glass-border)] h-full relative group/evidence">
             <div className="flex justify-between mb-2 border-b border-[var(--glass-border)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--accent-primary)]">Post: @{report.post.author.username}</span>
                  <Link 
                    href={`/channels/${report.post.channel.slug}#post-${report.post.id}`} 
                    target="_blank"
                    className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                    title="View post in channel"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
                <span className="text-xs text-orange-400 font-mono">
                    {report.post.author.strikeCount} Previous Strikes
                </span>
             </div>
             <p className="text-white mb-4 whitespace-pre-wrap">{report.post.content}</p>
             {report.post.mediaUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-[var(--glass-border)] bg-black/20 relative">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img 
                      src={report.post.mediaUrl} 
                      alt="Evidence" 
                      loading="lazy"
                      className="w-full object-contain max-h-64 md:max-h-48" 
                    />
                </div>
             )}
          </div>
        ) : report.message ? (
          <div className="bg-[var(--bg-app)] p-4 rounded-lg border border-[var(--glass-border)] h-full">
             <div className="flex justify-between mb-2 border-b border-[var(--glass-border)] pb-2">
                <span className="font-bold text-[var(--accent-primary)]">Message: @{report.message.sender.username}</span>
                <span className="text-xs text-orange-400 font-mono">
                    {report.message.sender.strikeCount} Previous Strikes
                </span>
             </div>
             <p className="text-white mb-4 whitespace-pre-wrap">{report.message.content}</p>
          </div>
        ) : report.comment ? (
          <div className="bg-[var(--bg-app)] p-4 rounded-lg border border-[var(--glass-border)] h-full">
             <div className="flex justify-between mb-2 border-b border-[var(--glass-border)] pb-2">
                <span className="font-bold text-[var(--accent-primary)]">Comment: @{report.comment.author.username}</span>
                <span className="text-xs text-orange-400 font-mono">
                    {report.comment.author.strikeCount} Previous Strikes
                </span>
             </div>
             <p className="text-white mb-4 whitespace-pre-wrap">{report.comment.content}</p>
          </div>
        ) : report.channel ? (
          <div className="bg-[var(--bg-app)] p-4 rounded-lg border border-[var(--glass-border)] h-full">
             <div className="flex justify-between mb-2 border-b border-[var(--glass-border)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--accent-primary)]">Channel: {report.channel.name}</span>
                  <Link 
                    href={`/channels/${report.channel.slug}`}
                    target="_blank"
                    className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
                <span className="text-xs text-orange-400 font-mono">
                    Creator: @{report.channel.creator.username} ({report.channel.creator.strikeCount} strikes)
                </span>
             </div>
             <p className="text-white italic">Report filed against the entire channel.</p>
          </div>
        ) : report.adId ? (
          <div className="bg-[var(--bg-app)] p-4 rounded-lg border border-[var(--glass-border)] h-full">
             <div className="flex justify-between mb-2 border-b border-[var(--glass-border)] pb-2">
                <span className="font-bold text-[var(--accent-primary)]">Advertisement</span>
             </div>
             <p className="text-white">Ad ID: <span className="font-mono text-xs">{report.adId}</span></p>
             <p className="text-[var(--text-muted)] text-sm mt-2 italic">Reported from ad provider.</p>
          </div>
        ) : report.reportedProfile ? (
          <div className="bg-[var(--bg-app)] p-4 rounded-lg border border-[var(--glass-border)] h-full">
             <div className="flex justify-between mb-2 border-b border-[var(--glass-border)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--accent-primary)]">Profile: @{report.reportedProfile.username}</span>
                  <Link 
                    href={`/profile/${report.reportedProfile.username}`} 
                    target="_blank"
                    className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
                <span className="text-xs text-orange-400 font-mono">
                    {report.reportedProfile.strikeCount} Previous Strikes
                </span>
             </div>
             <p className="text-white italic">Direct profile report.</p>
          </div>
        ) : (
          <div className="text-[var(--text-muted)] italic flex items-center justify-center h-full bg-[var(--bg-app)] rounded-lg">
            Content unavailable or deleted.
          </div>
        )}
      </div>

      {/* FOOTER: The Gavel (Buttons) */}
      <div className="p-4 border-t border-[var(--glass-border)]">
        {!showPenaltyOptions ? (
          // View 1: Initial Choice
          <div className="flex flex-col gap-3">
             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleDismiss}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] text-[var(--text-muted)] hover:text-white transition-colors border border-[var(--glass-border)]"
                >
                  <Check size={16} /> Dismiss
                </button>
                <button 
                  onClick={() => setShowPenaltyOptions(true)}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                >
                  <AlertTriangle size={16} /> Punish
                </button>
             </div>
             
             {(report.post || report.comment || report.channel || report.reportedProfile) && (
               <button 
                 onClick={handleToggleLock}
                 disabled={isLocking}
                 className="flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 transition-colors w-full"
               >
                 {isLocking ? (
                   <Loader2 size={16} className="animate-spin" />
                 ) : (
                    // Logic to check if currently locked
                    (() => {
                      const isLocked = report.post?.isLocked || report.comment?.isLocked || report.channel?.isLocked || report.reportedProfile?.isLocked;
                      return isLocked ? <><Unlock size={16} /> Unlock Content</> : <><Lock size={16} /> Lock for Review</>;
                    })()
                 )}
               </button>
             )}
          </div>
        ) : (
          // View 2: Penalty Selection
          <div className="space-y-2 animate-in slide-in-from-bottom-2 fade-in">
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handlePenalize("WARNING")} className="text-xs py-2 bg-[var(--glass-panel)] rounded hover:bg-[var(--accent-primary)] hover:text-white transition-colors">Warning</button>
                <button onClick={() => handlePenalize("CONTENT_REMOVAL")} className="text-xs py-2 bg-[var(--glass-panel)] rounded hover:bg-orange-500 hover:text-white transition-colors">Remove Content</button>
                <button onClick={() => handlePenalize("STRIKE_2_SUSPENSION")} className="text-xs py-2 bg-[var(--glass-panel)] rounded hover:bg-red-500 hover:text-white transition-colors">Suspend (7d)</button>
                <button onClick={() => handlePenalize("PERMANENT_BAN")} className="text-xs py-2 bg-[var(--glass-panel)] rounded hover:bg-red-700 hover:text-white font-bold transition-colors">PERMA-BAN</button>
            </div>
            <button 
              onClick={() => setShowPenaltyOptions(false)}
              className="w-full text-center text-xs text-[var(--text-muted)] hover:text-white mt-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}