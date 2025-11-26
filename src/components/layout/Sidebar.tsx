'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LayoutGrid, User, Plus, LogOut } from "lucide-react";
import clsx from "clsx";

interface SidebarProps {
  user?: { 
    name?: string | null;
    image?: string | null;
    username?: string | null;
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const safeUser = user || {
    name: "Guest",
    username: "guest",
    image: null
  };

  const navItems = [
    { label: "Discover", href: "/home", icon: Compass },
    { label: "My Feed", href: "/my-feed", icon: LayoutGrid },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="h-full w-full flex flex-col p-5 bg-white/30 dark:bg-black/20 backdrop-blur-xl border-r border-white/20 dark:border-white/5 shadow-sm">
      
      {/* --- 1. PROFILE HEADER --- */}
      <div className="flex flex-col items-center mt-6 mb-10 px-2 text-center w-full">
        <div className="h-24 w-24 mb-4 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-xl">
            <img 
              src={safeUser.image || `https://api.dicebear.com/7.x/initials/svg?seed=${safeUser.name}`} 
              alt="Profile" 
              className="h-full w-full rounded-full object-cover border-4 border-white dark:border-black bg-white"
            />
        </div>
        
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white truncate w-full px-2">
          {safeUser.name}
        </h2>
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest opacity-80 mt-1">
          @{safeUser.username}
        </p>
      </div>

      {/* --- 2. NAVIGATION LINKS (Big Buttons) --- */}
      {/* Changed space-y-3 to gap-4 for more separation */}
      <nav className="w-full flex flex-col gap-4 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                // BIGGER TOUCH TARGETS: py-4 px-6
                "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 font-bold text-base group no-underline relative overflow-hidden",
                
                // ACTIVE: Deep Shadow + Scale
                isActive 
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 scale-[1.02] ring-1 ring-white/20" 
                  
                // INACTIVE: 
                // - bg-white/60: More opaque to stand out against sidebar
                // - border-white/60: Crisp edge
                // - shadow-sm: Slight lift
                  : "bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-white hover:shadow-md hover:-translate-y-1"
              )}
            >
              <item.icon 
                size={24} // Bigger Icons (20 -> 24)
                strokeWidth={2.5}
                className={clsx(isActive ? "text-white" : "opacity-70 group-hover:opacity-100 transition-colors")} 
              />
              <span className="tracking-wide">{item.label}</span>
            </Link>
          );
        })}

        {/* Primary CTA: New Channel */}
        <Link 
            href="/channels/create"
            className="flex items-center justify-center gap-3 mt-8 w-full px-6 py-5 rounded-2xl bg-gray-900 text-white shadow-xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all no-underline dark:bg-white dark:text-black"
        >
            <Plus size={24} strokeWidth={3} />
            <span className="font-extrabold text-base">Create Channel</span>
        </Link>
      </nav>

      {/* --- 3. FOOTER --- */}
      <div className="w-full mt-auto pt-8 border-t border-gray-200/50 dark:border-white/5 px-2">
        <Link 
          href="/api/auth/signout"
          className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all no-underline font-bold text-xs uppercase tracking-wider border border-transparent hover:border-red-100"
        >
          <LogOut size={20} strokeWidth={2.5} />
          <span>Sign Out</span>
        </Link>
      </div>
    </div>
  );
}