'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Added useRouter
import { Compass, LayoutGrid, LogOut, User, Plus, X, Users, MessageSquare } from 'lucide-react';
import styles from '@/app/(dashboard)/dashboard.module.css';
import clsx from 'clsx';

export default function MobileBottomNav() {
  const [isActionMode, setIsActionMode] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (path: string) => pathname === path ? styles.mobileNavItemActive : '';

  // 🧠 SMART POST LOGIC
  const handlePostClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Stop default Link behavior
    setIsActionMode(false); // Close the menu

    // Condition 1: User is ALREADY on a channel page
    if (pathname.startsWith('/channels/')) {
        // Just scroll up to the composer
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } 
    // Condition 2: User is elsewhere (Home, Profile, etc.)
    else {
        // Redirect to My Feed so they can pick a channel
        router.push('/my-feed');
    }
  };

  return (
    <>
      {/* ==============================================
          BAR 1: ACTION MENU (The "New Channel/Post" Bar)
      ================================================ */}
      <div 
        style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '120px', // Taller to accommodate buttons comfortably
            zIndex: 60,
            transform: isActionMode ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className="bg-black/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-center gap-6 px-4 pb-4"
      >
          {/* Action 1: New Channel */}
          <Link href="/channels/create" onClick={() => setIsActionMode(false)}>
            <div className="flex flex-col items-center justify-center w-28 h-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg active:scale-95 transition-all hover:bg-white/10 hover:border-indigo-500/30 group">
                <div className="bg-indigo-500/20 p-2 rounded-full mb-2 group-hover:bg-indigo-500/30 transition-colors">
                    <Users size={24} className="text-indigo-300 group-hover:text-white" />
                </div>
                <span className="text-xs font-bold text-gray-300 group-hover:text-white tracking-wide">New Channel</span>
            </div>
          </Link>

          {/* CENTER: Close Button */}
          <div className="-mt-16 mx-2">
              <button 
                onClick={() => setIsActionMode(false)}
                className="h-14 w-14 rounded-full flex items-center justify-center bg-gray-800 border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] text-white hover:bg-gray-700 active:scale-90 transition-all"
              >
                <X size={26} />
              </button>
          </div>

          {/* Action 2: New Post (Smart Button) */}
          {/* We use a button here or intercept the Link click */}
          <button onClick={handlePostClick}>
             <div className="flex flex-col items-center justify-center w-28 h-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg active:scale-95 transition-all hover:bg-white/10 hover:border-emerald-500/30 group">
                <div className="bg-emerald-500/20 p-2 rounded-full mb-2 group-hover:bg-emerald-500/30 transition-colors">
                    <MessageSquare size={24} className="text-emerald-300 group-hover:text-white" />
                </div>
                <span className="text-xs font-bold text-gray-300 group-hover:text-white tracking-wide">Post</span>
            </div>
          </button>
      </div>


      {/* ==============================================
          BAR 2: STANDARD NAVIGATION
      ================================================ */}
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
            justifyContent: 'space-between', 
            transform: isActionMode ? 'translateY(100%)' : 'translateY(0)',
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

          {/* 3. CENTER BUTTON (+) */}
          <div className="-mt-8"> 
              <button 
                onClick={() => setIsActionMode(true)}
                className="h-14 w-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] bg-gradient-to-tr from-indigo-600 to-purple-600 hover:scale-105 active:scale-95 transition-all border border-white/20"
              >
                <Plus size={28} className="text-white" strokeWidth={3} />
              </button>
          </div>

          {/* 4. Profile */}
          <Link href="/profile" className={`${styles.mobileNavItem} ${isActive('/profile')}`}>
              <User size={24} />
              <span className="text-[10px]">Profile</span>
          </Link>

          {/* 5. Exit */}
          <Link href="/api/auth/signout" className={`${styles.mobileNavItem} ${isActive('/api/auth/signout')}`}>
              <LogOut size={24} />
              <span className="text-[10px]">Exit</span>
          </Link>
      </nav>

    </>
  );
}

