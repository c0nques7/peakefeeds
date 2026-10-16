import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth.config';
import { prisma } from '@/lib/db';
import { ChooseUsernameForm } from './ChooseUsernameForm';

// First stop for new Google sign-ups: they need a username before using the app.
export default async function WelcomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true, email: true } });
  if (user?.username) redirect('/home');

  // Suggest a username from the email address, e.g. jane-doe@gmail.com -> jane_doe
  const suggestion = (user?.email?.split('@')[0] ?? '').replace(/-/g, '_').replace(/[^a-zA-Z0-9._]/g, '').slice(0, 30);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Choose your username</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">It&apos;s your public name on PeakeFeeds and the address of your profile.</p>
      </div>
      <ChooseUsernameForm suggestion={suggestion.length >= 3 ? suggestion : ''} />
    </>
  );
}
