import SupportQueue from "@/components/admin/SupportQueue";
import { MessageSquare } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-3">
            <MessageSquare className="text-pink-500" size={32} />
            Support Queue
          </h1>
          <p className="text-[var(--text-muted)]">
            Manage live chat tickets, assignments, and escalations.
          </p>
        </div>
      </div>

      {/* The Enhanced Queue Component */}
      <SupportQueue />
      
    </div>
  );
}