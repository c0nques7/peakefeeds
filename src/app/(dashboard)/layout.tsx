import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { Sidebar } from "@/components/layout/Sidebar"; 
import { RightSidebar } from "@/components/layout/RightSidebar";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import styles from "./dashboard.module.css"; 

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  // Prepare user data for the Desktop Sidebar (which still needs props)
  const user = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    username: session.user.username,
    role: session.user.role 
  } : undefined;

  return (
    <div className={styles.layoutContainer}>

      {/* 2. LEFT SIDEBAR (Desktop) */}
      <aside className={styles.desktopSidebar}>
        {/* Sidebar uses props because it's a Server Component here */}
        <Sidebar user={user} /> 
      </aside>

      {/* 3. MAIN CONTENT */}
      <main className={styles.mainContent}>
        {children}
      </main>

      {/* 4. RIGHT SIDEBAR (Desktop) */}
      <aside className={styles.rightSidebar}>
        <RightSidebar />
      </aside>

      {/* 5. BOTTOM NAV (Mobile) */}
      <div className={styles.mobileNavWrapper}>
        {/* 🟢 FIX: Removed 'user={user}' because MobileBottomNav now uses 'useSession()' internally */}
        <MobileBottomNav />
      </div>

    </div>
  );
}