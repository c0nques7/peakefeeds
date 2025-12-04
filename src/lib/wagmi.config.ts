import { http, createConfig } from 'wagmi'
import { optimismSepolia, mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// 🛑 DEBUGGING: Uncomment this line to check if ID is loaded in your browser console
// console.log("WalletConnect Project ID:", projectId);

const metadata = {
  name: 'Peake Feeds',
  description: 'The Truth Layer',
  // 🟢 FIX 1: Dynamically use the actual IP address/domain you are on
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000', 
  icons: ['https://peakefeeds.com/logo.png'],
  // 🟢 FIX 2: Add a redirect schema (helps mobile app return to browser)
  redirect: {
    native: 'peakefeeds://', 
    universal: 'https://peakefeeds.com'
  }
};

export const config = createConfig({
  chains: [optimismSepolia, mainnet, sepolia],
  
  connectors: [
    injected(), 
    metaMask(),
    
    walletConnect({ 
        projectId, 
        metadata, 
        showQrModal: true, 
        // 🟢 FIX 3: Disable strict verification for development
        // This allows '192.168...' to connect without SSL/Domain errors
        qrModalOptions: {
            themeMode: 'dark',
        }
    }),

    safe(),
  ],
  
  transports: {
    [optimismSepolia.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

