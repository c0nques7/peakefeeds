'use client'
import React, { useState } from 'react';
import { PlayCircle, Award, X, Loader2, Flag } from 'lucide-react';
import { MediatorStatus } from '@/hooks/useAdMediator';
import ReportModal from '../moderation/ReportModal';
import { ReportTargetType } from '@prisma/client';

interface AdPlayerOverlayProps {
  status: MediatorStatus;
  provider: string | null;
  onSelectVideo: () => void; // 🆕
  onSelectQuest: () => void; // 🆕
  onCancel: () => void;
}

export const AdPlayerOverlay = ({ 
  status, provider, onSelectVideo, onSelectQuest, onCancel 
}: AdPlayerOverlayProps) => {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  
  if (status === 'IDLE') return null;

  // 1. The Choice Screen (PROMPT)
  if (status === 'PROMPT') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
        <div className="relative w-full max-w-lg bg-zinc-900/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white">Choose Verification</h3>
               <button onClick={onCancel}><X className="text-zinc-400 hover:text-white" /></button>
            </div>

            <div className="space-y-3">
              {/* Option A: Video */}
              <button onClick={onSelectVideo} className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-emerald-500/50 transition-all text-left group">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                   <PlayCircle size={24} />
                </div>
                <div>
                   <p className="font-bold text-white">Watch Ad</p>
                   <p className="text-xs text-zinc-400">Sponsor gas for 1 post • ~15s</p>
                </div>
              </button>

              {/* Option B: Quest (Placeholder) */}
              <button onClick={onSelectQuest} className="w-full flex items-center gap-4 p-4 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-400 transition-all text-left group">
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                   <Award size={24} />
                </div>
                <div>
                   <p className="font-bold text-white">Complete Quest <span className="text-[10px] bg-zinc-700 px-1 rounded ml-2">BETA</span></p>
                   <p className="text-xs text-zinc-400">Unlock <span className="text-purple-300">5 Free Posts</span> • Follow/Task</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. The Player Screen (LOADING / SHOWING / ERROR)
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                       {status === 'LOADING' ? 'Connecting...' : `Powered by ${provider || 'Peake'}`}
                    </span>
                    <div className="flex items-center gap-1">
                      {(status === 'SHOWING' || status === 'LOADING' || status === 'ERROR') && (
                        <button 
                          onClick={() => setReportModalOpen(true)}
                          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-400 transition-colors"
                          title="Report Ad"
                        >
                          <Flag size={18} />
                        </button>
                      )}
                      <button onClick={onCancel} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
          
                  <div className="relative aspect-video bg-black flex flex-col items-center justify-center">
                    {status === 'LOADING' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10">
                        <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
                        <p className="text-sm text-zinc-400">Loading Content...</p>
                      </div>
                    )}
                    
                    {status === 'ERROR' && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-20">
                          <p className="text-red-400 font-bold">Verification Failed</p>
                          <button onClick={onCancel} className="mt-4 text-xs px-4 py-2 bg-zinc-800 rounded">Close</button>
                       </div>
                    )}
                    
                    <div id="peake-ad-container" className="w-full h-full" />
                  </div>
                </div>
          
                <ReportModal 
                  isOpen={reportModalOpen}
                  onClose={() => setReportModalOpen(false)}
                  targetId={provider || 'unknown-ad'}
                  targetType={ReportTargetType.ADVERTISEMENT}
                  title="Report Advertisement"
                />
              </div>
            );
          };
          