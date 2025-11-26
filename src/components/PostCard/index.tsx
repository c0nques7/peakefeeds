'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Heart, Repeat, ShieldCheck, ShieldOff, X, Send, ChevronDown, ChevronUp, Trash, HeartCrack } from 'lucide-react'
import clsx from 'clsx'
import { deletePost } from '@/actions/delete-post' 
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
    type: "TEXT" | "IMAGE" | "VIDEO" | "LINK" | "QUOTE" | "POLL" | "REPOST"
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
  }
}

// 🧠 HELPER: Simplified, reliable detection 
function detectMedia(text: string | null): any {
    if (!text) return null;
    
    // 1. YouTube (Matches the full link for removal later)
    const ytMatch = text.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:\S+)?)/i);
    if (ytMatch) return { type: 'YOUTUBE', url: ytMatch[0] }; 

    // 2. Images (Matches the full link)
    const imgMatch = text.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp))/i);
    if (imgMatch) return { type: 'IMAGE', url: imgMatch[0] };

    // 3. Direct Video (Matches the full link)
    const vidMatch = text.match(/(https?:\/\/\S+\.(?:mp4|webm|ogg))/i);
    if (vidMatch) return { type: 'VIDEO', url: vidMatch[0] };
    
    return null;
}

// 🖼️ MEDIA RENDERER
function MediaPreview({ type, url }: { type: string, url: string | null }) {
    if (!url) return null;
    
    let embedUrl = url;
    let videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (videoIdMatch) {
        embedUrl = videoIdMatch[1];
    }

    if (type === 'YOUTUBE' && embedUrl) {
        return (
            <div className={styles.videoWrapper}>
                <iframe 
                    src={`https://www.youtube.com/embed/${embedUrl}?rel=0&modestbranding=1`}
                    title="YouTube video player"
                    allowFullScreen
                    loading="lazy"
                />
            </div>
        );
    }
    if (type === 'IMAGE') {
        return (
            <div className="media-image-container">
                <img 
                    src={url} 
                    alt="Post Content" 
                    style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }}
                    loading="lazy"
                />
            </div>
        );
    }
    return null;
}

export function PostCard({ post }: PostProps) {
  const [isFlipped, setIsFlipped] = useState(false) 
  const [showComments, setShowComments] = useState(false) 
  const [isExpanded, setIsExpanded] = useState(false) 
  const [isLiked, setIsLiked] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState("") 
  const [isSending, setIsSending] = useState(false)

  const isPostVerified = post.isVerified || false;
  
  // --- Media Logic (URL Filtering) ---
  let mediaInfo = detectMedia(post.mediaUrl);
  if (!mediaInfo) { mediaInfo = detectMedia(post.content); }
  const displayType = mediaInfo?.type || post.type;
  const displayUrl = mediaInfo?.url || post.mediaUrl;
  
  let cleanContent = post.content;
  if (displayUrl) {
      cleanContent = cleanContent.replace(displayUrl, '').trim(); 
  }
  cleanContent = cleanContent.replace(/\s{2,}/g, ' ');
  // -----------------------------

  // --- Handlers ---
  const handleLike = (e: React.MouseEvent) => { e.stopPropagation(); setIsLiked(!isLiked) }
  const handleComments = (e: React.MouseEvent) => { e.stopPropagation(); setShowComments(true) }
  const handleVerifyFlip = (e: React.MouseEvent) => { e.stopPropagation(); if (!showComments) setIsFlipped(!isFlipped) }
  const handleTextExpand = (e: React.MouseEvent) => { e.stopPropagation(); setIsExpanded(!isExpanded) }

  const handleConfirmDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowConfirm(true);
  }

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteError(null);
    setIsDeleting(true);
    setShowConfirm(false); 

    try {
        const result = await deletePost(post.id);
        if (result.error) {
            console.error("Post deletion failed:", result.error);
            setDeleteError(result.error);
        }
    } catch (e) {
        setDeleteError("A network error occurred.");
    } finally {
        setIsDeleting(false);
    }
  }
  
  async function handleSendComment() {
    if (!commentText.trim()) return;
    setIsSending(true);
    try {
      // Placeholder for createComment
      setCommentText("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  }
  
  return (
    <div className={styles.cardContainer}>
      <div className={clsx(styles.cardInner, { [styles.flipped]: isFlipped })}>
        
        {/* === FRONT FACE === */}
        <div className={styles.cardFront}>
          
          {/* 1. Header (Author, Date) */}
          <div className={styles.header}>
            <div className={styles.authorInfo}>
              <div className={styles.avatar}>
                {post.author.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <span className={styles.authorName}>{post.author.username}</span>
                <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            {/* Removed the Menu container */}
          </div>
          
          {/* 2. Channel Tag (Positioned below date, above content) */}
          <Link href={`/channels/${post.channel.slug}`} className={styles.channelTag} onClick={(e) => e.stopPropagation()}>
              #{post.channel.slug}
          </Link>

          {/* 3. Content Area */}
          <div className={clsx(styles.contentWrapper, { [styles.expanded]: isExpanded, [styles.clamped]: !isExpanded })} onClick={handleTextExpand}>
            {post.title && <h3 className={styles.title}>{post.title}</h3>}
            
            {/* 🎥 MEDIA PREVIEW */}
            <div onClick={(e) => e.stopPropagation()} className="media-preview-container">
                <MediaPreview type={displayType} url={displayUrl} />
            </div>
            
            {/* Displaying clean content */}
            {cleanContent.trim().length > 0 && (
                <p className={styles.content}>
                    {cleanContent}
                </p>
            )}
            
            {/* Adjust read more logic to check cleanContent */}
            {!isExpanded && (cleanContent.trim().length > 150) && (
                <div className={styles.readMoreHint}><ChevronDown size={12} className="inline" /> Read More</div>
            )}
            {isExpanded && (
                <div className={styles.readMoreHint}><ChevronUp size={12} className="inline" /> Show Less</div>
            )}
          </div>
          
          {/* 4. Action Bar */}
          <div className={styles.actionBar}>
            <button className={clsx(styles.actionBtn, { "text-red-500": isLiked })} onClick={handleLike}>
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              <span>{post._count?.likes || 0}</span>
            </button>
            <button className={styles.actionBtn}>
              <HeartCrack size={18} />
            </button>
            <button className={styles.actionBtn} onClick={handleComments}>
              <MessageCircle size={18} />
              <span>{post.comments?.length || post._count?.comments || 0}</span>
            </button>
            <button className={styles.actionBtn}><Repeat size={18} /></button>
            
            {/* 🗑️ DELETE BUTTON */}
            <button 
                className={clsx(styles.actionBtn)} 
                onClick={handleConfirmDelete} 
                disabled={isDeleting}
                style={{ color: 'var(--text-muted)', marginLeft: 'auto', opacity: isDeleting ? 0.5 : 1 }}
            >
                <Trash size={18} />
            </button>
            
            {/* 🛡️ DUAL VERIFICATION CHIP */}
            <button 
                className={clsx(styles.verifyChip, { 'unverified': !isPostVerified })} 
                onClick={handleVerifyFlip}
                style={{ color: isPostVerified ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            >
                {isPostVerified ? 
                    <ShieldCheck size={14} /> : 
                    <ShieldOff size={14} style={{ color: 'var(--text-muted)' }} /> 
                }
                {isPostVerified ? 'Verified' : 'Unverified'}
            </button>
          </div>

          {/* DELETE CONFIRMATION MODAL */}
          {showConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
                <div style={{ background: 'var(--glass-card)', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0, 0, 0, 0.4)', textAlign: 'center' }}>
                    <Trash size={32} style={{ color: 'red', margin: '0 auto 12px' }} />
                    <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Confirm Deletion</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '16px' }}>Are you sure you want to delete this post? This cannot be undone.</p>
                    {deleteError && <p style={{ color: 'red', fontSize: '0.75rem', marginBottom: '12px' }}>Error: {deleteError}</p>}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                            style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--glass-card-hover)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleDeletePost}
                            style={{ padding: '8px 16px', borderRadius: '8px', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', opacity: isDeleting ? 0.5 : 1 }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                    </div>
                </div>
            </div>
          )}
          
          {/* COMMENT DRAWER (Styles inline for brevity) */}
          <div className={clsx(styles.commentsPanel, { [styles.commentsOpen]: showComments })}>
              <div className={styles.panelHeader}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Comments</span>
                <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setShowComments(false); }}><X size={18} /></button>
              </div>

              <div className={styles.commentsList}>
                {post.comments && post.comments.length > 0 ? (
                    post.comments.map((comment: any, i: number) => (
                        <div key={i} className={styles.commentItem}>
                            <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>@{comment.author?.username || 'user'}</span>
                            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>{comment.content}</p>
                        </div>
                    ))
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <MessageCircle size={24} style={{ marginBottom: '8px', opacity: 0.5 }} /> No comments yet.
                    </div>
                )}
              </div>

              <div className={styles.inputArea}>
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

        {/* === BACK FACE (Verification) === */}
        <div className={styles.cardBack}>
             <button className="absolute-close-btn" style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)' }} onClick={handleVerifyFlip}><X size={20} /></button>
             <div className={styles.verificationContainer}>
                {isPostVerified ? 
                    <ShieldCheck size={48} style={{ color: 'var(--accent-success)', marginBottom: '8px' }} /> : 
                    <ShieldOff size={48} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                }
                
                <h3 className="verify-title" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                    {isPostVerified ? 'Verified on Optimism' : 'Verification Pending'}
                </h3>
                <p className="verify-text" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px', padding: '0 24px' }}>
                    {isPostVerified ? 'Cryptographically secured proof of origin.' : 'Proof is not yet secured on-chain.'}
                </p>

                {(post.contentHash || post.signature) && (
                    <div className={styles.hashBox}>
                        <span className={styles.hashLabel}>CONTENT HASH</span>
                        <span className={styles.hashValue}>{post.contentHash?.slice(0,30)}...</span>
                        <span className={styles.hashLabel} style={{ marginTop: '12px' }}>SIGNATURE</span>
                        <span className={styles.hashValue}>{post.signature ? post.signature.slice(0, 10) + '...' : 'N/A'}</span>
                    </div>
                )}
                
                <a href="#" className={styles.etherscanLink}>View Transaction ↗</a>
             </div>
        </div>
      </div>
    </div>
  )
}