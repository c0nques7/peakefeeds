import { AdAdapter } from "../types";

export const GoogleIMAAdapter: AdAdapter = {
  name: "GOOGLE_IMA",
  initialize: async () => { /* TODO: Load IMA SDK */ },
  showAd: async (containerId, request, onEvent) => {
    console.log("Google Stub: Playing fallback ad...");
    onEvent('AD_STARTED');
    setTimeout(() => onEvent('AD_COMPLETED'), 2000);
  }
};

