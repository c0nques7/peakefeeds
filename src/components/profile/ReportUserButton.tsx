'use client'

import { useState } from 'react';
import { Flag } from 'lucide-react';
import ReportModal from '../moderation/ReportModal';
import { ReportTargetType } from '@prisma/client';
import { buttonClasses } from '@/components/ui';

interface ReportUserButtonProps {
  userId: string;
}

export default function ReportUserButton({ userId }: ReportUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={buttonClasses({ variant: 'danger' })}
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
