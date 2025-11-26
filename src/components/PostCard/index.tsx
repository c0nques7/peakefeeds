'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { MessageCircle, Heart, Repeat, ShieldCheck, Share2, X, Send, ChevronDown, ChevronUp, Play, Trash2, Loader2, Reply } from 'lucide-react'
import styles from './PostCard.module.css'
import clsx from 'clsx'
import { deletePost } from '@/actions/delete-post'
import { deleteComment } from '@/actions/delete-comment' // 👈 NEW
import { createComment } from '@/actions/create-comment'

// ... Video Helper (Same as before) ...
function getVideoMeta(url: string | null) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^#&?]*)/);
  if (ytMatch && ytMatch[1]) return { platform: 'youtube', id: ytMatch[1], thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`, embed: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0` };
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) return { platform: 'vimeo', id: vimeoMatch[1], thumbnail: null, embed: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };
  return { platform: 'native', src: url };
}

interface Comment {
    id: string; // Must have ID for deletion
    author?: { username: string | null };
    content?: string;
    authorId?: string; // Needed for permission check
    parentId?: string | null; // Needed for threading
}

interface PostProps {
  currentUserId?: string;
  post: {
    id: string
    title: string | null
    content: string
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'LINK'
    mediaUrl: string | null
    createdAt: Date
    author: { id: string; name: string | null; username: string | null }
    channel: { name: string; slug: string; creatorId: string }
    comments?: Comment[] 
    _count?: { comments: number, likes: number }
  }
}

export function PostCard({ post, currentUserId }: PostProps) {
  // --- States ---
  const [isFlipped, setIsFlipped] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // 💬 Comment States
  const [commentText, setCommentText] = useState("") 
  const [isPostingComment, setIsPostingComment] = useState(false)
  // Track who we are replying to: { id, username }
  const [replyingTo, setReplyingTo] = useState<{id: string, username: string} | null>(null) 
  const commentInputRef = useRef<HTMLInputElement>(null)

  // --- Handlers ---
  const handleLike = (e: React.MouseEvent) => { e.stopPropagation(); setIsLiked(!isLiked) }
  const handleComments = (e: React.MouseEvent) => { e.stopPropagation(); setShowComments(true) }
  const handleVerifyFlip = (e: React.MouseEvent) => { e.stopPropagation(); if (!showComments) setIsFlipped(!isFlipped) }
  const handleTextExpand = (e: React.MouseEvent) => { e.stopPropagation(); setIsExpanded(!isExpanded) }
  const handleVideoClick = (e: React.MouseEvent) => { e.stopPropagation(); setIsPlaying(true) }

  // --- POST DELETION ---
  const canDeletePost = currentUserId && (currentUserId === post.author.id || currentUserId === post.channel.creatorId);
  const handleDeletePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this post?")) return;
    setIsDeleting(true);
    const result = await deletePost(post.id);
    if (result.error) { alert(result.error); setIsDeleting(false); }
  };

  // --- COMMENT DELETION ---
  const handleDeleteComment = async (commentId: string) => {
      if (!confirm("Delete comment?")) return;
      await deleteComment(commentId);
      // Optimistic update handled by revalidatePath
  }

  // --- REPLY SETUP ---
  const initReply = (comment: Comment) => {
      setReplyingTo({ 
          id: comment.id, 
          username: comment.author?.username || 'anon' 
      });
      commentInputRef.current?.focus();
  }

  const cancelReply = () => {
      setReplyingTo(null);
      setCommentText("");
  }

  // --- SUBMIT COMMENT ---
  const handleSendComment = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!commentText.trim()) return;

    setIsPostingComment(true);
    
    const formData = new FormData();
    formData.append('content', commentText);
    formData.append('postId', post.id);
    // If replying, attach parent ID
    if (replyingTo) {
        formData.append('parentId', replyingTo.id);
    }

    const result = await createComment(formData);

    if (result.success) {
        setCommentText(""); 
        setReplyingTo(null); // Reset reply state
    } else {
        alert("Failed to post comment.");
    }
    setIsPostingComment(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendComment();
      }
  }

  if (isDeleting) return <div className="w-full h-[220px] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-gray-500 animate-pulse">Deleting...</div>

  const videoMeta = post.type === 'VIDEO' ? getVideoMeta(post.mediaUrl) : null;
  const displayText = (post.type === 'IMAGE' || post.type === 'VIDEO') && post.mediaUrl ? post.content.replace(post.mediaUrl, '').trim() : post.content;

  return (
    <div className={styles.cardContainer}>
      <div className={clsx(styles.cardInner, { [styles.flipped]: isFlipped })}>
        
        {/* FRONT FACE */}
        <div className={styles.cardFront}>
          <div className={styles.header}>
            <div className={styles.authorInfo}>
              <div className={styles.avatar}>{post.author.username?.[0]?.toUpperCase() || "U"}</div>
              <div>
                <span className={styles.authorName}>{post.author.username}</span>
                <p className="text-[10px] text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Link href={`/channels/${post.channel.slug}`} className={styles.channelTag} onClick={(e) => e.stopPropagation()}>#{post.channel.slug}</Link>
                {canDeletePost && <button onClick={handleDeletePost} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"><Trash2 size={16} /></button>}
            </div>
          </div>

          <div className={clsx(styles.contentWrapper, { [styles.expanded]: isExpanded, [styles.clamped]: !isExpanded })} onClick={handleTextExpand}>
            {post.title && <h3 className={styles.title}>{post.title}</h3>}
            {post.type === 'IMAGE' && post.mediaUrl && (
                <div className="rounded-xl overflow-hidden mb-3 border border-white/10 relative bg-black/20"><img src={post.mediaUrl} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" loading="lazy"/></div>
            )}
            {post.type === 'VIDEO' && videoMeta && (
                <div className="rounded-xl overflow-hidden mb-3 border border-white/10 relative bg-black aspect-video group cursor-pointer" onClick={handleVideoClick}>
                    {isPlaying ? (videoMeta.platform === 'native' ? <video src={videoMeta.src} className="w-full h-full object-contain" controls autoPlay /> : <iframe src={videoMeta.embed} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />) : (<><div className="w-full h-full bg-gradient-to-br from-gray-800 to-black" /> <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform"><Play size={32} className="text-white fill-white ml-1" /></div></div></>)}
                </div>
            )}
            {displayText && <p className={styles.content}>{displayText}</p>}
            {!isExpanded && displayText.length > 150 && <div className={styles.readMoreHint}>Read More <ChevronDown size={12} className="inline" /></div>}
            {isExpanded && displayText.length > 150 && <div className={styles.readMoreHint}>Show Less <ChevronUp size={12} className="inline" /></div>}
          </div>
          
          <div className={styles.actionBar}>
            <button className={clsx(styles.actionBtn, { "text-red-500": isLiked })} onClick={handleLike}><Heart size={18} fill={isLiked ? "currentColor" : "none"} /><span>{post._count?.likes || 0}</span></button>
            <button className={styles.actionBtn} onClick={handleComments}><MessageCircle size={18} /><span>{post._count?.comments || 0}</span></button>
            <button className={styles.actionBtn}><Repeat size={18} /></button>
            <button className={styles.verifyChip} onClick={handleVerifyFlip}><ShieldCheck size={14} />Verified on Eth</button>
          </div>

          {/* === COMMENT DRAWER === */}
          <div className={clsx(styles.commentsPanel, { [styles.commentsOpen]: showComments })}>
              <div className={styles.panelHeader}>
                  <span className="font-bold text-sm">Comments</span>
                  <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setShowComments(false); }}><X size={18} /></button>
              </div>
              
              <div className={styles.commentsList}>
                 {post.comments && post.comments.length > 0 ? (
                    post.comments.map((comment, i) => {
                        // Check permissions per comment
                        // NOTE: We need comment.authorId from DB. If missing in props, this check might fail safe (hide button).
                        // Ensure your Prisma query fetches authorId
                        const isCommentOwner = currentUserId && comment.authorId === currentUserId;
                        const isMod = currentUserId && post.channel.creatorId === currentUserId;
                        
                        return (
                            <div key={i} className={styles.commentItem}>
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-indigo-400 text-xs font-bold">@{comment.author?.username || 'user'}</span>
                                        {comment.parentId && <span className="text-[9px] text-gray-500 px-1 border border-white/10 rounded">Reply</span>}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {/* Reply Button */}
                                        <button 
                                            onClick={() => initReply(comment)}
                                            className="text-gray-500 hover:text-white p-1"
                                            title="Reply"
                                        >
                                            <Reply size={12} />
                                        </button>

                                        {/* Delete Button (Owner or Mod) */}
                                        {(isCommentOwner || isMod) && (
                                            <button 
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="text-gray-500 hover:text-red-500 p-1"
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm opacity-90 break-words">{comment.content}</p>
                            </div>
                        )
                    })
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm"><MessageCircle size={24} className="mb-2 opacity-50" />No comments yet.</div>
                 )}
              </div>

              {/* INPUT AREA */}
              <div className={styles.inputArea}>
                  {/* Reply Context Banner */}
                  {replyingTo && (
                      <div className="absolute bottom-full left-0 w-full bg-indigo-900/90 backdrop-blur-md p-2 flex justify-between items-center px-4 border-t border-indigo-500/30">
                          <span className="text-xs text-indigo-200">Replying to <strong>@{replyingTo.username}</strong></span>
                          <button onClick={cancelReply} className="text-indigo-300 hover:text-white"><X size={14}/></button>
                      </div>
                  )}

                  <input 
                    ref={commentInputRef}
                    type="text" 
                    placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                    className={styles.commentInput}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isPostingComment}
                  />
                  <button 
                    className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-500 disabled:opacity-50"
                    onClick={handleSendComment}
                    disabled={isPostingComment || !commentText.trim()}
                  >
                      {isPostingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
              </div>
          </div>
        </div>

        {/* BACK FACE (Same as before) */}
        <div className={styles.cardBack}>
             <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={handleVerifyFlip}><X size={20} /></button>
             <div className={styles.verificationContainer}>
                <ShieldCheck size={48} className="text-emerald-500 mb-2" />
                <h3 className={styles.verifyTitle}>Verified on Optimism</h3>
                <p className={styles.verifyText}>Cryptographically secured proof of origin.</p>
                <div className={styles.hashBox}>
                    <span className={styles.hashLabel}>CONTENT HASH</span><span className={styles.hashValue}>0x7f83...a9c2</span>
                    <span className={`${styles.hashLabel} mt-3`}>SIGNATURE</span><span className={styles.hashValue}>0x129d...f8e2</span>
                </div>
                <a href="#" className={styles.etherscanLink}>View Transaction ↗</a>
             </div>
        </div>
      </div>
    </div>
  )
}