import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { AppShell } from "@/components/layout/AppShell";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  const user = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    username: session.user.username,
    role: session.user.role
  } : undefined;

  return (
    <AppShell
      sidebar={<Sidebar user={user} />}
      rightRail={<RightSidebar />}
      mobileNav={<MobileBottomNav />}
    >
      {children}
    </AppShell>
  );
}
