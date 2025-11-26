'use client'

import { useState } from 'react';
import Link from 'next/link';
// Removed useRouter as it's no longer needed without the handlePostClick logic
import { usePathname } from 'next/navigation'; 
// ❌ Removed Plus, X icons
import { Compass, LayoutGrid, LogOut, User } from 'lucide-react'; 
// Assuming styles is imported from the parent directory:
import styles from '@/app/(dashboard)/dashboard.module.css'; 
import clsx from 'clsx';

export default function MobileBottomNav() {
  // ❌ Removed isActionMode state
  const pathname = usePathname();
  // ❌ Removed router import and usage
  
  const isActive = (path: string) => pathname === path ? styles.mobileNavItemActive : '';

  // ❌ Removed handlePostClick function entirely

  return (
    <>
      <nav 
        className={styles.mobileNav}
        style={{ 
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '80px',
            zIndex: 50,
            paddingBottom: '20px', 
            alignItems: 'center',
            display: 'flex', 
            justifyContent: 'space-around', // Changed to space-around for even distribution
            // Removed transform animation as isActionMode is gone
            transition: 'transform 300ms ease-in-out'
        }}
      >
          {/* 1. Discover */}
          <Link href="/home" className={`${styles.mobileNavItem} ${isActive('/home')}`}>
              <Compass size={24} />
              <span className="text-[10px]">Discover</span>
          </Link>

          {/* 2. Feed */}
          <Link href="/my-feed" className={`${styles.mobileNavItem} ${isActive('/my-feed')}`}>
              <LayoutGrid size={24} />
              <span className="text-[10px]">Feed</span>
          </Link>

          {/* 3. Profile */}
          <Link href="/profile" className={`${styles.mobileNavItem} ${isActive('/profile')}`}>
          <User size={24} />
          <span className="text-[10px]">Profile</span>
          </Link>

          {/* 4. Exit */}
          <Link href="/api/auth/signout" className={`${styles.mobileNavItem} ${isActive('/api/auth/signout')}`}>
              <LogOut size={24} />
              <span className="text-[10px]">Sign Out</span>
          </Link>
      </nav>

    </>
  );
}

