import { AdAdapter } from "../types";

export const HypeLabAdapter: AdAdapter = {
  name: "HYPELAB",
  initialize: async () => { /* TODO: Load HypeLab SDK */ },
  showAd: async (containerId, request, onEvent) => {
    // Stub logic
    console.log("Hypelab Stub: Checking inventory...");
    // Simulate failure for now to test waterfall
    // onEvent('AD_ERROR'); 
    
    // Simulate Success
    onEvent('AD_STARTED');
    setTimeout(() => onEvent('AD_COMPLETED'), 2000);
  }
};

