'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSignMessage, useAccount } from 'wagmi'; 
import { useActionState } from 'react'; 
import { useFormStatus } from 'react-dom'; 

// UI Components
import { Loader2, User, Wallet, PlayCircle, ShieldOff, ShieldCheck, ArrowRight, Eye, Lock, Image as ImageIcon, Video as VideoIcon, X } from 'lucide-react';
import { toast } from 'sonner'; 

// Actions & Utils
import { createPost, CreatePostState } from '@/actions/create-post'; 
import { useLinkWallet } from '@/hooks/useLinkWallet';
import { generateContentHash, generateSalt } from '@/lib/verification'; 
import { VerificationMethod } from '@/lib/types'; 
import { validateFile, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/lib/storage-utils';

// Hooks
import { useAdMediator } from '@/hooks/useAdMediator';
import { useLinkPreview } from '@/hooks/useLinkPreview'; 

// Components
import { AdPlayerOverlay } from '@/components/ads/AdPlayerOverlay';
import PostPreview from './PostPreview'; 
import { Button } from '@/components/ui';

const POST_LABEL: Record<string, string> = { WALLET: 'Post verified', AD: 'Post sponsored', SKIP: 'Post unverified' };

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
  
  // Sponsored (ad-verified) posts stay off until the ad proof can be checked server-side
  const sponsorEnabled = false;

  // 1. Web3 Hooks
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const linkWallet = useLinkWallet();
  
  // 2. Hydration Fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 3. AdTech Hook
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
  const { status: linkStatus, metadata: linkMetadata, url: linkPreviewUrl } = useLinkPreview(content);

  // 4. Form State
  const [state, formAction, isPending] = useActionState(createPost, initialFormState);
  // const { pending } = useFormStatus(); // REMOVED: Incorrect usage outside form children

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

  // 7. Media State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 8. Verification Confirmation
  const [showVerifyWarning, setShowVerifyWarning] = useState(false);
  const [pendingVerifyChoice, setPendingVerifyChoice] = useState<'WALLET' | 'AD' | null>(null);

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
    console.log("📝 Form State Update:", state); // 🟢 LOGGING
    if (state.success) {
        setContent(""); 
        setIsExpanded(false); 
        setMethod('NONE'); 
        setSignature(null);
        setAdProofToken(null);
        setMediaUrl(null);
        setMediaType(null);
        setMediaPreview(null);
        router.refresh(); 
        toast.success("Post published successfully!");
    } else if (state.message) {
        console.error("❌ Post Creation Error:", state.message, state.errors); // 🟢 LOGGING
        toast.error(state.message);
        // Also show specific field errors if available
        if (state.errors) {
            Object.entries(state.errors).forEach(([key, msgs]) => {
                msgs.forEach(msg => toast.error(`${key}: ${msg}`));
            });
        }
    }
  }, [state, router]);

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  const redirectToProfile = () => {
      toast.info("Please connect your wallet in your profile.");
      router.push(`/profile/${username}?tab=wallet`);
  };

  // --- Upload Logic ---
  const handleFileUpload = async (file: File) => {
    try {
      validateFile(file);
      setUploading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('file', file);

      // Create local preview
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
      const preview = URL.createObjectURL(file);
      setMediaPreview(preview);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
      setMediaType(isVideo ? 'VIDEO' : 'IMAGE');

      setUploadProgress(30);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setMediaUrl(data.url);
      setUploadProgress(100);
      toast.success('Media uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload media');
      setMediaPreview(null);
      setMediaType(null);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const removeMedia = () => {
    setMediaUrl(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // --- Verification Logic ---
  const handleVerifyClick = useCallback(async (choice: 'WALLET' | 'AD') => {
    if (!content.trim()) { toast.warning("Please enter content first."); return; }
    setPendingVerifyChoice(choice);
    setShowVerifyWarning(true);
  }, [content]);

  const confirmVerification = useCallback(async () => {
    const choice = pendingVerifyChoice;
    if (!choice || !postHash) return; 
    setShowVerifyWarning(false);

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
      
      // Verified posts need this wallet linked to the account; awaited so a failure stops here
      if (address) {
          const linked = await linkWallet(address);
          if (!linked.success) throw new Error(`Wallet link failed: ${linked.error}`);
      }

      setSignature(sig);
      toast.success(choice === 'AD' ? "Sponsored Post Ready!" : "Content Signed Successfully");
      
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('User rejected')) {
          toast.warning("Signature rejected.");
      } else if (e.message?.startsWith('Wallet link failed')) {
          toast.error(e.message);
      } else {
          toast.error("Verification failed.");
      }
      setMethod('NONE');
      setSignature(null);
      setAdProofToken(null);
      resetAdState(); 
    } finally {
      setIsPreparing(false);
      setPendingVerifyChoice(null);
    }
  }, [pendingVerifyChoice, postHash, address, isConnected, signMessageAsync, startVerification, resetAdState, router, username, linkedWallet]);

  const isPostReady = content.trim() && (method === 'SKIP' || signature);
  const isButtonDisabled = isPending || isPreparing || !isPostReady || uploading;

  return (
    <>
      <AdPlayerOverlay 
          status={adStatus} 
          provider={currentProvider} 
          onSelectVideo={selectAdFlow}  
          onSelectQuest={selectQuestFlow} 
          onCancel={() => { resetAdState(); setMethod('NONE'); setIsPreparing(false); }} 
      />

      {/* Verification Warning Modal */}
      {showVerifyWarning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div role="dialog" aria-modal="true" aria-labelledby="finality-title" className="relative w-full max-w-md bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-[var(--radius-card)] shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-[var(--status-warning-bg)] rounded-full text-[var(--status-warning)]">
                <ShieldCheck size={32} />
              </div>
            </div>

            <h3 id="finality-title" className="text-xl font-bold text-[var(--text-primary)] text-center mb-2">Verified posts are permanent</h3>
            <p className="text-[var(--text-secondary)] text-sm text-center leading-relaxed mb-6">
              Verified posts are cryptographically signed and anchored to the blockchain. 
              <span className="text-[var(--status-warning)] font-bold block mt-2">
                Once published, this content cannot be edited or deleted.
              </span>
              Please ensure you have reviewed your content thoroughly.
            </p>

            <div className="flex flex-col gap-3">
              <Button onClick={confirmVerification} size="lg" fullWidth>
                Continue and sign
              </Button>
              <Button onClick={() => { setShowVerifyWarning(false); setPendingVerifyChoice(null); }} variant="secondary" size="lg" fullWidth>
                Go back and review
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-2">
        <div className="flex justify-between items-end mb-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">New Truth Submission</h2>
            
            {mounted && isConnected ? (
                <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--status-success)] bg-[var(--status-success-bg)] px-2 py-1 rounded-[var(--radius-pill)]">
                    <div className="w-1.5 h-1.5 bg-[var(--status-success)] rounded-full" />
                    {address?.slice(0,6)}...{address?.slice(-4)}
                </div>
            ) : mounted && linkedWallet && (
                 <div className="text-[11px] text-[var(--text-muted)] font-mono">Linked: {linkedWallet.slice(0,6)}…</div>
            )}
        </div>

        {mounted && !isConnected && (
             <button type="button" onClick={redirectToProfile} className="mb-4 w-full p-3 rounded-[var(--radius-control)] bg-[var(--status-info-bg)] text-[var(--accent-primary)] flex items-center justify-between gap-3 text-left hover:brightness-110 transition">
                 <span className="flex items-center gap-3">
                    <Wallet size={16} aria-hidden="true" />
                    <span className="text-sm font-medium">Connect a wallet to post verified content</span>
                 </span>
                 <ArrowRight size={16} aria-hidden="true" />
             </button>
        )}

        <form action={formAction}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onSubmit={(e) => { 
              if (!content.trim() || method === 'NONE') { 
                  e.preventDefault();
                  toast.warning("Please select a verification method.");
                  return;
              }
          }}
          className={`relative rounded-[var(--radius-control)] transition-all duration-300 ${isDragging ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--status-info-bg)]' : ''}`}
        >
          
          <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {userImage ? (<img src={userImage} alt="User" className="w-full h-full object-cover" />) : (<User size={20} />)}
              </div>

              <div className="flex-1">
                  <textarea 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={isExpanded || mediaPreview ? 3 : 1}
                      placeholder="Share your truth..." 
                      name="content"
                      readOnly={method === 'WALLET' || method === 'AD'}
                      className="w-full border-none focus:ring-0 resize-none p-2 text-lg bg-transparent placeholder-gray-500/50 focus:outline-none transition-all read-only:opacity-70"
                      style={{ color: 'var(--text-primary)' }}
                      onClick={() => setIsExpanded(true)}
                  />
                  
                  <input type="hidden" name="channelId" value={channelId} />
                  <input type="hidden" name="contentHash" value={postHash || ''} />
                  <input type="hidden" name="salt" value={postSalt || ''} />
                  <input type="hidden" name="signature" value={signature || ''} />
                  <input type="hidden" name="verificationMethod" value={method} />
                  <input type="hidden" name="adProofToken" value={adProofToken || ''} />
                  <input type="hidden" name="mediaUrl" value={mediaUrl || ''} />
                  <input type="hidden" name="mediaType" value={mediaType || ''} />

                  {/* MEDIA PREVIEW */}
                  {mediaPreview && (
                    <div className="relative mt-2 rounded-xl overflow-hidden group border border-[var(--glass-border)]">
                      {mediaType === 'IMAGE' ? (
                        <img src={mediaPreview} alt="Upload preview" className="w-full h-auto max-h-[300px] object-cover" />
                      ) : (
                        <video src={mediaPreview} controls className="w-full h-auto max-h-[300px] object-cover" />
                      )}
                      
                      {uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                           <div className="text-center">
                              <Loader2 className="animate-spin text-white mb-2 mx-auto" size={24} />
                              <div className="w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                 <div className="h-full bg-[var(--accent-primary)] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                              </div>
                           </div>
                        </div>
                      )}

                      {!uploading && (
                        <button 
                          type="button" 
                          onClick={removeMedia}
                          aria-label="Remove attachment"
                          // Always visible on touch screens (no hover there); hover-revealed on desktop
                          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}

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
                                previewUrl={mediaPreview || mediaUrl || linkPreviewUrl}
                                mediaType={mediaType}
                                authorName={username}
                                authorHandle={username} 
                                authorAvatar={userImage || undefined}
                                authorRole={userRole}
                            />
                          </div>
                      </div>
                  )}

                  <div className="flex justify-between items-center mt-2">
                      <div className="flex gap-4">
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1.5 text-xs font-medium"
                        >
                          <ImageIcon size={18} />
                          <span>Photo</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1.5 text-xs font-medium"
                        >
                          <VideoIcon size={18} />
                          <span>Video</span>
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={onFileSelect} 
                          className="hidden" 
                          accept="image/*,video/*"
                        />
                      </div>

                      {isExpanded && (
                        <button 
                          type="button" 
                          onClick={() => setShowPreview(!showPreview)}
                          className="text-[10px] flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <Eye size={12} /> {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                      )}
                  </div>
              </div>
          </div>

          {isExpanded && (
              <>
                <div className="mt-4 pt-3 border-t border-[var(--glass-border)]">
                  <h4 className="text-xs font-semibold mb-3 text-[var(--text-secondary)] uppercase tracking-wide">Verification Method</h4>
                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* OPTION 1: WALLET */}
                    <button type="button" onClick={() => handleVerifyClick('WALLET')} disabled={isPreparing || method === 'SKIP'}
                      className={`p-3 rounded-[var(--radius-control)] transition-all border text-xs flex flex-col items-center group ${method === 'WALLET' ? 'bg-[var(--status-info-bg)] border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]'}`}>
                      <Wallet size={18} />
                      <span className="mt-1">Pay Gas</span>
                      {mounted && method === 'WALLET' && isPreparing ? <Loader2 size={12} className="animate-spin mt-1" /> : mounted && signature && method === 'WALLET' ? <ShieldCheck size={12} className='mt-1 text-[var(--status-success)]' /> : null}
                    </button>

                    {/* OPTION 2: SPONSOR (disabled until ad proofs are verified) */}
                    <button 
                      type="button" 
                      onClick={() => sponsorEnabled && handleVerifyClick('AD')} 
                      disabled={!sponsorEnabled || isPreparing || method === 'SKIP'}
                      className={`p-3 rounded-[var(--radius-control)] transition-all border text-xs flex flex-col items-center group relative
                        ${!sponsorEnabled 
                            ? 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] cursor-not-allowed opacity-60' // Disabled
                            : method === 'AD' 
                                ? 'bg-[var(--status-info-bg)] border-[var(--accent-primary)] text-[var(--accent-primary)]' // Active
                                : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]' // Inactive
                        }`}
                    >
                      {!sponsorEnabled ? <Lock size={18} className="opacity-50" /> : <PlayCircle size={18} />}
                      <span className="mt-1">{!sponsorEnabled ? 'Coming Soon' : 'Sponsor Gas'}</span>

                      {/* Status Indicators */}
                      {mounted && sponsorEnabled && method === 'AD' && isPreparing ? <Loader2 size={12} className="animate-spin mt-1" /> : (mounted && sponsorEnabled && signature && method === 'AD' ? <ShieldCheck size={12} className='mt-1 text-[var(--status-success)]' /> : null)}
                    </button>

                    {/* OPTION 3: SKIP */}
                    <button type="button" onClick={() => { setMethod('SKIP'); setSignature(null); setAdProofToken(null); }} disabled={isPreparing}
                      className={`p-3 rounded-[var(--radius-control)] transition-all border text-xs flex flex-col items-center group ${method === 'SKIP' ? 'bg-[var(--status-info-bg)] border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'bg-[var(--glass-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-card-hover)]'}`}>
                      <ShieldOff size={18} />
                      <span className="mt-1">Unverified</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end items-center mt-3 pt-3">
                  <Button type="submit" disabled={isButtonDisabled}>
                      {isPending ? (<Loader2 className="animate-spin" size={16} aria-label="Posting" />) : (isPostReady ? POST_LABEL[method] ?? 'Post' : 'Post')}
                  </Button>
                </div>
              </>
          )}
        </form>
      </div>
    </>
  );
}