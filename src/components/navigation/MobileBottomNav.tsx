'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, User, Home, LogIn, LogOut, Bell, X, MessageCircle } from 'lucide-react'; 
import { useSession, signIn, signOut } from 'next-auth/react'; 
import { NotificationFeed } from '@/components/notifications/NotificationFeed'; 
import styles from './MobileBottomNav.module.css';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession(); 
  const [showNotifs, setShowNotifs] = useState(false);

  const isActive = (path: string) => {
    return pathname.startsWith(path) ? styles.navItemActive : '';
  };

  return (
    <>
      {/* 🔔 NOTIFICATION DRAWER */}
      {showNotifs && (
        <div className={styles.notificationOverlay} onClick={() => setShowNotifs(false)}>
          <div className={styles.notificationContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3 className="font-bold text-[var(--text-primary)]">Activity</h3>
              <button onClick={() => setShowNotifs(false)} className="p-1">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
               <NotificationFeed />
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV BAR */}
      <nav className={styles.bottomNav}>
          
          {/* 1. HOME */}
          <Link href="/home" className={`${styles.navItem} ${isActive('/home')}`}>
              <Home size={22} strokeWidth={isActive('/home') ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Home</span>
          </Link>

          {/* 2. DISCOVER */}
          <Link href="/discover" className={`${styles.navItem} ${isActive('/discover')}`}>
              <Compass size={22} strokeWidth={isActive('/discover') ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Discover</span>
          </Link>

          {/* 3. ACTIVITY */}
          {session ? (
            <button 
              onClick={() => setShowNotifs(!showNotifs)} 
              className={`${styles.navItem} ${showNotifs ? styles.navItemActive : ''}`}
            >
              <Bell size={22} strokeWidth={showNotifs ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Activity</span>
            </button>
          ) : (
             <div className={styles.navItem} style={{ opacity: 0.3 }}><Bell size={22} /></div>
          )}

          {/* 🆕 4. MESSAGES */}
          {session ? (
             <Link href="/messages" className={`${styles.navItem} ${isActive('/messages')}`}>
                <MessageCircle size={22} strokeWidth={isActive('/messages') ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Chats</span>
             </Link>
          ) : (
             <div className={styles.navItem} style={{ opacity: 0.3 }}><MessageCircle size={22} /></div>
          )}

          {/* 5. PROFILE */}
          <Link 
              href={session?.user?.username ? `/profile/${session.user.username}` : '/api/auth/signin'} 
              className={`${styles.navItem} ${isActive('/profile')}`}
          >
              <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Profile</span>
          </Link>

          {/* 6. AUTH */}
          {session ? (
              <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.navItem}>
                  <LogOut size={22} />
                  <span className="text-[10px] font-medium">Out</span>
              </button>
          ) : (
              <button onClick={() => signIn()} className={styles.navItem}>
                  <LogIn size={22} />
                  <span className="text-[10px] font-medium">In</span>
              </button>
          )}

      </nav>
    </>
  );
}