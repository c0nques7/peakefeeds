'use client'

import { useState } from 'react';
import { Flag } from 'lucide-react';
import ReportModal from '../moderation/ReportModal';
import { ReportTargetType } from '@prisma/client';

interface ReportUserButtonProps {
  userId: string;
}

export default function ReportUserButton({ userId }: ReportUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium"
        title="Report User"
      >
        <Flag size={16} />
        <span>Report</span>
      </button>

      <ReportModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        targetId={userId}
        targetType={ReportTargetType.USER}
        title="Report Profile"
      />
    </>
  );
}
