'use client';

import { useState, useTransition } from 'react';
import { updateChannel, deleteChannel } from '@/actions/admin-channels';
import { 
  Users, FileText, Calendar, MoreVertical, 
  Edit2, Trash2, Check, X, Loader2, ExternalLink 
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function ChannelManagementTable({ initialChannels }: { initialChannels: any[] }) {
  const [channels, setChannels] = useState(initialChannels);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [isPending, startTransition] = useTransition();

  const handleEdit = (channel: any) => {
    setEditingId(channel.id);
    setEditData({ name: channel.name, description: channel.description || '' });
  };

  const handleSave = async (id: string) => {
    startTransition(async () => {
      const res = await updateChannel(id, editData);
      if (res.success) {
        toast.success("Channel updated.");
        setChannels(prev => prev.map(c => c.id === id ? { ...c, ...editData } : c));
        setEditingId(null);
      } else {
        toast.error(res.error || "Failed to update.");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the channel and all its posts forever. This action is irreversible.")) return;

    startTransition(async () => {
      const res = await deleteChannel(id);
      if (res.success) {
        toast.success("Channel deleted.");
        setChannels(prev => prev.filter(c => c.id !== id));
      } else {
        toast.error(res.error || "Failed to delete.");
      }
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--glass-border)] bg-white/5">
            <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Channel</th>
            <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Stats</th>
            <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Creator</th>
            <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Activity</th>
            <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glass-border)]">
          {channels.map((channel) => (
            <tr key={channel.id} className="hover:bg-white/5 transition-colors">
              <td className="px-6 py-4">
                {editingId === channel.id ? (
                  <div className="space-y-2">
                    <input 
                      value={editData.name}
                      onChange={e => setEditData({...editData, name: e.target.value})}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white w-full"
                    />
                    <textarea 
                      value={editData.description}
                      onChange={e => setEditData({...editData, description: e.target.value})}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-400 w-full resize-none"
                      rows={2}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      #{channel.slug}
                      <Link href={`/channels/${channel.slug}`} target="_blank" className="text-[var(--text-muted)] hover:text-white">
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] line-clamp-1">{channel.name}</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <Users size={12} className="text-emerald-400 mb-1" />
                    <span className="text-xs font-bold text-white">{channel._count.subscribers}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <FileText size={12} className="text-indigo-400 mb-1" />
                    <span className="text-xs font-bold text-white">{channel._count.posts}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-xs text-[var(--text-muted)]">@{channel.creator.username}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col text-[10px]">
                  <span className="text-zinc-400">Created {new Date(channel.createdAt).toLocaleDateString()}</span>
                  <span className="text-zinc-500">{formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  {editingId === channel.id ? (
                    <>
                      <button onClick={() => handleSave(channel.id)} disabled={isPending} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(channel)} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(channel.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
