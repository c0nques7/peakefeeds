"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, Eye } from "lucide-react";
import { deletePost } from "@/actions/admin-posts";
import Link from "next/link";

export function PostActions({ postId, postSlug }: { postId: string, postSlug?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
    
    startTransition(async () => {
      await deletePost(postId);
    });
  };

  return (
    <div className="flex justify-end gap-2">
      {/* View Post Button (Optional link to actual post) */}
      <Link 
        href={`/post/${postId}`} 
        target="_blank"
        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--glass-border)] transition-colors"
        title="View Live"
      >
        <Eye size={18} />
      </Link>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="p-2 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-500/20 transition-colors disabled:opacity-50"
        title="Delete Post"
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
      </button>
    </div>
  );
}