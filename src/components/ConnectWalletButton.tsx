'use client'

import { useState, useEffect } from 'react'
// 🆕 Import Navigation Hooks
import { useRouter, usePathname } from 'next/navigation' 
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ShieldCheck, Wallet, Loader2, LogOut, Laptop, QrCode } from 'lucide-react'
import clsx from 'clsx'
import { verifyWalletAddress } from '@/actions/verify-wallet' 
import { toast } from 'sonner';

export function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const router = useRouter(); // 🆕 Router instance
  const pathname = usePathname(); // 🆕 Current path (without query params)

  useEffect(() => setMounted(true), []);

  // 2. Auto-Sync & Redirect Logic
  useEffect(() => {
    const syncAndRedirect = async () => {
      if (isConnected && address) {
        const formData = new FormData();
        formData.append('address', address);
        
        // 1. Link to DB
        const result = await verifyWalletAddress(formData);
        
        if (result.success) {
            toast.success("Wallet linked successfully!");
            
            // 2. Refresh Server Data (so Sidebar/Headers update)
            router.refresh();

            // 3. Redirect back to main profile (Remove ?tab=wallet)
            // We check if we are currently on the wallet tab to avoid infinite loops
            if (window.location.search.includes('tab=wallet')) {
                // Determine the base profile URL. 
                // pathname is usually "/profile/[username]"
                router.replace(pathname); 
            }
        }
      }
    };

    if (mounted && isConnected && address) {
        syncAndRedirect();
    }
  }, [isConnected, address, mounted, router, pathname]);

  // --- HANDLERS ---

  const handleBrowserWallet = () => {
    const target = connectors.find(c => c.id === 'injected' || c.id === 'metaMask');
    const hasInjected = typeof window !== 'undefined' && (window as any).ethereum;

    if (target && hasInjected) {
        connect({ connector: target });
        setShowOptions(false);
    } else {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            toast.info("Mobile detected: Switching to WalletConnect...");
            handleWalletConnect(); 
        } else {
            toast.info("No wallet extension detected.");
            window.open("https://metamask.io/download/", "_blank");
        }
    }
  };

  const handleWalletConnect = () => {
    const target = connectors.find(c => c.id === 'walletConnect');
    if (target) {
        connect({ connector: target });
        setShowOptions(false);
    } else {
        toast.error("WalletConnect not configured.");
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-card)] text-[var(--text-muted)] text-sm font-medium opacity-50">
        <Wallet size={16} /><span>Loading...</span>
      </div>
    );
  }

  // --- CONNECTED STATE ---
  if (isConnected && address) {
    return (
      <div className="group relative flex items-center gap-2 cursor-pointer">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all group-hover:border-red-500/30 group-hover:bg-red-500/10 group-hover:text-red-500">
          <ShieldCheck size={16} className="group-hover:hidden" />
          <LogOut size={16} className="hidden group-hover:block" />
          <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
        <button onClick={() => disconnect()} className="absolute inset-0 w-full h-full z-10" aria-label="Disconnect" />
      </div>
    );
  }

  // --- SELECTION MENU ---
  if (showOptions) {
      return (
          <div className="relative z-[9999]">
            <div className="flex flex-col gap-2 p-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-card)] absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[240px] shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-[9999]">
                
                <button onClick={handleBrowserWallet} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--glass-card-hover)] text-left text-sm transition-colors group">
                    <div className="p-2 bg-indigo-500/20 rounded-md text-indigo-400 group-hover:text-indigo-300"><Laptop size={18} /></div>
                    <div>
                        <span className="block font-bold text-[var(--text-primary)]">Browser Wallet</span>
                        <span className="text-[10px] text-[var(--text-muted)]">MetaMask / Injected</span>
                    </div>
                </button>

                <button onClick={handleWalletConnect} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--glass-card-hover)] text-left text-sm transition-colors group">
                    <div className="p-2 bg-blue-500/20 rounded-md text-blue-400 group-hover:text-blue-300"><QrCode size={18} /></div>
                    <div>
                        <span className="block font-bold text-[var(--text-primary)]">WalletConnect</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Mobile App / QR</span>
                    </div>
                </button>

                <button onClick={() => setShowOptions(false)} className="text-xs text-center p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] border-t border-[var(--glass-border)] mt-1">
                    Cancel
                </button>
            </div>
          </div>
      )
  }

  // --- DISCONNECTED BUTTON ---
  return (
    <button
      disabled={isPending}
      onClick={() => setShowOptions(true)}
      className={clsx(
        "flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm transition-all duration-300",
        "bg-[var(--accent-primary)] text-white hover:shadow-lg",
        "disabled:opacity-50"
      )}
    >
      {isPending ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
      <span>Connect Wallet</span>
    </button>
  );
}

