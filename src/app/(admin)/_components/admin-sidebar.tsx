"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
// 🟢 Added FileText, ScrollText, Hash to imports
import { 
  ShieldAlert, Users, LayoutDashboard, LogOut, Activity, Ticket, Menu, X, FileText, ScrollText, Hash, MessageSquare, Sun, Moon 
} from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css";

export function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar automatically when a link is clicked (Better UX)
  const handleLinkClick = () => setIsOpen(false);

  return (
    <>
      {/* 1. Mobile Top Bar (Visible only on small screens) */}
      <header className={styles.mobileHeader}>
        <div className="flex items-center gap-2">
           <ShieldAlert className="text-[var(--accent-primary)]" size={24} />
           <span className="font-bold text-[var(--text-primary)] tracking-wider">PEAKE<span className="text-[var(--accent-primary)]">ADMIN</span></span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* 2. Backdrop Overlay (Click to close) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. The Sidebar Drawer */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className="p-6 border-b border-[var(--glass-border)] hidden md:block">
          <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
            <ShieldAlert className="text-[var(--accent-primary)]" />
            <span className="text-[var(--text-primary)]">PEAKE<span className="text-[var(--accent-primary)]">ADMIN</span></span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLink href="/admin" icon={<LayoutDashboard size={18} />} label="The Pulse" active={pathname === "/admin"} onClick={handleLinkClick} />
          <NavLink href="/admin/waitlist" icon={<Ticket size={18} />} label="Waitlist (Air Lock)" active={pathname.startsWith("/admin/waitlist")} onClick={handleLinkClick} />
          <NavLink href="/admin/moderation" icon={<Activity size={18} />} label="Moderation Queue" active={pathname.startsWith("/admin/moderation")} onClick={handleLinkClick} />
          <NavLink href="/admin/users" icon={<Users size={18} />} label="User Registry" active={pathname.startsWith("/admin/users")} onClick={handleLinkClick} />
          
          {/* 🟢 New Post Management Link */}
          <NavLink href="/admin/posts" icon={<FileText size={18} />} label="Post Management" active={pathname.startsWith("/admin/posts")} onClick={handleLinkClick} />
          
          {/* 🟢 New Admin Logging Link */}
          <NavLink href="/admin/logs" icon={<ScrollText size={18} />} label="Admin Logging" active={pathname.startsWith("/admin/logs")} onClick={handleLinkClick} />

          {/* 🟢 New Channel Management Link */}
          <NavLink href="/admin/channels" icon={<Hash size={18} />} label="Channel Management" active={pathname.startsWith("/admin/channels")} onClick={handleLinkClick} />

          {/* 🟢 New Support Queue Link */}
          <NavLink href="/admin/support" icon={<MessageSquare size={18} />} label="Support Queue" active={pathname.startsWith("/admin/support")} onClick={handleLinkClick} />
        </nav>

        <div className="p-4 border-t border-[var(--glass-border)] space-y-2">
          {mounted && (
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm font-medium w-full text-left"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>
          )}

          <Link href="/home" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm font-medium">
            <LogOut size={18} />
            <span>Exit to App</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

// Helper Component for consistency
function NavLink({ href, icon, label, active, onClick }: any) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        active 
        ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-indigo-500/20" 
        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}