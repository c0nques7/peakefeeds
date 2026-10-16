'use client'

import { useState, useEffect, useRef } from 'react'
// 🟢 FIX: Import hooks from AppKit directly where possible
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { ShieldCheck, Wallet, Loader2, LogOut } from 'lucide-react'
import { useLinkWallet } from '@/hooks/useLinkWallet'
import { toast } from 'sonner'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui';

export function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false);
  
  // AppKit Hooks
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  
  // 🟢 FIX: Use disconnectAsync (disconnect is deprecated)
  const { disconnect: disconnectWallet } = useDisconnect()

  const router = useRouter();
  const pathname = usePathname();
  const linkWallet = useLinkWallet();
  const attemptedAddress = useRef<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Auto-Sync Logic
  useEffect(() => {
    const syncAndRedirect = async () => {
      // Ask once per connected address, not on every re-render
      if (isConnected && address && attemptedAddress.current !== address) {
        attemptedAddress.current = address;
        const result = await linkWallet(address);

        if (!result.success) {
            toast.error(result.error);
        } else if (!result.alreadyLinked) {
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
  }, [isConnected, address, mounted, router, pathname, linkWallet]);

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
      <Button disabled variant="secondary" icon={<Wallet size={16} aria-hidden="true" />}>Wallet</Button>
    );
  }

  // --- CONNECTED STATE ---
  if (isConnected && address) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-10 items-center gap-2 px-3 rounded-[var(--radius-control)] bg-[var(--status-success-bg)] text-[var(--status-success)] text-sm font-semibold font-mono">
          <ShieldCheck size={16} aria-hidden="true" />
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <Button variant="ghost" onClick={handleDisconnect} icon={<LogOut size={16} aria-hidden="true" />}>
          Disconnect
        </Button>
      </div>
    );
  }

  // --- DISCONNECTED STATE ---
  return (
    <Button onClick={() => open()} icon={<Wallet size={16} aria-hidden="true" />}>
      Connect wallet
    </Button>
  );
}