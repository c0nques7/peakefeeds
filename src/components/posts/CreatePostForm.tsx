'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/actions/create-post';
import { Send, Loader2 } from 'lucide-react';
import { generateContentHash } from '@/lib/hashing'; 
import { VerificationModal } from './VerificationModal'; 

interface CreatePostFormProps {
    channelId: string;
    userWalletAddress?: string | null; // Optional: helps pre-fill wallet logic
    authorId?: string; // 🛑 REQUIRED for hashing
}

export default function CreatePostForm({ channelId, authorId = "anon" }: CreatePostFormProps) {
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

    // Generate hash using the actual author ID
    const hash = generateContentHash(content, authorId); 
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
    // Also send the contentHash so the server can verify integrity
    formData.append('contentHash', currentHash);

    // Call the Server Action
    // Note: Assuming createPost accepts (prevState, formData) or just formData depending on your implementation
    // We pass null for prevState if using useFormState pattern, or just call it directly.
    // Based on your previous code, it seemed to be a direct async function.
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
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            New Truth Submission
        </h2>

      <form onSubmit={handleInitialSubmit} 
        className={`relative rounded-2xl p-4 transition-all duration-300`}
        style={{ 
            background: 'var(--glass-card)', 
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-card)'
        }}
      >
        
        <div className="flex gap-4">
            <div className="h-10 w-10 rounded-full flex-shrink-0"
                 style={{ background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                U
            </div>
            
            <div className="flex-1">
                <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={isExpanded ? 3 : 1}
                    placeholder="Share your truth, paste an image/video URL, or drop a long thought..." 
                    className="w-full border-none focus:ring-0 resize-none p-2 text-lg 
                                bg-transparent text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none"
                    style={{ 
                        color: 'var(--text-primary)',
                        background: 'transparent',
                    }}
                    onClick={() => setIsExpanded(true)}
                />

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
                    className="mr-3 text-sm px-3 py-2 text-gray-400 hover:text-gray-100 transition-colors"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={isPosting || !content.trim()}
                    className="px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all"
                    style={{ 
                        background: 'var(--accent-primary)', 
                        color: 'white',
                        opacity: (isPosting || !content.trim()) ? 0.6 : 1,
                        cursor: (isPosting || !content.trim()) ? 'not-allowed' : 'pointer',
                    }}
                >
                    {isPosting ? <Loader2 className="animate-spin" size={14} /> : <>Post <Send size={14} /></>}
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