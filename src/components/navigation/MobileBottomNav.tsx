'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, LayoutGrid, LogOut, User, ChevronRight, Menu } from 'lucide-react';
import styles from '@/app/(dashboard)/dashboard.module.css'; 

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true); 
  
  const isActive = (path: string) => pathname === path ? styles.mobileNavItemActive : '';

  return (
    <>
      {/* --- 1. THE TRIGGER TAB (Visible when menu is closed) --- */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center gap-2 py-4 px-1 rounded-l-xl shadow-lg border-l border-y border-[var(--glass-border)]"
        style={{
            transform: isOpen ? 'translateX(100%)' : 'translateX(0)',
            // Add a slight delay so it waits for the menu to leave before appearing
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s', 
            background: 'var(--glass-panel)',
            backdropFilter: 'blur(12px)',
            writingMode: 'vertical-rl', 
            textOrientation: 'mixed',
        }}
      >
        <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] rotate-180 mb-2">
            MENU
        </span>
        <Menu size={16} className="text-[var(--accent-primary)]" />
      </button>


      {/* --- 2. THE NAVIGATION BAR --- */}
      <nav 
        className={styles.mobileNav}
        style={{ 
            position: 'fixed',
            top: 0,
            right: 0,
            height: '100%',
            width: '80px', 
            zIndex: 50,
            
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '2rem', 
            
            background: 'var(--glass-panel)', 
            backdropFilter: 'blur(16px)',
            borderLeft: '1px solid var(--glass-border)',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',

            transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
          {/* HIDE BUTTON (Internal Chevron) 
             Fix: Added opacity and pointerEvents to hide it completely when minimized 
          */}
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-1/2 -left-3 -translate-y-1/2 bg-[var(--bg-app)] border border-[var(--glass-border)] rounded-full p-1 shadow-md text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
            style={{
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
                transition: 'opacity 0.2s ease', // Fades out quicker than the slide
            }}
            aria-label="Hide Menu"
          >
            <ChevronRight size={16} />
          </button>

          {/* Nav Items */}
          <div className="flex flex-col gap-8 w-full items-center">
            <Link href="/home" className={`${styles.mobileNavItem} ${isActive('/home')}`}>
                <Compass size={24} />
                <span className="text-[9px] font-medium mt-1">Discover</span>
            </Link>

            <Link href="/my-feed" className={`${styles.mobileNavItem} ${isActive('/my-feed')}`}>
                <LayoutGrid size={24} />
                <span className="text-[9px] font-medium mt-1">Feed</span>
            </Link>

            <Link href="/profile" className={`${styles.mobileNavItem} ${isActive('/profile')}`}>
                <User size={24} />
                <span className="text-[9px] font-medium mt-1">Profile</span>
            </Link>

            <Link href="/api/auth/signout" className={`${styles.mobileNavItem} ${isActive('/api/auth/signout')}`}>
                <LogOut size={24} />
                <span className="text-[9px] font-medium mt-1">Sign Out</span>
            </Link>
          </div>
      </nav>
    </>
  );
}