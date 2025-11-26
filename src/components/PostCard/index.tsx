'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Heart, Repeat, ShieldCheck, Share2, X, Send, ChevronDown, ChevronUp, Play, ExternalLink } from 'lucide-react'
import styles from './PostCard.module.css'
import clsx from 'clsx'

interface PostProps {
  post: {
    id: string
    title: string | null
    content: string
    type: "TEXT" | "IMAGE" | "VIDEO" | "LINK" | "QUOTE" | "POLL" | "REPOST"
    mediaUrl: string | null
    createdAt: Date
    author: { name: string | null; username: string | null }
    channel: { name: string; slug: string }
    comments?: { id?: string; author?: { username: string }; content?: string }[]
    _count?: { comments: number, likes: number }
  }
}

// 🧠 HELPER: Simplified, reliable detection
function detectMedia(text: string | null) {
  if (!text) return null;

  // 1. YouTube (Standard Links)
  // Matches: https://www.youtube.com/watch?v=ID and https://youtu.be/ID
  const ytMatch = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: 'YOUTUBE', url: ytMatch[1] }; 

  // 2. Direct Video (.mp4, .webm)
  const vidMatch = text.match(/(https?:\/\/\S+\.(?:mp4|webm|ogg))/i);
  if (vidMatch) return { type: 'VIDEO', url: vidMatch[0] };

  // 3. Images
  const imgMatch = text.match(/(https?:\/\/\S+(?:png|jpg|jpeg|gif|webp)|https?:\/\/(?:source\.unsplash\.com|picsum\.photos)\/\S+)/i);
  if (imgMatch) return { type: 'IMAGE', url: imgMatch[0] };

  return null;
}

// 🖼️ MEDIA RENDERER
function MediaPreview({ type, url }: { type: string, url: string | null }) {
    if (!url) return null;

    // --- YOUTUBE EMBED ---
    if (type === 'YOUTUBE') {
        return (
            <div className="relative w-full aspect-video mb-4 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg z-10">
                <iframe 
                    src={`https://www.youtube.com/embed/${url}?rel=0&modestbranding=1`}
                    className="w-full h-full"
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                />
            </div>
        );
    }

    // --- NATIVE VIDEO ---
    if (type === 'VIDEO') {
        return (
            <div className="relative w-full mb-4 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg z-10">
                <video 
                    src={url} 
                    controls 
                    playsInline
                    className="w-full max-h-[500px]" 
                    preload="metadata"
                />
            </div>
        );
    }

    // --- IMAGE ---
    if (type === 'IMAGE') {
        return (
            <div className="relative w-full h-72 mb-4 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-white/10 group shadow-sm z-10">
                <img 
                    src={url} 
                    alt="Post Content" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
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

  // 1. Detect from explicit Media URL
  let mediaInfo = detectMedia(post.mediaUrl);

  // 2. Fallback: Detect from Content Text
  if (!mediaInfo) {
      mediaInfo = detectMedia(post.content);
  }

  const displayType = mediaInfo?.type || post.type;
  const displayUrl = mediaInfo?.url || post.mediaUrl;

  // Clean content logic (Optional: remove the link if it's being displayed)
  const cleanContent = post.content; 

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLiked(!isLiked)
  }

  const handleComments = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowComments(true) 
  }

  const handleVerifyFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!showComments) setIsFlipped(!isFlipped)
  }

  const handleTextExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={styles.cardContainer}>
      <div className={clsx(styles.cardInner, { [styles.flipped]: isFlipped })}>
        
        {/* === FRONT FACE === */}
        <div className={styles.cardFront}>
          
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.authorInfo}>
              <div className={styles.avatar}>
                {post.author.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <span className={styles.authorName}>{post.author.username}</span>
                <div className="flex items-center gap-2 text-[10px] opacity-60">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    {displayType === 'YOUTUBE' && <span className="text-red-500 font-bold flex items-center gap-1">● YouTube</span>}
                </div>
              </div>
            </div>

            <Link 
              href={`/channels/${post.channel.slug}`} 
              className={styles.channelTag}
              onClick={(e) => e.stopPropagation()}
            >
              #{post.channel.slug}
            </Link>
          </div>

          {/* 🎥 MEDIA PREVIEW */}
          <div onClick={(e) => e.stopPropagation()}>
             <MediaPreview type={displayType} url={displayUrl} />
          </div>

          {/* Text Content */}
          <div 
            className={clsx(styles.contentWrapper, { 
                [styles.expanded]: isExpanded, 
                [styles.clamped]: !isExpanded 
            })}
            onClick={handleTextExpand}
          >
            {post.title && <h3 className={styles.title}>{post.title}</h3>}
            
            <p className={`${styles.content} whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 leading-relaxed`}>
                {cleanContent}
            </p>
            
            {!isExpanded && (
                <div className={styles.readMoreHint}>
                    Read More <ChevronDown size={12} className="inline" />
                </div>
            )}
             {isExpanded && (
                <div className={styles.readMoreHint}>
                    Show Less <ChevronUp size={12} className="inline" />
                </div>
            )}
          </div>
          
          {/* Action Bar */}
          <div className={styles.actionBar}>
            <button 
                className={clsx(styles.actionBtn, { "text-red-500": isLiked })}
                onClick={handleLike}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              <span>{post._count?.likes || 0}</span>
            </button>

            <button className={styles.actionBtn} onClick={handleComments}>
              <MessageCircle size={18} />
              <span>{post._count?.comments || 0}</span>
            </button>

            <button className={styles.actionBtn}>
              <Repeat size={18} />
            </button>
            
            <button className={styles.verifyChip} onClick={handleVerifyFlip}>
                 <ShieldCheck size={14} />
                 Verified on Eth
            </button>
          </div>

          {/* === COMMENT DRAWER === */}
          <div className={clsx(styles.commentsPanel, { [styles.commentsOpen]: showComments })}>
              <div className={styles.panelHeader}>
                  <span className="font-bold text-sm">Comments</span>
                  <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setShowComments(false); }}>
                      <X size={18} />
                  </button>
              </div>

              <div className={styles.commentsList}>
                 {post.comments && post.comments.length > 0 ? (
                    post.comments.map((comment, i) => (
                        <div key={i} className={styles.commentItem}>
                            <div className="flex justify-between mb-1">
                                <span className="text-indigo-500 dark:text-indigo-400 text-xs font-bold">@{comment.author?.username || 'user'}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                        </div>
                    ))
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                        <MessageCircle size={24} className="mb-2 opacity-50" />
                        No comments yet.
                    </div>
                 )}
              </div>

              <div className={styles.inputArea}>
                  <input 
                    type="text" 
                    placeholder="Add a comment..." 
                    className={styles.commentInput}
                    onClick={(e) => e.stopPropagation()} 
                  />
                  <button className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-500">
                      <Send size={16} />
                  </button>
              </div>
          </div>
        </div>

        {/* === BACK FACE === */}
        <div className={styles.cardBack}>
             <button 
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                onClick={handleVerifyFlip}
             >
                <X size={20} />
             </button>

             <div className={styles.verificationContainer}>
                <ShieldCheck size={48} className="text-emerald-500 mb-2" />
                <h3 className="text-lg font-bold text-white mb-1">Verified on Optimism</h3>
                <p className="text-xs text-gray-400 mb-4 px-6">
                    Cryptographically secured proof of origin.
                </p>

                <div className={styles.hashBox}>
                    <span className={styles.hashLabel}>CONTENT HASH</span>
                    <span className={styles.hashValue}>0x7f83...a9c2</span>
                    <span className={`${styles.hashLabel} mt-3`}>SIGNATURE</span>
                    <span className={styles.hashValue}>0x129d...f8e2</span>
                </div>

                <a href="#" className={styles.etherscanLink}>
                    View Transaction ↗
                </a>
             </div>
        </div>

      </div>
    </div>
  )
}

