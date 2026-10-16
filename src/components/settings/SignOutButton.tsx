'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui';

export function SignOutButton() {
  return (
    <Button variant="danger" icon={<LogOut size={16} aria-hidden="true" />} onClick={() => signOut({ callbackUrl: '/' })}>
      Log out
    </Button>
  );
}
