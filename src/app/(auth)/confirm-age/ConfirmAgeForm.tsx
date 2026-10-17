'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { Button, TextField } from '@/components/ui';
import { confirmAge } from '@/actions/confirm-age';

export function ConfirmAgeForm() {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { update } = useSession();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await confirmAge(dateOfBirth);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      if ('closed' in res) {
        await signOut({ callbackUrl: '/login?error=ACCOUNT_UNDERAGE' });
        return;
      }
      await update(); // refresh the session so it carries the confirmation
      router.replace('/home');
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField
        id="dateOfBirth"
        label="Date of birth"
        type="date"
        autoComplete="bday"
        autoFocus
        required
        max={new Date().toISOString().slice(0, 10)}
        value={dateOfBirth}
        onChange={(e) => setDateOfBirth(e.target.value)}
        hint="You can't change this later, so enter it carefully."
        error={error || undefined}
      />
      <Button type="submit" size="lg" fullWidth disabled={isPending} icon={isPending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : undefined}>
        Continue
      </Button>
    </form>
  );
}
