"use client";

import { useState, useTransition } from "react";
import { updateUserDetails } from "@/actions/admin-user-detail";
import { User } from "@prisma/client";
import { Edit2, Save, X, Loader2, User as UserIcon, AtSign, Mail } from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css";
import { toast } from "sonner";

export function EditUserForm({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: user.name || "",
    username: user.username || "",
    email: user.email || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateUserDetails(user.id, formData);
      if (result.success) {
        toast.success("User updated successfully");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to update user");
      }
    });
  };

  if (!isEditing) {
    return (
      <div className={styles.glassPanel}>
        <div className="p-4 border-b border-[var(--glass-border)] flex justify-between items-center">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <UserIcon size={18} className="text-[var(--accent-primary)]" />
            Profile Information
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-[var(--glass-card-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
          >
            <Edit2 size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Display Name</label>
              <p className="text-[var(--text-primary)] font-medium">{user.name || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Username</label>
              <p className="text-[var(--text-primary)] font-medium">@{user.username || "Anonymous"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Email Address</label>
              <p className="text-[var(--text-primary)] font-medium">{user.email || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.glassPanel}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-[var(--glass-border)] flex justify-between items-center">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <UserIcon size={18} className="text-[var(--accent-primary)]" />
            Edit Profile
          </h3>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all flex items-center gap-2 text-sm font-bold"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-2">
                <UserIcon size={12} /> Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded bg-black/20 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all"
                placeholder="Real Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-2">
                <AtSign size={12} /> Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 rounded bg-black/20 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all"
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-2">
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 rounded bg-black/20 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all"
                placeholder="user@example.com"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
