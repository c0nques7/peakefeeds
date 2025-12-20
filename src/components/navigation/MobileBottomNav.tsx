'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, User, Home, Bell, LogOut, LogIn, MessageCircle, X } from 'lucide-react'; 
import { useSession, signIn, signOut } from 'next-auth/react'; 
import { NotificationFeed } from '@/components/notifications/NotificationFeed';
import clsx from 'clsx';
import styles from './MobileBottomNav.module.css';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession(); 
  const [showNotifs, setShowNotifs] = useState(false);
  
  // 🟢 State for hiding the nav on scroll
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const isActive = (path: string) => pathname.startsWith(path);

  useEffect(() => {
    const controlNavbar = () => {
      // Current scroll position
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // Scrolling DOWN: Hide Navbar
        setIsVisible(false);
      } else {
        // Scrolling UP: Show Navbar
        setIsVisible(true);
      }

      // Remember current position for next move
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  return (
    <>
      {/* 🔔 NOTIFICATION DRAWER */}
      {showNotifs && (
        <div className={styles.notificationOverlay} onClick={() => setShowNotifs(false)}>
          <div className={styles.notificationContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3 className="font-bold text-[var(--text-primary)]">Activity</h3>
              <button onClick={() => setShowNotifs(false)} className="p-2 rounded-full hover:bg-[var(--glass-border)]">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
               <NotificationFeed />
            </div>
          </div>
        </div>
      )}

      {/* 📱 BOTTOM NAV BAR */}
      <nav className={clsx(
          styles.bottomNav, 
          !isVisible && styles.navHidden // 🟢 Apply hidden class
      )}>
          <Link href="/home" className={clsx(styles.navItem, isActive('/home') && styles.navItemActive)}>
              <Home size={22} strokeWidth={isActive('/home') ? 2.5 : 2} />
              <span className={styles.navLabel}>Home</span>
          </Link>

          <Link href="/discover" className={clsx(styles.navItem, isActive('/discover') && styles.navItemActive)}>
              <Compass size={22} strokeWidth={isActive('/discover') ? 2.5 : 2} />
              <span className={styles.navLabel}>Discover</span>
          </Link>

          {session ? (
            <button onClick={() => setShowNotifs(!showNotifs)} className={clsx(styles.navItem, showNotifs && styles.navItemActive)}>
              <Bell size={22} strokeWidth={showNotifs ? 2.5 : 2} />
              <span className={styles.navLabel}>Activity</span>
            </button>
          ) : (
             <div className={styles.navItemDisabled}>
                <Bell size={22} /><span className={styles.navLabel}>Activity</span>
             </div>
          )}

          {session ? (
             <Link href="/messages" className={clsx(styles.navItem, isActive('/messages') && styles.navItemActive)}>
                <MessageCircle size={22} strokeWidth={isActive('/messages') ? 2.5 : 2} />
                <span className={styles.navLabel}>Chats</span>
             </Link>
          ) : (
             <div className={styles.navItemDisabled}>
                <MessageCircle size={22} /><span className={styles.navLabel}>Chats</span>
             </div>
          )}

          <Link href={session?.user?.username ? `/profile/${session.user.username}` : '/api/auth/signin'} className={clsx(styles.navItem, isActive('/profile') && styles.navItemActive)}>
              <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
              <span className={styles.navLabel}>Profile</span>
          </Link>

          {session ? (
              <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.navItem}>
                  <LogOut size={22} /><span className={styles.navLabel}>Out</span>
              </button>
          ) : (
              <button onClick={() => signIn()} className={styles.navItem}>
                  <LogIn size={22} /><span className={styles.navLabel}>In</span>
              </button>
          )}
      </nav>
    </>
  );
}

