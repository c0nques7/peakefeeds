import { cookieStorage, createStorage, http } from 'wagmi'
import { optimismSepolia, mainnet, sepolia } from 'wagmi/chains'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// 1. Get Project ID from env
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// 2. Configure Networks
export const networks = [optimismSepolia, mainnet, sepolia]

// 3. Set up the Wagmi Adapter (replaces createConfig)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

// 4. Initialize AppKit
// This automatically handles the "Mobile vs Desktop" logic and QR codes
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [optimismSepolia, mainnet, sepolia],
  projectId,
  metadata: {
    name: 'Peake Feeds',
    description: 'The Truth Layer',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://peakefeeds.com', 
    icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://peakefeeds.com/logo.png']
  },
  themeMode: 'dark',
  features: {
    analytics: false, 
    email: false, // Disable email login (Web3 only)
    socials: []   // Disable social login
  }
})

export const config = wagmiAdapter.wagmiConfig