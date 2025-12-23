'use client'

import React, { useState } from 'react';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

interface LockedOverlayProps {
  message?: string;
  className?: string;
}

export default function LockedOverlay({ 
  message = "This Content is Under Review by PeakeFeeds Admins. You can still view this content, you just won't be able to interact with it.",
  className
}: LockedOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="absolute top-2 right-2 z-[45] p-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 rounded-full backdrop-blur-sm transition-all border border-amber-500/30 group"
        title="Show Review Status"
      >
        <ShieldAlert size={16} className="group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className={clsx(
      "absolute inset-0 z-[40] flex items-center justify-center p-6 text-center backdrop-blur-md bg-black/60 transition-all duration-300 rounded-2xl",
      className
    )}>
      <div className="bg-zinc-900/95 border border-amber-500/30 rounded-2xl p-6 shadow-2xl max-w-sm animate-in zoom-in-95 duration-200">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-amber-500/20 rounded-full text-amber-500">
            <ShieldAlert size={24} />
          </div>
        </div>
        <h3 className="text-white font-bold mb-2">Content Locked</h3>
        <p className="text-zinc-300 text-xs leading-relaxed mb-6">
          {message}
        </p>
        
        <button 
          onClick={() => setIsVisible(false)}
          className="flex items-center justify-center gap-2 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
        >
          <Eye size={14} /> View Content
        </button>
      </div>
    </div>
  );
}