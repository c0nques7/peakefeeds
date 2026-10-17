import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth.config';
import { prisma } from '@/lib/db';
import { ConfirmAgeForm } from './ConfirmAgeForm';

// Every account answers this once, before anything else in the app (new and existing members alike).
// The prompt doesn't name the minimum age, so it doesn't suggest what to answer.
export default async function ConfirmAgePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { ageConfirmedAt: true } });
  if (user?.ageConfirmedAt) redirect('/home');

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Enter your date of birth</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">We only keep whether you meet our age requirement, not the date itself.</p>
      </div>
      <ConfirmAgeForm />
    </>
  );
}
