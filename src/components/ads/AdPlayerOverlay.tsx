'use client';

import { Loader2, XCircle } from "lucide-react";

interface AdPlayerOverlayProps {
  status: 'IDLE' | 'INITIALIZING' | 'LOADING' | 'SHOWING' | 'COMPLETED' | 'ERROR';
  provider: string | null;
  onCancel: () => void; // Allow user to bail out if it hangs
}

export function AdPlayerOverlay({ status, provider, onCancel }: AdPlayerOverlayProps) {
  if (status === 'IDLE' || status === 'COMPLETED') return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
      
      {/* Loading State */}
      {(status === 'INITIALIZING' || status === 'LOADING') && (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-white">Loading Sponsor...</h3>
          <p className="text-zinc-400 text-sm">Finding a Web3 partner to pay your gas.</p>
        </div>
      )}

      {/* The Ad Container - SDKs inject video here */}
      <div 
        id="peake-ad-container" 
        className={`relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800 transition-opacity duration-300 ${
          status === 'SHOWING' ? 'opacity-100' : 'opacity-0 h-0'
        }`}
      />

      {/* Footer Info */}
      {status === 'SHOWING' && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-zinc-400 text-sm animate-pulse">
            Watching this video verifies your post on Optimism.
          </p>
          <div className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-500">
            Ad Provider: <span className="text-teal-400 font-mono">{provider || 'Loading...'}</span>
          </div>
        </div>
      )}

      {/* Emergency Escape Hatch */}
      <button 
        onClick={onCancel}
        className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
      >
        <XCircle size={32} />
      </button>
    </div>
  );
}

