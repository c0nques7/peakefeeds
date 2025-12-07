import { getAdminDashboardStats } from "@/actions/admin-dashboard";
import Link from "next/link";
import { Users, ShieldAlert, Ban, UserPlus } from "lucide-react";
import styles from "./admin.module.css";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">System Overview</h2>
          <p className="text-[var(--text-muted)]">Live protocol metrics and alerts.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          OPERATIONAL
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassStat 
          label="Pending Reports" 
          value={stats.pendingReports} 
          icon={<ShieldAlert size={24} className="text-orange-400" />}
          trend="Needs Action"
          href="/admin/moderation"
        />
        <GlassStat 
          label="Total Users" 
          value={stats.totalUsers.toLocaleString()} 
          icon={<Users size={24} className="text-blue-400" />}
        />
        <GlassStat 
          label="New Signups (24h)" 
          value={stats.recentSignups} 
          icon={<UserPlus size={24} className="text-purple-400" />}
        />
        <GlassStat 
          label="Banned Identities" 
          value={stats.bannedUsers} 
          icon={<Ban size={24} className="text-red-400" />}
        />
      </div>

      {/* Priority Action Area */}
      <div className={styles.glassPanel}>
        <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Priority Actions</h3>
        </div>
        <div className="p-6">
          {stats.pendingReports > 0 ? (
            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/20 rounded-full text-orange-400">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-orange-100">Moderation Queue Active</h4>
                  <p className="text-sm text-orange-200/70">{stats.pendingReports} reports require adjudication.</p>
                </div>
              </div>
              <Link 
                href="/admin/moderation"
                className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
              >
                Review Queue
              </Link>
            </div>
          ) : (
             <div className="text-center py-8 text-[var(--text-muted)]">
                <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
                <p>All clear. No pending actions.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Component for Stats
function GlassStat({ label, value, icon, trend, href }: any) {
  const content = (
    <div className={`${styles.glassPanel} p-6 relative group transition-all hover:-translate-y-1 hover:border-[var(--accent-primary)]`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-[var(--glass-panel)] text-[var(--text-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors">
          {icon}
        </div>
        {trend && <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">{trend}</span>}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
import { ShieldCheck } from "lucide-react";