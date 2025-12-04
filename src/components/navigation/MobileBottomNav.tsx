'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, User, Home, LogIn, LogOut } from 'lucide-react'; 
import { useSession, signIn, signOut } from 'next-auth/react'; // 🆕 Auth Hooks
import styles from './MobileBottomNav.module.css';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession(); // 🆕 Get Session

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
        {/* If logged in, go to profile. If not, go to login. */}
        <Link 
            href={session?.user?.username ? `/profile/${session.user.username}` : '/api/auth/signin'} 
            className={`${styles.navItem} ${isActive('/profile')}`}
        >
            <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Profile</span>
        </Link>

        {/* 4. AUTH ACTION (Replaces Wallet) */}
        {session ? (
            // LOGGED IN -> Show Sign Out
            <button 
                onClick={() => signOut({ callbackUrl: '/' })}
                className={styles.navItem}
                type="button"
            >
                <LogOut size={24} />
                <span className="text-[10px] font-medium">Sign Out</span>
            </button>
        ) : (
            // LOGGED OUT -> Show Sign In
            <button 
                onClick={() => signIn()}
                className={styles.navItem}
                type="button"
            >
                <LogIn size={24} />
                <span className="text-[10px] font-medium">Sign In</span>
            </button>
        )}

    </nav>
  );
}

