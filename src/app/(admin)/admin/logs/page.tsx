import { getAdminLogs } from "@/actions/admin-logs";
import { AdminLogType } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, User, Info, Calendar, Terminal } from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css";
import LogFilters from "./_components/LogFilters";

interface LogsPageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
    adminId?: string;
    search?: string;
  }>;
}

export default async function AdminLogsPage({ searchParams }: LogsPageProps) {
  const { page, type, adminId, search } = await searchParams;
  const currentPage = parseInt(page || "1");
  const eventType = type as AdminLogType | undefined;

  const { logs, totalPages, totalCount } = await getAdminLogs({
    page: currentPage,
    eventType,
    adminId,
    search,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Terminal className="text-[var(--accent-primary)]" />
            Admin Logging
          </h1>
          <p className="text-[var(--text-muted)]">Audit trail of all administrative actions and security events.</p>
        </div>
        <div className="text-sm text-[var(--text-muted)] font-mono bg-[var(--glass-panel)] px-3 py-1 rounded-full border border-[var(--glass-border)]">
          {totalCount} Total Events
        </div>
      </div>

      <LogFilters />

      {/* Logs Table */}
      <div className={`${styles.glassPanel} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--glass-border)] bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Admin</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Event Type</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)] italic">
                    No log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-xs">
                        <span className="text-white font-medium">{new Date(log.createdAt).toLocaleString()}</span>
                        <span className="text-[var(--text-muted)]">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <User size={12} />
                        </div>
                        <span className="text-sm text-white">@{log.admin.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getLogTypeStyles(log.eventType)}`}>
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded">
                        {log.targetResource || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs overflow-hidden text-ellipsis">
                        <pre className="text-[10px] text-[var(--text-muted)] font-mono leading-tight whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pb-10">
          {Array.from({ length: totalPages }).map((_, i) => (
            <a
              key={i}
              href={`?page=${i + 1}${type ? `&type=${type}` : ''}${adminId ? `&adminId=${adminId}` : ''}${search ? `&search=${search}` : ''}`}
              className={`px-4 py-2 rounded-lg border transition-all text-xs font-bold ${
                currentPage === i + 1
                  ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]"
                  : "bg-[var(--glass-panel)] text-[var(--text-muted)] border-[var(--glass-border)] hover:text-white"
              }`}
            >
              {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function getLogTypeStyles(type: AdminLogType) {
  switch (type) {
    case 'AUTH_LOGIN': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'AUTH_LOGOUT': return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    case 'USER_UPDATE': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'USER_DELETE': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'CONTENT_LOCK': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'CONTENT_UNLOCK': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'REPORT_RESOLVE': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'CONFIG_CHANGE': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'SUPPORT_TICKET': return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
}
