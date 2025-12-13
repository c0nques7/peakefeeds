'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSignMessage, useAccount } from 'wagmi'; 
import { useActionState } from 'react'; 
import { useFormStatus } from 'react-dom'; 

import { Loader2, User, Wallet, PlayCircle, ShieldOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner'; 

// Actions & Utils
import { createPost, CreatePostState } from '@/actions/create-post'; 
import { verifyWalletAddress } from '@/actions/verify-wallet'; 
import { generateContentHash, generateSalt } from '@/lib/verification'; 

// AdTech Integration
import { AdPlayerOverlay } from '@/components/ads/AdPlayerOverlay';
import { useAdMediator } from '@/hooks/useAdMediator';

type VerificationState = 'NONE' | 'WALLET' | 'AD' | 'SKIP';

interface CreatePostFormProps {
    channelId: string;
    userImage?: string | null; 
    username: string; 
    linkedWallet?: string | null; 
}

const initialFormState: CreatePostState = {
    success: false,
    message: null,
};

export default function CreatePostForm({ channelId, userImage, username, linkedWallet }: CreatePostFormProps) {
  const router = useRouter(); 
  
  // Web3 Hooks
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // 🟢 AdTech Hook (Updated with Choice Flow)
  const { 
      startVerification, 
      selectAdFlow, 
      selectQuestFlow, 
      status: adStatus, 
      currentProvider, 
      resetAdState 
  } = useAdMediator();

  // Form State
  const [state, formAction] = useActionState(createPost, initialFormState);
  const { pending } = useFormStatus();

  // Local Component State
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [method, setMethod] = useState<VerificationState>('NONE');
  
  // Cryptographic State
  const [signature, setSignature] = useState<string | null>(null);
  const [postHash, setPostHash] = useState<string | null>(null);
  const [postSalt, setPostSalt] = useState<string | null>(null);
  const [adProofToken, setAdProofToken] = useState<string | null>(null);

  // 1. Live Hashing of Content
  useEffect(() => {
    if (content.trim()) {
      const newSalt = generateSalt();
      const newHash = generateContentHash(content, newSalt);
      setPostSalt(newSalt);
      setPostHash(newHash);
    } else {
      setPostSalt(null); 
      setPostHash(null); 
      setMethod('NONE'); 
      setSignature(null);
      setAdProofToken(null);
    }
  }, [content]);

  // 2. Handle Server Response
  useEffect(() => {
    if (state.message && state.errors) {
        toast.error(state.message);
    } else if (state.success) {
        setContent(""); 
        setIsExpanded(false); 
        setMethod('NONE'); 
        setSignature(null);
        setAdProofToken(null);
        router.refresh(); 
        toast.success("Post published successfully!");
    }
  }, [state, router]);

  // 3. Helper: Redirect to Profile
  const redirectToProfile = () => {
      toast.info("Please connect your wallet in your profile.");
      router.push(`/profile/${username}?tab=wallet`);
  };

  // 4. Core Verification Logic
  const handleVerifyClick = useCallback(async (choice: 'WALLET' | 'AD') => {
    if (!content.trim()) { toast.warning("Please enter content first."); return; }
    if (!postHash) return; 

    // A. Connection Check
    if (!isConnected || !address) {
        redirectToProfile();
        return; 
    }

    // B. Security Guard: Wallet Mismatch
    if (linkedWallet && address) {
        if (linkedWallet.toLowerCase() !== address.toLowerCase()) {
            toast.error("Wallet Mismatch!");
            toast.warning(`Switch MetaMask to: ${linkedWallet.slice(0,6)}...`);
            return;
        }
    }

    setIsPreparing(true);
    setMethod(choice);

    try {
      // --- C. Ad Logic (Conditional) ---
      if (choice === 'AD') {
          // 1. Open the Prompt (Prompt -> User Picks Video/Quest -> Ad Plays -> Returns Token)
          const proofToken = await startVerification('peake-ad-container', { 
              userId: address!, 
              contentHash: postHash // Pass hash for anti-spam tracking
          });

          if (!proofToken) {
              // User cancelled or failed
              setMethod('NONE');
              setIsPreparing(false);
              return; // 🛑 STOP HERE
          }
          
          setAdProofToken(proofToken);

          // 2. Wait briefly so user sees the "Success Checkmark" in the overlay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 3. Close the overlay explicitly
          resetAdState();
          
          toast.success("Sponsorship Verified! Please sign to publish.");
      }

      // --- D. Signature Logic ---
      const hashToSign = postHash as `0x${string}`;

      // Sign with { raw } to match server expectation
      const sig = await signMessageAsync({ message: { raw: hashToSign } });
      
      // Auto-Link Logic (Fire & Forget)
      if (address) {
          const formData = new FormData();
          formData.append('address', address);
          verifyWalletAddress(formData);
      }

      setSignature(sig);
      toast.success(choice === 'AD' ? "Sponsored Post Ready!" : "Content Signed Successfully");
      
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('User rejected')) {
          toast.warning("Signature rejected.");
      } else {
          toast.error("Verification failed.");
      }
      
      // Reset state on failure
      setMethod('NONE');
      setSignature(null);
      setAdProofToken(null);
      resetAdState(); 
    } finally {
      setIsPreparing(false);
    }
  }, [content, postHash, address, isConnected, signMessageAsync, startVerification, resetAdState, router, username, linkedWallet]);


  // UI Helpers
  const isPostReady = content.trim() && (method === 'SKIP' || signature);
  const isButtonDisabled = pending || isPreparing || !isPostReady;

  return (
    <>
      {/* 🟢 The Glassmorphism Overlay */}
      <AdPlayerOverlay 
          status={adStatus} 
          provider={currentProvider} 
          onSelectVideo={selectAdFlow}  // 👈 Connect Video Button
          onSelectQuest={selectQuestFlow} // 👈 Connect Quest Button (Placeholder)
          onCancel={() => {
              // Handle manual close
              resetAdState();
              setMethod('NONE');
              setIsPreparing(false);
          }} 
      />
      
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-[var(--text-primary)]">New Truth Submission</h2>

        {linkedWallet && (
            <div className="text-[10px] text-zinc-500 mb-2 font-mono">
                Linked: {linkedWallet.slice(0,6)}...{linkedWallet.slice(-4)}
            </div>
        )}

        {!isConnected ? (
             <div className="p-3 mb-4 rounded-xl bg-indigo-800/20 border border-indigo-700 text-indigo-400 flex items-center justify-between gap-3 cursor-pointer hover:bg-indigo-800/30 transition-colors"
                 onClick={redirectToProfile}>
                 <div className="flex items-center gap-3">
                    <Wallet size={16} /> 
                    <span className="text-sm font-medium">Link Wallet to Post Verified Content</span>
                 </div>
                 <ArrowRight size={16} />
             </div>
        ) : (
            <div className="flex items-center gap-2 mb-4 text-xs text-emerald-400 bg-emerald-900/20 p-2 rounded-lg border border-emerald-800/50 w-fit">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Wallet Active: {address?.slice(0,6)}...{address?.slice(-4)}
            </div>
        )}

        <form action={formAction}
          onSubmit={(e) => { 
              if (!content.trim() || method === 'NONE') { 
                  e.preventDefault();
                  toast.warning("Please select a verification method.");
                  return;
              }
              setIsExpanded(true); 
          }}
          className="relative rounded-2xl p-4 backdrop-blur-md"
          style={{ background: 'var(--glass-card)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}
        >
          {/* Form Content */}
          <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {userImage ? (<img src={userImage} alt="User" className="w-full h-full object-cover" />) : (<User size={20} />)}
              </div>

              <div className="flex-1">
                  <textarea 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={isExpanded ? 4 : 1}
                      placeholder="Share your truth..." 
                      name="content"
                      className="w-full border-none focus:ring-0 resize-none p-2 text-lg bg-transparent placeholder-gray-500/50 focus:outline-none transition-all"
                      style={{ color: 'var(--text-primary)' }}
                      onClick={() => setIsExpanded(true)}
                  />
                  
                  {/* Hidden Inputs for Server Action */}
                  <input type="hidden" name="channelId" value={channelId} />
                  <input type="hidden" name="contentHash" value={postHash || ''} />
                  <input type="hidden" name="salt" value={postSalt || ''} />
                  <input type="hidden" name="signature" value={signature || ''} />
                  <input type="hidden" name="verificationMethod" value={method} />
                  <input type="hidden" name="adProofToken" value={adProofToken || ''} />

                  {isExpanded && (
                      <p className="text-xs mt-2 text-[var(--text-muted)] opacity-70">* Content is hashed client-side before submission.</p>
                  )}
              </div>
          </div>

          {isExpanded && (
              <>
                <div className="mt-4 pt-3 border-t border-[var(--glass-border)]">
                  <h4 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Verification Method</h4>
                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* OPTION 1: WALLET SIGN (Standard) */}
                    <button type="button" onClick={() => handleVerifyClick('WALLET')} disabled={isPreparing || method === 'SKIP'}
                      className={`p-3 rounded-xl transition-all border text-xs flex flex-col items-center group ${method === 'WALLET' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]'}`}>
                      <Wallet size={18} />
                      <span className="mt-1">Pay Gas</span>
                      {method === 'WALLET' && isPreparing ? <Loader2 size={12} className="animate-spin mt-1" /> : signature && method === 'WALLET' ? <ShieldCheck size={12} className='mt-1 text-green-500' /> : null}
                    </button>

                    {/* OPTION 2: SPONSOR (Ad / Quest) */}
                    <button type="button" onClick={() => handleVerifyClick('AD')} disabled={isPreparing || method === 'SKIP'}
                      className={`p-3 rounded-xl transition-all border text-xs flex flex-col items-center group ${method === 'AD' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]'}`}>
                      <PlayCircle size={18} />
                      <span className="mt-1">Sponsor Gas</span>
                      {method === 'AD' && isPreparing ? <Loader2 size={12} className="animate-spin mt-1" /> : signature && method === 'AD' ? <ShieldCheck size={12} className='mt-1 text-green-500' /> : null}
                    </button>

                    {/* OPTION 3: SKIP (Unverified) */}
                    <button type="button" onClick={() => { setMethod('SKIP'); setSignature(null); setAdProofToken(null); }} disabled={isPreparing}
                      className={`p-3 rounded-xl transition-all border text-xs flex flex-col items-center group ${method === 'SKIP' ? 'bg-zinc-700/20 border-zinc-600 text-zinc-400' : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]'}`}>
                      <ShieldOff size={18} />
                      <span className="mt-1">Unverified</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end items-center mt-3 pt-3">
                  <button type="submit" disabled={isButtonDisabled}
                      className="px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(13,148,136,0.3)] hover:shadow-[0_0_25px_rgba(13,148,136,0.5)]"
                      style={{ background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', color: 'white' }}>
                      {pending ? (<Loader2 className="animate-spin" size={16} />) : (`Post ${isPostReady ? `(${method})` : ''}`)}
                  </button>
                </div>
              </>
          )}
        </form>
      </div>
    </>
  );
}