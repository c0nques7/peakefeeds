'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Heart, Repeat, ShieldCheck, Share2, X, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { createComment } from '@/actions/create-comment'
import styles from './PostCard.module.css'
import clsx from 'clsx'

// 1. Interfaces (Synchronized with Schema)
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
    type: string;
    
    // ✅ NEW: Fields added to the schema
    mediaUrl?: string | null;
    embedUrl?: string | null; // <--- ADDED
    contentHash?: string | null;
    isVerified?: boolean;
    signature?: string | null;
    
    createdAt: Date
    author: { id: string; name: string | null; username: string | null; image?: string | null; }
    channel: { id: string; name: string; slug: string; creatorId: string; }
    comments?: any[] 
    _count?: { comments: number, likes: number }
  }
}
// 2. Helper: Robustly extract YouTube ID for Embed URL (Moved from Server Action)
function getYouTubeEmbedUrl(url: string) {
    if (!url) return null;
    
    let videoId = '';

    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } 
    else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    }
    else if (url.includes('embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0];
    }

    if (videoId && videoId.length === 11) {
        // Adds necessary security parameters for iframe to load
        return `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1`;
    }
    return null;
}

export function PostCard({ post }: PostProps) {
  // --- States ---
  const [isFlipped, setIsFlipped] = useState(false) 
  const [showComments, setShowComments] = useState(false) 
  const [isExpanded, setIsExpanded] = useState(false) 
  const [isLiked, setIsLiked] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [isSending, setIsSending] = useState(false)

  // Determine Embed URL (Uses the clean URL saved by the Server Action)
  const embedUrl = (post.type === 'VIDEO' && post.embedUrl) // Check against the new embedUrl field
    ? post.embedUrl
    : null;

  // --- Handlers ---
  const handleLike = (e: React.MouseEvent) => { e.stopPropagation(); setIsLiked(!isLiked) }
  const handleComments = (e: React.MouseEvent) => { e.stopPropagation(); setShowComments(true) }
  const handleVerifyFlip = (e: React.MouseEvent) => { e.stopPropagation(); if (!showComments) setIsFlipped(!isFlipped) }
  const handleTextExpand = (e: React.MouseEvent) => { e.stopPropagation(); setIsExpanded(!isExpanded) }

  // 🚀 Comment Submission Logic
  async function handleSendComment() {
    if (!commentText.trim()) return;
    setIsSending(true);
    try {
        const formData = new FormData();
        formData.append('content', commentText);
        formData.append('postId', post.id);
        formData.append('channelSlug', post.channel.slug);

        const result = await createComment(formData);
        
        if (result.success) {
            setCommentText(""); // Clear on success
        } else {
             // Basic UI alert for comment failure
             alert("Failed to post comment: " + result.message);
        }
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
          
          <div className={styles.header}>
            <div className={styles.authorInfo}>
              <div className={styles.avatar}>{post.author.username?.[0]?.toUpperCase() || "U"}</div>
              <div>
                <span className={styles.authorName}>{post.author.username}</span>
                <p className="text-[10px] text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <Link href={`/channels/${post.channel.slug}`} className={styles.channelTag} onClick={(e) => e.stopPropagation()}>
              #{post.channel.slug}
            </Link>
          </div>

          {/* Content Area */}
          <div className={styles.contentWrapper} onClick={handleTextExpand}>
            {post.title && <h3 className={styles.title}>{post.title}</h3>}
            <p className={clsx(styles.content, { 
                'line-clamp-3': !isExpanded && post.mediaUrl, 
                'line-clamp-6': !isExpanded && !post.mediaUrl 
            })}>
                {post.content}
            </p>

            {/* 🖼️ MEDIA PLAYER */}
            {post.mediaUrl && (
    <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black relative shadow-sm">
        
        {/* IMAGE Rendering */}
        {post.type === 'IMAGE' && (
            <img src={post.mediaUrl} alt="Post content" className="w-full h-auto max-h-[500px] object-cover" loading="lazy" />
        )}

        {/* VIDEO Rendering */}
        {post.type === 'VIDEO' && (
            <div className="relative w-full aspect-video bg-black">
                {post.embedUrl ? ( // Use the PRE-CALCULATED embedUrl
                    <iframe
                        src={post.embedUrl}
                        className="absolute top-0 left-0 w-full h-full"
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    // Fallback for raw MP4 file links (uses original mediaUrl)
                    <video src={post.mediaUrl} className="w-full h-full object-contain" controls />
                )}
            </div>
        )}
        
        {/* LINK Rendering */}
        {post.type === 'LINK' && (
            <a href={post.mediaUrl} target="_blank" className="block p-4 bg-white/5 hover:bg-white/10 text-indigo-400 text-sm truncate">
                {post.mediaUrl}
            </a>
        )}
    </div>
)}
            
            {!isExpanded && (post.content.length > 150) && (
                <div className={styles.readMoreHint}><ChevronDown size={12} className="inline" /> Read More</div>
            )}
          </div>
          
          <div className={styles.actionBar}>
            <button className={clsx(styles.actionBtn, { "text-red-500": isLiked })} onClick={handleLike}>
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              <span>{post._count?.likes || 0}</span>
            </button>
            <button className={styles.actionBtn} onClick={handleComments}>
              <MessageCircle size={18} />
              <span>{post.comments?.length || post._count?.comments || 0}</span>
            </button>
            <button className={styles.actionBtn}><Repeat size={18} /></button>
            <button className={styles.verifyChip} onClick={handleVerifyFlip}><ShieldCheck size={14} /> Verified on Eth</button>
          </div>

          {/* Comments Drawer */}
          <div className={clsx(styles.commentsPanel, { [styles.commentsOpen]: showComments })}>
              <div className={styles.panelHeader}>
                  <span className="font-bold text-sm">Comments</span>
                  <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setShowComments(false); }}><X size={18} /></button>
              </div>
              <div className={styles.commentsList}>
                 {post.comments && post.comments.length > 0 ? (
                    post.comments.map((comment: any, i: number) => (
                        <div key={i} className={styles.commentItem}>
                            <span className="text-indigo-400 text-xs font-bold block mb-1">@{comment.author?.username || 'user'}</span>
                            <p className="text-sm opacity-90">{comment.content}</p>
                        </div>
                    ))
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                        <MessageCircle size={24} className="mb-2 opacity-50" /> No comments yet.
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
                  <button onClick={(e) => { e.stopPropagation(); handleSendComment(); }} disabled={isSending} className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-500 disabled:opacity-50">
                      {isSending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                  </button>
              </div>
          </div>
        </div>

        {/* Back Face */}
        <div className={styles.cardBack}>
             <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={handleVerifyFlip}><X size={20} /></button>
             <div className={styles.verificationContainer}>
                <ShieldCheck size={48} className="text-emerald-500 mb-2" />
                <h3 className={styles.verifyTitle}>Verified on Optimism</h3>
                <p className={styles.verifyText}>Cryptographically secured proof of origin.</p>
                <div className={styles.hashBox}>
                    <span className={styles.hashLabel}>CONTENT HASH</span>
                    <span className={styles.hashValue}>{post.contentHash?.slice(0,30)}...</span>
                    <span className={`${styles.hashLabel} mt-3`}>SIGNATURE</span>
                    <span className={styles.hashValue}>0x129d...f8e2</span>
                </div>
                <a href="#" className={styles.etherscanLink}>View Transaction ↗</a>
             </div>
        </div>
      </div>
    </div>
  )
}

