"use client";
import { useState, useEffect } from "react";
import { Search, Plus, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChannelSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [firstPost, setFirstPost] = useState("");

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/channels/search?q=${query}`);
      const data = await res.json();
      setResults(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleCreate = async () => {
    const res = await fetch("/api/channels/create-with-post", {
      method: "POST",
      body: JSON.stringify({ channelName: query, firstPost })
    });
    
    if (res.ok) {
      const data = await res.json();
      router.push(`/channels/${data.slug}`); // Go to new channel
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-20 relative z-10">
      
      {/* The Big Search Bar */}
      <div className="relative group">
        <div className="absolute inset-0 bg-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition"></div>
        <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center p-4">
          <Search className="w-6 h-6 text-gray-400 mr-3" />
          <input 
            className="bg-transparent border-none outline-none text-xl text-white w-full placeholder-gray-500"
            placeholder="Find or create a channel..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsCreating(false); // Reset create mode on type
            }}
          />
        </div>
      </div>

      {/* Results Dropdown */}
      {query.length > 1 && !isCreating && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          
          {/* Existing Channels */}
          {results.map((channel) => (
            <div 
              key={channel.id}
              onClick={() => router.push(`/channels/${channel.slug}`)}
              className="p-4 hover:bg-white/10 cursor-pointer flex justify-between items-center border-b border-white/5"
            >
              <div>
                <h4 className="font-bold text-white">#{channel.name}</h4>
                <p className="text-sm text-gray-400">{channel.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </div>
          ))}

          {/* Prompt to Create */}
          <div 
            onClick={() => setIsCreating(true)}
            className="p-4 hover:bg-blue-900/30 cursor-pointer flex items-center gap-3 text-blue-400"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold">Create "{query}"</span>
              <p className="text-xs text-blue-300/70">Channel doesn't exist. Claim it now.</p>
            </div>
          </div>
        </div>
      )}

      {/* Creation Mode: Add First Post */}
      {isCreating && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-white mb-2">Start the conversation</h3>
          <p className="text-sm text-gray-400 mb-4">Create <span className="text-blue-400">#{query}</span> and post the first message.</p>
          
          <textarea 
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500/50 h-24 resize-none"
            placeholder="What is this channel about?"
            value={firstPost}
            onChange={(e) => setFirstPost(e.target.value)}
            autoFocus
          />
          
          <button 
            onClick={handleCreate}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all"
          >
            Launch Channel
          </button>
        </div>
      )}
    </div>
  );
}
