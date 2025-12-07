import { getAdminDashboardStats } from "@/actions/admin-dashboard";
import Link from "next/link";
import { Users, ShieldAlert, UserPlus, Ticket, ShieldCheck, ArrowRight } from "lucide-react";
import styles from "./admin.module.css";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">The Pulse</h2>
          <p className="text-[var(--text-muted)]">Launch health, demand, and safety metrics.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          PHASE 2: GATING ACTIVE
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Demand (Waitlist) */}
        <GlassStat 
          label="Waitlist Demand" 
          // @ts-ignore - handled by server action update
          value={stats.waitlistCount?.toLocaleString() || "0"} 
          icon={<Ticket size={24} className="text-indigo-400" />}
          trend="Potential Users"
          href="/admin/waitlist"
        />
        
        {/* 2. Supply (Total Users) */}
        <GlassStat 
          label="Total Users" 
          value={stats.totalUsers.toLocaleString()} 
          icon={<Users size={24} className="text-blue-400" />}
        />

        {/* 3. Velocity (New Signups) */}
        <GlassStat 
          label="New Signups (24h)" 
          value={stats.recentSignups} 
          icon={<UserPlus size={24} className="text-purple-400" />}
        />

        {/* 4. Safety (Reports) */}
        <GlassStat 
          label="Pending Reports" 
          value={stats.pendingReports} 
          icon={<ShieldAlert size={24} className="text-orange-400" />}
          trend={stats.pendingReports > 0 ? "Needs Action" : "All Clear"}
          href="/admin/moderation"
        />
      </div>

      {/* Priority Action Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ACTION 1: SAFETY */}
        <div className={styles.glassPanel}>
          <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Safety Queue</h3>
          </div>
          <div className="p-6">
            {stats.pendingReports > 0 ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-full text-orange-400">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-orange-100">Attention Required</h4>
                    <p className="text-sm text-orange-200/70">{stats.pendingReports} reports pending.</p>
                  </div>
                </div>
                <Link 
                  href="/admin/moderation"
                  className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                >
                  Review
                </Link>
              </div>
            ) : (
               <div className="text-center py-4 text-[var(--text-muted)]">
                  <ShieldCheck size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">System Secure.</p>
               </div>
            )}
          </div>
        </div>

        {/* ACTION 2: GROWTH (THE AIR LOCK) */}
        <div className={styles.glassPanel}>
          <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">The Air Lock</h3>
          </div>
          <div className="p-6">
            {/* @ts-ignore */}
            {stats.waitlistCount > 0 ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-100">Admit Users</h4>
                    {/* @ts-ignore */}
                    <p className="text-sm text-indigo-200/70">{stats.waitlistCount} people waiting.</p>
                  </div>
                </div>
                <Link 
                  href="/admin/waitlist"
                  className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  Manage Batch <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
               <div className="text-center py-4 text-[var(--text-muted)]">
                  <Ticket size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Waitlist empty.</p>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper Component for Stats
function GlassStat({ label, value, icon, trend, href }: any) {
  const content = (
    <div className={`${styles.glassPanel} p-6 relative group transition-all hover:-translate-y-1 hover:border-[var(--accent-primary)] cursor-pointer`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-[var(--glass-panel)] text-[var(--text-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors">
          {icon}
        </div>
        {trend && <span className="text-xs font-bold text-[var(--text-muted)] group-hover:text-white uppercase tracking-wider transition-colors">{trend}</span>}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}