'use client'

import { useState } from 'react';
import { Flag } from 'lucide-react';
import ReportModal from '../moderation/ReportModal';
import { ReportTargetType } from '@prisma/client';

interface ReportChannelButtonProps {
  channelId: string;
}

export default function ReportChannelButton({ channelId }: ReportChannelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500 text-red-500 bg-red-500/10 text-sm font-bold hover:bg-red-500/20 transition-all"
        title="Report Channel"
      >
        <Flag size={14} />
        <span>Report</span>
      </button>

      <ReportModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        targetId={channelId}
        targetType={ReportTargetType.CHANNEL}
        title="Report Channel"
      />
    </>
  );
}
