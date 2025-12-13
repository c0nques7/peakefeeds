import { useState, useCallback, useRef } from 'react';
import { AdRequest, AdEvent, AdAdapter } from '@/lib/ads/types';

// Adapters
import { HypeLabAdapter } from '@/lib/ads/adapters/hypelab';
import { GoogleIMAAdapter } from '@/lib/ads/adapters/google-ima';

// ------------------------------------------------------------------
// 1. Dev Mode Adapter
// ------------------------------------------------------------------
const DevMockAdapter: AdAdapter = {
  name: "DEV_DEBUGGER",
  initialize: async () => console.log("🔧 [Dev] Ad System Init"),
  showAd: async (containerId, request, onEvent) => {
    const controls = document.createElement('div');
    controls.id = 'dev-ad-controls';
    controls.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 9999; display: flex; flex-direction: column; gap: 12px;
      background: #18181b; padding: 24px; border-radius: 16px; border: 1px solid #3f3f46;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5); font-family: sans-serif; text-align: center;
    `;
    
    controls.innerHTML = `
      <h3 style="color:white; margin:0 0 4px 0; font-size:16px;">🛠 Developer Mode</h3>
      <div style="display:grid; gap:8px; grid-template-columns: 1fr 1fr;">
        <button id="dev-pass" style="background:#059669; color:white; padding:10px; border-radius:8px; border:none; cursor:pointer; font-weight:600; font-size:12px;">✅ Success</button>
        <button id="dev-fail" style="background:#dc2626; color:white; padding:10px; border-radius:8px; border:none; cursor:pointer; font-weight:600; font-size:12px;">❌ Fail</button>
      </div>
    `;
    
    document.getElementById(containerId)?.appendChild(controls);
    onEvent('AD_STARTED');

    document.getElementById('dev-pass')?.addEventListener('click', () => {
       controls.remove();
       onEvent('AD_COMPLETED', { proofToken: `DEV_PROOF_${Date.now()}` }); 
    });

    document.getElementById('dev-fail')?.addEventListener('click', () => {
       controls.remove();
       onEvent('AD_ERROR');
    });
  }
};

// ------------------------------------------------------------------
// 2. The Hook Logic
// ------------------------------------------------------------------

export type MediatorStatus = 'IDLE' | 'PROMPT' | 'INITIALIZING' | 'LOADING' | 'SHOWING' | 'COMPLETED' | 'ERROR';

export function useAdMediator() {
  const [status, setStatus] = useState<MediatorStatus>('IDLE');
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const promiseResolver = useRef<((value: string | null) => void) | null>(null);
  const cachedRequest = useRef<{ containerId: string; request: AdRequest } | null>(null);

  // A. Start -> Opens the Choice Menu
  const startVerification = useCallback((containerId: string, request: AdRequest): Promise<string | null> => {
    cachedRequest.current = { containerId, request };
    setStatus('PROMPT');
    setError(null);
    return new Promise((resolve) => { promiseResolver.current = resolve; });
  }, []);

  // B. Option 1: Watch Video (Waterfall)
  const selectAdFlow = useCallback(async () => {
    if (!cachedRequest.current) return;
    const { containerId, request } = cachedRequest.current;

    setStatus('INITIALIZING');
    const waterfall: AdAdapter[] = [];
    if (process.env.NODE_ENV === 'development') waterfall.push(DevMockAdapter);
    waterfall.push(HypeLabAdapter, GoogleIMAAdapter);

    for (const adapter of waterfall) {
      try {
        await adapter.initialize();
        setStatus('LOADING');
        setCurrentProvider(adapter.name);

        const token = await new Promise<string>((resolveAd, rejectAd) => {
          adapter.showAd(containerId, request, (event, payload) => {
            if (event === 'AD_STARTED') setStatus('SHOWING');
            if (event === 'AD_COMPLETED') {
                setStatus('COMPLETED');
                resolveAd(payload?.proofToken || `${adapter.name}_PROOF_${Date.now()}`);
            }
            if (event === 'AD_SKIPPED' || event === 'AD_ERROR') rejectAd();
          });
        });

        if (promiseResolver.current) promiseResolver.current(token);
        return;
      } catch (err) {
        console.warn(`[${adapter.name}] failed. Next...`);
      }
    }

    setStatus('ERROR');
    setError('No sponsors available.');
    if (promiseResolver.current) promiseResolver.current(null);
  }, []);

  // C. Option 2: Quest (PLACEHOLDER)
  const selectQuestFlow = useCallback(async () => {
    setStatus('LOADING');
    setCurrentProvider('QUEST_PLACEHOLDER');

    // 🛑 PLACEHOLDER LOGIC 🛑
    // Replace this setTimeout with your future TaskOn/Zealy API call
    setTimeout(() => {
        setStatus('COMPLETED');
        const mockToken = `QUEST_PLACEHOLDER_${Date.now()}`;
        if (promiseResolver.current) promiseResolver.current(mockToken);
    }, 2000); // Fakes a 2s verification delay
  }, []);

  const resetAdState = useCallback(() => {
    setStatus('IDLE');
    setCurrentProvider(null);
    setError(null);
    cachedRequest.current = null;
    if (promiseResolver.current) {
        promiseResolver.current(null);
        promiseResolver.current = null;
    }
  }, []);

  return { 
    startVerification, 
    selectAdFlow, 
    selectQuestFlow, 
    resetAdState, 
    status, 
    currentProvider,
    error 
  };
}