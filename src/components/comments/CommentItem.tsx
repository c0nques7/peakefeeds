'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Reply, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteComment, updateComment } from '@/actions/comment-actions.ts'
import { createComment } from '@/actions/create-comment'
import { LiveTimestamp } from '../PostCard/LiveTimestamp'
import clsx from 'clsx'
import styles from './CommentItem.module.css'

interface CommentItemProps {
  comment: any
  postId: string
  channelSlug?: string
  postAuthorId: string
  currentUserId?: string
  onReply?: (newComment: any) => void
  onDelete?: (id: string) => void
  onEdit?: (id: string, content: string) => void
  isReply?: boolean
}

export function CommentItem({ 
  comment, postId, postAuthorId, currentUserId, onReply, onDelete, onEdit, isReply = false 
}: CommentItemProps) {
  const [showOptions, setShowOptions] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isSendingReply, setIsSendingReply] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const isAuthor = currentUserId === comment.author.id
  const isPostAuthor = currentUserId === postAuthorId

  const handleReply = async () => {
    if (!replyText.trim() || isSendingReply) return;
    setIsSendingReply(true);

    try {
      const formData = new FormData();
      formData.append('content', replyText);
      formData.append('postId', postId);
      formData.append('parentId', comment.id);

      const result = await createComment(formData);
      if (result.success && result.comment) {
        onReply?.({ ...result.comment, createdAt: new Date().toISOString(), replies: [] });
        setReplyText("");
        setIsReplying(false);
        toast.success("Reply posted");
      }
    } catch (e) {
      toast.error("Failed to reply");
    } finally {
      setIsSendingReply(false);
    }
  }

  const handleDelete = async () => {
    try {
      const res = await deleteComment(comment.id);
      if (res.success) {
        onDelete?.(comment.id);
        toast.success("Comment deleted");
      }
    } catch (e) {
      toast.error("Error deleting comment");
    }
  }

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === comment.content || isSavingEdit) {
      setIsEditing(false);
      return;
    }
    setIsSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append('content', editText);
      formData.append('commentId', comment.id);
      const res = await updateComment(formData);
      if (res.success) {
        onEdit?.(comment.id, editText);
        setIsEditing(false);
        toast.success("Comment updated");
      }
    } catch (e) {
      toast.error("Failed to edit");
    } finally {
      setIsSavingEdit(false);
    }
  }

  return (
    <div className={clsx(styles.commentWrapper, isReply && styles.isReply)}>
      <div className={styles.commentHeader}>
        <div className="flex items-center gap-2">
          <Link href={`/profile/${comment.author.username}`} className={styles.commentAvatar}>
            {comment.author.image ? <img src={comment.author.image} className="w-full h-full object-cover rounded-full" /> : <span>{comment.author.username?.[0]}</span>}
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <Link href={`/profile/${comment.author.username}`} className={styles.commentUsername}>@{comment.author.username}</Link>
              {isPostAuthor && <span className="text-[8px] bg-[var(--accent-primary)] text-white px-1 rounded-sm uppercase font-bold">OP</span>}
            </div>
            <LiveTimestamp date={comment.createdAt} className={styles.timestamp} />
          </div>
        </div>

        <div className="relative">
          <button onClick={() => setShowOptions(!showOptions)} className="p-1 opacity-50 hover:opacity-100 hover:bg-white/5 rounded-full">
            <MoreHorizontal size={14} />
          </button>
          {showOptions && (
            <div className={styles.optionsDropdown}>
              {isAuthor && <button onClick={() => { setIsEditing(true); setShowOptions(false); }} className={styles.optionItem}><Edit2 size={12} /> Edit</button>}
              {(isAuthor || isPostAuthor) && <button onClick={handleDelete} className={clsx(styles.optionItem, "text-red-400")}><Trash2 size={12} /> Delete</button>}
              <button onClick={() => setShowOptions(false)} className={styles.optionItem}>Close</button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.commentBody}>
        {isEditing ? (
          <div className="flex flex-col gap-2 mt-1">
            <textarea className={styles.editInput} value={editText} onChange={(e) => setEditText(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="text-xs p-1 opacity-50"><X size={14} /></button>
              <button onClick={handleSaveEdit} className="text-xs p-1 text-emerald-400">{isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
            </div>
          </div>
        ) : (
          <p className={styles.commentText}>{comment.content}</p>
        )}
      </div>

      <div className={styles.commentActions}>
        {!isReply && (
          <button onClick={() => setIsReplying(!isReplying)} className={styles.replyBtn}>
            <Reply size={12} /> {isReplying ? "Cancel" : "Reply"}
          </button>
        )}
      </div>

      {isReplying && (
        <div className={styles.replyInputArea}>
          <input className={styles.replyInput} placeholder={`Reply to @${comment.author.username}...`} value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReply()} />
          <button onClick={handleReply} disabled={!replyText.trim() || isSendingReply} className={styles.replySendBtn}>
            {isSendingReply ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.repliesList}>
          {comment.replies.map((reply: any) => (
            <CommentItem key={reply.id} comment={reply} postId={postId} postAuthorId={postAuthorId} currentUserId={currentUserId} onReply={onReply} onDelete={onDelete} onEdit={onEdit} isReply={true} />
          ))}
        </div>
      )}
    </div>
  )
}

