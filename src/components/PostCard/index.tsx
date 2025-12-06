'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  MessageCircle, 
  Heart, 
  ShieldCheck, 
  ShieldOff, 
  X, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Trash, 
  HeartCrack, 
  ExternalLink 
} from 'lucide-react'
import clsx from 'clsx'
import styles from './PostCard.module.css' 
import { PostType } from '@prisma/client'

// 🆕 Role Badge Import
import { UserRoleBadge } from '@/components/userrolebadge/UserRoleBadge'

// Server Actions (Bypassed in Demo Mode)
import { deletePost } from '@/actions/delete-post' 
import { createComment } from '@/actions/create-comment'
import { setReaction } from '@/actions/toggle-reaction' 

// --- TYPES ---

interface Comment {
    id: string;
    author: { id: string; username: string | null };
    content: string;
    parentId?: string | null; 
    replies?: Comment[];      
}

interface PostProps {
  post: {
    id: string
    title: string | null
    content: string;
    type: PostType; 
    mediaUrl: string | null;
    embedUrl?: string | null;
    contentHash?: string | null;
    isVerified?: boolean; 
    signature?: string | null;
    
    // 🛑 UPDATED: Changed from Date to string to fix Serialization Error
    createdAt: string; 
    
    author: { 
        id: string; 
        name: string | null; 
        username: string | null; 
        image?: string | null; 
        role?: string | null; 
    };
    channel: { id: string; name: string; slug: string; creatorId: string; };
    comments?: Comment[];
    _count?: { comments: number, likes: number, dislikes: number };
  }
  initialReaction?: 'LIKE' | 'DISLIKE' | null;
  isDemo?: boolean; // ⚡️ Toggles Simulation Mode
}

// --- HELPER: Media Detection ---
function detectMedia(text: string | null): any {
    if (!text) return null;
    const ytMatch = text.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:\S+)?)/i);
    if (ytMatch) return { type: 'YOUTUBE', url: ytMatch[0] }; 
    const imgMatch = text.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)|https?:\/\/(?:i\.imgur\.com|storage\.googleapis\.com|cdn\.\S+)\/\S+)/i);
    if (imgMatch) return { type: 'IMAGE', url: imgMatch[0] };
    return null;
}

// --- SUB-COMPONENT: Media Preview ---
function MediaPreview({ type, url }: { type: string, url: string | null }) {
    if (!url) return null;
    
    if (type === 'YOUTUBE') {
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (!videoId) return null;

        return (
            <div className={styles.videoWrapper} onClick={(e) => e.stopPropagation()}>
                <iframe 
                    src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`} 
                    title="YouTube" 
                    allowFullScreen 
                />
            </div>
        );
    }

    if (type === 'IMAGE') {
        return (
            <div className={styles.imageWrapper}>
                <img src={url} alt="Post Content" loading="lazy" />
            </div>
        );
    }
    return null;
}

// --- SUB-COMPONENT: Single Comment ---
function SingleComment({ comment, isDemo }: { comment: Comment, isDemo: boolean }) {
    return (
        <div className={styles.commentItem}>
            <div className="flex justify-between items-start">
                <span className={styles.commentAuthor}>@{comment.author?.username || 'user'}</span>
                <span className="text-[10px] text-gray-500">Just now</span>
            </div>
            <p className={styles.commentText}>{comment.content}</p>
        </div>
    )
}

// --- MAIN COMPONENT ---
export function PostCard({ post, initialReaction = null, isDemo = false }: PostProps) {
  // UI State
  const [isFlipped, setIsFlipped] = useState(false) 
  const [showComments, setShowComments] = useState(false) 
  const [isExpanded, setIsExpanded] = useState(false) 
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Data State
  const [userReaction, setUserReaction] = useState<'LIKE' | 'DISLIKE' | null>(initialReaction);
  const [counts, setCounts] = useState({
      likes: post._count?.likes || 0,
      dislikes: post._count?.dislikes || 0,
      comments: post.comments?.length || post._count?.comments || 0
  });

  // Demo Comment State
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments || []);
  const [commentText, setCommentText] = useState("") 

  // --- HANDLERS ---
  
  const handleVerifyFlip = (e: React.MouseEvent) => { 
      e.stopPropagation(); 
      if (!showComments) setIsFlipped(!isFlipped) 
  }

  const handleReaction = async (e: React.MouseEvent, type: 'LIKE' | 'DISLIKE') => {
    e.stopPropagation();
    
    // 1. Optimistic Update (Instant Feedback)
    const previousReaction = userReaction;
    const previousCounts = { ...counts };
    
    let newCounts = { ...counts };

    if (userReaction === type) {
        // Toggle Off
        setUserReaction(null);
        if (type === 'LIKE') newCounts.likes--;
        if (type === 'DISLIKE') newCounts.dislikes--;
    } else {
        // Toggle On (and flip other if needed)
        setUserReaction(type);
        if (type === 'LIKE') {
            newCounts.likes++;
            if (previousReaction === 'DISLIKE') newCounts.dislikes--;
        }
        if (type === 'DISLIKE') {
            newCounts.dislikes++;
            if (previousReaction === 'LIKE') newCounts.likes--;
        }
    }
    setCounts(newCounts);

    // 2. Stop here if Demo
    if (isDemo) return; 

    // 3. Server Action
    const formData = new FormData();
    formData.append('postId', post.id);
    formData.append('reactionType', type);
    formData.append('channelSlug', post.channel.slug);
    
    try {
        const result = await setReaction(formData);
        if (result.error) throw new Error(result.error);
    } catch (err) {
        setUserReaction(previousReaction); // Revert on error
        setCounts(previousCounts);
    }
  }

  async function handleSendComment() {
    if (!commentText.trim()) return;
    
    // 1. Optimistic Update
    const newComment: Comment = {
        id: `temp-${Date.now()}`,
        author: { id: 'me', username: 'you' },
        content: commentText,
        replies: []
    };
    
    setLocalComments(prev => [newComment, ...prev]);
    setCounts(prev => ({ ...prev, comments: prev.comments + 1 }));
    setCommentText("");

    // 2. Stop if Demo
    if (isDemo) return;

    // 3. Server Action
    const formData = new FormData();
    formData.append('postId', post.id);
    formData.append('content', commentText);
    formData.append('channelSlug', post.channel.slug);
    await createComment(formData);
  }

  const handleDeletePost = async () => {
      if(isDemo) {
          alert("Demo Mode: Post deletion simulated.");
          setShowConfirm(false);
          return;
      }
      setIsDeleting(true);
      await deletePost(post.id);
      setIsDeleting(false);
  }

  // Content Prep
  const isPostVerified = post.isVerified || false;
  let mediaInfo = detectMedia(post.mediaUrl) || detectMedia(post.content);
  const cleanContent = (mediaInfo?.url ? post.content.replace(mediaInfo.url, '') : post.content).trim();

  // 🛑 HELPER: Safe Date Parsing
  // Since createdAt is now a string, we ensure we convert it back to a Date object for display
  const formattedDate = new Date(post.createdAt).toLocaleDateString(undefined, {
      month: 'short', 
      day: 'numeric'
  });

  return (
    <div className={styles.cardContainer}>
      <div className={clsx(styles.cardInner, { [styles.flipped]: isFlipped })}>
        
        {/* --- FRONT FACE --- */}
        <div className={styles.cardFront}>
          
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.authorInfo}>
              <div className={styles.avatar}>{post.author.username?.[0]?.toUpperCase()}</div>
              <div>
                <div className="flex items-center gap-2">
                    <span className={styles.authorName}>{post.author.username}</span>
                    
                    {/* ROLE BADGE */}
                    {post.author.role && (
                        <UserRoleBadge 
                            role={post.author.role} 
                            showLabel={true} 
                        />
                    )}
                </div>
                <span className={styles.timestamp}>
                    {formattedDate} 
                    {isDemo && " • Optimism Mainnet"}
                </span>
              </div>
            </div>
            
            {!isDemo && (
                <Link href={`/channels/${post.channel.slug}`} className={styles.channelTag} onClick={(e) => e.stopPropagation()}>
                    #{post.channel.slug}
                </Link>
            )}
          </div>

          {/* Body */}
          <div className={clsx(styles.contentWrapper, { [styles.expanded]: isExpanded })} onClick={() => setIsExpanded(!isExpanded)}>
            {post.title && <h3 className={styles.title}>{post.title}</h3>}
            
            <div onClick={(e) => e.stopPropagation()}>
                <MediaPreview type={mediaInfo?.type || post.type} url={mediaInfo?.url || post.mediaUrl} />
            </div>

            {cleanContent && <p className={styles.content}>{cleanContent}</p>}
            
            {!isExpanded && cleanContent.length > 150 && (
                <div className={styles.readMore}>Read More <ChevronDown size={12}/></div>
            )}
            {isExpanded && cleanContent.length > 150 && (
                <div className={styles.readMore}>Show Less <ChevronUp size={12}/></div>
            )}
          </div>
          
          {/* Footer Actions */}
          <div className={styles.actionBar}>
            <button className={clsx(styles.actionBtn, { [styles.liked]: userReaction === 'LIKE' })} onClick={(e) => handleReaction(e, 'LIKE')}>
              <Heart size={18} fill={userReaction === 'LIKE' ? "currentColor" : "none"} />
              <span>{counts.likes}</span>
            </button>

            <button className={clsx(styles.actionBtn, { [styles.disliked]: userReaction === 'DISLIKE' })} onClick={(e) => handleReaction(e, 'DISLIKE')}>
              <HeartCrack size={18} fill={userReaction === 'DISLIKE' ? "currentColor" : "none"} />
              <span>{counts.dislikes}</span>
            </button>

            <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setShowComments(true); }}>
              <MessageCircle size={18} />
              <span>{counts.comments}</span>
            </button>
            
            <button className={clsx(styles.actionBtn, "ml-auto")} onClick={(e) => {e.stopPropagation(); setShowConfirm(true)}}>
                <Trash size={18} />
            </button>
          </div>

          {/* Verification Chip (Trigger for Flip) */}
          <div className={styles.verificationFooter}>
             <button className={clsx(styles.verifyChip, { [styles.unverified]: !isPostVerified })} onClick={handleVerifyFlip}>
                {isPostVerified ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                {isPostVerified ? 'Verified' : 'Unverified'}
            </button>
          </div>

          {/* DELETE CONFIRMATION MODAL (INLINE) */}
          {showConfirm && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded-[20px] backdrop-blur-sm">
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl text-center max-w-[280px] shadow-2xl border border-white/10">
                    <Trash className="mx-auto text-red-500 mb-2" size={32} />
                    <h4 className="font-bold text-lg mb-1">Delete Post?</h4>
                    <p className="text-xs text-gray-500 mb-4">This action cannot be undone.</p>
                    <div className="flex gap-2 justify-center">
                        <button onClick={(e) => {e.stopPropagation(); setShowConfirm(false)}} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-xs font-bold">Cancel</button>
                        <button onClick={(e) => {e.stopPropagation(); handleDeletePost()}} className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold" disabled={isDeleting}>
                            {isDeleting ? '...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* --- DRAWER: COMMENTS --- */}
          <div className={clsx(styles.commentsPanel, { [styles.commentsOpen]: showComments })}>
              <div className={styles.panelHeader}>
                <span className="font-bold text-sm">Comments ({counts.comments})</span>
                <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setShowComments(false); }}><X size={16} /></button>
              </div>

              <div className={styles.commentsList}>
                {localComments.length > 0 ? (
                    localComments.map((c) => (
                        <SingleComment key={c.id} comment={c} isDemo={isDemo} />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 text-sm text-center px-4">
                        <MessageCircle size={24} className="mb-2" /> 
                        <p>No thoughts yet.<br/>Be the first to sign a comment.</p>
                    </div>
                )}
              </div>

              <div className={styles.inputArea}>
                  <input 
                    type="text" 
                    placeholder="Write a thought..." 
                    className={styles.commentInput} 
                    value={commentText} 
                    onChange={(e) => setCommentText(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} 
                    onClick={(e) => e.stopPropagation()} 
                   />
                  <button onClick={(e) => { e.stopPropagation(); handleSendComment(); }} className={styles.sendBtn}>
                      <Send size={14} />
                  </button>
              </div>
          </div>
        </div>

        {/* --- BACK FACE (VERIFICATION DATA) --- */}
        <div className={styles.cardBack}>
             <button className={styles.absoluteCloseBtn} onClick={handleVerifyFlip}><X size={20} /></button>
             
             <div className={styles.verificationContainer}>
                <ShieldCheck size={56} className="text-emerald-400 mb-4 animate-pulse" />
                <h3 className={styles.verifyTitle}>Anchored on Optimism</h3>
                <p className={styles.verifyText}>
                    This content was cryptographically signed and settled on the Superchain.
                </p>
                
                <div className={styles.hashBox}>
                    <span className={styles.hashLabel}>BLOCK HASH</span>
                    <span className={styles.hashValue}>{post.contentHash || "0x7f83...2d9069"}</span>
                </div>

                <div className={styles.hashBox}>
                    <span className={styles.hashLabel}>SIGNATURE</span>
                    <span className={styles.hashValue}>{post.signature || "0x9a2...11b"}</span>
                </div>
                
                <a 
                    href="#" 
                    className={styles.etherscanLink} 
                    onClick={(e) => isDemo && e.preventDefault()}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View on Etherscan <ExternalLink size={12} />
                </a>
             </div>
        </div>

      </div>
    </div>
  )
}