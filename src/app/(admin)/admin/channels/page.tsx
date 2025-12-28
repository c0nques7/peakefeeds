import { getAllChannels } from "@/actions/admin-channels";
import { Hash, Users, FileText, Calendar, MoreVertical, Edit2, Trash2 } from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css";
import Link from "next/link";
import { ChannelManagementTable } from "./_components/channel-table";

export default async function AdminChannelsPage() {
  const channels = await getAllChannels();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Hash className="text-[var(--accent-primary)]" />
            Channel Management
          </h1>
          <p className="text-[var(--text-muted)]">Oversee all protocol channels, their growth, and activity.</p>
        </div>
        <div className="text-sm text-[var(--text-muted)] font-mono bg-[var(--glass-panel)] px-3 py-1 rounded-full border border-[var(--glass-border)]">
          {channels.length} Channels
        </div>
      </div>

      <div className={`${styles.glassPanel} overflow-hidden`}>
        <ChannelManagementTable initialChannels={channels} />
      </div>
    </div>
  );
}
