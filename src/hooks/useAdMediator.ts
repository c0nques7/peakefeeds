import { useState, useCallback } from 'react';
import { AdRequest, AdEvent, AdAdapter } from '@/lib/ads/types';

// We will implement these specific files next
import { HypeLabAdapter } from '@/lib/ads/adapters/hypelab';
import { GoogleIMAAdapter } from '@/lib/ads/adapters/google-ima';

type MediatorStatus = 'IDLE' | 'INITIALIZING' | 'LOADING' | 'SHOWING' | 'COMPLETED' | 'ERROR';

export function useAdMediator() {
  const [status, setStatus] = useState<MediatorStatus>('IDLE');
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerAdWaterfall = useCallback(async (containerId: string, request: AdRequest) => {
    setStatus('INITIALIZING');
    setError(null);

    // 1. Define the Priority Queue (The Waterfall)
    // Priority: HypeLab (Web3) -> Google IMA (Web2)
    const waterfall: AdAdapter[] = [HypeLabAdapter, GoogleIMAAdapter];

    for (const adapter of waterfall) {
      try {
        console.log(`🌊 AdMediator: Attempting provider [${adapter.name}]...`);
        
        await adapter.initialize();
        
        // If we get here, initialization worked. Now try to show.
        setStatus('LOADING');
        setCurrentProvider(adapter.name);

        await new Promise<void>((resolve, reject) => {
          adapter.showAd(containerId, request, (event: AdEvent) => {
            if (event === 'AD_STARTED') setStatus('SHOWING');
            
            if (event === 'AD_COMPLETED') {
              setStatus('COMPLETED');
              resolve(); 
            }
            
            if (event === 'AD_ERROR') {
              reject(new Error('Provider failed to fill or play'));
            }
          });
        });

        // If we reach this line, the ad completed successfully!
        console.log(`✅ AdMediator: Success with [${adapter.name}]`);
        return; // EXIT THE LOOP

      } catch (err) {
        console.warn(`⚠️ AdMediator: Provider [${adapter.name}] failed. Falling back.`, err);
        // Continue to next provider in the loop...
      }
    }

    // If loop finishes without returning, everything failed.
    setStatus('ERROR');
    setError('No ads available from any provider.');
  }, []);

  return { 
    triggerAdWaterfall, 
    status, 
    currentProvider,
    error 
  };
}

