import { getPendingWaitlist } from "@/actions/admin-waitlist";
import { WaitlistTable } from "./_components/waitlist-table";
import { Ticket, Users } from "lucide-react";

export default async function WaitlistPage() {
  // Fetch up to 100 pending users
  const pendingUsers = await getPendingWaitlist(100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Ticket className="text-purple-600 dark:text-purple-400" />
            The Air Lock
          </h1>
          <p className="text-[var(--text-muted)]">Batch activate users from the waitlist.</p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] bg-[var(--glass-panel)] px-4 py-2 rounded-full border border-[var(--glass-border)]">
          <Users size={16} />
          <span>Queue Depth: </span>
          <span className="text-slate-900 dark:text-white font-bold">{pendingUsers.length} visible</span>
        </div>
      </div>

      {/* The Interactive Table */}
      <WaitlistTable initialData={pendingUsers} />
      
      <p className="text-xs text-[var(--text-muted)] text-center mt-8">
        * Activating users generates a unique Invite Code and logs it to the console. 
        Email integration pending.
      </p>
    </div>
  );
}