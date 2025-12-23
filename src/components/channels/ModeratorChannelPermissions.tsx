'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
  getChannelPermissions, 
  updateChannelPermissions, 
  removeChannelUser 
} from '@/actions/channel-permissions';
import { ChannelRole } from '@prisma/client';
import { 
  Shield, User, Trash2, Check, X, Loader2, 
  MessageSquare, Send, Pin, ShieldAlert 
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

interface PermissionData {
  userId: string;
  role: ChannelRole;
  canPost: boolean;
  canComment: boolean;
  canDeletePosts: boolean;
  canPinPosts: boolean;
  user: {
    id: string;
    username: string | null;
    image: string | null;
    role: string;
  };
}

interface ModeratorChannelPermissionsProps {
  channelId: string;
}

export default function ModeratorChannelPermissions({ channelId }: ModeratorChannelPermissionsProps) {
  const [permissions, setPermissions] = useState<PermissionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchPermissions();
  }, [channelId]);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const data = await getChannelPermissions(channelId);
      setPermissions(data as any);
    } catch (error) {
      toast.error("Failed to load permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (userId: string, updates: Partial<PermissionData>) => {
    const current = permissions.find(p => p.userId === userId);
    if (!current) return;

    const newData = {
      role: updates.role || current.role,
      permissions: {
        canPost: updates.canPost !== undefined ? updates.canPost : current.canPost,
        canComment: updates.canComment !== undefined ? updates.canComment : current.canComment,
        canDeletePosts: updates.canDeletePosts !== undefined ? updates.canDeletePosts : current.canDeletePosts,
        canPinPosts: updates.canPinPosts !== undefined ? updates.canPinPosts : current.canPinPosts,
      }
    };

    startTransition(async () => {
      try {
        const res = await updateChannelPermissions({
          channelId,
          userId,
          ...newData
        });
        if (res.success) {
          toast.success("Permissions updated.");
          setPermissions(prev => prev.map(p => p.userId === userId ? { ...p, ...updates, ...newData.permissions } : p));
        } else {
          toast.error("Failed to update.");
        }
      } catch (error) {
        toast.error("An error occurred.");
      }
    });
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user from the channel?")) return;

    startTransition(async () => {
      try {
        const res = await removeChannelUser(channelId, userId);
        if (res.success) {
          toast.success("User removed.");
          setPermissions(prev => prev.filter(p => p.userId !== userId));
        } else {
          toast.error("Failed to remove user.");
        }
      } catch (error) {
        toast.error("An error occurred.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-[var(--accent-primary)]" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-2xl overflow-hidden shadow-xl">
      <div className="p-6 border-b border-[var(--glass-border)] bg-white/5">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="text-[var(--accent-primary)]" size={20} />
          Channel Permissions
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Manage roles and granular access for channel members.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4 text-center">Post</th>
              <th className="px-6 py-4 text-center">Comment</th>
              <th className="px-6 py-4 text-center">Mod tools</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)]">
            {permissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)] italic">
                  No members found in this channel.
                </td>
              </tr>
            ) : (
              permissions.map((p) => (
                <tr key={p.userId} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white overflow-hidden border border-white/10">
                        {p.user.image ? (
                          <img src={p.user.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold">{p.user.username?.[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">@{p.user.username}</span>
                        {p.user.role === 'ADMIN' && (
                          <span className="text-[9px] text-red-400 font-bold uppercase">Global Admin</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select 
                      value={p.role}
                      onChange={(e) => handleUpdate(p.userId, { role: e.target.value as ChannelRole })}
                      disabled={isPending || p.role === 'OWNER'}
                      className="bg-[var(--glass-panel)] border border-[var(--glass-border)] text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--accent-primary)] transition-all disabled:opacity-50"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="OWNER">Owner</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <PermissionToggle 
                      active={p.canPost} 
                      onToggle={() => handleUpdate(p.userId, { canPost: !p.canPost })}
                      icon={<Send size={12} />}
                      disabled={isPending || p.role === 'OWNER'}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <PermissionToggle 
                      active={p.canComment} 
                      onToggle={() => handleUpdate(p.userId, { canComment: !p.canComment })}
                      icon={<MessageSquare size={12} />}
                      disabled={isPending || p.role === 'OWNER'}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <PermissionToggle 
                        active={p.canDeletePosts} 
                        onToggle={() => handleUpdate(p.userId, { canDeletePosts: !p.canDeletePosts })}
                        icon={<Trash2 size={12} />}
                        disabled={isPending || p.role === 'OWNER'}
                        title="Can delete others' posts"
                      />
                      <PermissionToggle 
                        active={p.canPinPosts} 
                        onToggle={() => handleUpdate(p.userId, { canPinPosts: !p.canPinPosts })}
                        icon={<Pin size={12} />}
                        disabled={isPending || p.role === 'OWNER'}
                        title="Can pin posts"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRemove(p.userId)}
                      disabled={isPending || p.role === 'OWNER'}
                      className="text-[var(--text-muted)] hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-30"
                      title="Remove from channel"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermissionToggle({ active, onToggle, icon, disabled, title }: any) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={title}
      className={clsx(
        "inline-flex items-center justify-center w-8 h-8 rounded-full border transition-all disabled:opacity-50",
        active 
          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
          : "bg-red-500/10 border-red-500/20 text-red-400 opacity-60"
      )}
    >
      {icon}
    </button>
  );
}
