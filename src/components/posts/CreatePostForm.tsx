'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// 🛑 REMOVED: toHex import is no longer needed
// import { toHex } from 'viem'; 
import { useSignMessage, useAccount } from 'wagmi'; 
import { useActionState } from 'react'; 
import { useFormStatus } from 'react-dom'; 

import { Send, Loader2, User, Wallet, PlayCircle, ShieldOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner'; 

import { createPost, CreatePostState } from '@/actions/create-post'; 
import { verifyWalletAddress } from '@/actions/verify-wallet'; 
import { generateContentHash, generateSalt } from '@/lib/verification'; 
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
  
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { triggerAdWaterfall, status: adStatus, currentProvider } = useAdMediator();

  const [state, formAction] = useActionState(createPost, initialFormState);
  const { pending } = useFormStatus();

  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [method, setMethod] = useState<VerificationState>('NONE');
  const [signature, setSignature] = useState<string | null>(null);
  const [postHash, setPostHash] = useState<string | null>(null);
  const [postSalt, setPostSalt] = useState<string | null>(null);

  // 1. Hashing
  useEffect(() => {
    if (content.trim()) {
      const newSalt = generateSalt();
      const newHash = generateContentHash(content, newSalt);
      setPostSalt(newSalt);
      setPostHash(newHash);
    } else {
      setPostSalt(null); setPostHash(null); setMethod('NONE'); setSignature(null);
    }
  }, [content]);

  // 2. Server Response
  useEffect(() => {
    if (state.message && state.errors) toast.error(state.message);
    else if (state.success) {
        setContent(""); setIsExpanded(false); setMethod('NONE'); setSignature(null);
        router.refresh(); 
        toast.success("Post published successfully!");
    }
  }, [state, router]);

  // 3. Redirect
  const redirectToProfile = () => {
      toast.info("Please connect your wallet in your profile.");
      router.push(`/profile/${username}?tab=wallet`);
  };

  // 4. Verification Logic
  const handleVerifyClick = useCallback(async (choice: 'WALLET' | 'AD') => {
    if (!content.trim()) { toast.warning("Please enter content first."); return; }
    if (!postHash) return; 

    // A. Connect Check
    if (!isConnected || !address) {
        redirectToProfile();
        return; 
    }

    // B. SECURITY GUARD
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
      // 🟢 FIX: Directly typecast the hash. Do not use toHex().
      // postHash is already a 0x hex string from generateContentHash.
      const hashToSign = postHash as `0x${string}`;

      // Sign with { raw } to match server expectation
      const sig = await signMessageAsync({ message: { raw: hashToSign } });
      
      // Auto-Link
      if (address) {
          const formData = new FormData();
          formData.append('address', address);
          verifyWalletAddress(formData);
      }

      if (choice === 'AD') {
        await triggerAdWaterfall('peake-ad-container', { 
            userId: address!, 
            contentHash: postHash, 
            signature: sig 
        });
        toast.success("Verification Sponsored.");
      } else {
        toast.success("Content signed.");
      }
      
      setSignature(sig);
      
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('User rejected')) toast.warning("Signature rejected.");
      else toast.error("Verification failed.");
      setMethod('NONE');
      setSignature(null);
    } finally {
      setIsPreparing(false);
    }
  }, [content, postHash, address, isConnected, signMessageAsync, triggerAdWaterfall, router, username, linkedWallet]);


  // UI
  const isPostReady = content.trim() && (method === 'SKIP' || signature);
  const isButtonDisabled = pending || isPreparing || !isPostReady;

  return (
    <>
      <AdPlayerOverlay status={adStatus} provider={currentProvider} onCancel={() => setMethod('NONE')} />
      
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
                  
                  <input type="hidden" name="channelId" value={channelId} />
                  <input type="hidden" name="contentHash" value={postHash || ''} />
                  <input type="hidden" name="salt" value={postSalt || ''} />
                  <input type="hidden" name="signature" value={signature || ''} />
                  <input type="hidden" name="verificationMethod" value={method} />

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
                    
                    <button type="button" onClick={() => handleVerifyClick('WALLET')} disabled={isPreparing || method === 'SKIP'}
                      className={`p-3 rounded-xl transition-all border text-xs flex flex-col items-center group ${method === 'WALLET' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]'}`}>
                      <Wallet size={18} />
                      <span className="mt-1">Wallet Sign</span>
                      {method === 'WALLET' && isPreparing ? <Loader2 size={12} className="animate-spin mt-1" /> : signature && method === 'WALLET' ? <ShieldCheck size={12} className='mt-1 text-green-500' /> : null}
                    </button>

                    <button type="button" onClick={() => handleVerifyClick('AD')} disabled={isPreparing || method === 'SKIP'}
                      className={`p-3 rounded-xl transition-all border text-xs flex flex-col items-center group ${method === 'AD' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]'}`}>
                      <PlayCircle size={18} />
                      <span className="mt-1">Watch Ad</span>
                      {method === 'AD' && isPreparing ? <Loader2 size={12} className="animate-spin mt-1" /> : signature && method === 'AD' ? <ShieldCheck size={12} className='mt-1 text-green-500' /> : null}
                    </button>

                    <button type="button" onClick={() => { setMethod('SKIP'); setSignature(null); }} disabled={isPreparing}
                      className={`p-3 rounded-xl transition-all border text-xs flex flex-col items-center group ${method === 'SKIP' ? 'bg-zinc-700/20 border-zinc-600 text-zinc-400' : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]'}`}>
                      <ShieldOff size={18} />
                      <span className="mt-1">Post Unverified</span>
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

