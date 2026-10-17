'use client';

import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, TextField, buttonClasses } from '@/components/ui';
import { deleteMyAccount } from '@/actions/delete-account';

// Settings › Your data: download everything, then optionally delete the account for good.
export function DeleteAccountCard({ hasPassword, blocker }: { hasPassword: boolean; blocker: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await deleteMyAccount(confirmation);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      await signOut({ callbackUrl: '/' });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Download your data"
          description="A file with your profile, posts, comments, messages and everything else we hold about you. Links to your images and videos in it work for 24 hours."
          actions={
            <a href="/api/account/export" download className={buttonClasses({ variant: 'secondary' })}>
              <Download size={16} aria-hidden="true" /> Download
            </a>
          }
        />
      </Card>

      <Card>
        <CardHeader
          title="Delete your account"
          description="Your account, posts (verified ones too), comments, messages and uploads are deleted straight away and can't be recovered. Download your data first if you want a copy."
          actions={!confirming && (
            <Button variant="danger" icon={<Trash2 size={16} aria-hidden="true" />} disabled={!!blocker} onClick={() => setConfirming(true)}>
              Delete account
            </Button>
          )}
        />
        {blocker && <p className="mt-3 text-sm text-[var(--text-muted)]">{blocker}</p>}

        {confirming && !blocker && (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <TextField
              id="deleteConfirmation"
              label={hasPassword ? 'Enter your password to confirm' : 'Type your username to confirm'}
              type={hasPassword ? 'password' : 'text'}
              autoComplete={hasPassword ? 'current-password' : 'off'}
              autoFocus
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              error={error || undefined}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="danger" disabled={isPending || !confirmation} icon={isPending ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}>
                Delete my account permanently
              </Button>
              <Button variant="ghost" disabled={isPending} onClick={() => { setConfirming(false); setConfirmation(''); setError(''); }}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
