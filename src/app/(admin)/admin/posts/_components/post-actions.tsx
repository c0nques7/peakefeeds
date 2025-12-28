"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, Eye, Lock, Unlock, ExternalLink } from "lucide-react";
import { deletePost } from "@/actions/delete-post";
import { toggleLockContent } from "@/actions/admin-moderation";
import Link from "next/link";
import { toast } from "sonner";
import DeletePostModal from "@/components/posts/DeletePostModal";

interface PostActionsProps {
  post: {
    id: string;
    isLocked: boolean;
    isVerified: boolean;
    channel: { slug: string };
    author: { id: string };
  };
}

export function PostActions({ post }: PostActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [isLocking, setIsLocking] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleToggleLock = async () => {
    setIsLocking(true);
    try {
      const res = await toggleLockContent({
        targetId: post.id,
        targetType: "POST",
        lockState: !post.isLocked
      });
      if (res.success) {
        toast.success(post.isLocked ? "Post unlocked" : "Post locked for review");
      } else {
        toast.error(res.error || "Failed to toggle lock");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsLocking(false);
    }
  };

  const onConfirmDelete = async (reason: string, comments: string) => {
    startTransition(async () => {
      const res = await deletePost(post.id, reason, comments);
      if (res.success) {
        toast.success("Post deleted successfully");
        setShowDeleteModal(false);
      } else {
        toast.error(res.error || "Failed to delete post");
      }
    });
  };

  return (
    <div className="flex justify-end gap-1">
      {/* View Post Button */}
      <Link 
        href={`/channels/${post.channel.slug}#post-${post.id}`} 
        target="_blank"
        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        title="View Live in Channel"
      >
        <ExternalLink size={16} />
      </Link>

      {/* Lock Button */}
      <button
        onClick={handleToggleLock}
        disabled={isLocking}
        className={`p-2 rounded-lg transition-colors ${post.isLocked ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' : 'text-[var(--text-muted)] hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
        title={post.isLocked ? "Unlock Post" : "Lock for Review"}
      >
        {isLocking ? <Loader2 size={16} className="animate-spin" /> : post.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
      </button>

      {/* Delete Button */}
      {!post.isVerified && (
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={isPending}
          className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          title="Delete Post"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      )}

      {post.isVerified && (
        <div className="p-2 text-zinc-400 dark:text-zinc-600" title="Verified content cannot be deleted">
          <Trash2 size={16} className="opacity-20" />
        </div>
      )}

      <DeletePostModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={onConfirmDelete}
        isDeleting={isPending}
      />
    </div>
  );
}
