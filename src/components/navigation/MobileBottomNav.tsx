'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, User, Home, Wallet } from 'lucide-react'; 
import styles from './MobileBottomNav.module.css';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname.startsWith(path) ? styles.navItemActive : '';
  };

  return (
    <nav className={styles.bottomNav}>
        
        {/* 1. HOME */}
        <Link href="/home" className={`${styles.navItem} ${isActive('/home')}`}>
            <Home size={24} strokeWidth={isActive('/home') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* 2. DISCOVER */}
        <Link href="/discover" className={`${styles.navItem} ${isActive('/discover')}`}>
            <Compass size={24} strokeWidth={isActive('/discover') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Discover</span>
        </Link>

        {/* 3. PROFILE */}
        <Link href="/profile/me" className={`${styles.navItem} ${isActive('/profile')}`}>
            <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Profile</span>
        </Link>

        {/* 4. WALLET */}
        <Link href="/profile/me?tab=wallet" className={`${styles.navItem} ${isActive('/wallet')}`}>
            <Wallet size={24} strokeWidth={isActive('/wallet') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Wallet</span>
        </Link>

    </nav>
  );
}

