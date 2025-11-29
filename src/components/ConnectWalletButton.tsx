'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ShieldCheck, Wallet, Loader2, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { verifyWalletAddress } from '@/actions/verifiy-wallet'

export function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  // 1. Hydration Fix
  useEffect(() => {
    setMounted(true)
  }, [])

  // 2. Auto-Sync
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

  // 3. 🧠 SMARTER CONNECTION LOGIC
  const handleConnect = () => {
    // Priority 1: Explicit MetaMask (Supports Mobile Deep Linking)
    const metaMask = connectors.find(c => c.id === 'metaMask' || c.name === 'MetaMask');
    
    // Priority 2: WalletConnect (If you add it later)
    const walletConnect = connectors.find(c => c.id === 'walletConnect');
    
    // Priority 3: Injected (Desktop Browser Extension)
    const injected = connectors.find(c => c.id === 'injected');

    // Select the best available option
    const target = metaMask || walletConnect || injected || connectors[0];

    if (target) {
        connect({ connector: target });
    } else {
        console.error("No suitable wallet connector found.");
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

  // Connected State
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

  // Disconnected State
  return (
    <button
      disabled={isPending}
      // 🛑 UPDATED: Use the smart handler
      onClick={handleConnect} 
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
