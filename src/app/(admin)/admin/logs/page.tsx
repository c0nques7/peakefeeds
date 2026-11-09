import { getAdminLogs } from "@/actions/admin-logs";
import { AdminLogType } from "@/generated/prisma/client";
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
          <h1 className="text-2xl font-bold text-(--text-primary) flex items-center gap-3">
            <Terminal className="text-(--accent-primary)" />
            Admin Logging
          </h1>
          <p className="text-(--text-muted)">Audit trail of all administrative actions and security events.</p>
        </div>
        <div className="text-sm text-(--text-muted) font-mono bg-(--glass-panel) px-3 py-1 rounded-full border border-(--glass-border)">
          {totalCount} Total Events
        </div>
      </div>

      <LogFilters />

      {/* Logs Table */}
      <div className={`${styles.glassPanel} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-(--glass-border) bg-black/5">
                <th className="px-6 py-4 text-xs font-bold text-(--text-muted) uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-(--text-muted) uppercase tracking-wider">Admin</th>
                <th className="px-6 py-4 text-xs font-bold text-(--text-muted) uppercase tracking-wider">Event Type</th>
                <th className="px-6 py-4 text-xs font-bold text-(--text-muted) uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-xs font-bold text-(--text-muted) uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--glass-border)">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-(--text-muted) italic">
                    No log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-black/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-xs">
                        <span className="text-(--text-primary) font-medium">{new Date(log.createdAt).toLocaleString()}</span>
                        <span className="text-(--text-muted)">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-(--status-info-bg) flex items-center justify-center text-(--accent-primary) text-(--accent-primary)">
                          <User size={12} />
                        </div>
                        <span className="text-sm text-(--text-primary)">@{log.admin.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getLogTypeStyles(log.eventType)}`}>
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-(--text-muted) bg-black/5 px-2 py-1 rounded-sm">
                        {log.targetResource || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs overflow-hidden text-ellipsis">
                        <pre className="text-[10px] text-(--text-muted) font-mono leading-tight whitespace-pre-wrap">
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
                  ? "bg-(--btn-primary) text-(--btn-primary-text) border-(--btn-primary)"
                  : "bg-(--glass-panel) text-(--text-muted) border-(--glass-border) hover:text-(--text-primary)"
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
    case 'AUTH_LOGIN': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'AUTH_LOGOUT': return 'text-(--text-muted) bg-(--glass-card-hover) border-(--glass-border)';
    case 'USER_UPDATE': return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'USER_DELETE': return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
    case 'CONTENT_LOCK': return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'CONTENT_UNLOCK': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'REPORT_RESOLVE': return 'text-(--accent-primary) text-(--accent-primary) bg-(--status-info-bg) border-(--accent-primary)';
    case 'CONFIG_CHANGE': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'SUPPORT_TICKET': return 'text-(--accent-primary) text-(--accent-primary) bg-(--status-info-bg) border-(--accent-primary)';
    default: return 'text-(--text-muted) bg-(--glass-card-hover) border-(--glass-border)';
  }
}
