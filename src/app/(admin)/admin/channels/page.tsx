import { getAllChannels } from "@/actions/admin-channels";
import { Hash } from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css";
import Link from "next/link";
import { ChannelManagementTable } from "./_components/channel-table";

export default async function AdminChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const { channels, totalCount, page, totalPages } = await getAllChannels(Number(params.page) || 1);

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
          {totalCount} Channels
        </div>
      </div>

      <div className={`${styles.glassPanel} overflow-hidden`}>
        {/* Keyed by page so the table's local state resets when the page changes */}
        <ChannelManagementTable key={page} initialChannels={channels} />
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center text-sm text-[var(--text-muted)]">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
           {page > 1 && (
             <Link href={`?page=${page - 1}`} className="px-4 py-2 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] transition-colors">Previous</Link>
           )}
           {page < totalPages && (
             <Link href={`?page=${page + 1}`} className="px-4 py-2 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] transition-colors">Next</Link>
           )}
        </div>
      </div>
    </div>
  );
}
