import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { redirect } from "next/navigation";
import TwoFactorSettings from "@/components/profile/TwoFactorSettings";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import styles from "../(dashboard)/dashboard.module.css"; 

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className={styles.feedWrapper}>
        <div className="mb-8">
            <Link href={`/profile/${session.user.username}`} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4">
                <ChevronLeft size={16} />
                Back to Profile
            </Link>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Settings</h1>
            <p className="text-[var(--text-muted)] mt-2">Manage your account preferences and security.</p>
        </div>

        <div className="space-y-6">
            <section>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Security</h2>
                <TwoFactorSettings userId={session.user.id} />
            </section>
        </div>
    </div>
  );
}
