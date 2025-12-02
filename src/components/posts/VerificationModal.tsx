'use client'

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { Wallet, PlayCircle, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (method: 'WALLET' | 'AD' | 'SKIP', signature?: string) => void;
  contentHash: string; 
}

export function VerificationModal({ isOpen, onClose, onVerified, contentHash }: VerificationModalProps) {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { signMessageAsync } = useSignMessage();
  
  const [adProgress, setAdProgress] = useState(0);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
        setAdProgress(0);
        setIsWatchingAd(false);
        setIsSigning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- OPTION A: WALLET ---
  const handleWalletVerify = async () => {
    setIsSigning(true);
    try {
        let currentAddress = address;
        
        // 1. Connect if not connected
        if (!isConnected || !currentAddress) {
            const result = await connectAsync({ connector: connectors[0] });
            currentAddress = result.accounts[0];
        }
        
        // 2. Sign the Hash
        if (currentAddress) {
            const signature = await signMessageAsync({ 
                message: `Verify Truth Layer Content:\n${contentHash}` 
            });
            
            if (signature) {
                onVerified('WALLET', signature);
            }
        }
    } catch (error) {
        console.error("Verification failed:", error);
        // Optional: Add toast error here
    } finally {
        setIsSigning(false);
    }
  };

  // --- OPTION B: AD ---
  const handleWatchAd = () => {
    setIsWatchingAd(true);
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        setAdProgress(progress);
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                onVerified('AD'); 
            }, 500);
        }
    }, 500); 
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--bg-app)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4 text-emerald-400 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Verify Content</h2>
            <p className="text-[var(--text-muted)] text-sm mt-2">
                Anchor this post to the Optimism Blockchain to prove authenticity.
            </p>
        </div>

        {/* --- THE CHOICE --- */}
        {!isWatchingAd ? (
            <div className="space-y-3">
                {/* Button A: Wallet */}
                <button 
                    onClick={handleWalletVerify}
                    disabled={isSigning}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-indigo-400 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-500/20 p-2 rounded-lg group-hover:bg-white/20"><Wallet size={24} /></div>
                        <div className="text-left">
                            <span className="block font-bold text-sm">Connect Wallet</span>
                            <span className="block text-[10px] opacity-70">Sign & Pay Gas (Self-Custody)</span>
                        </div>
                    </div>
                    {isSigning ? <Loader2 className="animate-spin" /> : <span>→</span>}
                </button>

                {/* Button B: Ad */}
                <button 
                    onClick={handleWatchAd}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--glass-card)] border border-[var(--glass-border)] hover:bg-[var(--glass-card-hover)] hover:border-emerald-500/30 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-[var(--glass-panel)] p-2 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-400 text-[var(--text-primary)]"><PlayCircle size={24} /></div>
                        <div className="text-left">
                            <span className="block font-bold text-[var(--text-primary)]">Watch 5s Ad</span>
                            <span className="block text-[10px] text-[var(--text-muted)]">Free Verification (Sponsored)</span>
                        </div>
                    </div>
                </button>

                <div className="py-2 flex items-center justify-center">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">or</span>
                </div>

                {/* Button C: SKIP (The "Ghost" Option) */}
                <button 
                    onClick={() => onVerified('SKIP')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-card-hover)] transition-colors text-xs"
                >
                    <AlertCircle size={14} />
                    Post without verification (Unverified)
                </button>
                
            </div>
        ) : (
            // --- AD PLAYBACK ---
            <div className="text-center py-8">
                <p className="text-[var(--text-primary)] font-bold mb-4 animate-pulse">Verifying on Optimism...</p>
                <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden mb-2">
                    <div 
                        className="bg-emerald-500 h-full transition-all duration-500 ease-linear"
                        style={{ width: `${adProgress}%` }}
                    />
                </div>
                <p className="text-xs text-[var(--text-muted)]">PeakeFeeds is sponsoring this transaction</p>
            </div>
        )}

      </div>
    </div>
  );
}
