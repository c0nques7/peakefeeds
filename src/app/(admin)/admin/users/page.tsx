import { getAdminUsers } from "@/actions/admin-users";
import Link from "next/link";
import { Search, Filter, Shield } from "lucide-react";
import styles from "../admin.module.css";
import { UserRole } from "@prisma/client";
// 🟢 Import the new Create Button
import { CreateUserButton } from "./_components/create-user-button"; 

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const role = params.role || "ALL";
  const status = (params.status as "banned" | "active") || undefined;
  const page = Number(params.page) || 1;

  const { users, totalPages } = await getAdminUsers({ query, role, status, page });

  return (
    <div className="space-y-6">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Registry</h1>
          <p className="text-[var(--text-muted)]">Manage roles, permissions, and bans.</p>
        </div>

        {/* Action Area: Create Button + Search Form */}
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-stretch md:items-end">
            
            {/* 🟢 The New Create Button */}
            <div className="w-full md:w-auto">
               <CreateUserButton />
            </div>
            
            {/* Search & Filter Form (Responsive Layout from Script A) */}
            <form className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative group w-full md:w-auto">
                <Search className="absolute left-3 top-2.5 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)]" size={18} />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] w-full md:w-64 transition-all"
                />
              </div>
              
              <select 
                name="role" 
                defaultValue={role}
                className="px-4 py-2 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] appearance-none cursor-pointer w-full md:w-auto"
              >
                <option value="ALL">All Roles</option>
                {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <button type="submit" className="hidden">Submit</button>
            </form>
        </div>
      </div>

      {/* DATA TABLE (Horizontal Scroll Wrapper from Script A) */}
      <div className={styles.tableWrapper}>
        <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
          <thead>
            <tr>
              <th className={`p-4 ${styles.tableHeader}`}>User Identity</th>
              <th className={`p-4 ${styles.tableHeader}`}>Role</th>
              {/* Hide Stats on Mobile to save space */}
              <th className={`p-4 ${styles.tableHeader} hidden md:table-cell`}>Stats</th>
              <th className={`p-4 ${styles.tableHeader}`}>Safety Standing</th>
              <th className={`p-4 ${styles.tableHeader} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)]">
            {users.map((user) => (
              <tr key={user.id} className={styles.tableRow}>
                {/* Identity */}
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-[var(--text-primary)]">@{user.username || "Anon"}</span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">{user.email}</span>
                  </div>
                </td>

                {/* Role */}
                <td className="p-4">
                  <span className={`
                    ${styles.badge} 
                    ${user.role === 'ADMIN' ? styles.badgeRed : 
                      user.role === 'MODERATOR' ? styles.badgeGold : 
                      user.role === 'BUSINESS' ? styles.badgeBlue : 
                      'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'}
                  `}>
                    {user.role}
                  </span>
                </td>

                {/* Stats (Hidden on Mobile) */}
                <td className="p-4 text-sm text-[var(--text-muted)] hidden md:table-cell">
                  <div>{user._count.posts} Posts</div>
                  <div className="text-xs opacity-70">Joined {new Date(user.createdAt).toLocaleDateString()}</div>
                </td>

                {/* Safety Standing */}
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {user.isBanned ? (
                      <span className={`${styles.badge} ${styles.badgeRed}`}>BANNED</span>
                    ) : user.strikeCount > 0 ? (
                      <span className={`${styles.badge} ${styles.badgeGold}`}>
                        {user.strikeCount} Strike{user.strikeCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeGreen}`}>Good</span>
                    )}
                    
                    {user._count.reportsAgainst > 0 && (
                      <span className="text-xs text-orange-400 font-mono ml-2 flex items-center gap-1">
                        <Shield size={12} /> {user._count.reportsAgainst} Reports
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="p-4 text-right">
                  <Link 
                    href={`/admin/users/${user.id}`}
                    className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && (
          <div className="p-12 text-center text-[var(--text-muted)]">
             <Filter size={48} className="mx-auto mb-4 opacity-20" />
             <p>No users found matching filters.</p>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center text-sm text-[var(--text-muted)]">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
           {page > 1 && (
             <Link href={`?page=${page - 1}&q=${query}&role=${role}`} className="px-4 py-2 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] transition-colors">Previous</Link>
           )}
           {page < totalPages && (
             <Link href={`?page=${page + 1}&q=${query}&role=${role}`} className="px-4 py-2 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] transition-colors">Next</Link>
           )}
        </div>
      </div>
    </div>
  );
}