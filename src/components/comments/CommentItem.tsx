'use client'

import { useState, useMemo } from 'react'
import { useSession } from "next-auth/react" 
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { 
  Reply, Trash, Edit2, Send, MoreVertical, CornerDownRight, 
  X, Check, Loader2, ExternalLink, MessageCircle 
} from 'lucide-react'
import { createComment } from '@/actions/create-comment'
import { deleteComment, updateComment } from '@/actions/comment-actions'
import { toast } from 'sonner' 
import clsx from 'clsx'
import ReportModal from '../moderation/ReportModal'
import LockedOverlay from '../moderation/LockedOverlay'
import { ReportTargetType } from '@prisma/client'
import { Flag } from 'lucide-react'
import { MOD_TAG } from '@/lib/constants'

// --- HELPER: Embed Logic for Comments ---
const CommentEmbed = ({ url }: { url: string }) => {
  if (!url) return null;

  let type = 'external';
  
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || url.match(/(picsum\.photos|i\.imgur\.com)/)) {
      type = 'image';
  }
  else if (url.match(/(youtube\.com|youtu\.be)/)) type = 'youtube';
  else if (url.match(/(open\.spotify\.com)/)) type = 'spotify';
  else if (url.match(/(soundcloud\.com)/)) type = 'soundcloud';
  else if (url.match(/(instagram\.com)/)) type = 'instagram';
  else if (url.match(/(discord\.com|discord\.gg)/)) type = 'discord';

  // --- RENDERERS ---

  if (type === 'youtube') {
    const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|shorts\/)([^"&?\/\s]{11})/)?.[1];
    if (!videoId) return <GenericLinkCard url={url} />;
    return (
      <div className="mt-3 w-full max-w-[400px] overflow-hidden rounded-xl border border-[var(--glass-border)] bg-black aspect-video shadow-sm">
        <iframe 
          src={`https://www.youtube-nocookie.com/embed/${videoId}`} 
          className="w-full h-full" 
          allowFullScreen 
          allow="autoplay; encrypted-media" 
          style={{ border: 'none' }} 
        />
      </div>
    );
  }

  if (type === 'spotify') {
    const embedUrl = url.replace('open.spotify.com', 'open.spotify.com/embed');
    return (
        <div className="mt-3 w-full max-w-[400px]">
            <iframe 
              src={embedUrl} 
              width="100%" 
              height="80" 
              allow="encrypted-media" 
              className="rounded-xl shadow-sm bg-white/5" 
              style={{ border: 'none' }}
            />
        </div>
    );
  }

  if (type === 'soundcloud') {
    return (
      <div className="mt-3 w-full max-w-[400px]">
        <iframe 
          width="100%" 
          height="166" 
          scrolling="no" 
          allow="autoplay" 
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`} 
          className="rounded-xl border border-[var(--glass-border)]" 
          style={{ border: 'none' }}
        />
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className="mt-3 w-full max-w-[400px] rounded-xl overflow-hidden border border-[var(--glass-border)] shadow-sm relative group/image">
        <img 
            src={url} 
            alt="Comment attachment" 
            className="w-full h-auto object-cover max-h-[400px]" 
            loading="lazy" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>
    );
  }

  if (type === 'instagram') {
    const match = url.match(/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
    const postId = match ? match[1] : null;
    const handle = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/)?.[1];
    const label = handle ? `@${handle}` : "Instagram";

    return (
        <div className="w-full mt-3 relative z-10 max-w-[400px]">
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group block relative overflow-hidden rounded-xl border border-[var(--glass-border)] bg-gradient-to-br from-[#833ab4]/5 via-[#fd1d1d]/5 to-[#fcb045]/5 hover:from-[#833ab4]/10 hover:via-[#fd1d1d]/10 hover:to-[#fcb045]/10 transition-all"
            >
                <div className="flex items-center gap-3 p-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-tr from-[#ffc107] via-[#f44336] to-[#9c27b0] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                        <ExternalLink size={20} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {postId ? "View Post on Instagram" : "View Profile on Instagram"}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                            {label} • Click to open
                        </span>
                    </div>
                    <div className="ml-auto text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors">
                        <CornerDownRight size={14} />
                    </div>
                </div>
            </a>
        </div>
    );
  }

  if (type === 'discord') {
      return <GenericLinkCard url={url} icon={<MessageCircle className="text-[#5865F2]" size={18} />} label="Discord Invite" />;
  }

  return <GenericLinkCard url={url} />;
};

const GenericLinkCard = ({ url, icon, label }: any) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-3 p-2 pr-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-card)] hover:bg-[var(--glass-card-hover)] transition-colors max-w-md group/card">
        <div className="p-2 bg-[var(--glass-card-hover)] rounded-lg text-[var(--text-muted)] group-hover/card:text-[var(--accent-primary)] transition-colors">
            {icon || <ExternalLink size={16} />}
        </div>
        <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-[var(--text-primary)] truncate">{label || new URL(url).hostname}</span>
            <span className="text-[10px] text-[var(--text-muted)] truncate">{url}</span>
        </div>
    </a>
);

const ModBadge = ({ channelRole }: { channelRole: string | null }) => {
    if (!channelRole || (channelRole !== 'MODERATOR' && channelRole !== 'OWNER')) return null;
    return (
        <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded ml-1 align-middle tracking-tighter">
            {MOD_TAG}
        </span>
    );
};

// --- MAIN COMPONENT ---

interface CommentItemProps {
  comment: any; 
  postId: string;
  channelSlug: string;
  postAuthorId: string;
  // 🟢 ADDED: currentUserId to Interface to fix TypeScript error
  currentUserId?: string; 
  onReply?: (comment: any) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
}

export function CommentItem({ 
    comment, postId, channelSlug, postAuthorId, 
    // 🟢 Rename prop to 'propUserId' to merge with session ID logic
    currentUserId: propUserId, 
    onReply, onDelete, onEdit 
}: CommentItemProps) {
  const { data: session } = useSession();
  
  // 🟢 Priority: Use prop if passed (faster), otherwise fallback to session hook
  const currentUserId = propUserId || session?.user?.id;
  
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [replyText, setReplyText] = useState("");
  const [editText, setEditText] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const isCommentAuthor = currentUserId && (
      currentUserId === comment.authorId || 
      currentUserId === comment.author?.id
  );
  
  const isPostOwner = currentUserId === postAuthorId;
  const canEdit = isCommentAuthor; 
  const canDelete = isCommentAuthor || isPostOwner; 

  // Random border color based on ID
  const randomBorderClass = useMemo(() => {
      const colors = [
          'border-indigo-200 dark:border-indigo-400/50',
          'border-purple-200 dark:border-purple-400/50',
          'border-teal-200 dark:border-teal-400/50',
          'border-cyan-200 dark:border-cyan-400/50',
          'border-sky-200 dark:border-sky-400/50',
          'border-violet-200 dark:border-violet-400/50',
          'border-fuchsia-200 dark:border-fuchsia-400/50',
      ];
      // Fallback ID if missing
      const idStr = comment.id || "fallback";
      const index = idStr.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length;
      return colors[index];
  }, [comment.id]);

  // Extract URL for embedding
  const url = useMemo(() => {
    const content = comment?.content || "";
    const match = content.match(/(https?:\/\/[^\s]+)/g);
    return match ? match[0] : null;
  }, [comment.content]);

  // --- Handlers ---

  const handleReply = async () => {
    if (comment.isLocked) {
        toast.error("This comment is locked for review.");
        return;
    }
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('content', replyText);
    formData.append('postId', postId);
    formData.append('parentId', comment.id); 
    
    const res = await createComment(formData);
    
    if (res?.success && res.comment) {
        const newReply = { 
            ...res.comment, 
            createdAt: new Date().toISOString(), 
            replies: [] 
        };
        // 🟢 Update Parent State
        if (onReply) onReply(newReply);
        
        setReplyText("");
        setIsReplying(false);
    } else {
        toast.error(res?.error || "Failed to reply");
    }
    setIsSubmitting(false);
  };

  const handleUpdate = async () => {
    if (comment.isLocked) {
        toast.error("This comment is locked for review.");
        return;
    }
    if (!editText.trim() || editText === comment.content) {
        setIsEditing(false);
        return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('content', editText);
    formData.append('commentId', comment.id);

    const res = await updateComment(formData);

    if (res?.success) {
        // 🟢 Update Parent State
        if (onEdit) onEdit(comment.id, editText);
        toast.success("Comment updated");
        setIsEditing(false);
        setShowMenu(false);
    } else {
        toast.error(res?.error || "Failed to update comment");
    }
    setIsSubmitting(false);
  };

  const confirmDelete = async () => {
    if (comment.isLocked) {
        toast.error("This comment is locked for review.");
        return;
    }
    setIsSubmitting(true);
    const res = await deleteComment(comment.id);
    
    if (res?.success) {
        // 🟢 Update Parent State
        if (onDelete) onDelete(comment.id);
        toast.success("Comment deleted");
    } else {
        toast.error(res?.error || "Failed to delete");
    }
    
    setIsSubmitting(false);
    setShowDeleteConfirm(false);
  };

  // Helper to make links clickable
  const renderContent = (text: string) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) => 
        part.match(/^https?:\/\//) ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                {part}
            </a>
        ) : part
    );
  };

  return (
    <div className="flex gap-3 mb-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300 group/comment relative">
      {/* Avatar & Thread Line */}
      <div className="flex flex-col items-center">
         <Link href={`/profile/${comment.author?.username}`} className="w-8 h-8 rounded-full bg-[var(--glass-card-hover)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] shrink-0 overflow-hidden border border-[var(--glass-border)]">
            {comment.author?.image ? (
                <img src={comment.author.image} alt={comment.author.username} className="w-full h-full object-cover" />
            ) : (
                comment.author?.username?.[0]?.toUpperCase() || 'U'
            )}
         </Link>
         {comment.replies && comment.replies.length > 0 && (
             <div className="w-[2px] bg-[var(--glass-border)] flex-grow mt-2 rounded-full min-h-[20px]" />
         )}
      </div>

      <div className="flex-1 min-w-0">
        
        {/* BUBBLE CONTAINER */}
        <div className={clsx(
            "relative rounded-2xl p-3 border-2 group transition-colors duration-500",
            "bg-[var(--glass-card-hover)] overflow-visible",
            randomBorderClass
        )}>
            {comment.isLocked && <LockedOverlay className="rounded-2xl" />}
            
            {/* DELETE OVERLAY */}
            <div 
                className={clsx(
                    "absolute inset-0 z-20 flex items-center justify-between px-4 transition-all duration-300 rounded-2xl",
                    "bg-gradient-to-r from-red-600 to-red-500 dark:from-red-900 dark:to-red-800",
                    { 
                        'opacity-100 pointer-events-auto': showDeleteConfirm, 
                        'opacity-0 pointer-events-none': !showDeleteConfirm 
                    }
                )}
            >
                <span className="text-white font-bold text-sm">Delete this?</span>
                <div className="flex gap-2">
                    <button onClick={() => setShowDeleteConfirm(false)} className="p-1 rounded-full bg-black/20 text-white hover:bg-black/40"><X size={14}/></button>
                    <button onClick={confirmDelete} disabled={isSubmitting} className="p-1 rounded-full bg-white text-red-600 hover:bg-red-50 shadow-sm">
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                </div>
            </div>

            {/* HEADER */}
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                        @{comment.author?.username || 'user'}
                    </span>
                    <ModBadge channelRole={comment.author?.channelRole} />
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-muted)]">
                        {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'Just now'}
                    </span>
                    
                                {/* MENU TOGGLE */}
                    
                                {currentUserId && (
                    
                                    <div className="relative">
                    
                    
                            <button onClick={() => setShowMenu(!showMenu)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 -mr-1">
                                <MoreVertical size={14} />
                            </button>
                            
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)}/>
                                    
                                    <div className="absolute right-0 top-6 bg-[var(--glass-card)] shadow-xl border border-[var(--glass-border)] rounded-lg z-30 p-1 w-24 animate-in fade-in zoom-in-95 duration-100">
                                        {canEdit && (
                                            <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="flex items-center w-full px-2 py-1.5 text-xs hover:bg-[var(--glass-card-hover)] rounded text-[var(--text-primary)]">
                                                <Edit2 size={10} className="mr-2"/> Edit
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }} className="flex items-center w-full px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                                <Trash size={10} className="mr-2"/> Delete
                                            </button>
                                        )}
                                        {!isCommentAuthor && (
                                            <button onClick={() => { setReportModalOpen(true); setShowMenu(false); }} className="flex items-center w-full px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                                <Flag size={10} className="mr-2"/> Report
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content & Embed Logic */}
            {isEditing ? (
                <div className="mt-2">
                    <input aria-label="Edit comment" 
                        type="text" 
                        value={editText} 
                        onChange={(e) => setEditText(e.target.value)} 
                        className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => setIsEditing(false)} className="text-xs text-[var(--text-muted)] px-2 py-1 hover:text-[var(--text-primary)]">Cancel</button>
                        <button onClick={handleUpdate} disabled={isSubmitting} className="text-xs bg-[var(--btn-primary)] text-[var(--btn-primary-text)] px-2 py-1 rounded hover:bg-[var(--btn-primary-hover)] flex items-center gap-1">
                            {isSubmitting && <Loader2 size={10} className="animate-spin" />} Save
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-sm text-[var(--text-secondary)] break-words leading-relaxed whitespace-pre-wrap">
                        {renderContent(comment.content)}
                    </p>
                    
                    {/* RICH MEDIA EMBED */}
                    {url && <CommentEmbed url={url} />}
                </>
            )}

            {/* Reply Button */}
            {!isEditing && (
                <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-2 transition-colors">
                    <Reply size={12} /> Reply
                </button>
            )}
        </div>

        {/* Reply Input Form */}
        {isReplying && (
            <div className="flex items-center gap-2 mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <CornerDownRight size={14} className="text-[var(--text-muted)]" />
                <input aria-label="Write a reply" 
                    type="text" 
                    placeholder="Write a reply..." 
                    className="flex-1 min-w-0 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-lg py-1 px-2 text-xs focus:outline-none focus:border-[var(--accent-primary)] transition-colors shadow-sm placeholder:text-[var(--text-muted)]"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                    autoFocus
                />
                <button onClick={handleReply} disabled={isSubmitting} className="p-1 bg-[var(--btn-primary)] rounded-md text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] shadow-sm">
                    {isSubmitting ? <Loader2 size={12} className="animate-spin"/> : <Send size={12} />}
                </button>
            </div>
        )}

        {/* Recursive Child Rendering */}
        {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 pl-2">
                {comment.replies.map((reply: any) => (
                    <CommentItem 
                        key={reply.id} 
                        comment={reply} 
                        postId={postId}
                        channelSlug={channelSlug}
                        postAuthorId={postAuthorId}
                        currentUserId={currentUserId} // 🟢 Pass down recursively
                        onReply={onReply}   // Pass down
                        onDelete={onDelete} // Pass down
                        onEdit={onEdit}     // Pass down
                    />
                ))}
                        </div>
                    )}
                  </div>
            
                  <ReportModal 
                    isOpen={reportModalOpen}
                    onClose={() => setReportModalOpen(false)}
                    targetId={comment.id}
                    targetType={ReportTargetType.COMMENT}
                  />
                </div>
              )
            }
            