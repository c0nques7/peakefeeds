'use client'

import { useState } from 'react';
import { Flag } from 'lucide-react';
import ReportModal from '../moderation/ReportModal';
import { ReportTargetType } from '@prisma/client';
import { buttonClasses } from '@/components/ui';

interface ReportChannelButtonProps {
  channelId: string;
}

export default function ReportChannelButton({ channelId }: ReportChannelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={buttonClasses({ variant: 'danger' })}
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
