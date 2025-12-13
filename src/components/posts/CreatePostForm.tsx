'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSignMessage, useAccount } from 'wagmi'; 
import { useActionState } from 'react'; 
import { useFormStatus } from 'react-dom'; 

// UI Components
import { Loader2, User, Wallet, PlayCircle, ShieldOff, ShieldCheck, ArrowRight, Eye, Lock } from 'lucide-react';
import { toast } from 'sonner'; 

// Actions & Utils
import { createPost, CreatePostState } from '@/actions/create-post'; 
import { verifyWalletAddress } from '@/actions/verify-wallet'; 
import { generateContentHash, generateSalt } from '@/lib/verification'; 
import { VerificationMethod } from '@/lib/types'; 

// Hooks
import { useAdMediator } from '@/hooks/useAdMediator';
import { useLinkPreview } from '@/hooks/useLinkPreview'; 

// Components
import { AdPlayerOverlay } from '@/components/ads/AdPlayerOverlay';
import PostPreview from './PostPreview'; 

interface CreatePostFormProps {
    channelId: string;
    userImage?: string | null; 
    username: string; 
    linkedWallet?: string | null; 
    userRole?: string; 
}

const initialFormState: CreatePostState = {
    success: false,
    message: null,
};

export default function CreatePostForm({ 
    channelId, 
    userImage, 
    username, 
    linkedWallet,
    userRole = "USER"
}: CreatePostFormProps) {
  const router = useRouter(); 
  
  // ⚡️ ENV CHECK
  const isDev = process.env.NODE_ENV === 'development';

  // 1. Web3 Hooks
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // 2. AdTech Hook
  const { 
      startVerification, 
      selectAdFlow, 
      selectQuestFlow, 
      status: adStatus, 
      currentProvider, 
      resetAdState 
  } = useAdMediator();

  // 3. Link Preview Hook
  const [content, setContent] = useState("");
  // ✅ FIX: Destructure 'metadata' (not 'meta') and alias it to 'linkMetadata'
  const { status: linkStatus, metadata: linkMetadata, url: previewUrl } = useLinkPreview(content);

  // 4. Form State
  const [state, formAction] = useActionState(createPost, initialFormState);
  const { pending } = useFormStatus();

  // 5. Local State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [showPreview, setShowPreview] = useState(true); 
  const [method, setMethod] = useState<VerificationMethod>('NONE');
  
  // 6. Crypto State
  const [signature, setSignature] = useState<string | null>(null);
  const [postHash, setPostHash] = useState<string | null>(null);
  const [postSalt, setPostSalt] = useState<string | null>(null);
  const [adProofToken, setAdProofToken] = useState<string | null>(null);

  // --- Effects ---
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

  const redirectToProfile = () => {
      toast.info("Please connect your wallet in your profile.");
      router.push(`/profile/${username}?tab=wallet`);
  };

  // --- Verification Logic ---
  const handleVerifyClick = useCallback(async (choice: 'WALLET' | 'AD') => {
    if (!content.trim()) { toast.warning("Please enter content first."); return; }
    if (!postHash) return; 

    if (!isConnected || !address) {
        redirectToProfile();
        return; 
    }

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
      if (choice === 'AD') {
          const proofToken = await startVerification('peake-ad-container', { 
              userId: address!, 
              contentHash: postHash 
          });

          if (!proofToken) {
              setMethod('NONE');
              setIsPreparing(false);
              return; 
          }
          setAdProofToken(proofToken);
          await new Promise(resolve => setTimeout(resolve, 1000));
          resetAdState();
          toast.success("Sponsorship Verified! Signing content now...");
      }

      const hashToSign = postHash as `0x${string}`;
      const sig = await signMessageAsync({ message: { raw: hashToSign } });
      
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
      setMethod('NONE');
      setSignature(null);
      setAdProofToken(null);
      resetAdState(); 
    } finally {
      setIsPreparing(false);
    }
  }, [content, postHash, address, isConnected, signMessageAsync, startVerification, resetAdState, router, username, linkedWallet]);

  const isPostReady = content.trim() && (method === 'SKIP' || signature);
  const isButtonDisabled = pending || isPreparing || !isPostReady;

  return (
    <>
      <AdPlayerOverlay 
          status={adStatus} 
          provider={currentProvider} 
          onSelectVideo={selectAdFlow}  
          onSelectQuest={selectQuestFlow} 
          onCancel={() => { resetAdState(); setMethod('NONE'); setIsPreparing(false); }} 
      />
      
      <div className="mb-2">
        <div className="flex justify-between items-end mb-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">New Truth Submission</h2>
            
            {isConnected ? (
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-800/50">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {address?.slice(0,6)}...{address?.slice(-4)}
                </div>
            ) : linkedWallet && (
                 <div className="text-[10px] text-zinc-500 font-mono">Linked: {linkedWallet.slice(0,6)}...</div>
            )}
        </div>

        {!isConnected && (
             <div onClick={redirectToProfile} className="mb-4 p-3 rounded-xl bg-indigo-900/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-between gap-3 cursor-pointer hover:bg-indigo-900/20 transition-colors">
                 <div className="flex items-center gap-3">
                    <Wallet size={16} /> 
                    <span className="text-sm font-medium">Connect Wallet to Post Verified Content</span>
                 </div>
                 <ArrowRight size={16} />
             </div>
        )}

        <form action={formAction}
          onSubmit={(e) => { 
              if (!content.trim() || method === 'NONE') { 
                  e.preventDefault();
                  toast.warning("Please select a verification method.");
                  return;
              }
          }}
          className="relative rounded-2xl p-4 backdrop-blur-md transition-all duration-300"
          style={{ background: 'var(--glass-card)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}
        >
          
          <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {userImage ? (<img src={userImage} alt="User" className="w-full h-full object-cover" />) : (<User size={20} />)}
              </div>

              <div className="flex-1">
                  <textarea 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={isExpanded ? 3 : 1}
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
                  <input type="hidden" name="adProofToken" value={adProofToken || ''} />

                  {/* LIVE PREVIEW AREA */}
                  {isExpanded && content.trim().length > 0 && showPreview && (
                      <div className="mt-4 mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-2 mb-2">
                             <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Live Preview</span>
                             <div className="h-px flex-1 bg-[var(--glass-border)]"></div>
                          </div>
                          <div className="transform scale-[0.98] origin-top-left opacity-90 hover:opacity-100 hover:scale-100 transition-all duration-300">
                            <PostPreview 
                                content={content}
                                verificationMethod={method}
                                linkStatus={linkStatus}
                                linkMetadata={linkMetadata}
                                previewUrl={previewUrl}
                                authorName={username}
                                authorHandle={username} 
                                authorAvatar={userImage || undefined}
                                authorRole={userRole}
                            />
                          </div>
                      </div>
                  )}

                  {isExpanded && (
                      <div className="flex justify-between items-center mt-2">
                          <p className="text-[10px] text-[var(--text-muted)] opacity-70">* Content hashed locally before signing.</p>
                          <button 
                             type="button" 
                             onClick={() => setShowPreview(!showPreview)}
                             className="text-[10px] flex items-center gap-1 text-[var(--text-muted)] hover:text-white transition-colors"
                          >
                             <Eye size={12} /> {showPreview ? 'Hide Preview' : 'Show Preview'}
                          </button>
                      </div>
                  )}
              </div>
          </div>

          {isExpanded && (
              <>
                <div className="mt-4 pt-3 border-t border-[var(--glass-border)]">
                  <h4 className="text-xs font-semibold mb-3 text-[var(--text-secondary)] uppercase tracking-wide">Verification Method</h4>
                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* OPTION 1: WALLET */}
                    <button type="button" onClick={() => handleVerifyClick('WALLET')} disabled={isPreparing || method === 'SKIP'}
                      className={`p-3 rounded-xl transition-all border text-xs flex flex-col items-center group ${method === 'WALLET' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]'}`}>
                      <Wallet size={18} />
                      <span className="mt-1">Pay Gas</span>
                      {method === 'WALLET' && isPreparing ? <Loader2 size={12} className="animate-spin mt-1" /> : signature && method === 'WALLET' ? <ShieldCheck size={12} className='mt-1 text-green-500' /> : null}
                    </button>

                    {/* OPTION 2: SPONSOR (Disabled in Prod) */}
                    <button 
                      type="button" 
                      onClick={() => isDev && handleVerifyClick('AD')} 
                      disabled={!isDev || isPreparing || method === 'SKIP'}
                      className={`p-3 rounded-xl transition-all border text-xs flex flex-col items-center group relative
                        ${!isDev 
                            ? 'bg-zinc-800/30 border-zinc-700/50 text-zinc-600 cursor-not-allowed opacity-70' // Prod
                            : method === 'AD' 
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' // Dev Active
                                : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]' // Dev Inactive
                        }`}
                    >
                      {!isDev ? <Lock size={18} className="opacity-50" /> : <PlayCircle size={18} />}
                      <span className="mt-1">{!isDev ? 'Coming Soon' : 'Sponsor Gas'}</span>

                      {/* Status Indicators (Dev Only) */}
                      {isDev && method === 'AD' && isPreparing ? <Loader2 size={12} className="animate-spin mt-1" /> : (isDev && signature && method === 'AD' ? <ShieldCheck size={12} className='mt-1 text-green-500' /> : null)}
                    </button>

                    {/* OPTION 3: SKIP */}
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