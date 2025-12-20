'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { 
  MessageCircle, Heart, HeartCrack, Share2, MoreHorizontal, 
  ShieldCheck, Loader2, Send, ExternalLink, X, AlertCircle, Trash2, ChevronDown 
} from 'lucide-react'
import { toast } from 'sonner' 
import { setReaction } from '@/actions/toggle-reaction'
import { deletePost } from '@/actions/delete-post' 
import { createComment } from '@/actions/create-comment' 
import { CommentItem } from '@/components/comments/CommentItem' 
import { PostEmbed } from './PostEmbed' 
import clsx from 'clsx'
import styles from './PostCard.module.css'

// --- HELPERS (FULL RESTORATION) ---
function formatTextWithLinks(text: string, previewUrl?: string | null) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
        if (previewUrl && part.includes(previewUrl)) return null; 
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline break-all relative z-10" onClick={(e) => e.stopPropagation()}>{part}</a>;
    }
    return part;
  });
}

function buildCommentTree(flatComments: any[]) {
    if (!flatComments) return [];
    const comments = JSON.parse(JSON.stringify(flatComments));
    const map = new Map();
    comments.forEach((c: any) => map.set(c.id, { ...c, replies: [] }));
    const roots: any[] = [];
    comments.forEach((c: any) => {
        if (c.parentId && map.has(c.parentId)) map.get(c.parentId).replies.push(map.get(c.id));
        else roots.push(map.get(c.id));
    });
    return roots;
}

const RoleBadge = ({ role }: { role: string }) => {
    if (!role || role === 'STANDARD' || role === 'USER') return null;
    let colorClass = role === 'ADMIN' ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-gray-400 bg-gray-500/10 border-gray-500/20"; 
    return <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md border ml-2 align-middle", colorClass)}>{role}</span>;
};

// --- MAIN COMPONENT ---
interface PostCardProps {
    post: any;
    initialReaction?: 'LIKE' | 'DISLIKE' | null;
    currentUserId?: string;
    isDemo?: boolean;
}

export function PostCard({ post, initialReaction, currentUserId, isDemo }: PostCardProps) {
  const [reaction, setReactionState] = useState(initialReaction)
  const [likesCount, setLikesCount] = useState(post._count?.likes || post.likesCount || 0)
  const [dislikesCount, setDislikesCount] = useState(post._count?.dislikes || post.dislikesCount || 0)
  const [showMenu, setShowMenu] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  // Comment State
  const [showComments, setShowComments] = useState(false) 
  const [commentText, setCommentText] = useState("")
  const [isSendingComment, setIsSendingComment] = useState(false)

  // Local comments state (Flat list for Optimistic UI)
  const [localComments, setLocalComments] = useState(post.comments || [])
  const [commentsCount, setCommentsCount] = useState(post._count?.comments || 0)

  // Post Actions State
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  // Derived State
  const commentTree = useMemo(() => buildCommentTree(localComments), [localComments]);
  const channelSlug = post.channel?.slug || 'home';

  // --- HANDLERS (FULL RESTORATION) ---
  const handleReaction = async (type: 'LIKE' | 'DISLIKE') => {
    if (reaction === type) {
        if (type === 'LIKE') setLikesCount((p: number) => Math.max(0, p - 1))
        else setDislikesCount((p: number) => Math.max(0, p - 1))
        setReactionState(null)
    } else {
        if (reaction === 'LIKE') setLikesCount((p: number) => Math.max(0, p - 1))
        else if (reaction === 'DISLIKE') setDislikesCount((p: number) => Math.max(0, p - 1))
        if (type === 'LIKE') setLikesCount((p: number) => p + 1)
        else setDislikesCount((p: number) => p + 1)
        setReactionState(type)
    }
    if (isDemo) { toast("Demo Mode: Reaction simulated"); return; }
    const formData = new FormData();
    formData.append('postId', post.id);
    formData.append('reactionType', type);
    formData.append('channelSlug', channelSlug); 
    await setReaction(formData)
  }

  const handleNewComment = (newComment: any) => {
      setLocalComments((prev: any) => {
          if (prev.some((c: any) => c.id === newComment.id)) return prev;
          return [...prev, newComment];
      });
      setCommentsCount((prev: number) => prev + 1);
  };

  const handleDeleteComment = (commentId: string) => {
      setLocalComments((prev: any) => prev.filter((c: any) => c.id !== commentId));
      setCommentsCount((prev: number) => Math.max(0, prev - 1));
  };

  const handleEditComment = (commentId: string, newContent: string) => {
      setLocalComments((prev: any) => prev.map((c: any) => 
          c.id === commentId ? { ...c, content: newContent } : c
      ));
  };

  const handleCreateCommentRoot = async () => {
      if (!commentText.trim() || isSendingComment) return;
      setIsSendingComment(true);
      const tempId = `temp-${Date.now()}`;
      if (isDemo) {
          await new Promise(r => setTimeout(r, 800)); 
          handleNewComment({
              id: tempId, content: commentText,
              author: { id: "guest", username: "guest_user", image: null, role: "USER" },
              createdAt: new Date().toISOString(), parentId: null, replies: []
          });
          setCommentText(""); setIsSendingComment(false); toast.success("Demo Comment Posted");
          return;
      }
      try {
          const formData = new FormData();
          formData.append('content', commentText);
          formData.append('postId', post.id);
          const result = await createComment(formData);
          if (result.success && result.comment) {
              handleNewComment({ ...result.comment, createdAt: new Date().toISOString(), replies: [] });
              setCommentText(""); 
          } else { toast.error(result.error || "Failed to post"); }
      } catch (e) { toast.error("Something went wrong"); } 
      finally { setIsSendingComment(false); }
  }

  const handleDeletePost = async () => { 
      if (isDemo) { toast.error("Disabled in Demo"); return; }
      setIsDeleting(true); 
      try {
          const res = await deletePost(post.id);
          if (res.success) { toast.success("Post deleted"); setIsDeleted(true); } 
          else { toast.error(res.error || "Failed"); setIsDeleting(false); }
      } catch (e) { toast.error("Error"); setIsDeleting(false); }
  }

  const mediaUrl = post.mediaUrl || (post.type === 'LINK' ? post.content.match(/(https?:\/\/[^\s]+)/)?.[0] : null);
  const hasEmbed = !!mediaUrl;

  if (isDeleted) return null;

  return (
    <div className={clsx(
        styles.cardContainer, 
        isDemo ? "w-full h-full" : "w-full max-w-[550px] mx-auto",
        showComments && styles.isExpanded
    )}>
      <div className={clsx(styles.cardInner, isFlipped && styles.flipped)}>

        {/* --- FRONT FACE --- */}
        <div className={styles.cardFront}> 
          {/* HEADER */}
          <div className={styles.header}>
            <div className={styles.authorInfo}>
                <Link href={`/profile/${post.author.username}`} className={styles.avatar}>
                    {post.author.image ? <img src={post.author.image} className="w-full h-full object-cover" /> : <span>{post.author.username?.[0]}</span>}
                </Link>
                <div>
                    <div className="flex items-center">
                        <Link href={`/profile/${post.author.username}`} className={styles.authorName}>@{post.author.username}</Link>
                        <RoleBadge role={post.author.role} />
                    </div>
                    <div className={styles.timestamp}>
                       <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                       {post.channel && (
                           <>
                               <span className="mx-1">•</span>
                               <Link href={`/channels/${post.channel.slug}`} className={styles.channelTag}>/c/{post.channel.slug}</Link>
                           </>
                       )}
                    </div>
                </div>
            </div>
            <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="text-[var(--text-muted)] hover:text-white">
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <MoreHorizontal size={18} />}
                </button>
                {showMenu && !isDemo && (
                     <div className={styles.dropdownMenu}>
                        {(currentUserId === post.author.id) && (
                            <button onClick={handleDeletePost} className="px-4 py-2 text-left text-xs hover:bg-red-500/10 text-red-400 flex items-center gap-2 w-full">
                                <Trash2 size={12} /> Delete Post
                            </button>
                        )}
                        <button onClick={() => setShowMenu(false)} className="px-4 py-2 text-left text-xs hover:bg-white/5 text-[var(--text-secondary)] w-full">Close</button>
                     </div>
                )}
            </div>
          </div>

          {/* MAIN BODY AREA (SCROLLABLE) */}
          <div className={styles.mainBodyArea}>
            <div className={styles.contentWrapper}>
                <div className={styles.content}> 
                    {formatTextWithLinks(post.content, mediaUrl)}
                </div>
            </div>
            {hasEmbed && <PostEmbed url={mediaUrl} fallbackData={post} />}
          </div>

          {/* ACTIONS FOOTER */}
          <div className={styles.footerActions}>
             <div className={styles.actionBar}>
                <button onClick={() => handleReaction('LIKE')} className={clsx(styles.actionBtn, reaction === 'LIKE' && styles.liked)}>
                    <Heart size={18} fill={reaction === 'LIKE' ? "currentColor" : "none"} />
                    <span>{likesCount}</span>
                </button>
                <button onClick={() => handleReaction('DISLIKE')} className={clsx(styles.actionBtn, reaction === 'DISLIKE' && styles.disliked)}>
                    <HeartCrack size={18} fill={reaction === 'DISLIKE' ? "currentColor" : "none"} />
                    <span>{dislikesCount}</span>
                </button>
                <button onClick={() => setShowComments(true)} className={styles.actionBtn}>
                    <MessageCircle size={18} />
                    <span>{commentsCount}</span>
                </button>
                <button className={styles.actionBtn}><Share2 size={18} /></button>
             </div>
             <button onClick={() => setIsFlipped(true)} className={clsx(styles.verifyChip, !post.isVerified && styles.unverified)}>
                {post.isVerified ? <ShieldCheck size={14} className="text-emerald-400" /> : <AlertCircle size={14} />}
                <span>{post.isVerified ? 'Verified' : 'Unverified'}</span>
             </button>
          </div>

          {/* 🟢 THE COMMENTS DRAWER */}
          <div className={clsx(styles.commentsDrawer, showComments && styles.drawerOpen)}>
              <div className={styles.drawerHandle} onClick={() => setShowComments(false)}>
                  <ChevronDown size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Comments ({commentsCount})</span>
              </div>
              <div className={styles.drawerList}>
                {commentTree.length > 0 ? commentTree.map((c: any) => (
                    <CommentItem 
                        key={c.id} comment={c} postId={post.id} channelSlug={channelSlug} postAuthorId={post.author.id} currentUserId={currentUserId}
                        onReply={handleNewComment} onDelete={handleDeleteComment} onEdit={handleEditComment}
                    />
                )) : <div className="text-center text-[var(--text-muted)] text-xs mt-12">No comments yet.</div>}
              </div>
              <div className={styles.drawerInputArea}>
                  <input className={styles.commentInput} placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateCommentRoot()} />
                  <button onClick={handleCreateCommentRoot} disabled={!commentText.trim() || isSendingComment} className={styles.sendBtn}>
                      {isSendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
              </div>
          </div>
        </div> 

        {/* --- BACK FACE (VERIFICATION LAYER) --- */}
        <div className={styles.cardBack}>
             <button onClick={() => setIsFlipped(false)} className={styles.absoluteCloseBtn}><X size={20} /></button>
             <div className={styles.verificationContainer}>
                <ShieldCheck size={48} className={clsx("mb-4", post.isVerified ? "text-emerald-400" : "text-[var(--text-muted)]")} />
                <h3 className="font-bold text-white text-lg">{post.isVerified ? "On-Chain Verified" : "Unverified Content"}</h3>
                <p className="text-sm text-[var(--text-muted)] text-center max-w-[80%] mt-2 mb-6">Cryptographically signed by the author.</p>
                {post.contentHash && (
                    <div className={styles.hashBox}>
                        <span className={styles.hashLabel}>Content Hash (SHA-256)</span>
                        <span className={styles.hashValue}>{post.contentHash}</span>
                    </div>
                )}
                {post.verificationTx && (
                    <a href={`https://optimistic.etherscan.io/tx/${post.verificationTx}`} target="_blank" rel="noopener noreferrer" className={styles.etherscanLink}>
                        View Transaction <ExternalLink size={12} />
                    </a>
                )}
             </div>
        </div>

      </div>
    </div>
  )
}

