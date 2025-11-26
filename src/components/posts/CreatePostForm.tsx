'use client'

import { useActionState } from 'react'; // React 19 Hook
import { createPost, CreatePostState } from '@/actions/create-post';
import { Send, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const initialState: CreatePostState = { message: null, errors: {} };

export default function CreatePostForm({ channelId }: { channelId: string }) {
  const [state, action, isPending] = useActionState(createPost, initialState);
  const [isExpanded, setIsExpanded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form on success
  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
      setIsExpanded(false);
    }
  }, [state.success]);

  return (
    <div className="mb-6">
      <form 
        ref={formRef}
        action={action} 
        className={`
            relative bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-300 ease-in-out
            ${isExpanded ? 'shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30' : 'hover:bg-white/10'}
        `}
      >
        <input type="hidden" name="channelId" value={channelId} />
        
        <div className="flex gap-4">
            {/* Avatar Placeholder (Optional) */}
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0" />
            
            <div className="flex-1">
                <textarea 
                    name="content"
                    rows={isExpanded ? 3 : 1}
                    placeholder="What's the truth today?" 
                    className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none p-2 text-lg"
                    onClick={() => setIsExpanded(true)}
                />
                
                {/* Error Message */}
                {state.errors?.content && (
                    <p className="text-red-400 text-sm mt-1">{state.errors.content[0]}</p>
                )}
            </div>
        </div>

        {/* Footer Actions (Only visible when expanded) */}
        {isExpanded && (
            <div className="flex justify-end items-center mt-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                
                <button 
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="mr-3 text-sm text-gray-400 hover:text-white px-3 py-2"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        <>
                            Post <Send size={14} />
                        </>
                    )}
                </button>
            </div>
        )}
      </form>
    </div>
  );
}