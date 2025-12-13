'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { 
  MessageCircle, Heart, Share2, MoreHorizontal, 
  ShieldCheck, Trash2, AlertCircle, X, Loader2, Send, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner' 
import { setReaction } from '@/actions/toggle-reaction'
import { deletePost } from '@/actions/delete-post' 
import { createComment } from '@/actions/create-comment' 
import { CommentItem } from '@/components/comments/CommentItem' 
import { PostEmbed } from './PostEmbed' // <--- NEW IMPORT
import clsx from 'clsx'
import styles from './PostCard.module.css'

// --- HELPERS ---

function formatTextWithLinks(text: string, previewUrl?: string | null) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
        // If this URL is the one being previewed, hide it to avoid duplication
        if (previewUrl && part.includes(previewUrl)) {
            return null; 
        }
        return (
            <a 
                key={i} 
                href={part} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[var(--accent-primary)] hover:underline break-all relative z-10" 
                onClick={(e) => e.stopPropagation()}
            >
                {part}
            </a>
        );
    }
    return part;
  });
}

function buildCommentTree(flatComments: any[]) {
    if (!flatComments) return [];
    const map = new Map();
    flatComments.forEach(c => map.set(c.id, { ...c, replies: [] }));
    const roots: any[] = [];
    flatComments.forEach(c => {
        if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId).replies.push(map.get(c.id));
        } else {
            roots.push(map.get(c.id));
        }
    });
    return roots;
}

const RoleBadge = ({ role }: { role: string }) => {
    if (!role || role === 'STANDARD' || role === 'USER') return null;
    let label = role;
    let colorClass = "text-gray-400 bg-gray-500/10 border-gray-500/20"; 
    switch (role) {
        case 'ADMIN': label = 'ADMIN'; colorClass = "text-red-400 bg-red-500/10 border-red-500/20"; break;
        case 'MODERATOR': label = 'MOD'; colorClass = "text-orange-400 bg-orange-500/10 border-orange-500/20"; break;
        case 'GOVERNMENT': label = 'OFFICIAL'; colorClass = "text-blue-400 bg-blue-500/10 border-blue-500/20"; break;
        case 'FACT_CHECKER': label = 'VERIFIER'; colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"; break;
        case 'INFLUENCER': label = 'CREATOR'; colorClass = "text-purple-400 bg-purple-500/10 border-purple-500/20"; break;
    }
    return <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md border ml-2 align-middle", colorClass)}>{label}</span>;
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
  const [showMenu, setShowMenu] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  
  // Comment State
  const [showComments, setShowComments] = useState(false) 
  const [commentText, setCommentText] = useState("")
  const [isSendingComment, setIsSendingComment] = useState(false)

  // Delete State
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false) 
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  const isOwner = currentUserId === post.author.id;
  
  const commentTree = useMemo(() => buildCommentTree(post.comments || []), [post.comments]);

  // --- HANDLERS ---

  const handleReaction = async (type: 'LIKE' | 'DISLIKE') => {
    if (reaction === type) {
        setReactionState(null)
        if(type === 'LIKE') setLikesCount((prev: number) => prev - 1)
    } else {
        if(reaction === 'LIKE') setLikesCount((prev: number) => prev - 1) 
        if(type === 'LIKE') setLikesCount((prev: number) => prev + 1)     
        setReactionState(type)
    }
    const formData = new FormData()
    formData.append('postId', post.id)
    formData.append('reactionType', type)
    formData.append('channelSlug', post.channel?.slug || 'home') 
    await setReaction(formData)
  }

  const handleCreateComment = async () => {
      if(!commentText.trim()) return;
      setIsSendingComment(true);
      
      const formData = new FormData();
      formData.append('content', commentText);
      formData.append('postId', post.id);
      
      await createComment(formData);
      
      setCommentText("");
      setIsSendingComment(false);
  }

  const handleDelete = async () => { 
      setIsConfirmingDelete(false); 
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

  // --- RENDER CHECKS ---
  
  // Identify URL. Prefer explicit mediaUrl, fallback to extracting first URL from body
  const mediaUrl = post.mediaUrl || (post.type === 'LINK' ? post.content.match(/(https?:\/\/[^\s]+)/)?.[0] : null);
  const hasEmbed = !!mediaUrl;

  if (isDeleted) return null;

  return (
    <div className={clsx(styles.cardContainer, isDeleting && "opacity-50 pointer-events-none")}>
      <div className={clsx(styles.cardInner, isFlipped && styles.flipped)}>
        
        {/* ================= FRONT FACE ================= */}
        <div className={styles.cardFront} style={{ overflow: 'visible' }}> 
          
          {/* DELETE OVERLAY */}
          {isConfirmingDelete && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm rounded-[20px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-3"><Trash2 size={24} /></div>
                <h3 className="text-white font-bold text-lg mb-6">Delete Post?</h3>
                <div className="flex gap-3 w-full">
                    <button onClick={() => setIsConfirmingDelete(false)} className="flex-1 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20">Cancel</button>
                    <button onClick={handleDelete} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600">Delete</button>
                </div>
            </div>
          )}

          {/* HEADER */}
          <div className={styles.header}>
            <div className={styles.authorInfo}>
                <Link href={`/profile/${post.author.username}`} className={styles.avatar}>
                    {post.author.image ? <img src={post.author.image} className="w-full h-full object-cover rounded-full" /> : <span>{post.author.username?.[0]}</span>}
                </Link>
                <div>
                    <div className="flex items-center">
                        <Link href={`/profile/${post.author.username}`} className={styles.authorName}>@{post.author.username}</Link>
                        <RoleBadge role={post.author.role} />
                        {isDemo && (
                            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md text-[var(--accent-primary)] bg-[var(--glass-card)] border border-[var(--glass-border)]">DEMO</span>
                        )}
                    </div>
                    <div className={styles.timestamp}>
                       <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                       {post.channel && <><span className="mx-1">•</span><Link href={`/channels/${post.channel.slug}`} className={styles.channelTag}>#{post.channel.slug}</Link></>}
                    </div>
                </div>
            </div>
            
            {/* ACTION MENU */}
            <div className="relative">
                <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-full hover:bg-white/5 transition-colors"
                >
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <MoreHorizontal size={18} />}
                </button>
                
                {showMenu && !isDeleting && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                        
                        <div className="absolute right-0 top-8 w-32 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-lg shadow-xl overflow-hidden z-20 backdrop-blur-xl">
                            {isOwner && (
                                <button 
                                    onClick={() => { setShowMenu(false); setIsConfirmingDelete(true); }} 
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer z-30"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            )}
                            <button className="w-full text-left px-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:bg-white/5 flex items-center gap-2 cursor-pointer z-30">
                                <AlertCircle size={14} /> Report
                            </button>
                        </div>
                    </>
                )}
            </div>
          </div>

          {/* CONTENT BODY */}
          <div className={styles.contentWrapper}>
              <div className={styles.content}>
                  {formatTextWithLinks(post.content, mediaUrl)}
              </div>
          </div>

          {/* MEDIA EMBED SYSTEM */}
          {hasEmbed && (
              <PostEmbed url={mediaUrl} fallbackData={post} />
          )}

          {/* ACTIONS FOOTER */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--glass-border)] mt-auto">
             <div className={styles.actionBar} style={{borderTop: 'none', marginTop: 0, paddingTop: 0}}>
                 <button onClick={() => handleReaction('LIKE')} className={clsx(styles.actionBtn, reaction === 'LIKE' && styles.liked)}>
                    <Heart size={18} fill={reaction === 'LIKE' ? "currentColor" : "none"} />
                    <span>{likesCount}</span>
                 </button>
                 <button onClick={() => setShowComments(true)} className={styles.actionBtn}>
                    <MessageCircle size={18} />
                    <span>{post._count?.comments || 0}</span>
                 </button>
                 <button className={styles.actionBtn}><Share2 size={18} /></button>
             </div>
             <button onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} className={clsx(styles.verifyChip, !post.isVerified && styles.unverified)}>
                {post.isVerified ? <><ShieldCheck size={14} className="text-emerald-400" /><span className="text-emerald-400">Verified</span></> : <><AlertCircle size={14} /><span>Unverified</span></>}
             </button>
          </div>

          {/* COMMENT DRAWER */}
          <div className={clsx(styles.commentsPanel, showComments && styles.commentsOpen)}>
              <div className={styles.panelHeader}>
                  <span className="font-bold text-sm">Comments ({post._count?.comments || 0})</span>
                  <button onClick={() => setShowComments(false)} className="text-[var(--text-muted)] hover:text-white"><X size={18}/></button>
              </div>
              
              <div className={styles.commentsList}>
                  {commentTree.length > 0 ? (
                      commentTree.map(c => (
                          <CommentItem 
                            key={c.id} 
                            comment={c}
                            postId={post.id}
                            channelSlug={post.channel?.slug || 'home'}
                            postAuthorId={post.author.id} 
                          />
                      ))
                  ) : (
                      <div className="text-center text-[var(--text-muted)] text-xs mt-8">No comments yet.</div>
                  )}
              </div>

              <div className={styles.inputArea}>
                  <input 
                    className={styles.commentInput} 
                    placeholder="Add to the discussion..." 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateComment()}
                  />
                  <button onClick={handleCreateComment} disabled={!commentText.trim() || isSendingComment} className={styles.sendBtn}>
                      {isSendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
              </div>
          </div>

        </div> 
        {/* ================= END FRONT FACE ================= */}

        {/* BACK FACE (METADATA) */}
        <div className={styles.cardBack}>
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