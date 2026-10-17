'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  Compass, User, Home, Mountain, LogOut, LogIn, Bell, MessageCircle, Settings, ShieldCheck,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import ThemeToggle from '@/components/ThemeToggle';
import { ButtonLink } from '@/components/ui';
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

const ROLE_LABEL: Record<string, string> = {
  GOVERNMENT: 'Official',
  FACT_CHECKER: 'Verifier',
  EXPERT: 'Expert',
  BOT: 'Automated',
  BUSINESS: 'Business',
  INFLUENCER: 'Creator',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};

function NavLink({ pathname, href, icon: Icon, label, match }: { pathname: string; href: string; icon: typeof Home; label: string; match?: string }) {
  const base = match ?? href;
  const active = pathname === href || pathname === base || pathname.startsWith(base + '/');
  return (
    <Link href={href} className={clsx(styles.navItem, active && styles.navItemActive)} aria-current={active ? 'page' : undefined}>
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

// The app's permanent left rail on desktop (phones use MobileBottomNav instead).
export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const role = (user?.role || 'STANDARD').toUpperCase();
  const isStaff = role === 'ADMIN' || role === 'MODERATOR';
  const profileHref = `/profile/${user?.username || ''}`;

  return (
    <div className={styles.rail}>
      <Link href={user ? '/home' : '/'} className={styles.brand}>
        <span className={styles.brandMark}><Mountain size={18} fill="currentColor" aria-hidden="true" /></span>
        <span className={styles.brandName}>PeakeFeeds</span>
      </Link>

      <nav className={styles.nav} aria-label="Main">
        <NavLink pathname={pathname} href="/home" icon={Home} label="Home" />
        <NavLink pathname={pathname} href="/discover" icon={Compass} label="Discover" />
        {user && (
          <>
            <NavLink pathname={pathname} href="/notifications" icon={Bell} label="Activity" />
            <NavLink pathname={pathname} href="/messages" icon={MessageCircle} label="Messages" />
            <NavLink pathname={pathname} href={profileHref} icon={User} label="Profile" match="/profile" />
            <NavLink pathname={pathname} href="/settings" icon={Settings} label="Settings" />
            {isStaff && <NavLink pathname={pathname} href="/admin" icon={ShieldCheck} label="Admin" />}
          </>
        )}
      </nav>

      <div className={styles.footer}>
        {user ? (
          <Link href={profileHref} className={styles.account}>
            <span className={styles.avatar}>
              {user.image ? <img src={user.image} alt="" /> : (user.username?.[0] ?? '?').toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className={styles.accountName}>@{user.username || 'user'}</span>
              {ROLE_LABEL[role] && <span className={styles.accountRole}>{ROLE_LABEL[role]}</span>}
            </span>
          </Link>
        ) : (
          <div className="flex flex-col gap-2">
            <ButtonLink href="/login" icon={<LogIn size={16} aria-hidden="true" />} fullWidth>Log in</ButtonLink>
            <ButtonLink href="/register" variant="secondary" fullWidth>Create account</ButtonLink>
          </div>
        )}

        <ThemeToggle variant="row" />
        {user && (
          <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className={clsx(styles.navItem, styles.signOut)}>
            <LogOut size={18} aria-hidden="true" />
            <span>Log out</span>
          </button>
        )}
      </div>
    </div>
  );
}
