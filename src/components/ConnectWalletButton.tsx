'use client'

import { useState, useEffect } from 'react'
// 🟢 FIX: Import hooks from AppKit directly where possible
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { ShieldCheck, Wallet, Loader2, LogOut } from 'lucide-react'
import { verifyWalletAddress } from '@/actions/verify-wallet'
import { toast } from 'sonner'
import { useRouter, usePathname } from 'next/navigation'

export function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false);
  
  // AppKit Hooks
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  
  // 🟢 FIX: Use disconnectAsync (disconnect is deprecated)
  const { disconnect: disconnectWallet } = useDisconnect()

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Auto-Sync Logic
  useEffect(() => {
    const syncAndRedirect = async () => {
      if (isConnected && address) {
        const formData = new FormData();
        formData.append('address', address);
        
        const result = await verifyWalletAddress(formData);
        
        if (result.success) {
            toast.success("Wallet linked successfully!");
            router.refresh();
            if (window.location.search.includes('tab=wallet')) {
                router.replace(pathname); 
            }
        }
      }
    };

    if (mounted && isConnected && address) {
        syncAndRedirect();
    }
  }, [isConnected, address, mounted, router, pathname]);

  // --- HANDLER ---
  const handleDisconnect = async () => {
      try {
          await disconnectWallet();
      } catch (e) {
          console.error("Failed to disconnect:", e);
      }
  };

  if (!mounted) {
    return (
      <button disabled className="flex items-center gap-2 px-6 py-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-card)] opacity-50">
         <Wallet size={16} /><span>Loading...</span>
      </button>
    );
  }

  // --- CONNECTED STATE ---
  if (isConnected && address) {
    return (
      <div className="group relative flex items-center gap-2 cursor-pointer">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-sm font-bold shadow-sm">
          <ShieldCheck size={16} className="group-hover:hidden" />
          <LogOut size={16} className="hidden group-hover:block" />
          <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
        {/* 🟢 FIX: Use the async handler */}
        <button onClick={handleDisconnect} className="absolute inset-0 w-full h-full z-10" aria-label="Disconnect" />
      </div>
    );
  }

  // --- DISCONNECTED STATE ---
  return (
    <button
      onClick={() => open()} 
      className="flex items-center gap-2 px-6 py-2 rounded-full bg-[var(--accent-primary)] text-white font-bold hover:shadow-lg transition-all"
    >
      <Wallet size={16} />
      <span>Connect Wallet</span>
    </button>
  );
}