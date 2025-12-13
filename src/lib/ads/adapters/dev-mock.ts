// lib/ads/adapters/dev-mock.ts
import { AdAdapter } from "../types";

export const DevMockAdapter: AdAdapter = {
  name: "DEV_MOCK_PROVIDER",
  initialize: async () => console.log("🔧 Dev Mode: Initializing..."),
  showAd: async (containerId, request, onEvent) => {
    // Inject a hidden "Dev Control" into the UI for manual testing
    const devControls = document.createElement('div');
    devControls.innerHTML = `
      <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); z-index:9999; display:flex; gap:10px;">
        <button id="dev-pass" style="background:green; color:white; padding:10px;">✅ Force Success</button>
        <button id="dev-fail" style="background:red; color:white; padding:10px;">❌ Force Fail</button>
      </div>
    `;
    document.getElementById(containerId)?.appendChild(devControls);

    document.getElementById('dev-pass')?.addEventListener('click', () => {
       onEvent('AD_STARTED');
       setTimeout(() => onEvent('AD_COMPLETED', { proofToken: 'DEV_TOKEN_123' }), 500);
       devControls.remove();
    });

    document.getElementById('dev-fail')?.addEventListener('click', () => {
       onEvent('AD_ERROR');
       devControls.remove();
    });
  }
};