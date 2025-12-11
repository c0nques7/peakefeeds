'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { 
  Compass, User, Home, Mountain, ChevronLeft, Menu, LogOut, LogIn,
  ShieldCheck, Building2, Sparkles, Bot, Gavel, CheckCircle, Briefcase, 
  Bell, MessageCircle 
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner'; 
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
  
  // State
  const [isOpen, setIsOpen] = useState(false); 
  const [isIntro, setIsIntro] = useState(false); 
  const [showHints, setShowHints] = useState(false); // 🆕 Checkbox State

  const rawRole = user?.role || 'STANDARD'; 
  const normalizedRole = rawRole.toUpperCase(); 
  const BadgeConfig = ROLE_CONFIG[normalizedRole] || ROLE_CONFIG['STANDARD'];

  const isActive = (path: string) => pathname.startsWith(path);

  // --- ONBOARDING LOGIC ---
  useEffect(() => {
    if (!user) return;

    // Check LocalStorage on mount
    const hasSeenIntro = localStorage.getItem('peake_intro_complete');
    
    // Sync Checkbox State (If "seen" is null/false, then hints are ON)
    setShowHints(!hasSeenIntro);

    if (!hasSeenIntro) {
      setTimeout(() => {
        toast('Welcome to the Truth Layer', {
          description: 'Would you like a quick visual tour of the navigation?',
          action: {
            label: 'Show Me',
            onClick: () => runIntroSequence()
          },
          cancel: {
            label: 'No Thanks',
            onClick: () => disableHints() // Use helper
          },
          duration: Infinity 
        });
      }, 1000);
    } 
  }, [user]);

  const runIntroSequence = () => {
    // 1. Reset state to ensure animation plays even if already open
    setIsOpen(true);   
    setIsIntro(true);  
    
    // 2. Play Sequence
    setTimeout(() => {
      setIsOpen(false); 
      setIsIntro(false); 
      // We do NOT disable hints here automatically anymore, 
      // unless you want it to be a "one-time only" thing.
      // If we want the checkbox to stay checked, we don't set localStorage here.
      // BUT, usually "intro" implies one-time. 
      // Let's set it to 'true' (disabled) so it doesn't annoy them next refresh.
      disableHints();
    }, 600);
  };

  // Helper to turn OFF hints
  const disableHints = () => {
    localStorage.setItem('peake_intro_complete', 'true');
    setShowHints(false);
  };

  // Helper to turn ON hints
  const enableHints = () => {
    localStorage.removeItem('peake_intro_complete');
    setShowHints(true);
    runIntroSequence(); // Demonstrate immediately
  };

  // Toggle Handler
  const toggleHints = () => {
    if (showHints) {
        disableHints();
        toast.info("Menu visuals disabled.");
    } else {
        enableHints();
        toast.success("Menu visuals enabled.");
    }
  };

  // --- SUB-COMPONENT: Nav Link ---
  const NavLink = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
    const active = isActive(href);
    return (
      <Link href={href} className={clsx(styles.navItem, active && styles.navItemActive)}>
        <Icon size={20} className={clsx(active ? "text-[var(--accent-secondary)]" : "text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]")} />
        <span className={styles.navLabel}>{label}</span>
      </Link>
    );
  };

  // --- CLOSED STATE ---
  if (!isOpen) {
      return (
          <div className={styles.collapsedControls}>
              <button onClick={() => setIsOpen(true)} className={styles.menuTrigger} aria-label="Open Menu">
                  <Menu size={20} strokeWidth={2.5} />
                  <span className={styles.menuText}>MENU</span>
              </button>
              <div className={styles.collapsedThemeWrapper}>
                 <ThemeToggle />
              </div>
          </div>
      );
  }

  // --- OPEN STATE ---
  return (
    <div className={clsx(styles.sidebar, isIntro && styles.introHighlight)}> 
      
      <button onClick={() => setIsOpen(false)} className={styles.collapseHandle} aria-label="Collapse Menu">
        <ChevronLeft size={16} />
      </button>

      {/* Brand Header */}
      <div className={styles.header}>
        <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 rounded-lg flex-shrink-0 flex items-center justify-center text-white shadow-lg">
          <Mountain size={18} fill="currentColor" />
        </div>
        <span className={styles.logoText}>PeakeFeeds</span>
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
                    <div className={clsx("absolute bottom-0 right-0 w-6 h-6 rounded-full border-[3px] border-[var(--bg-app)] flex items-center justify-center shadow-sm", BadgeConfig.className)}>
                        <BadgeConfig.icon size={12} strokeWidth={3} className="text-current" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[160px]">@{user.username || 'User'}</p>
                    <div className={clsx(styles.rolePill, BadgeConfig.className)}>{BadgeConfig.label}</div>
                </div>
            </Link>
        ) : (
            <div className={styles.userCard}>
                <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[var(--glass-card-hover)] flex items-center justify-center text-[var(--accent-primary)] mb-1">
                        <User size={20} />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Join the Truth Layer</h3>
                    <p className="text-[10px] text-[var(--text-muted)] leading-tight mb-2">Verify information and earn trust badges.</p>
                    <Link href="/api/auth/signin" className="px-4 py-2 rounded-full bg-[var(--accent-primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity w-full">
                        Sign In / Sign Up
                    </Link>
                </div>
            </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className={styles.navContainer}>
        <NavLink href="/home" icon={Home} label="Home" />
        <NavLink href="/discover" icon={Compass} label="Discover" />
        
        {user && (
            <>
               <NavLink href="/notifications" icon={Bell} label="Activity" />
               <NavLink href="/messages" icon={MessageCircle} label="Messages" />
               <NavLink href={`/profile/${user.username}`} icon={User} label="Profile" />
            </>
        )}
      </nav>

      {/* Footer Actions */}
      <div className={styles.footer}>
        
        {/* 🆕 SETTINGS CHECKBOX */}
        {user && (
            <label className={styles.settingsRow}>
                <input 
                    type="checkbox" 
                    className={styles.checkbox}
                    checked={showHints}
                    onChange={toggleHints}
                />
                <span>Enable Visual Hints</span>
            </label>
        )}

        <div className="flex items-center justify-between w-full pt-2 border-t border-[var(--glass-border)]">
            <ThemeToggle /> 

            {user ? (
                <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer">
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
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