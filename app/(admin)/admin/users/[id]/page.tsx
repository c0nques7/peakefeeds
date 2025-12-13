import { getUserDetails } from "@/actions/admin-user-detail";
import { notFound } from "next/navigation";
import { UserRoleSelector } from "./_components/role-selector";
import { BanButton } from "./_components/ban-button";
import { ResetPasswordButton } from "./_components/reset-password-button";
// 🟢 Import the new Email Triggers component
import { EmailTriggers } from "./_components/email-triggers";

import styles from "@/app/(admin)/admin/admin.module.css"; 
import { ArrowLeft, Shield, AlertTriangle, Calendar, Lock, Mail } from "lucide-react";
import Link from "next/link";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Await params to extract ID (Next.js 15+)
  const { id } = await params;
  
  const user = await getUserDetails(id);

  if (!user) notFound();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link 
        href="/admin/users" 
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Registry
      </Link>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[var(--glass-panel)] flex items-center justify-center text-3xl font-bold text-[var(--accent-primary)] border border-[var(--glass-border)]">
            {user.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">@{user.username || "Anonymous"}</h1>
            <p className="text-[var(--text-muted)]">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 text-xs font-mono text-[var(--text-muted)]">
              <span className="px-2 py-0.5 rounded bg-[var(--glass-panel)] border border-[var(--glass-border)]">
                ID: {user.id}
              </span>
              <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <BanButton userId={user.id} isBanned={user.isBanned} />
        </div>
      </div>

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CONTROLS */}
        <div className="space-y-6">
          
          {/* Permissions Card */}
          <div className={styles.glassPanel}>
            <div className="p-4 border-b border-[var(--glass-border)]">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-[var(--accent-primary)]" />
                Permissions
              </h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Global Role</label>
              <UserRoleSelector userId={user.id} currentRole={user.role} />
            </div>
          </div>

          {/* Security & Access Card */}
          <div className={styles.glassPanel}>
            <div className="p-4 border-b border-[var(--glass-border)]">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Lock size={18} className="text-blue-400" />
                Security & Access
              </h3>
            </div>
            <div className="p-4 space-y-4">
               {/* 1. Password Reset */}
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Recovery</label>
                 <ResetPasswordButton userId={user.id} />
               </div>

               {/* 2. 🟢 Manual Email Triggers (Debug Tools) */}
               <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
                 <label className="text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-2">
                    <Mail size={12} /> Email Tools (Debug)
                 </label>
                 <EmailTriggers userId={user.id} />
               </div>
            </div>
          </div>

          {/* Risk Profile Card */}
          <div className={styles.glassPanel}>
            <div className="p-4 border-b border-[var(--glass-border)]">
              <h3 className="font-bold text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-400" />
                Risk Profile
              </h3>
            </div>
            <div className="p-6 space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-sm text-[var(--text-muted)]">Reports Against</span>
                 <span className="text-white font-mono">{user._count.reportsAgainst}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm text-[var(--text-muted)]">Active Strikes</span>
                 <span className="text-white font-mono">{user.strikeCount}</span>
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HISTORY */}
        <div className={`lg:col-span-2 ${styles.glassPanel}`}>
          <div className="p-4 border-b border-[var(--glass-border)]">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-blue-400" />
              Penalty History
            </h3>
          </div>
          <div className="p-0">
            {user.penaltiesReceived.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                <p>Clean record. No penalties found.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[var(--glass-panel)] text-xs uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="p-4">Type</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border)]">
                  {user.penaltiesReceived.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--glass-card-hover)]">
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded border 
                          ${p.type === 'PERMANENT_BAN' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                            'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-[var(--text-muted)]">{p.reason}</td>
                      <td className="p-4 text-sm text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}