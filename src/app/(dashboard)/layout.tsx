import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { AppShell } from "@/components/layout/AppShell";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // Every account confirms its age once (lib/age.ts), then new Google sign-ups pick a username
  if (session?.user && !session.user.ageConfirmed) {
    redirect("/confirm-age");
  }
  if (session?.user && !session.user.username) {
    redirect("/welcome");
  }

  const user = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    username: session.user.username,
    role: session.user.role
  } : undefined;

  // Restores the connected wallet from its cookie on first render
  const cookies = (await headers()).get('cookie');

  return (
    <Web3Provider cookies={cookies}>
      <AppShell
        sidebar={<Sidebar user={user} />}
        rightRail={<RightSidebar />}
        mobileNav={<MobileBottomNav user={user} />}
      >
        {children}
      </AppShell>
    </Web3Provider>
  );
}
