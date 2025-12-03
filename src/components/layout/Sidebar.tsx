'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { 
  Compass, User, Home, Mountain, ChevronLeft, Menu, LogOut, LogIn,
  ShieldCheck, Building2, Sparkles, Bot, Gavel, CheckCircle, Briefcase
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle'; 
import styles from './sidebar.module.css';

interface SidebarProps {
  user?: { 
    name?: string | null; 
    email?: string | null; 
    image?: string | null; 
    username?: string | null;
    role?: string | null; 
  }
}

// --- CONFIGURATION ---
const ROLE_CONFIG: Record<string, { icon: any, className: string, label: string }> = {
  GOVERNMENT:   { icon: Building2,   className: styles.badgeGov,      label: 'Official' },
  FACT_CHECKER: { icon: ShieldCheck, className: styles.badgeChecker,  label: 'Verifier' },
  BOT:          { icon: Bot,         className: styles.badgeBot,      label: 'Automated' },
  BUSINESS:     { icon: Briefcase,   className: styles.badgeBiz,      label: 'Business' },
  INFLUENCER:   { icon: Sparkles,    className: styles.badgeCreator,  label: 'Creator' },
  MODERATOR:    { icon: Gavel,       className: styles.badgeMod,      label: 'Mod' },
  ADMIN:        { icon: ShieldCheck, className: styles.badgeMod,      label: 'Admin' },
  STANDARD:     { icon: CheckCircle, className: styles.badgeStandard, label: 'Verified' },
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const prevWidth = useRef(0);

  const rawRole = user?.role || 'STANDARD'; 
  const normalizedRole = rawRole.toUpperCase(); 
  const BadgeConfig = ROLE_CONFIG[normalizedRole] || ROLE_CONFIG['STANDARD'];

  useEffect(() => {
    if (typeof window !== 'undefined') {
        prevWidth.current = window.innerWidth;
        setIsOpen(window.innerWidth >= 1200);
    }
    const handleResize = () => {
        const currWidth = window.innerWidth;
        if (currWidth === prevWidth.current) return;
        prevWidth.current = currWidth;
        if (currWidth >= 640 && currWidth < 1200) setIsOpen(false);
        else if (currWidth >= 1200) setIsOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (path: string) => pathname === path;

  const NavLink = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
    const active = isActive(href);
    return (
      <Link href={href} className={clsx(styles.navItem, active && styles.navItemActive)}>
        <Icon size={20} className={clsx(active ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]")} />
        <span className="font-medium text-sm">{label}</span>
      </Link>
    );
  };

  if (!isOpen) {
      return (
          <button onClick={() => setIsOpen(true)} className={styles.menuTrigger} aria-label="Open Menu">
              <Menu size={20} strokeWidth={2.5} />
              <span className={styles.menuText}>MENU</span>
          </button>
      );
  }

  return (
    <div className={styles.sidebar}>
      
      {/* Collapse Handle */}
      <button onClick={() => setIsOpen(false)} className={styles.collapseHandle} aria-label="Collapse Menu">
        <ChevronLeft size={16} />
      </button>

      {/* Brand Header */}
      <div className="mb-6 px-2 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 rounded-lg flex-shrink-0 flex items-center justify-center text-white shadow-lg">
          <Mountain size={18} fill="currentColor" />
        </div>
        <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
          PeakeFeeds
        </span>
      </div>

      {/* User / Guest Card */}
      <div className={styles.userHeader}>
        {user ? (
            <Link href={`/profile/${user.username || 'me'}`} className={styles.userCard}>
                <div className="relative mb-2 transition-transform duration-300 group-hover:scale-105">
                    <div className="w-16 h-16 rounded-full bg-[var(--accent-secondary)] flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 ring-[var(--glass-border)] overflow-hidden">
                        {user.image ? (
                            <img src={user.image} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            user.username?.[0]?.toUpperCase()
                        )}
                    </div>
                    <div className={clsx("absolute bottom-0 right-0 w-5 h-5 rounded-full border-[3px] border-[#050505] flex items-center justify-center shadow-sm", BadgeConfig.className)}>
                        <BadgeConfig.icon size={10} strokeWidth={3} className="text-white" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[160px]">@{user.username || 'User'}</p>
                    <div className={clsx(styles.rolePill, BadgeConfig.className, "mt-1")}>{BadgeConfig.label}</div>
                </div>
            </Link>
        ) : (
            <div className={styles.loginCard}>
                <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[var(--glass-card)] flex items-center justify-center text-[var(--accent-primary)] mb-1">
                        <User size={20} />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Join the Truth Layer</h3>
                    <p className="text-[10px] text-[var(--text-muted)] leading-tight mb-2">Verify information and earn trust badges.</p>
                    <Link href="/api/auth/signin" className={styles.loginButton}>Sign In / Sign Up</Link>
                </div>
            </div>
        )}
      </div>

      {/* Navigation Links (REMOVED: flex-1, Wallet) */}
      <nav className="space-y-1 mb-4">
        <NavLink href="/home" icon={Home} label="Home" />
        <NavLink href="/discover" icon={Compass} label="Discover" />
        {user && (
           <NavLink href={`/profile/${user.username || 'me'}`} icon={User} label="Profile" />
           /* Wallet Link Removed Here */
        )}
      </nav>

      {/* Footer Actions (Moved directly after nav items) */}
      <div className="space-y-2 pb-6">
        <div className="flex items-center justify-between px-2 pt-4 border-t border-[var(--glass-border)]">
            <ThemeToggle /> 
            {user ? (
                <Link href="/api/auth/signout" className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-red-400 hover:text-red-500 transition-colors">
                    <LogOut size={14} />
                    <span>Sign Out</span>
                </Link>
            ) : (
                <Link href="/api/auth/signin" className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-[var(--accent-primary)] hover:text-white transition-colors">
                    <LogIn size={14} />
                    <span>Log In</span>
                </Link>
            )}
        </div>
      </div>

    </div>
  );
}

