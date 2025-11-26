'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // 👈 1. Import this
import { createPost } from '@/actions/create-post';
import { Send, Loader2 } from 'lucide-react';
import { generateContentHash } from '@/lib/verification'; 
import { VerificationModal } from './VerificationModal'; 

export default function CreatePostForm({ channelId }: { channelId: string }) {
  const router = useRouter(); // 👈 2. Initialize hook
  
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
    
    // 🚀 3. THE FIX: Force the UI to fetch the new list immediately
    router.refresh(); 
    
    // Reset UI
    setIsPosting(false);
    setShowModal(false);
    setIsExpanded(false);
    setContent("");
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleInitialSubmit} className={`relative bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-300 ${isExpanded ? 'shadow-lg ring-1 ring-indigo-500/30' : 'hover:bg-white/10'}`}>
        
        <div className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0" />
            <div className="flex-1">
                <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={isExpanded ? 3 : 1}
                    placeholder="What's the truth today?" 
                    className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none p-2 text-lg"
                    onClick={() => setIsExpanded(true)}
                />
            </div>
        </div>

        {isExpanded && (
            <div className="flex justify-end items-center mt-3 pt-3 border-t border-white/5">
                <button 
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="mr-3 text-sm text-gray-400 hover:text-white px-3 py-2"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={isPosting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all"
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

