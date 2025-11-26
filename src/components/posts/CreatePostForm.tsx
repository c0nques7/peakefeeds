'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/actions/create-post';
import { Send, Loader2 } from 'lucide-react';
import { generateContentHash } from '@/lib/verification'; 
import { VerificationModal } from './VerificationModal'; 

export default function CreatePostForm({ channelId }: { channelId: string }) {
  const router = useRouter(); 
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  
  const [currentHash, setCurrentHash] = useState("");

  // 1. User clicks "Post" -> Calculate hash & show modal
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    // Generate hash for UI display
    const hash = generateContentHash(content, "placeholder-id"); 
    setCurrentHash(hash);
    
    setShowModal(true); 
  };

  // 2. Modal returns choice -> Call Server Action
  const handleFinalizePost = async (method: 'WALLET' | 'AD' | 'SKIP', signature?: string) => {
    setIsPosting(true);
    
    const formData = new FormData();
    formData.append('content', content);
    formData.append('channelId', channelId);
    formData.append('verificationMethod', method); 
    
    if (signature) {
        formData.append('signature', signature);
    }

    // Call the Server Action
    await createPost({} as any, formData);
    
    router.refresh(); 
    
    // Reset UI
    setIsPosting(false);
    setShowModal(false);
    setIsExpanded(false);
    setContent("");
  };

  return (
    <div className="mb-6">
        {/* --- NEW HEADING FOR CLARITY --- */}
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            New Truth Submission
        </h2>

      <form onSubmit={handleInitialSubmit} 
        className={`relative rounded-2xl p-4 transition-all duration-300`}
        // CRITICAL FIX: Use CSS Variables for standard styles
        style={{ 
            background: 'var(--glass-card)', 
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-card)'
        }}
      >
        
        <div className="flex gap-4">
            {/* Avatar Placeholder: Uses primary accent color */}
            <div className="h-10 w-10 rounded-full flex-shrink-0"
                 style={{ background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                U
            </div>
            
            <div className="flex-1">
                <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={isExpanded ? 3 : 1}
                    // 🛑 FINAL FIX: Corrected Placeholder Text
                    placeholder="Share your truth, paste an image/video URL, or drop a long thought..." 
                    
                    // 🛑 FINAL FIX: Use Tailwind classes for focus/placeholder styling
                    // We rely on global/theme CSS to map colors (e.g., text-gray-400 maps to var(--text-muted))
                    className="w-full border-none focus:ring-0 resize-none p-2 text-lg 
                                bg-transparent text-gray-800 dark:text-white placeholder-gray-500"
                    
                    style={{ 
                        // Set text color explicitly from var for readability, ensuring background is clear
                        color: 'var(--text-primary)',
                        background: 'transparent',
                    }}
                    onClick={() => setIsExpanded(true)}
                />

                {/* NEW: Guidance text for media links */}
                {isExpanded && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        * URLs for images or videos will generate a preview after posting.
                    </p>
                )}
            </div>
        </div>

        {isExpanded && (
            <div className="flex justify-end items-center mt-3 pt-3"
                 style={{ borderTop: '1px solid var(--glass-border)' }}>
                <button 
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="mr-3 text-sm px-3 py-2 text-gray-400 hover:text-gray-100" // Use Tailwind hover utility
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={isPosting || !content.trim()}
                    className="px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all"
                    // CRITICAL FIX: Use standard CSS for background/opacity control
                    style={{ 
                        background: 'var(--accent-primary)', 
                        color: 'white',
                        opacity: (isPosting || !content.trim()) ? 0.6 : 1,
                        cursor: (isPosting || !content.trim()) ? 'not-allowed' : 'pointer',
                    }}
                >
                    {isPosting ? <Loader2 className="animate-spin" /> : <>Post <Send size={14} /></>}
                </button>
            </div>
        )}
      </form>

      {/* Verification Modal Interceptor */}
      <VerificationModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        contentHash={currentHash}
        onVerified={handleFinalizePost}
      />
    </div>
  );
}