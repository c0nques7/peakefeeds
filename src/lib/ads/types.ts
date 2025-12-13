export interface AdRequest {
  userId: string;         // Wallet Address
  contentHash?: string;   // Optional: We have this, but make it optional to be safe
  signature?: string;     // ✅ FIX: Make this Optional. We sign AFTER the ad.
}

export type AdEvent = 
  | 'AD_LOADED'
  | 'AD_STARTED'
  | 'AD_CLICKED'
  | 'AD_SKIPPED'
  | 'AD_COMPLETED' 
  | 'AD_ERROR';

export interface AdAdapter {
  name: string; 
  initialize: () => Promise<void>;
  showAd: (
    containerId: string,
    request: AdRequest,
    onEvent: (event: AdEvent, data?: any) => void
  ) => Promise<void>;
}