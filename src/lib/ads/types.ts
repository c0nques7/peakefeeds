export interface AdRequest {
  userId: string;       // Wallet Address (0x...) or User ID
  contentHash: string;  // The SHA256 hash of the post content + salt
  signature: string;    // The user's cryptographic signature proving ownership
}

export type AdEvent = 
  | 'AD_LOADED'
  | 'AD_STARTED'
  | 'AD_CLICKED'
  | 'AD_SKIPPED'
  | 'AD_COMPLETED' // <--- The money event
  | 'AD_ERROR';

/**
 * The Interface every Provider must implement.
 */
export interface AdAdapter {
  name: string; // e.g., 'HYPELAB', 'GOOGLE_IMA'
  
  /**
   * Initialize the SDK (load scripts, setup listeners).
   * Should be idempotent (safe to call multiple times).
   */
  initialize: () => Promise<void>;

  /**
   * Attempt to load and show an ad.
   * Resolves when the flow finishes (either complete or error).
   * * @param containerId The HTML ID of the div where the ad should render
   * @param request Data needed for the Server-Side Verification
   * @param onEvent Callback for UI updates (spinner, success message)
   */
  showAd: (
    containerId: string,
    request: AdRequest,
    onEvent: (event: AdEvent, data?: any) => void
  ) => Promise<void>;
}

