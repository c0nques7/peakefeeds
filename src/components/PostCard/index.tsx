'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Heart, Repeat, ShieldCheck, ShieldOff, X, Send, ChevronDown, ChevronUp, Trash, HeartCrack } from 'lucide-react'
import clsx from 'clsx'
import { deletePost } from '@/actions/delete-post' 
import { setReaction } from '@/actions/toggle-reaction' 
import { createComment } from '@/actions/create-comment'
import { CommentItem } from '../comments/CommentItem'
import { PostType } from '@prisma/client';
import styles from './PostCard.module.css' 

// --- Interfaces ---
interface Comment {
    id?: string;
    author?: { username: string | null };
    content?: string;
}

interface PostProps {
  post: {
    id: string
    title: string | null
    content: string
    type: PostType; 
    mediaUrl: string | null
    embedUrl?: string | null;
    contentHash?: string | null;
    isVerified?: boolean; 
    signature?: string | null;
    createdAt: Date
    author: { id: string; name: string | null; username: string | null; image?: string | null; }
    channel: { id: string; name: string; slug: string; creatorId: string; }
    comments?: Comment[] 
    _count?: { comments: number, likes: number }
    currentUserReaction?: 'LIKE' | 'DISLIKE' | null; 
  }
}

// 🧠 HELPER: Media Detection
function detectMedia(text: string | null): any {
    if (!text) return null;
    const ytMatch = text.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:\S+)?)/i);
    if (ytMatch) return { type: 'YOUTUBE', url: ytMatch[0] }; 
    const vidMatch = text.match(/(https?:\/\/\S+\.(?:mp4|webm|ogg))/i);
    if (vidMatch) return { type: 'VIDEO', url: vidMatch[0] };
    const imgMatch = text.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)|https?:\/\/(?:i\.imgur\.com|storage\.googleapis\.com|cdn\.\S+)\/\S+)/i);
    if (imgMatch) return { type: 'IMAGE', url: imgMatch[0] };
    return null;
}

// 🖼️ MEDIA RENDERER
function MediaPreview({ type, url }: { type: string, url: string | null }) {
    if (!url) return null;
    let embedUrl = url;
    let videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (videoIdMatch) embedUrl = videoIdMatch[1];

    if (type === 'YOUTUBE' && embedUrl) {
        return (
            <div className={styles.videoWrapper}>
                <iframe src={`https://www.youtube.com/embed/${embedUrl}?rel=0&modestbranding=1`} title="YouTube" allowFullScreen loading="lazy" />
            </div>
        );
    }
    if (type === 'IMAGE') {
        return (
            <div className="media-image-container">
                <img src={url} alt="Post Content" style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }} loading="lazy" />
            </div>
        );
    }
    return null;
}

// 🌳 HELPER: Build Comment Tree
function buildCommentTree(comments: any[]) {
    const map = new Map();
    const roots: any[] = [];
    comments.forEach(c => map.set(c.id, { ...c, replies: [] }));
    comments.forEach(c => {
        if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId).replies.push(map.get(c.id));
        } else {
            roots.push(map.get(c.id));
        }
    });
    return roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function PostCard({ post }: PostProps) {
  const [isFlipped, setIsFlipped] = useState(false) 
  const [showComments, setShowComments] = useState(false) 
  const [isExpanded, setIsExpanded] = useState(false) 
  const [showConfirm, setShowConfirm] = useState(false)
  
  // Optimistic Data
  const [reaction, setReactionState] = useState<'NONE' | 'LIKE' | 'DISLIKE'>(post.currentUserReaction || 'NONE')
  const [likesCount, setLikesCount] = useState(post._count?.likes || 0)
  
  const [commentText, setCommentText] = useState("") 
  const [isSending, setIsSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isPostVerified = post.isVerified || false;
  
  // Media Logic
  let mediaInfo = detectMedia(post.mediaUrl);
  if (!mediaInfo) { mediaInfo = detectMedia(post.content); }
  const displayType = mediaInfo?.type || post.type;
  const displayUrl = mediaInfo?.url || post.mediaUrl;
  
  let cleanContent = post.content;
  if (displayUrl) cleanContent = cleanContent.replace(displayUrl, '').trim(); 
  cleanContent = cleanContent.replace(/\s{2,}/g, ' ');

  // Tree Building
  const commentTree = post.comments ? buildCommentTree(post.comments) : [];

  // --- HANDLERS ---

  const handleSetReaction = async (e: React.MouseEvent, type: 'LIKE' | 'DISLIKE') => {
    e.stopPropagation();
    const previousReaction = reaction;
    const previousCount = likesCount;
    let newReaction: 'NONE' | 'LIKE' | 'DISLIKE' = type;
    let newCount = likesCount;

    if (previousReaction === type) {
        newReaction = 'NONE';
        if (type === 'LIKE') newCount = Math.max(0, newCount - 1);
    } else {
        if (type === 'LIKE') newCount = newCount + 1;
        else if (previousReaction === 'LIKE') newCount = Math.max(0, newCount - 1);
    }

    setReactionState(newReaction);
    setLikesCount(newCount);

    const formData = new FormData();
    formData.append('postId', post.id);
    formData.append('channelSlug', post.channel.slug);
    formData.append('reactionType', type);

    const result = await setReaction(formData);
    if (result.error) {
        setReactionState(previousReaction);
        setLikesCount(previousCount);
    }
  }

  async function handleSendComment() {
    if (!commentText.trim()) return;
    setIsSending(true);
    const formData = new FormData();
    formData.append('content', commentText);
    formData.append('postId', post.id);
    try {
        await createComment(formData); 
        setCommentText(""); 
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  }

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteError(null);
    setIsDeleting(true);
    setShowConfirm(false); 
    try {
        const result = await deletePost(post.id);
        if (result.error) setDeleteError(result.error);
    } catch (e) {
        setDeleteError("Network error.");
    } finally {
        setIsDeleting(false);
    }
  }

  const handleTextExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }

  const handleVerifyFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showComments) setIsFlipped(!isFlipped);
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowConfirm(true);
  }

  return (
    <div className={styles.cardContainer}>
      <div className={clsx(styles.cardInner, { [styles.flipped]: isFlipped })}>
        
        {/* === FRONT FACE === */}
        <div className={styles.cardFront}>
          <div className={styles.header}>
            <div className={styles.authorInfo}>
              <div className={styles.avatar}>{post.author.username?.[0]?.toUpperCase() || "U"}</div>
              <div>
                <span className={styles.authorName}>{post.author.username}</span>
                <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <Link href={`/channels/${post.channel.slug}`} className={styles.channelTag} onClick={(e) => e.stopPropagation()}>
              #{post.channel.slug}
          </Link>

          <div className={clsx(styles.contentWrapper, { [styles.expanded]: isExpanded, [styles.clamped]: !isExpanded })} onClick={handleTextExpand}>
            {post.title && <h3 className={styles.title}>{post.title}</h3>}
            <div onClick={(e) => e.stopPropagation()} className="media-preview-container">
                <MediaPreview type={displayType} url={displayUrl} />
            </div>
            {cleanContent.trim().length > 0 && <p className={styles.content}>{cleanContent}</p>}
            {!isExpanded && (cleanContent.trim().length > 150) && (
                <div className={styles.readMoreHint}><ChevronDown size={12} className="inline" /> Read More</div>
            )}
            {isExpanded && <div className={styles.readMoreHint}><ChevronUp size={12} className="inline" /> Show Less</div>}
          </div>
          
          <div className={styles.actionBar}>
            {/* LIKE BUTTON */}
            <button 
                className={clsx(styles.actionBtn, { [styles.liked]: reaction === 'LIKE' })} 
                onClick={(e) => handleSetReaction(e, 'LIKE')}
            >
              <Heart size={18} fill={reaction === 'LIKE' ? "currentColor" : "none"} />
              <span>{likesCount}</span>
            </button>

            {/* DISLIKE BUTTON */}
            <button 
                className={clsx(styles.actionBtn, { [styles.disliked]: reaction === 'DISLIKE' })} 
                onClick={(e) => handleSetReaction(e, 'DISLIKE')}
            >
              <HeartCrack size={18} fill={reaction === 'DISLIKE' ? "currentColor" : "none"} />
            </button>

            {/* COMMENT BUTTON */}
            <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setShowComments(true); }}>
              <MessageCircle size={18} />
              <span>{post.comments?.length || post._count?.comments || 0}</span>
            </button>

            <button className={styles.actionBtn}><Repeat size={18} /></button>
            
            <button 
                className={clsx(styles.actionBtn)} 
                onClick={handleConfirmDelete} 
                disabled={isDeleting}
                style={{ color: 'var(--text-muted)', marginLeft: 'auto', opacity: isDeleting ? 0.5 : 1 }}
            >
                <Trash size={18} />
            </button>
            
            <button 
                className={clsx(styles.verifyChip, { 'unverified': !isPostVerified })} 
                onClick={handleVerifyFlip}
                style={{ color: isPostVerified ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            >
                {isPostVerified ? <ShieldCheck size={14} /> : <ShieldOff size={14} style={{ color: 'var(--text-muted)' }} />}
                {isPostVerified ? 'Verified' : 'Unverified'}
            </button>
          </div>

          {showConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
                <div style={{ background: 'var(--glass-card)', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0, 0, 0, 0.4)', textAlign: 'center' }}>
                    <Trash size={32} style={{ color: 'red', margin: '0 auto 12px' }} />
                    <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Confirm Deletion</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>This cannot be undone.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <button onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--glass-card-hover)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleDeletePost} style={{ padding: '8px 16px', borderRadius: '8px', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer' }}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
                    </div>
                </div>
            </div>
          )}
          
          {/* 🆕 THEME-MATCHED COMMENT DRAWER */}
          <div className={clsx(
              styles.commentsPanel, 
              { [styles.commentsOpen]: showComments },
              // 1. Force background to match app background variable
              "bg-[var(--bg-app)]/95", 
              // 2. Heavy blur
              "backdrop-blur-xl",
              // 3. Ensure text uses main theme color (Black/White)
              "text-[var(--text-primary)]"
          )}>
              <div className={styles.panelHeader}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Comments</span>
                <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setShowComments(false); }}><X size={18} /></button>
              </div>

              <div className={styles.commentsList}>
                {commentTree.length > 0 ? (
                    commentTree.map((comment) => (
                        <CommentItem 
                            key={comment.id}
                            comment={comment}
                            postId={post.id}
                            channelSlug={post.channel.slug}
                        />
                    ))
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <MessageCircle size={24} style={{ marginBottom: '8px', opacity: 0.5 }} /> No comments yet.
                    </div>
                )}
              </div>

              {/* 🆕 MATCHING INPUT AREA */}
              <div className={clsx(
                  styles.inputArea,
                  "bg-[var(--bg-app)]/95 backdrop-blur-xl" // Match the drawer
              )}>
                  <input 
                    type="text" placeholder="Add a comment..." className={styles.commentInput}
                    value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    onClick={(e) => e.stopPropagation()} disabled={isSending}
                  />
                  <button onClick={(e) => { e.stopPropagation(); handleSendComment(); }} disabled={isSending} style={{ background: 'var(--accent-primary)', color: 'white', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer', opacity: isSending ? 0.5 : 1 }}>
                      {isSending ? <div style={{ height: '16px', width: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  </button>
              </div>
          </div>
        </div>

        {/* Back Face */}
        <div className={styles.cardBack}>
             <button className="absolute-close-btn" style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)' }} onClick={handleVerifyFlip}><X size={20} /></button>
             <div className={styles.verificationContainer}>
                {isPostVerified ? <ShieldCheck size={48} style={{ color: 'var(--accent-success)', marginBottom: '8px' }} /> : <ShieldOff size={48} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />}
                <h3 className="verify-title" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{isPostVerified ? 'Verified on Optimism' : 'Verification Pending'}</h3>
                <p className="verify-text" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px', padding: '0 24px' }}>{isPostVerified ? 'Cryptographically secured proof of origin.' : 'Proof is not yet secured on-chain.'}</p>
                {(post.contentHash || post.signature) && (
                    <div className={styles.hashBox}>
                        <span className={styles.hashLabel}>CONTENT HASH</span>
                        <span className={styles.hashValue}>{post.contentHash?.slice(0,30)}...</span>
                    </div>
                )}
                <a href="#" className={styles.etherscanLink}>View Transaction ↗</a>
             </div>
        </div>
      </div>
    </div>
  )
}