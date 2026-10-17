import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { redirect } from "next/navigation";
import TwoFactorSettings from "@/components/profile/TwoFactorSettings";
import ThemeToggle from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { DeleteAccountCard } from "@/components/settings/DeleteAccountCard";
import { getDeletionBlocker } from "@/lib/account-deletion";
import { prisma } from "@/lib/db";
import { Card, CardHeader, PageHeader } from "@/components/ui";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [account, deletionBlocker] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } }),
    getDeletionBlocker(session.user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Settings" description="Manage your account, security and appearance." />

      <div className="flex flex-col gap-6">
        <section aria-labelledby="security-heading">
          <h2 id="security-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Security</h2>
          <TwoFactorSettings userId={session.user.id} />
        </section>

        <section aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Appearance</h2>
          <Card>
            <CardHeader title="Theme" description="Switch between the light and dark themes." />
            <div className="max-w-xs">
              <ThemeToggle variant="row" className="border border-[var(--glass-border)]" />
            </div>
          </Card>
        </section>

        <section aria-labelledby="account-heading">
          <h2 id="account-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Account</h2>
          <Card>
            <CardHeader
              title={`Logged in as @${session.user.username ?? 'user'}`}
              description={session.user.email ?? undefined}
              actions={<SignOutButton />}
            />
          </Card>
        </section>

        <section aria-labelledby="data-heading">
          <h2 id="data-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Your data</h2>
          <DeleteAccountCard hasPassword={!!account?.passwordHash} blocker={deletionBlocker} />
        </section>
      </div>
    </div>
  );
}
