import { getAdminDashboardStats } from "@/actions/admin-dashboard";
import Link from "next/link";
import { Users, ShieldAlert, UserPlus, Ticket, ShieldCheck, ArrowRight, MessageSquare } from "lucide-react";
import styles from "./admin.module.css";
import { ButtonLink } from "@/components/ui";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-(--text-primary) mb-2">The Pulse</h2>
          <p className="text-(--text-muted)">Launch health, demand, and safety metrics.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-(--status-info-bg) text-(--status-info) border border-(--status-info)/20 text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--status-info) opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-(--status-info)"></span>
          </span>
          PHASE 2: GATING ACTIVE
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassStat 
          label="Waitlist Demand" 
          value={stats.waitlistCount?.toLocaleString() || "0"} 
          icon={<Ticket size={24} className="text-(--status-info)" />}
          trend="Potential Users"
          href="/admin/waitlist"
        />
        
        <GlassStat 
          label="Total Users" 
          value={stats.totalUsers.toLocaleString()} 
          icon={<Users size={24} className="text-(--accent-primary)" />}
        />

        <GlassStat 
          label="New Signups (24h)" 
          value={stats.recentSignups} 
          icon={<UserPlus size={24} className="text-(--accent-secondary)" />}
        />

        <GlassStat 
          label="Pending Reports" 
          value={stats.pendingReports} 
          icon={<ShieldAlert size={24} className="text-(--status-warning)" />}
          trend={stats.pendingReports > 0 ? "Needs Action" : "All Clear"}
          href="/admin/moderation"
        />
      </div>

      {/* Priority Action Area - Now with 3 Panels (Safety, Air Lock, Support) */}
      <div className="grid grid-cols-1 lg:col-span-2 gap-6">
        
        {/* 1. SAFETY QUEUE */}
        <div className={styles.glassPanel}>
          <div className="p-6 border-b border-(--glass-border) flex justify-between items-center">
            <h3 className="text-lg font-bold text-(--text-primary)">Safety Queue</h3>
          </div>
          <div className="p-6">
            {stats.pendingReports > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-(--radius-control) bg-(--status-warning-bg)">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-(--status-warning-bg) rounded-full text-(--status-warning)">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-(--text-primary)">Attention Required</h4>
                    <p className="text-sm text-(--text-muted)">{stats.pendingReports} reports pending.</p>
                  </div>
                </div>
                <ButtonLink href="/admin/moderation">Review reports</ButtonLink>
              </div>
            ) : (
               <div className="text-center py-4 text-(--text-muted)">
                  <ShieldCheck size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">System Secure.</p>
               </div>
            )}
          </div>
        </div>

        {/* 2. THE AIR LOCK */}
        <div className={styles.glassPanel}>
          <div className="p-6 border-b border-(--glass-border) flex justify-between items-center">
            <h3 className="text-lg font-bold text-(--text-primary)">The Air Lock</h3>
          </div>
          <div className="p-6">
            {stats.waitlistCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-(--radius-control) bg-(--status-info-bg)">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-(--status-info-bg) rounded-full text-(--status-info)">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-(--text-primary)">Admit Users</h4>
                    <p className="text-sm text-(--text-muted)">{stats.waitlistCount} people waiting.</p>
                  </div>
                </div>
                <ButtonLink href="/admin/waitlist" icon={<ArrowRight size={14} aria-hidden="true" />} className="flex-row-reverse">Open waitlist</ButtonLink>
              </div>
            ) : (
               <div className="text-center py-4 text-(--text-muted)">
                  <Ticket size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Waitlist empty.</p>
               </div>
            )}
          </div>
        </div>

        {/* 3. SUPPORT CHANNELS (NEW) */}
        <div className={`${styles.glassPanel} lg:col-span-2`}>
          <div className="p-6 border-b border-(--glass-border) flex justify-between items-center">
            <h3 className="text-lg font-bold text-(--text-primary)">Support Channels</h3>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-(--radius-control) bg-(--status-accent-bg)">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-(--status-accent-bg) rounded-full text-(--status-accent)">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-(--text-primary)">Help Bot Escalations</h4>
                  <p className="text-sm text-(--text-muted)">View live tickets from users requesting human assistance.</p>
                </div>
              </div>
              <ButtonLink href="/admin/support" icon={<ArrowRight size={14} aria-hidden="true" />} className="flex-row-reverse">Open support queue</ButtonLink>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper Component for Stats
function GlassStat({ label, value, icon, trend, href }: any) {
  const content = (
    <div className={`${styles.glassPanel} p-6 relative group transition-all hover:-translate-y-1 hover:border-(--accent-primary) cursor-pointer`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-(--glass-panel) text-(--text-primary) group-hover:bg-(--btn-primary) group-hover:text-(--btn-primary-text) transition-colors">
          {icon}
        </div>
        {trend && <span className="text-xs font-bold text-(--text-muted) group-hover:text-white uppercase tracking-wider transition-colors">{trend}</span>}
      </div>
      <p className="text-3xl font-bold text-(--text-primary) mb-1">{value}</p>
      <p className="text-sm text-(--text-muted)">{label}</p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}