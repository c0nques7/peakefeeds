'use client'

import { useActionState } from 'react';
import { createPost, CreatePostState } from '@/actions/create-post';
import { Send, Loader2, Image as ImageIcon, Video, Link as LinkIcon, Type, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

const initialState: CreatePostState = { message: null, errors: {} };

// Define the logic for media types (must match server enum)
type PostType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'LINK';

export default function CreatePostForm({ channelId }: { channelId: string }) {
  const [state, action, isPending] = useActionState(createPost, initialState);
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  
  // --- Validation States ---
  const [postType, setPostType] = useState<PostType>('TEXT');
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false); // New loading state
  const [isMediaValid, setIsMediaValid] = useState(true); // Tracks successful validation

  const formRef = useRef<HTMLFormElement>(null);

  // 1. Logic: Scan text for links and set Type
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = content.match(urlRegex);
    let newType: PostType = 'TEXT';
    
    if (match) {
      const url = match[0];
      setDetectedUrl(url);

      if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('.mp4')) {
        newType = 'VIDEO';
      } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
        newType = 'IMAGE';
      } else {
        newType = 'LINK';
      }
    } else {
      setDetectedUrl(null);
    }
    
    // 2. Only auto-switch if user hasn't manually selected TEXT to ignore the link
    if (postType === 'TEXT' || newType !== 'TEXT') {
        setPostType(newType);
    }
    
  }, [content, postType]);

  // 3. Logic: Validate Media URL (Runs when URL or Type changes)
  useEffect(() => {
    if (!detectedUrl || postType === 'TEXT') {
        setIsMediaValid(true); // Always valid if no media is expected
        return;
    }

    setIsValidating(true);
    setIsMediaValid(false);

    // Simple, lightweight test for external media URLs
    if (postType === 'IMAGE' || postType === 'VIDEO') {
        const img = new Image();
        
        img.onload = () => {
            setIsMediaValid(true);
            setIsValidating(false);
        };
        
        img.onerror = () => {
            setIsMediaValid(false);
            setIsValidating(false);
        };
        
        // This triggers the browser to attempt to load the resource
        img.src = detectedUrl; 
    } else {
        // Assume non-image/video links are valid if they pass regex (safer than a heavy OPTIONS request)
        setIsMediaValid(true); 
        setIsValidating(false);
    }

  }, [detectedUrl, postType]);

  // Reset form on success
  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
      setContent("");
      setPostType("TEXT");
      setDetectedUrl(null);
      setIsExpanded(false);
      setIsMediaValid(true); // Reset media validity
    }
  }, [state.success]);

  const isSubmitDisabled = isPending || isValidating || !isMediaValid;

  return (
    <div className="mb-6">
      <form 
        ref={formRef}
        action={action} 
        className={clsx(
            "relative bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-300 ease-in-out",
            isExpanded ? 'shadow-xl ring-1 ring-indigo-500/30 bg-black/40 backdrop-blur-md' : 'hover:bg-white/10'
        )}
      >
        <input type="hidden" name="channelId" value={channelId} />
        
        {/* Hidden inputs to pass the detected/selected state to server */}
        <input type="hidden" name="type" value={postType} />
        <input type="hidden" name="mediaUrl" value={detectedUrl || ""} />
        
        <div className="flex gap-4">
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0 shadow-lg border border-white/10" />
            
            <div className="flex-1">
                <textarea 
                    name="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={isExpanded ? 3 : 1}
                    placeholder="What's the truth today?" 
                    className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none p-2 text-lg"
                    onClick={() => setIsExpanded(true)}
                />
            </div>
        </div>

        {/* ✨ SMART TYPE SELECTOR (Only visible when expanded) */}
        {isExpanded && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2">

                {/* 🛑 NEW: Specific Error Display */}
                {state.errors?.mediaUrl && (
                    <div className="mb-4 p-2 rounded-lg bg-red-800/80 text-sm text-white">
                        🚨 URL Validation Failed: **{state.errors.mediaUrl[0]}**
                    </div>
                )}
                
                {/* Status Bar */}
                {detectedUrl && (
                    <div className={clsx("mb-3 p-2 rounded-lg text-sm flex items-center gap-2",
                        (isValidating) && "bg-gray-700/50 text-gray-300",
                        (!isMediaValid && !isValidating) && "bg-red-700/50 text-white",
                        (isMediaValid && !isValidating) && "bg-emerald-700/50 text-white"
                    )}>
                        {isValidating ? <Loader2 size={16} className="animate-spin" /> : null}
                        {isMediaValid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        
                        <span className="font-semibold">
                           {isValidating && "Validating Media..."}
                           {!isValidating && isMediaValid && "Media URL Verified."}
                           {!isValidating && !isMediaValid && "Link is Broken or Not an Image/Video."}
                        </span>
                    </div>
                )}
                
                {/* The Selection Chips */}
                <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                    {/* ... (Chips omitted for brevity, but they should call setPostType) ... */}
                    <button type="button" onClick={() => setPostType('TEXT')} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all", postType === 'TEXT' ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10")}>
                        <Type size={14} /> Text
                    </button>
                    <button type="button" onClick={() => setPostType('IMAGE')} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all", postType === 'IMAGE' ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10")}>
                        <ImageIcon size={14} /> Image
                    </button>
                    <button type="button" onClick={() => setPostType('VIDEO')} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all", postType === 'VIDEO' ? "bg-red-600 border-red-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10")}>
                        <Video size={14} /> Video
                    </button>
                    <button type="button" onClick={() => setPostType('LINK')} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all", postType === 'LINK' ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10")}>
                        <LinkIcon size={14} /> Link
                    </button>
                </div>

                {/* Link Detection Feedback */}
                {detectedUrl && (
                    <div className="mb-4 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2 truncate">
                        <span className="font-bold text-indigo-400 shrink-0">Detected:</span> 
                        <span className="truncate opacity-70">{detectedUrl}</span>
                    </div>
                )}

                <div className="flex justify-end items-center pt-3 border-t border-white/10">
                    <button 
                        type="button"
                        onClick={() => setIsExpanded(false)}
                        className="mr-3 text-sm text-gray-400 hover:text-white px-3 py-2"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isPending ? <Loader2 size={16} className="animate-spin" /> : <>Post <Send size={14} /></>}
                    </button>
                </div>
            </div>
        )}
      </form>
    </div>
  );
}

