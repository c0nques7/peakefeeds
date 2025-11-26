'use client'

import { useState } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { Wallet, PlayCircle, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ✅ UPDATED: Now accepts 'SKIP'
  onVerified: (method: 'WALLET' | 'AD' | 'SKIP', signature?: string) => void;
  contentHash: string; 
}

export function VerificationModal({ isOpen, onClose, onVerified, contentHash }: VerificationModalProps) {
  const { connectWallet, signContent, walletAddress } = useWeb3();
  const [adProgress, setAdProgress] = useState(0);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  if (!isOpen) return null;

  // --- OPTION A: WALLET ---
  const handleWalletVerify = async () => {
    setIsSigning(true);
    let address = walletAddress;
    if (!address) {
        address = await connectWallet();
    }
    
    if (address) {
        const signature = await signContent(contentHash);
        if (signature) {
            onVerified('WALLET', signature);
        }
    }
    setIsSigning(false);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4 text-emerald-400 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">Verify Content</h2>
            <p className="text-gray-400 text-sm mt-2">
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
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-indigo-300 transition-all group"
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
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-400"><PlayCircle size={24} /></div>
                        <div className="text-left">
                            <span className="block font-bold text-white">Watch 5s Ad</span>
                            <span className="block text-[10px] text-gray-400">Free Verification (Sponsored)</span>
                        </div>
                    </div>
                </button>

                <div className="py-2 flex items-center justify-center">
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">or</span>
                </div>

                {/* Button C: SKIP (The "Ghost" Option) */}
                <button 
                    onClick={() => onVerified('SKIP')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors text-xs"
                >
                    <AlertCircle size={14} />
                    Post without verification (Unverified)
                </button>
                
            </div>
        ) : (
            // --- AD PLAYBACK ---
            <div className="text-center py-8">
                <p className="text-white font-bold mb-4 animate-pulse">Verifying on Optimism...</p>
                <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden mb-2">
                    <div 
                        className="bg-emerald-500 h-full transition-all duration-500 ease-linear"
                        style={{ width: `${adProgress}%` }}
                    />
                </div>
                <p className="text-xs text-gray-500">PeakeFeeds is sponsoring this transaction</p>
            </div>
        )}

      </div>
    </div>
  );
}

