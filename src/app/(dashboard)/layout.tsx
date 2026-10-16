import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { AppShell } from "@/components/layout/AppShell";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // New Google sign-ups pick a username before using the app
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
