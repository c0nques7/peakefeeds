import { http, createConfig } from 'wagmi'
import { optimism, mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask, safe } from 'wagmi/connectors'

// 1. Define Chains (Optimism is our L2 focus)
export const config = createConfig({
  chains: [optimism, mainnet, sepolia],
  
  // 2. Define Connectors (Wallets)
  connectors: [
    injected(), // Browser default (e.g. Rabbit, Brave)
    metaMask(),
    safe(),
  ],
  
  // 3. Define Transports (RPC Providers)
  transports: {
    [optimism.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})