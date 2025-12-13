import { useState, useCallback } from 'react';
import { AdAdapter, AdEvent, AdRequest } from '@/lib/ads/types';

// Adapters
import { HypeLabAdapter } from '@/lib/ads/adapters/hypelab';
import { GoogleIMAAdapter } from '@/lib/ads/adapters/google-ima';

// ------------------------------------------------------------------
// 1. Dev Mode Adapter (Only active in development)
// ------------------------------------------------------------------
const DevMockAdapter: AdAdapter = {
  name: "DEV_DEBUGGER",
  initialize: async () => console.log("🔧 [Dev Mode] Ad System Initialized"),
  showAd: async (containerId, request, onEvent) => {
    // Inject a visible control panel into the DOM for manual testing
    const existing = document.getElementById('dev-ad-controls');
    if (existing) existing.remove();

    const controls = document.createElement('div');
    controls.id = 'dev-ad-controls';
    controls.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 9999; display: flex; flex-direction: column; gap: 12px;
      background: #18181b; padding: 20px; border-radius: 12px; border: 1px solid #3f3f46;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5); font-family: sans-serif;
    `;
    
    controls.innerHTML = `
      <h3 style="color:white; margin:0 0 8px 0; font-size:14px;">🛠 Dev Ad Controller</h3>
      <button id="dev-pass" style="background:#059669; color:white; padding:8px 16px; border-radius:6px; border:none; cursor:pointer; font-weight:bold;">
        ✅ Simulate Success (Proof)
      </button>
      <button id="dev-fail" style="background:#dc2626; color:white; padding:8px 16px; border-radius:6px; border:none; cursor:pointer; font-weight:bold;">
        ❌ Simulate Error
      </button>
    `;
    
    // Append to the specific container so it appears inside the Overlay
    const container = document.getElementById(containerId);
    if (container) container.appendChild(controls);

    onEvent('AD_STARTED');

    // Handle Clicks
    document.getElementById('dev-pass')?.addEventListener('click', () => {
       controls.remove();
       // Return a fake "signed" token for testing verification logic
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

export type MediatorStatus = 'IDLE' | 'INITIALIZING' | 'LOADING' | 'SHOWING' | 'COMPLETED' | 'ERROR' | 'SKIPPED';

export function useAdMediator() {
  const [status, setStatus] = useState<MediatorStatus>('IDLE');
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to reset state when user closes the modal
  const resetAdState = useCallback(() => {
    setStatus('IDLE');
    setCurrentProvider(null);
    setError(null);
  }, []);

  /**
   * Triggers the Ad Waterfall.
   * Returns a Promise that resolves to a 'proofToken' (string) if successful, 
   * or null if all ads failed/skipped.
   */
  const triggerAdWaterfall = useCallback(async (containerId: string, request: AdRequest): Promise<string | null> => {
    setStatus('INITIALIZING');
    setError(null);

    // Build the Waterfall: Dev Adapter (if local) -> HypeLab (Web3 Native) -> Google IMA (Fallback)
    const waterfall: AdAdapter[] = [];
    
    if (process.env.NODE_ENV === 'development') {
      waterfall.push(DevMockAdapter);
    }
    waterfall.push(HypeLabAdapter, GoogleIMAAdapter);

    // Iterate through providers
    for (const adapter of waterfall) {
      try {
        console.log(`🌊 AdMediator: Requesting [${adapter.name}]...`);
        
        // 1. Initialize SDK
        await adapter.initialize();
        
        // 2. Ready to show
        setStatus('LOADING');
        setCurrentProvider(adapter.name);

        // 3. Play & Wait for Result
        const resultToken = await new Promise<string>((resolve, reject) => {
          adapter.showAd(containerId, request, (event: AdEvent, payload?: any) => {
            
            switch (event) {
              case 'AD_STARTED':
                setStatus('SHOWING');
                break;
              
              case 'AD_COMPLETED':
                setStatus('COMPLETED');
                // Use the token provided by the adapter, or fallback to a timestamp for basic logic
                resolve(payload?.proofToken || `proof-${Date.now()}`);
                break;

              case 'AD_SKIPPED':
                setStatus('SKIPPED');
                reject(new Error('User skipped the ad'));
                break;
                
              case 'AD_ERROR':
                // Rejecting here triggers the catch block below, which moves to the next provider
                reject(new Error(`Provider ${adapter.name} failed to play`));
                break;
            }
          });
        });

        // ✅ Success! We have a token.
        console.log(`✅ AdMediator: Success via [${adapter.name}]`);
        return resultToken;

      } catch (err) {
        console.warn(`⚠️ AdMediator: [${adapter.name}] failed/skipped.`, err);
        // Continue loop to next provider...
      }
    }

    // ❌ Total Failure: If we exit the loop, no provider succeeded.
    console.error("❌ AdMediator: All providers failed.");
    setStatus('ERROR');
    setError('Sponsorship unavailable at this time.');
    return null;
  }, []);

  return { 
    triggerAdWaterfall, 
    resetAdState,
    status, 
    currentProvider,
    error 
  };
}