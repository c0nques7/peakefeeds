// FILE: app/test/ad-overlay/page.tsx
'use client'

import React, { useState } from 'react';
import { AdPlayerOverlay } from '@/components/ads/AdPlayerOverlay';
import { MediatorStatus } from '@/hooks/useAdMediator';

export default function TestAdPage() {
  // Use the proper type for status
  const [status, setStatus] = useState<MediatorStatus>('IDLE');

  return (
    <div className="p-10 bg-zinc-900 min-h-screen text-white flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Ad Overlay Test Suite</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
            onClick={() => setStatus('PROMPT')} 
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all">
            1. Open Prompt
        </button>

        <button 
            onClick={() => setStatus('LOADING')} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all">
            2. Simulate Loading
        </button>

        <button 
            onClick={() => setStatus('SHOWING')} 
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-all">
            3. Simulate Playing
        </button>

        <button 
            onClick={() => setStatus('ERROR')} 
            className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-all">
            4. Simulate Error
        </button>
      </div>

      <div className="p-4 border border-zinc-700 rounded-lg text-sm text-zinc-400 font-mono">
        Current Status: <span className="text-emerald-400">{status}</span>
      </div>

      {/* 🟢 The Component Under Test */}
      <AdPlayerOverlay 
        status={status} 
        provider="TEST_PROVIDER" 
        onCancel={() => setStatus('IDLE')} 
        // 👇 ADD THESE TWO MISSING PROPS
        onSelectVideo={() => {
            console.log("Selected Video");
            setStatus('LOADING');
        }}
        onSelectQuest={() => {
            console.log("Selected Quest");
            setStatus('LOADING');
        }}
      />
    </div>
  );
}