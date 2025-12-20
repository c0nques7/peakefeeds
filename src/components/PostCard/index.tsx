'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { 
  MessageCircle, Heart, HeartCrack, Share2, MoreHorizontal, 
  ShieldCheck, Loader2, Send, ExternalLink, X, AlertCircle, Trash2 
} from 'lucide-react'
import { toast } from 'sonner' 
import { setReaction } from '@/actions/toggle-reaction'
import { deletePost } from '@/actions/delete-post' 
import { createComment } from '@/actions/create-comment' 
import { CommentItem } from '@/components/comments/CommentItem' 
import { PostEmbed } from './PostEmbed' 
import clsx from 'clsx'
import styles from './PostCard.module.css'

// --- HELPERS ---
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
  
  // Local comments state (Flat list)
  const [localComments, setLocalComments] = useState(post.comments || [])
  const [commentsCount, setCommentsCount] = useState(post._count?.comments || 0)

  // Delete Post State
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  // Derived State
  const commentTree = useMemo(() => buildCommentTree(localComments), [localComments]);
  const channelSlug = post.channel?.slug || 'home';

  // --- HANDLERS ---
  
  const handleReaction = async (type: 'LIKE' | 'DISLIKE') => {
    if (reaction === type) {
        // Toggle OFF current reaction
        if (type === 'LIKE') {
            setLikesCount((prev: number) => Math.max(0, prev - 1))
        } else {
            setDislikesCount((prev: number) => Math.max(0, prev - 1))
        }
        setReactionState(null)
    } else {
        // Switch reaction or set for the first time
        if (reaction === 'LIKE') {
            setLikesCount((prev: number) => Math.max(0, prev - 1))
        } else if (reaction === 'DISLIKE') {
            setDislikesCount((prev: number) => Math.max(0, prev - 1))
        }

        if (type === 'LIKE') {
            setLikesCount((prev: number) => prev + 1)
        } else {
            setDislikesCount((prev: number) => prev + 1)
        }

        setReactionState(type)
    }

    if (isDemo) {
        toast("Demo Mode: Reaction simulated");
        return; 
    }
    const formData = new FormData()
    formData.append('postId', post.id)
    formData.append('reactionType', type)
    formData.append('channelSlug', channelSlug) 
    await setReaction(formData)
  }

  // 1. CREATE Handler
  const handleNewComment = (newComment: any) => {
      setLocalComments((prev: any) => {
          if (prev.some((c: any) => c.id === newComment.id)) return prev;
          return [...prev, newComment];
      });
      setCommentsCount((prev: number) => prev + 1);
  };

  // 2. DELETE Handler
  const handleDeleteComment = (commentId: string) => {
      setLocalComments((prev: any) => prev.filter((c: any) => c.id !== commentId));
      setCommentsCount((prev: number) => Math.max(0, prev - 1));
  };

  // 3. EDIT Handler
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
          const fakeComment = {
              id: tempId,
              content: commentText,
              author: { id: "guest", username: "guest_user", image: null, role: "USER" },
              createdAt: new Date().toISOString(),
              parentId: null,
              replies: []
          };
          handleNewComment(fakeComment);
          setCommentText("");
          setIsSendingComment(false);
          toast.success("Demo Comment Posted");
          return;
      }

      try {
          const formData = new FormData();
          formData.append('content', commentText);
          formData.append('postId', post.id);
          
          const result = await createComment(formData);
          
          if (result.success && result.comment) {
              const newComment = {
                  ...result.comment,
                  createdAt: new Date().toISOString(), 
                  replies: [] 
              };
              handleNewComment(newComment);
              setCommentText(""); 
          } else {
              toast.error(result.error || "Failed to post comment");
          }
      } catch (error) {
          toast.error("Something went wrong");
      } finally {
          setIsSendingComment(false);
      }
  }

  const handleDeletePost = async () => { 
      if (isDemo) {
          toast.error("Delete disabled in Demo Mode");
          return;
      }
      setIsDeleting(true); 
      try {
          const res = await deletePost(post.id);
          if (res.success) { 
              toast.success("Post deleted"); 
              setIsDeleted(true); 
          } else { 
              toast.error(res.error || "Failed to delete"); 
              setIsDeleting(false); 
          }
      } catch (e) { 
          toast.error("Error deleting post"); 
          setIsDeleting(false); 
      }
  }

  // --- RENDER ---
  const mediaUrl = post.mediaUrl || (post.type === 'LINK' ? post.content.match(/(https?:\/\/[^\s]+)/)?.[0] : null);
  const hasEmbed = !!mediaUrl;

  if (isDeleted) return null;

  return (
    <div className={clsx(
        styles.cardContainer, 
        isDemo ? "w-full h-full" : "w-full max-w-[550px] mx-auto",
        isDeleting && "opacity-50 pointer-events-none"
    )}>
      <div className={clsx(styles.cardInner, isFlipped && styles.flipped)}>
        
        {/* ================= FRONT FACE ================= */}
        <div className={clsx(styles.cardFront, isDemo && "h-full flex flex-col justify-between")} style={{ overflow: 'visible' }}> 
          
          {/* HEADER */}
          <div className={styles.header}>
            <div className={styles.authorInfo}>
                {/* 🟢 1. LINK TO PROFILE IMAGE */}
                <Link href={`/profile/${post.author.username}`} className={styles.avatar}>
                    {post.author.image ? <img src={post.author.image} className="w-full h-full object-cover rounded-full" /> : <span>{post.author.username?.[0]}</span>}
                </Link>
                <div>
                    <div className="flex items-center">
                        {/* 🟢 1. LINK TO PROFILE NAME */}
                        <Link href={`/profile/${post.author.username}`} className={styles.authorName}>
                            @{post.author.username}
                        </Link>
                        <RoleBadge role={post.author.role} />
                        {isDemo && <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md text-[var(--accent-primary)] bg-[var(--glass-card)] border border-[var(--glass-border)]">DEMO</span>}
                    </div>
                    <div className={styles.timestamp}>
                       <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                       
                       {/* 🟢 2. LINK TO CHANNEL */}
                       {post.channel && (
                           <>
                               <span className="mx-1">•</span>
                               <Link href={`/channels/${post.channel.slug}`} className={styles.channelTag}>
                                   /c/{post.channel.slug}
                               </Link>
                           </>
                       )}
                    </div>
                </div>
            </div>
            
            <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-full hover:bg-white/5 transition-colors">
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <MoreHorizontal size={18} />}
                </button>
                {showMenu && !isDemo && (
                     <div className="absolute right-0 top-8 w-32 bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                        {(currentUserId === post.author.id) && (
                            <button onClick={handleDeletePost} className="px-4 py-2 text-left text-xs hover:bg-red-500/10 text-red-400 flex items-center gap-2">
                                <Trash2 size={12} /> Delete Post
                            </button>
                        )}
                        <button onClick={() => setShowMenu(false)} className="px-4 py-2 text-left text-xs hover:bg-[var(--glass-card-hover)] text-[var(--text-secondary)]">
                            Close
                        </button>
                     </div>
                )}
            </div>
          </div>

          {/* CONTENT BODY */}
          <div className={clsx(styles.contentWrapper, "flex-1 flex flex-col justify-center")}>
              <div className={clsx(styles.content, isDemo && "text-lg")}> 
                  {formatTextWithLinks(post.content, mediaUrl)}
              </div>
          </div>

          {hasEmbed && <PostEmbed url={mediaUrl} fallbackData={post} />}

          {/* ACTIONS FOOTER */}
          <div className="flex flex-col gap-3 pt-3 border-t border-[var(--glass-border)] mt-auto">
             <div className={styles.actionBar} style={{borderTop: 'none', marginTop: 0, paddingTop: 0, width: '100%', justifyContent: 'center'}}>
                 <div className="flex gap-6">
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
             </div>
             
             <div className="flex justify-center w-full">
                <button onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} className={clsx(styles.verifyChip, !post.isVerified && styles.unverified)}>
                    {post.isVerified ? <><ShieldCheck size={14} className="text-emerald-400" /><span className="text-emerald-400">Verified</span></> : <><AlertCircle size={14} /><span>Unverified</span></>}
                </button>
             </div>
          </div>

          {/* COMMENT DRAWER */}
          <div className={clsx(styles.commentsPanel, showComments && styles.commentsOpen)}>
              <div className={styles.panelHeader}>
                  <span className="font-bold text-sm">Comments ({commentsCount})</span>
                  <button onClick={() => setShowComments(false)} className="text-[var(--text-muted)] hover:text-white"><X size={18}/></button>
              </div>
              
              <div className={styles.commentsList}>
                {commentTree.length > 0 ? commentTree.map((c: any, index: number) => (
                    <CommentItem 
                        key={c.id || `fallback-${index}`} 
                        comment={c} 
                        postId={post.id} 
                        channelSlug={channelSlug} 
                        postAuthorId={post.author.id}
                        currentUserId={currentUserId}
                        onReply={handleNewComment}
                        onDelete={handleDeleteComment}
                        onEdit={handleEditComment}
                    />
                )) : <div className="text-center text-[var(--text-muted)] text-xs mt-8">No comments yet.</div>}
              </div>

              <div className={styles.inputArea}>
                  <input 
                      className={styles.commentInput} 
                      placeholder={isDemo ? "Type a demo comment..." : "Add to the discussion..."} 
                      value={commentText} 
                      onChange={(e) => setCommentText(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateCommentRoot()} 
                  />
                  <button onClick={handleCreateCommentRoot} disabled={!commentText.trim() || isSendingComment} className={styles.sendBtn}>
                      {isSendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
              </div>
          </div>

        </div> 
        {/* ================= END FRONT FACE ================= */}

        {/* BACK FACE (METADATA) */}
        <div className={clsx(styles.cardBack, isDemo && "h-full")}>
             <button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }} className={styles.absoluteCloseBtn}><X size={20} /></button>
             <div className={styles.verificationContainer}>
                <ShieldCheck size={48} className={clsx("mb-4", post.isVerified ? "text-emerald-400" : "text-[var(--text-muted)]")} />
                <h3 className={styles.verifyTitle}>{post.isVerified ? "On-Chain Verification" : "Unverified Content"}</h3>
                <p className={styles.verifyText}>{post.isVerified ? "This content has been cryptographically signed and timestamped on the Optimism blockchain." : "This content lives off-chain and has not been cryptographically verified."}</p>
                {post.contentHash && <div className={styles.hashBox}><span className={styles.hashLabel}>Content Hash (SHA-256)</span><span className={styles.hashValue}>{post.contentHash}</span></div>}
                {post.signature && <div className={styles.hashBox}><span className={styles.hashLabel}>Author Signature</span><span className={styles.hashValue}>{post.signature}</span></div>}
                {post.verificationTx && <a href={`https://optimistic.etherscan.io/tx/${post.verificationTx}`} target="_blank" rel="noopener noreferrer" className={styles.etherscanLink}>View Transaction <ExternalLink size={12} /></a>}
             </div>
        </div>

      </div>
    </div>
  )
}