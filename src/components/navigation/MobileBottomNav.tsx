'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, User, Home, LogIn, Bell, X, MessageCircle, Settings, Shield } from 'lucide-react';
import { NotificationFeed } from '@/components/notifications/NotificationFeed';
import clsx from 'clsx';
import styles from './MobileBottomNav.module.css';

type NavUser = { username?: string | null; role?: string | null };

// `user` comes from the server layout, so the bar renders signed in from the first paint
// (reading the client session would flash the signed-out tabs while it loads)
export default function MobileBottomNav({ user }: { user?: NavUser }) {
  const pathname = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);
  const signedIn = !!user;
  const isStaff = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };
  const current = (path: string) => (isActive(path) ? 'page' as const : undefined);

  return (
    <>
      {/* 🔔 NOTIFICATION DRAWER (Slides up behind the nav) */}
      {showNotifs && (
        <div className={styles.notificationOverlay} onClick={() => setShowNotifs(false)}>
          <div
            id="activity-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-drawer-title"
            className={styles.notificationContent}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowNotifs(false); }}
          >
            <div className={styles.drawerHeader}>
              <h3 id="activity-drawer-title" className="font-bold text-[var(--text-primary)]">Activity</h3>
              <button onClick={() => setShowNotifs(false)} aria-label="Close activity" autoFocus className="p-2 rounded-full hover:bg-[var(--glass-border)]">
                <X size={20} aria-hidden="true" className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
               <NotificationFeed />
            </div>
          </div>
        </div>
      )}

      {/* 📱 BOTTOM NAV BAR */}
      <nav className={styles.bottomNav} aria-label="Tab bar">
          
          {/* 1. HOME */}
          <Link href="/home" aria-current={current('/home')} className={clsx(styles.navItem, isActive('/home') && styles.navItemActive)}>
              <Home size={22} strokeWidth={isActive('/home') ? 2.5 : 2} />
              <span className={styles.navLabel}>Home</span>
          </Link>

          {/* 2. DISCOVER */}
          <Link href="/discover" aria-current={current('/discover')} className={clsx(styles.navItem, isActive('/discover') && styles.navItemActive)}>
              <Compass size={22} strokeWidth={isActive('/discover') ? 2.5 : 2} />
              <span className={styles.navLabel}>Discover</span>
          </Link>

          {/* 3. ACTIVITY (Toggle Drawer) */}
          {signedIn ? (
            <button 
              onClick={() => setShowNotifs(!showNotifs)} 
              aria-expanded={showNotifs}
              aria-controls="activity-drawer"
              className={clsx(styles.navItem, showNotifs && styles.navItemActive)}
            >
              <Bell size={22} strokeWidth={showNotifs ? 2.5 : 2} />
              <span className={styles.navLabel}>Activity</span>
            </button>
          ) : (
             <div className={styles.navItemDisabled} aria-disabled="true">
                <Bell size={22} aria-hidden="true" />
                <span className={styles.navLabel}>Activity</span>
             </div>
          )}

          {/* 4. MESSAGES */}
          {signedIn ? (
             <Link href="/messages" aria-current={current('/messages')} className={clsx(styles.navItem, isActive('/messages') && styles.navItemActive)}>
                <MessageCircle size={22} strokeWidth={isActive('/messages') ? 2.5 : 2} />
                <span className={styles.navLabel}>Chats</span>
             </Link>
          ) : (
             <div className={styles.navItemDisabled} aria-disabled="true">
                <MessageCircle size={22} aria-hidden="true" />
                <span className={styles.navLabel}>Chats</span>
             </div>
          )}

          {/* 5. PROFILE */}
          <Link 
              href={user?.username ? `/profile/${user.username}` : '/login'} 
              aria-current={current('/profile')}
              className={clsx(styles.navItem, isActive('/profile') && styles.navItemActive)}
          >
              <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
              <span className={styles.navLabel}>Profile</span>
          </Link>

          {/* 6. SETTINGS (Log out lives there, so it can't be hit by accident from the tab bar) */}
          {/* Staff only: the admin area */}
          {isStaff && (
              <Link href="/admin" aria-current={current('/admin')} className={clsx(styles.navItem, isActive('/admin') && styles.navItemActive)}>
                  <Shield size={22} strokeWidth={isActive('/admin') ? 2.5 : 2} />
                  <span className={styles.navLabel}>Admin</span>
              </Link>
          )}

          {signedIn && (
              <Link href="/settings" aria-current={current('/settings')} className={clsx(styles.navItem, isActive('/settings') && styles.navItemActive)}>
                  <Settings size={22} strokeWidth={isActive('/settings') ? 2.5 : 2} />
                  <span className={styles.navLabel}>Settings</span>
              </Link>
          )}

          {!signedIn && (
              <Link href="/login" className={styles.navItem}>
                  <LogIn size={22} />
                  <span className={styles.navLabel}>Log in</span>
              </Link>
          )}

      </nav>
    </>
  );
}