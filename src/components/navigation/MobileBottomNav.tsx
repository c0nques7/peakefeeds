'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, User, Home, LogIn, LogOut, Bell, X, MessageCircle } from 'lucide-react'; 
import { useSession, signIn, signOut } from 'next-auth/react'; 
import { NotificationFeed } from '@/components/notifications/NotificationFeed'; // Ensure this component exists
import clsx from 'clsx';
import styles from './MobileBottomNav.module.css';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession(); 
  const [showNotifs, setShowNotifs] = useState(false);

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* 🔔 NOTIFICATION DRAWER (Slides up behind the nav) */}
      {showNotifs && (
        <div 
          className={styles.notificationOverlay} 
          onClick={() => setShowNotifs(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Activity Feed"
        >
          <div className={styles.notificationContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2 className="font-bold text-[var(--text-primary)] text-lg">Activity</h2>
              <button 
                onClick={() => setShowNotifs(false)} 
                className="p-2 rounded-full hover:bg-[var(--glass-border)]"
                aria-label="Close activity feed"
              >
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
               {/* Pass a prop to NotificationFeed if needed, e.g. limit={10} */}
               <NotificationFeed />
            </div>
          </div>
        </div>
      )}

      {/* 📱 BOTTOM NAV BAR */}
      <nav className={styles.bottomNav}>
          
          {/* 1. HOME */}
          <Link href="/home" className={clsx(styles.navItem, isActive('/home') && styles.navItemActive)}>
              <Home size={22} strokeWidth={isActive('/home') ? 2.5 : 2} />
              <span className={styles.navLabel}>Home</span>
          </Link>

          {/* 2. DISCOVER */}
          <Link href="/discover" className={clsx(styles.navItem, isActive('/discover') && styles.navItemActive)}>
              <Compass size={22} strokeWidth={isActive('/discover') ? 2.5 : 2} />
              <span className={styles.navLabel}>Discover</span>
          </Link>

          {/* 3. ACTIVITY (Toggle Drawer) */}
          {session ? (
            <button 
              onClick={() => setShowNotifs(!showNotifs)} 
              className={clsx(styles.navItem, showNotifs && styles.navItemActive)}
            >
              <Bell size={22} strokeWidth={showNotifs ? 2.5 : 2} />
              <span className={styles.navLabel}>Activity</span>
            </button>
          ) : (
             <div className={styles.navItemDisabled}>
                <Bell size={22} />
                <span className={styles.navLabel}>Activity</span>
             </div>
          )}

          {/* 4. MESSAGES */}
          {session ? (
             <Link href="/messages" className={clsx(styles.navItem, isActive('/messages') && styles.navItemActive)}>
                <MessageCircle size={22} strokeWidth={isActive('/messages') ? 2.5 : 2} />
                <span className={styles.navLabel}>Chats</span>
             </Link>
          ) : (
             <div className={styles.navItemDisabled}>
                <MessageCircle size={22} />
                <span className={styles.navLabel}>Chats</span>
             </div>
          )}

          {/* 5. PROFILE */}
          <Link 
              href={session?.user?.username ? `/profile/${session.user.username}` : '/api/auth/signin'} 
              className={clsx(styles.navItem, isActive('/profile') && styles.navItemActive)}
          >
              <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
              <span className={styles.navLabel}>Profile</span>
          </Link>

          {/* 6. AUTH ACTION */}
          {session ? (
              <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.navItem}>
                  <LogOut size={22} />
                  <span className={styles.navLabel}>Out</span>
              </button>
          ) : (
              <button onClick={() => signIn()} className={styles.navItem}>
                  <LogIn size={22} />
                  <span className={styles.navLabel}>In</span>
              </button>
          )}

      </nav>
    </>
  );
}