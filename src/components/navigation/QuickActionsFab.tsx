'use client'

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users, MessageSquare } from 'lucide-react';

export default function QuickActionsFab() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    // Main Container
    <div className="relative flex items-center justify-center -mt-8 z-[100]" ref={menuRef}>
      
      {/* --- The Pop-up Menu --- */}
      <div 
        // FIX 1: 'bottom-28' (7rem) pushes it way up, clear of the button.
        // FIX 2: 'z-40' puts it physically "behind" the main button in the stack,
        //        so it looks like it slides out from underneath it.
        className={`absolute bottom-28 flex flex-col gap-4 items-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom z-40 ${
          isOpen 
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
            : 'opacity-0 translate-y-10 scale-50 pointer-events-none'
        }`}
      >
        {/* Option 1: Create Channel (Top) */}
        <Link 
            href="/channels/create"
            className={`flex items-center gap-3 bg-gray-900 border border-white/20 backdrop-blur-xl !text-white px-5 py-3 rounded-2xl shadow-2xl hover:bg-gray-800 transition-all whitespace-nowrap w-max ${isOpen ? 'delay-75' : ''}`}
        >
            <div className="bg-indigo-600 p-2 rounded-full text-white">
                <Users size={20} />
            </div>
            <span className="font-bold text-sm tracking-wide">New Community</span>
        </Link>

        {/* Option 2: Create Post (Bottom) */}
        <Link 
            href="/home" 
            className="flex items-center gap-3 bg-gray-900 border border-white/20 backdrop-blur-xl !text-white px-5 py-3 rounded-2xl shadow-2xl hover:bg-gray-800 transition-all whitespace-nowrap w-max"
        >
            <div className="bg-emerald-600 p-2 rounded-full text-white">
                <MessageSquare size={20} />
            </div>
            <span className="font-bold text-sm tracking-wide">Post to Channel</span>
        </Link>
      </div>

      {/* --- The Main FAB Button --- */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        // FIX 3: 'z-50' ensures the button stays ON TOP of the menu items 
        //        during the animation (so they don't flash over it).
        className={`
            h-16 w-16 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] 
            transition-all duration-300 border border-white/20 relative z-50
            ${isOpen ? 'bg-gray-800 rotate-45 border-white/40' : 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:scale-110'}
        `}
      >
        <Plus size={32} className="text-white" strokeWidth={3} />
      </button>

    </div>
  );
}

