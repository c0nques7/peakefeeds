'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { Button, TextField } from '@/components/ui';
import { chooseUsername } from '@/actions/choose-username';

export function ChooseUsernameForm({ suggestion }: { suggestion: string }) {
  const [username, setUsername] = useState(suggestion);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { update } = useSession();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await chooseUsername(username);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      await update(); // refresh the session so it carries the new username
      router.replace('/home');
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField
        id="username"
        label="Username"
        autoComplete="username"
        autoFocus
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        hint={username ? `Your profile: peakefeeds.com/profile/${username}` : '3 to 30 letters, numbers, dots or underscores.'}
        error={error || undefined}
      />
      <Button type="submit" size="lg" fullWidth disabled={isPending} icon={isPending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : undefined}>
        Continue
      </Button>
    </form>
  );
}
