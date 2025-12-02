'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { 
  Compass, User, Home, Wallet, Mountain, ChevronLeft, Menu, LogOut, LogIn,
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
    role?: string | null; // This now expects "STANDARD", "ADMIN", etc.
  }
}

// --- CONFIGURATION (Matched to Prisma Schema) ---
const ROLE_CONFIG: Record<string, { icon: any, className: string, label: string }> = {
  // Trust & Transparency
  GOVERNMENT:   { icon: Building2,   className: styles.badgeGov,      label: 'Official' },
  FACT_CHECKER: { icon: ShieldCheck, className: styles.badgeChecker,  label: 'Verifier' },
  BOT:          { icon: Bot,         className: styles.badgeBot,      label: 'Automated' },
  
  // Commercial
  BUSINESS:     { icon: Briefcase,   className: styles.badgeBiz,      label: 'Business' },
  INFLUENCER:   { icon: Sparkles,    className: styles.badgeCreator,  label: 'Creator' },
  
  // Management
  MODERATOR:    { icon: Gavel,       className: styles.badgeMod,      label: 'Mod' },
  ADMIN:        { icon: ShieldCheck, className: styles.badgeMod,      label: 'Admin' },

  // Default
  STANDARD:     { icon: CheckCircle, className: styles.badgeStandard, label: 'Verified' },
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const prevWidth = useRef(0);

  // --- ROLE LOGIC ---
  // 1. Get role from user object or default to STANDARD (Prisma default)
  const rawRole = user?.role || 'STANDARD'; 
  const normalizedRole = rawRole.toUpperCase(); 
  
  // 2. Lookup Config
  const BadgeConfig = ROLE_CONFIG[normalizedRole] || ROLE_CONFIG['STANDARD'];

  // ... (Rest of component remains exactly the same as previous) ...
  // ... (Copy the Responsive Logic, Render Return, etc. from previous response) ...
  
  // NOTE: For brevity, I am not repeating the unchanged render HTML. 
  // Just paste the ROLE_CONFIG and ROLE LOGIC updates above into your existing file.
  
  // ...
  
  // --- RESPONSIVE LOGIC ---
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
          <button 
            onClick={() => setIsOpen(true)} 
            className="fixed top-[100px] left-0 z-40 p-3 bg-[var(--glass-panel)] backdrop-blur-md border-y border-r border-[var(--glass-border)] rounded-r-xl shadow-lg hover:bg-[var(--glass-card-hover)] transition-all"
          >
              <Menu size={24} className="text-[var(--text-primary)]" />
          </button>
      );
  }

  return (
    <div className={styles.sidebar}>
      <button onClick={() => setIsOpen(false)} className={styles.collapseHandle}>
        <ChevronLeft size={16} />
      </button>

      <div className="mb-6 px-2 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 rounded-lg flex-shrink-0 flex items-center justify-center text-white shadow-lg">
          <Mountain size={18} fill="currentColor" />
        </div>
        <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
          PeakeFeeds
        </span>
      </div>

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
                    {/* Role Status Dot */}
                    <div className={clsx(
                        "absolute bottom-0 right-0 w-5 h-5 rounded-full border-[3px] border-[#050505] flex items-center justify-center shadow-sm", 
                        BadgeConfig.className
                    )}>
                        <BadgeConfig.icon size={10} strokeWidth={3} className="text-white" />
                    </div>
                </div>
                
                <div className="text-center">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[160px]">
                        @{user.username || 'User'}
                    </p>
                    <div className={clsx(styles.rolePill, BadgeConfig.className, "mt-1")}>
                        {BadgeConfig.label}
                    </div>
                </div>
            </Link>
        ) : (
            <div className={styles.loginCard}>
                <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[var(--glass-card)] flex items-center justify-center text-[var(--accent-primary)] mb-1">
                        <User size={20} />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Join the Truth Layer</h3>
                    <p className="text-[10px] text-[var(--text-muted)] leading-tight mb-2">
                        Verify information and earn trust badges.
                    </p>
                    <Link href="/api/auth/signin" className={styles.loginButton}>
                        Sign In / Sign Up
                    </Link>
                </div>
            </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        <NavLink href="/home" icon={Home} label="Home" />
        <NavLink href="/discover" icon={Compass} label="Discover" />
        {user && (
            <>
                <NavLink href={`/profile/${user.username || 'me'}`} icon={User} label="Profile" />
                <NavLink href={`/profile/${user.username || 'me'}?tab=wallet`} icon={Wallet} label="Wallet" />
            </>
        )}
      </nav>

      <div className="mt-auto pt-4 space-y-2">
        <div className="flex items-center justify-between px-2 pt-2 border-t border-[var(--glass-border)]">
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