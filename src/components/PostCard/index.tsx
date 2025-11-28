'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { MessageCircle, Heart, Repeat, ShieldCheck, ShieldOff, X, Send, ChevronDown, ChevronUp, Trash, HeartCrack, Edit2, CornerDownRight } from 'lucide-react'
import clsx from 'clsx'
import styles from './PostCard.module.css' 
import { Post, PostType } from '@prisma/client'
import { deletePost } from '@/actions/delete-post' 
import { createComment } from '@/actions/create-comment'
import { setReaction } from '@/actions/toggle-reaction' 
import { deleteComment, updateComment } from '@/actions/comment-actions' 

// --- Types ---
interface Comment {
    id: string;
    author: { id: string; username: string | null };
    content: string;
    parentId?: string | null; // 👈 Needed for threading logic
    replies?: Comment[];      // We will populate this in the tree builder
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
  }
}

// --- Helpers ---
function detectMedia(text: string | null): any {
    if (!text) return null;
    const ytMatch = text.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:\S+)?)/i);
    if (ytMatch) return { type: 'YOUTUBE', url: ytMatch[0] }; 
    const imgMatch = text.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)|https?:\/\/(?:i\.imgur\.com|storage\.googleapis\.com|cdn\.\S+)\/\S+)/i);
    if (imgMatch) return { type: 'IMAGE', url: imgMatch[0] };
    const vidMatch = text.match(/(https?:\/\/\S+\.(?:mp4|webm|ogg))/i);
    if (vidMatch) return { type: 'VIDEO', url: vidMatch[0] };
    return null;
}

function MediaPreview({ type, url }: { type: string, url: string | null }) {
    if (!url) return null;
    let embedUrl = url;
    let videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (videoIdMatch) embedUrl = videoIdMatch[1];

    if (type === 'YOUTUBE' && embedUrl) {
        return (
            <div className={styles.videoWrapper}>
                <iframe src={`https://www.youtube.com/embed/${embedUrl}?rel=0&modestbranding=1`} title="YouTube video player" allowFullScreen loading="lazy" />
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

// 🧠 LOGIC: Turn Flat List into Nested Tree
function buildCommentTree(flatComments: Comment[] = []): Comment[] {
    const commentMap: Record<string, Comment> = {};
    const roots: Comment[] = [];

    // 1. Initialize map with empty replies array
    flatComments.forEach(c => {
        commentMap[c.id] = { ...c, replies: [] };
    });

    // 2. Link children to parents
    flatComments.forEach(c => {
        if (c.parentId && commentMap[c.parentId]) {
            // It's a child, add to parent's replies
            commentMap[c.parentId].replies!.push(commentMap[c.id]);
        } else {
            // It's a root comment
            roots.push(commentMap[c.id]);
        }
    });

    // 3. Sort by date (optional, usually DB handles sort order but safe to keep)
    return roots; // The DB order is usually preserved
}

// --- Single Comment Sub-Component ---
function SingleComment({ comment, postId, channelSlug, isSubComment = false }: { comment: Comment, postId: string, channelSlug: string, isSubComment?: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [editContent, setEditContent] = useState(comment.content || "");
    const [replyContent, setReplyContent] = useState("");

    const handleDelete = async () => {
        if (!confirm("Delete this comment?")) return;
        setIsProcessing(true);
        await deleteComment(comment.id, channelSlug);
        setIsProcessing(false);
    }

    const handleEditSave = async () => {
        if (!editContent.trim()) return;
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('commentId', comment.id);
        formData.append('content', editContent);
        formData.append('channelSlug', channelSlug);
        await updateComment(formData);
        setIsEditing(false);
        setIsProcessing(false);
    }

    const handleReplySubmit = async () => {
        if (!replyContent.trim()) return;
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('postId', postId);
        formData.append('content', replyContent);
        formData.append('channelSlug', channelSlug);
        formData.append('parentId', comment.id); // 🔗 This creates the nest!

        await createComment(formData);
        setIsReplying(false);
        setReplyContent("");
        setIsProcessing(false);
    }

    return (
        <div className={clsx(styles.commentItem, { "pl-4": isSubComment })}>
            <div className="flex justify-between items-start">
                <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    @{comment.author?.username || 'user'}
                </span>
                
                <div className="flex gap-2">
                    <button onClick={() => setIsEditing(!isEditing)} disabled={isProcessing} className={styles.actionIcon}>
                        <Edit2 size={12} />
                    </button>
                    <button onClick={handleDelete} disabled={isProcessing} className={clsx(styles.actionIcon, styles.delete)}>
                        <Trash size={12} />
                    </button>
                </div>
            </div>

            {isEditing ? (
                <div className="mt-2">
                    <input type="text" value={editContent} onChange={(e) => setEditContent(e.target.value)} className={styles.commentInput} autoFocus disabled={isProcessing} />
                    <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500">Cancel</button>
                        <button onClick={handleEditSave} className="text-xs text-indigo-500 font-bold" disabled={isProcessing}>Save</button>
                    </div>
                </div>
            ) : (
                <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '2px' }}>{comment.content}</p>
            )}

            {!isEditing && (
                <div className={styles.commentActions}>
                    <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-400">
                        <CornerDownRight size={10} /> Reply
                    </button>
                </div>
            )}

            {isReplying && (
                <div className="mt-2 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
                     <input type="text" placeholder={`Reply to @${comment.author?.username}...`} value={replyContent} onChange={(e) => setReplyContent(e.target.value)} className={styles.commentInput} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} autoFocus disabled={isProcessing} />
                     <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => setIsReplying(false)} className="text-xs text-gray-500">Cancel</button>
                        <button onClick={handleReplySubmit} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded" disabled={isProcessing}>
                            {isProcessing ? '...' : 'Reply'}
                        </button>
                    </div>
                </div>
            )}

            {/* 🧵 RENDER NESTED REPLIES HERE */}
            {comment.replies && comment.replies.length > 0 && (
                <div className={styles.commentThread}>
                    {comment.replies.map((reply) => (
                        <SingleComment 
                            key={reply.id} 
                            comment={reply} 
                            postId={postId} 
                            channelSlug={channelSlug} 
                            isSubComment={true} 
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// --- MAIN COMPONENT ---
export function PostCard({ post }: PostProps) {
  const [isFlipped, setIsFlipped] = useState(false) 
  const [showComments, setShowComments] = useState(false) 
  const [isExpanded, setIsExpanded] = useState(false) 
  const [userReaction, setUserReaction] = useState<'LIKE' | 'DISLIKE' | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState("") 
  const [isSending, setIsSending] = useState(false)

  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const drawerBgColor = mounted && resolvedTheme === 'dark' ? 'rgba(18, 18, 22, 0.95)' : 'rgba(255, 255, 255, 0.95)';

  // 🌲 TRANSFORM FLAT COMMENTS TO TREE
  // We use useMemo so we don't recalculate this on every keystroke
  const commentTree = useMemo(() => {
      return buildCommentTree(post.comments || []);
  }, [post.comments]);

  const isPostVerified = post.isVerified || false;
  let mediaInfo = detectMedia(post.mediaUrl);
  if (!mediaInfo) { mediaInfo = detectMedia(post.content); }
  const displayType = mediaInfo?.type || post.type;
  const displayUrl = mediaInfo?.url || post.mediaUrl;
  let cleanContent = post.content;
  if (displayUrl) { cleanContent = cleanContent.replace(displayUrl, '').trim(); }
  cleanContent = cleanContent.replace(/\s{2,}/g, ' ');

  const handleLike = (e: React.MouseEvent) => { e.stopPropagation(); handleReaction(e, 'LIKE'); }
  const handleComments = (e: React.MouseEvent) => { e.stopPropagation(); setShowComments(true) }
  const handleVerifyFlip = (e: React.MouseEvent) => { e.stopPropagation(); if (!showComments) setIsFlipped(!isFlipped) }
  const handleTextExpand = (e: React.MouseEvent) => { e.stopPropagation(); setIsExpanded(!isExpanded) }
  const handleConfirmDelete = (e: React.MouseEvent) => { e.stopPropagation(); setShowConfirm(true); }

  const handleReaction = async (e: React.MouseEvent, type: 'LIKE' | 'DISLIKE') => {
    e.stopPropagation();
    const previousReaction = userReaction;
    setUserReaction(prev => prev === type ? null : type);
    
    const formData = new FormData();
    formData.append('postId', post.id);
    formData.append('reactionType', type);
    formData.append('channelSlug', post.channel.slug);
    
    const result = await setReaction(formData);
    if (result.error) {
        setUserReaction(previousReaction);
        console.error("Reaction failed:", result.error);
    }
  }
  
  const handleDeletePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteError(null);
    setIsDeleting(true);
    setShowConfirm(false); 
    try { await deletePost(post.id); } 
    catch (e) { setDeleteError("Network error."); } 
    finally { setIsDeleting(false); }
  }

  async function handleSendComment() {
    if (!commentText.trim()) return;
    setIsSending(true);
    const formData = new FormData();
    formData.append('postId', post.id);
    formData.append('content', commentText);
    formData.append('channelSlug', post.channel.slug);
    try {
        await createComment(formData);
        setCommentText("");
    } catch (err) { console.error(err); } 
    finally { setIsSending(false); }
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
            {!isExpanded && (cleanContent.trim().length > 150) && <div className={styles.readMoreHint}><ChevronDown size={12} className="inline" /> Read More</div>}
            {isExpanded && <div className={styles.readMoreHint}><ChevronUp size={12} className="inline" /> Show Less</div>}
          </div>
          
          <div className={styles.actionBar}>
            <button className={clsx(styles.actionBtn, { "text-red-500": userReaction === 'LIKE' })} onClick={handleLike}>
              <Heart size={18} fill={userReaction === 'LIKE' ? "currentColor" : "none"} />
              <span>{post._count?.likes || 0}</span>
            </button>
            <button className={clsx(styles.actionBtn, { "text-purple-500": userReaction === 'DISLIKE' })} onClick={(e) => handleReaction(e, 'DISLIKE')}>
              <HeartCrack size={18} fill={userReaction === 'DISLIKE' ? "currentColor" : "none"} />
            </button>
            <button className={styles.actionBtn} onClick={handleComments}>
              <MessageCircle size={18} />
              <span>{post.comments?.length || post._count?.comments || 0}</span>
            </button>
            <button className={styles.actionBtn}><Repeat size={18} /></button>
            <button className={clsx(styles.actionBtn)} onClick={handleConfirmDelete} disabled={isDeleting} style={{ color: 'var(--text-muted)', marginLeft: 'auto', opacity: isDeleting ? 0.5 : 1 }}>
                <Trash size={18} />
            </button>
            <button className={clsx(styles.verifyChip, { 'unverified': !isPostVerified })} onClick={handleVerifyFlip} style={{ color: isPostVerified ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                {isPostVerified ? <ShieldCheck size={14} /> : <ShieldOff size={14} style={{ color: 'var(--text-muted)' }} />}
                {isPostVerified ? 'Verified' : 'Unverified'}
            </button>
          </div>

          {showConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
                <div style={{ background: 'var(--glass-card)', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0, 0, 0, 0.4)', textAlign: 'center' }}>
                    <Trash size={32} style={{ color: 'red', margin: '0 auto 12px' }} />
                    <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Confirm Deletion</h4>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <button onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--glass-card-hover)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }} disabled={isDeleting}>Cancel</button>
                        <button onClick={handleDeletePost} style={{ padding: '8px 16px', borderRadius: '8px', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', opacity: isDeleting ? 0.5 : 1 }} disabled={isDeleting}>Delete</button>
                    </div>
                </div>
            </div>
          )}
          
          {/* === COMMENT DRAWER === */}
          <div className={clsx(styles.commentsPanel, { [styles.commentsOpen]: showComments })} style={{ backgroundColor: drawerBgColor }}>
              <div className={styles.panelHeader}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Comments</span>
                <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setShowComments(false); }}><X size={18} /></button>
              </div>

              <div className={styles.commentsList}>
                {commentTree.length > 0 ? (
                    // 🌲 RENDER THE TREE, NOT THE FLAT LIST
                    commentTree.map((comment) => (
                        <SingleComment 
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

              <div className={styles.inputArea} style={{ backgroundColor: drawerBgColor }}>
                  <input type="text" placeholder="Add a comment..." className={styles.commentInput} value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} onClick={(e) => e.stopPropagation()} disabled={isSending} />
                  <button onClick={(e) => { e.stopPropagation(); handleSendComment(); }} disabled={isSending} style={{ background: 'var(--accent-primary)', color: 'white', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer', opacity: isSending ? 0.5 : 1 }}>
                      <Send size={16} />
                  </button>
              </div>
          </div>
        </div>

        {/* ... Back Face (No Changes) ... */}
        <div className={styles.cardBack}>
             <button className="absolute-close-btn" style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)' }} onClick={handleVerifyFlip}><X size={20} /></button>
             <div className={styles.verificationContainer}>
                {isPostVerified ? <ShieldCheck size={48} style={{ color: 'var(--accent-success)', marginBottom: '8px' }} /> : <ShieldOff size={48} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />}
                <h3 className="verify-title" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{isPostVerified ? 'Verified on Optimism' : 'Verification Pending'}</h3>
                <p className="verify-text" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px', padding: '0 24px' }}>Cryptographically secured proof of origin.</p>
                <div className={styles.hashBox}>
                    <span className={styles.hashLabel}>CONTENT HASH</span>
                    <span className={styles.hashValue}>{post.contentHash?.slice(0,30)}...</span>
                </div>
                <a href="#" className={styles.etherscanLink}>View Transaction ↗</a>
             </div>
        </div>
      </div>
    </div>
  )
}