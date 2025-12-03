import { http, createConfig } from 'wagmi'
import { optimismSepolia, mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors' // 🆕 Import walletConnect

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Metadata for the WalletConnect Modal
const metadata = {
  name: 'Peake Feeds',
  description: 'The Truth Layer',
  url: 'https://peakefeeds.com', 
  icons: ['https://peakefeeds.com/logo.png']
};

export const config = createConfig({
  chains: [optimismSepolia, mainnet, sepolia],
  
  connectors: [
    // 1. Browser Extension (MetaMask, Rabby, etc.)
    // Keep this first so desktop users get the best experience
    injected(), 
    
    // 2. MetaMask Specific (Optional, usually covered by injected, but good for specificity)
    metaMask(),

    // 3. WalletConnect V2 (Crucial for Mobile & QR Codes)
    walletConnect({ 
        projectId, 
        metadata, 
        showQrModal: true // Opens the official modal for scanning
    }),

    safe(),
  ],
  
  transports: {
    [optimismSepolia.id]: http(), // Fixed: Changed from optimism to optimismSepolia for testing
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})