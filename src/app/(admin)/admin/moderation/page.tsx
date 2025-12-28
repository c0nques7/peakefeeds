import { getModerationQueue } from "@/actions/admin-moderation";
// 🟢 FIX: Import from local _components folder
import { ModerationCard } from "@/app/(admin)/admin/moderation/_components/moderation-card";
import { CheckCircle2 } from "lucide-react";

export default async function ModerationPage() {
  // 1. Fetch Reports (Server-Side)
  const reports = await getModerationQueue();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Moderation Queue</h1>
          <p className="text-[var(--text-muted)]">Review user reports and maintain protocol safety.</p>
        </div>
        <div className="text-sm text-[var(--text-muted)] font-mono bg-[var(--glass-panel)] px-3 py-1 rounded-full border border-[var(--glass-border)]">
          {reports.length} Pending
        </div>
      </div>

      {reports.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[var(--glass-border)] rounded-2xl bg-[var(--glass-panel)]">
          <CheckCircle2 size={48} className="text-emerald-500/50 mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)]">All Clear</h3>
          <p className="text-[var(--text-muted)]">No pending reports at this time.</p>
        </div>
      ) : (
        // Grid State
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {reports.map((report) => (
            // @ts-ignore - The Server Action includes specific relations that TS inference sometimes misses across boundaries
            <ModerationCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}