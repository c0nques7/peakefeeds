'use client' // Error boundaries must be Client Components

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button, ButtonLink, EmptyState } from '@/components/ui';

export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={<AlertTriangle size={22} aria-hidden="true" />}
      title="Something went wrong"
      description={
        <>
          This page didn&apos;t load. Try again, or come back in a moment.
          {error.digest && <span className="mt-2 block text-xs opacity-70">Reference: {error.digest}</span>}
        </>
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => retry()} icon={<RotateCcw size={16} aria-hidden="true" />}>Try again</Button>
          <ButtonLink href="/home" variant="secondary">Go to your feed</ButtonLink>
        </div>
      }
    />
  );
}
