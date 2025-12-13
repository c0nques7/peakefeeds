'use client'

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { Wallet, PlayCircle, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from "sonner"; 
import { createPortal } from 'react-dom'; 

// 🟢 Updated Imports
import { useAdMediator } from '@/hooks/useAdMediator';
import { AdPlayerOverlay } from '@/components/ads/AdPlayerOverlay';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (method: 'WALLET' | 'AD' | 'SKIP', signature?: string, proofToken?: string) => void;
  contentHash: string; 
}

export function VerificationModal({ isOpen, onClose, onVerified, contentHash }: VerificationModalProps) {
    const { address, isConnected } = useAccount();
    const { connectors, connectAsync } = useConnect();
    const { signMessageAsync } = useSignMessage();
    
    // 🟢 1. Use the new Hook Interface
    const { 
        startVerification, 
        selectAdFlow, 
        selectQuestFlow, 
        status: adStatus, 
        currentProvider,
        resetAdState
    } = useAdMediator();
    
    // Component State
    const [isSigning, setIsSigning] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Mount logic for Portal
    useEffect(() => {
        setMounted(true);
        if (!isOpen) {
            setIsSigning(false);
            resetAdState(); // Ensure ad state clears on close
        }
    }, [isOpen, resetAdState]);

    if (!mounted || !isOpen) return null;

    // --- OPTION A: WALLET (Direct Pay) ---
    const handleWalletVerify = async () => {
        setIsSigning(true);
        try {
            let currentAddress = address;
            if (!isConnected || !currentAddress) {
                const result = await connectAsync({ connector: connectors[0] });
                currentAddress = result.accounts[0];
            }

            if (currentAddress) {
                const signature = await signMessageAsync({ 
                    message: { raw: contentHash as `0x${string}` } 
                });
                if (signature) {
                    onVerified('WALLET', signature);
                }
            }
        } catch (error) {
            console.error("Wallet verification failed:", error);
            toast.error("Signature rejected.");
        } finally {
            setIsSigning(false);
        }
    };

    // --- OPTION B: AD (Sponsor Gas) ---
    const handleWatchAd = async () => {
        try {
            let currentAddress = address;
            
            // 1. Ensure Connection
            if (!isConnected || !currentAddress) {
                const result = await connectAsync({ connector: connectors[0] });
                currentAddress = result.accounts[0];
            }

            // 2. Start the Ad Flow (Opens the "Video vs Quest" Choice)
            // This awaits until the user finishes the entire flow
            const proofToken = await startVerification('peake-ad-container', {
                userId: currentAddress!,
                contentHash: contentHash,
            });

            // 3. If we got a token, they watched the ad. Now we sign.
            if (proofToken) {
                setIsSigning(true);
                const signature = await signMessageAsync({ 
                    message: { raw: contentHash as `0x${string}` }
                });

                // 4. Success
                onVerified('AD', signature, proofToken);
                resetAdState();
            }

        } catch (error: any) {
            console.error(error);
            if (error?.message?.includes('User rejected')) {
                toast.warning("Signature required to publish.");
            } else {
                // If startVerification returned null, user likely cancelled overlay
            }
        } finally {
            setIsSigning(false);
        }
    };

    // --- PORTAL CONTENT ---
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            
            {/* 🟢 The Updated Ad Overlay */}
            {/* It sits on top of the modal when active */}
            <AdPlayerOverlay 
                status={adStatus} 
                provider={currentProvider} 
                onSelectVideo={selectAdFlow}   // 👈 Connect Video
                onSelectQuest={selectQuestFlow} // 👈 Connect Quest
                onCancel={() => {
                    resetAdState();
                    // Don't close the whole modal, just the ad layer
                }} 
            />
            
            {/* The Main Modal Card */}
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                 style={{ opacity: adStatus !== 'IDLE' ? 0 : 1, pointerEvents: adStatus !== 'IDLE' ? 'none' : 'auto' }}>
                 
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4 text-emerald-400 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Verify Content</h2>
                    <p className="text-zinc-400 text-sm mt-2">
                        Anchor this post to Optimism to prove authenticity.
                    </p>
                </div>

                {/* Choices */}
                <div className="space-y-3">
                    
                    {/* 1. Wallet */}
                    <button 
                        onClick={handleWalletVerify}
                        disabled={isSigning}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-indigo-400 transition-all group disabled:opacity-50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-500/20 p-2 rounded-lg group-hover:bg-white/20"><Wallet size={24} /></div>
                            <div className="text-left">
                                <span className="block font-bold text-sm">Pay Gas (Wallet)</span>
                                <span className="block text-[10px] opacity-70">Standard (~$0.01 ETH)</span>
                            </div>
                        </div>
                        {isSigning ? <Loader2 className="animate-spin" /> : <span>→</span>}
                    </button>

                    {/* 2. Ad / Sponsor */}
                    <button 
                        onClick={handleWatchAd}
                        disabled={isSigning}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-800 hover:border-emerald-500/50 transition-all group disabled:opacity-50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-zinc-800 p-2 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-400 text-white"><PlayCircle size={24} /></div>
                            <div className="text-left">
                                <span className="block font-bold text-white">Sponsor Gas</span>
                                <span className="block text-[10px] text-zinc-400">Watch Ad or Quest (Free)</span>
                            </div>
                        </div>
                    </button>

                    <div className="py-2 flex items-center justify-center">
                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">or</span>
                    </div>

                    {/* 3. Skip */}
                    <button 
                        onClick={() => onVerified('SKIP')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors text-xs"
                    >
                        <AlertCircle size={14} />
                        Post Unverified
                    </button>

                </div>
            </div>

        </div>,
        document.body 
    );
}