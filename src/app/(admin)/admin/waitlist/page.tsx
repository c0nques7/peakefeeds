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
          <h1 className="text-2xl font-bold text-(--text-primary) flex items-center gap-3">
            <Ticket className="text-(--accent-primary) text-(--accent-primary)" />
            The Air Lock
          </h1>
          <p className="text-(--text-muted)">Batch activate users from the waitlist.</p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-(--text-muted) bg-(--glass-panel) px-4 py-2 rounded-full border border-(--glass-border)">
          <Users size={16} />
          <span>Queue Depth: </span>
          <span className="text-(--text-primary) font-bold">{pendingUsers.length} visible</span>
        </div>
      </div>

      {/* The Interactive Table */}
      <WaitlistTable initialData={pendingUsers} />
      
      <p className="text-xs text-(--text-muted) text-center mt-8">
        * Activating users generates a unique Invite Code and logs it to the console. 
        Email integration pending.
      </p>
    </div>
  );
}