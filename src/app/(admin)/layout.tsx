import { requireStaff } from "@/lib/rbac";
import Link from "next/link";
import { 
  ShieldAlert, 
  Users, 
  LayoutDashboard, 
  LogOut,
  Activity
} from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css";

// Assuming global CSS variables (bg-app, text-primary) are available via globals.css

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🔒 Security Check
  await requireStaff();

  return (
    <div className={styles.adminContainer}>
      {/* Background Orb */}
      <div className={styles.orbAdmin} />

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className="p-6 border-b border-[var(--glass-border)]">
          <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
            <ShieldAlert className="text-[var(--accent-primary)]" />
            <span className="text-white">PEAKE<span className="text-[var(--accent-primary)]">ADMIN</span></span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/admin" icon={<LayoutDashboard size={18} />} label="Mission Control" />
          <NavLink href="/admin/moderation" icon={<Activity size={18} />} label="Moderation Queue" />
          <NavLink href="/admin/users" icon={<Users size={18} />} label="User Registry" />
        </nav>

        <div className="p-4 border-t border-[var(--glass-border)]">
          <Link href="/home" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--glass-card-hover)] transition-all text-sm font-medium">
            <LogOut size={18} />
            <span>Exit to App</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--glass-card-hover)] hover:translate-x-1 transition-all"
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}