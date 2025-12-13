// FILE: app/test/ad-overlay/page.tsx
'use client'

import React, { useState } from 'react';
import { AdPlayerOverlay } from '@/components/ads/AdPlayerOverlay';

export default function TestAdPage() {
  // Allow 'any' here just for the test harness state switching
  const [status, setStatus] = useState<any>('IDLE');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-zinc-950 text-white">
      
      <h1 className="text-2xl font-bold mb-8">Ad Overlay Test Harness</h1>

      {/* Control Panel */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button onClick={() => setStatus('LOADING')} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
          Trigger LOADING
        </button>
        <button onClick={() => setStatus('PLAYING')} className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-500">
          Trigger PLAYING (Success Flow)
        </button>
        <button onClick={() => setStatus('ERROR')} className="px-4 py-2 bg-red-600 rounded hover:bg-red-500">
          Trigger ERROR
        </button>
        <button onClick={() => setStatus('COMPLETED')} className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500">
          Trigger COMPLETED
        </button>
      </div>

      <p className="text-zinc-500 mb-4">
        Current State: <span className="text-white font-mono">{status}</span>
      </p>

      {/* The Component Under Test */}
      <AdPlayerOverlay 
         status={status} 
         provider="TEST_PROVIDER" 
         onCancel={() => setStatus('IDLE')} 
      />
    </div>
  );
}