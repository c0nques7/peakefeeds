'use client'

import { useState, useMemo } from 'react'
import { useSession } from "next-auth/react" 
import { Reply, Trash, Edit2, Send, MoreVertical, CornerDownRight, X, Check } from 'lucide-react'
import { createComment } from '@/actions/create-comment'
import { deleteComment, updateComment } from '@/actions/comment-actions'
import clsx from 'clsx'

interface CommentItemProps {
  comment: any; 
  postId: string;
  channelSlug: string;
}

export function CommentItem({ comment, postId, channelSlug }: CommentItemProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [replyText, setReplyText] = useState("");
  const [editText, setEditText] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAuthor = currentUserId === comment.authorId;

  // 🎨 DARK MODE FIX: Use lighter/brighter borders for dark mode visibility
  const randomBorderClass = useMemo(() => {
      const colors = [
          'border-indigo-200 dark:border-indigo-400/50',
          'border-purple-200 dark:border-purple-400/50',
          'border-teal-200 dark:border-teal-400/50',
          'border-cyan-200 dark:border-cyan-400/50',
          'border-sky-200 dark:border-sky-400/50',
          'border-violet-200 dark:border-violet-400/50',
          'border-fuchsia-200 dark:border-fuchsia-400/50',
      ];
      const index = comment.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length;
      return colors[index];
  }, [comment.id]);

  // --- Handlers ---
  const handleReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('content', replyText);
    formData.append('postId', postId);
    formData.append('parentId', comment.id); 
    
    await createComment(formData);
    setReplyText("");
    setIsReplying(false);
    setIsSubmitting(false);
  };

  const handleUpdate = async () => {
    if (!editText.trim()) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('content', editText);
    formData.append('commentId', comment.id);
    formData.append('channelSlug', channelSlug);

    await updateComment(formData);
    setIsEditing(false);
    setIsSubmitting(false);
    setShowMenu(false);
  };

  const confirmDelete = async () => {
    setIsSubmitting(true);
    await deleteComment(comment.id, channelSlug);
    setIsSubmitting(false);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="flex gap-3 mb-4 w-full">
      {/* Avatar & Thread Line */}
      <div className="flex flex-col items-center">
         <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300">
            {comment.author?.username?.[0]?.toUpperCase() || 'U'}
         </div>
         {comment.replies && comment.replies.length > 0 && (
             <div className="w-[2px] bg-gray-200 dark:bg-gray-700 flex-grow mt-2 rounded-full min-h-[20px]" />
         )}
      </div>

      <div className="flex-1 min-w-0">
        
        {/* BUBBLE CONTAINER */}
        <div className={clsx(
            "relative overflow-hidden rounded-2xl p-3 border-2 group transition-colors duration-500",
            // Light: gray-50 background. Dark: Very subtle white overlay (5%) to distinguish from black page.
            "bg-gray-50 dark:bg-white/5",
            randomBorderClass
        )}>
            
            {/* --- SLIDE OVERLAY: DELETE CONFIRMATION --- */}
            <div 
                className={clsx(
                    "absolute inset-0 z-20 flex items-center justify-between px-4 transition-transform duration-300 ease-in-out",
                    // Use gradients for the delete slide for better look
                    "bg-gradient-to-r from-red-600 to-red-500 dark:from-red-900 dark:to-red-800",
                    { 
                        'translate-x-0': showDeleteConfirm, 
                        'translate-x-full': !showDeleteConfirm 
                    }
                )}
            >
                <span className="text-white font-bold text-sm">Delete this?</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="p-1 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
                    >
                        <X size={14} />
                    </button>
                    <button 
                        onClick={confirmDelete}
                        disabled={isSubmitting}
                        className="p-1 rounded-full bg-white text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                    >
                        {isSubmitting ? <div className="animate-spin w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full" /> : <Check size={14} />}
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            
            {/* Header */}
            <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    @{comment.author?.username || 'user'}
                </span>
                
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    
                    {/* Menu Toggle */}
                    {isAuthor && (
                        <div className="relative">
                            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <MoreVertical size={14} />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-4 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-lg z-10 p-1 w-24">
                                    <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="flex items-center w-full px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-200">
                                        <Edit2 size={10} className="mr-2"/> Edit
                                    </button>
                                    <button onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }} className="flex items-center w-full px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                        <Trash size={10} className="mr-2"/> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Logic */}
            {isEditing ? (
                <div className="mt-2">
                    <input 
                        type="text" 
                        value={editText} 
                        onChange={(e) => setEditText(e.target.value)} 
                        // Dark mode: Darker background (gray-950) for contrast against the bubble
                        className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 dark:text-gray-100 rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                        <button onClick={handleUpdate} disabled={isSubmitting} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">Save</button>
                        <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 break-words leading-relaxed">
                    {comment.content}
                </p>
            )}

            {/* Reply Button */}
            {!isEditing && (
                <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 mt-2 transition-colors">
                    <Reply size={12} /> Reply
                </button>
            )}
        </div>

        {/* Reply Input Form */}
        {isReplying && (
            <div className="flex items-center gap-2 mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <CornerDownRight size={14} className="text-gray-300 dark:text-gray-600" />
                <input 
                    type="text" 
                    placeholder="Write a reply..." 
                    // Dark mode: Deep black background to stand out from bubble
                    className="flex-1 min-w-0 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg py-1 px-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-white shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                    autoFocus
                />
                <button onClick={handleReply} disabled={isSubmitting} className="p-1 bg-indigo-600 rounded-md text-white hover:bg-indigo-700 shadow-sm">
                    <Send size={12} />
                </button>
            </div>
        )}

        {/* Recursive Child Rendering */}
        {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 pl-2">
                {comment.replies.map((reply: any) => (
                    <CommentItem 
                        key={reply.id} 
                        comment={reply} 
                        postId={postId}
                        channelSlug={channelSlug}
                    />
                ))}
            </div>
        )}
      </div>
    </div>
  )
}