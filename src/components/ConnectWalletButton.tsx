'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ShieldCheck, Wallet, Loader2, LogOut, Laptop, QrCode } from 'lucide-react'
import clsx from 'clsx'
import { verifyWalletAddress } from '@/actions/verify-wallet'
import { toast } from 'sonner'

export function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false)
  const [showOptions, setShowOptions] = useState(false) // 🆕 State for menu
  
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  // 1. Hydration Fix
  useEffect(() => {
    setMounted(true)
  }, [])

  // 2. Auto-Sync to Database
  useEffect(() => {
    const syncToDb = async () => {
      if (isConnected && address) {
        const formData = new FormData();
        formData.append('address', address);
        await verifyWalletAddress(formData);
      }
    };

    if (mounted && isConnected && address) {
        syncToDb();
    }
  }, [isConnected, address, mounted]);

  // 3. HANDLERS
  const handleBrowserWallet = () => {
    // Looks for 'injected' (Generic) or 'metaMask' specifically
    const target = connectors.find(c => c.id === 'injected' || c.id === 'metaMask');
    
    if (target) {
        connect({ connector: target });
        setShowOptions(false);
    } else {
        toast.info("No browser wallet detected.");
    }
  };

  const handleWalletConnect = () => {
    // Explicitly looks for the WalletConnect connector
    const target = connectors.find(c => c.id === 'walletConnect');
    
    if (target) {
        connect({ connector: target });
        setShowOptions(false);
    } else {
        toast.error("WalletConnect not configured. Check Project ID.");
    }
  };


  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-card)] text-[var(--text-muted)] text-sm font-medium opacity-50">
        <Wallet size={16} />
        <span>Loading...</span>
      </div>
    )
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

        <button 
            onClick={() => disconnect()}
            className="absolute inset-0 w-full h-full z-10"
            aria-label="Disconnect"
        />
      </div>
    )
  }

  // --- SELECTION MENU (When Clicked) ---
  if (showOptions) {
      return (
          <div className="flex flex-col gap-2 p-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-card)] absolute z-50 min-w-[220px] shadow-xl animate-in fade-in zoom-in-95 duration-200">
              
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
                      <span className="text-[10px] text-[var(--text-muted)]">Mobile App / QR Code</span>
                  </div>
              </button>

              <button onClick={() => setShowOptions(false)} className="text-xs text-center p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  Cancel
              </button>
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
        "border border-[var(--accent-primary)] text-[var(--accent-primary)]",
        "hover:bg-[var(--accent-primary)] hover:text-white hover:shadow-[0_0_20px_var(--orb-purple)]",
        "disabled:opacity-50"
      )}
    >
      {isPending ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
      <span>{isPending ? 'Connecting...' : 'Connect Wallet'}</span>
    </button>
  )
}