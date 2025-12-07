import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { Sidebar } from "@/components/Sidebar"; // Adjusted path to match component
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import styles from "../home/dashboard.module.css"; // Pointing to your main CSS module

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  // Prepare user data for Sidebar props
  const user = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    username: session.user.username,
    role: session.user.role 
  } : undefined;

  return (
    <div className={styles.layoutContainer}>

      {/* 1. BACKGROUND LAYER (Global) */}
      <div className={styles.backgroundLayer}>
          <div className={styles.orbTeal} />
          <div className={styles.orbPurple} />
      </div>

      {/* 2. LEFT SIDEBAR (Desktop) */}
      <aside className={styles.desktopSidebar}>
        <Sidebar user={user} /> 
      </aside>

      {/* 3. MAIN CONTENT */}
      <main className={styles.mainContent}>
        {/* Render the specific page content here */}
        {children}
      </main>

      {/* 4. RIGHT SIDEBAR (Large Desktop) */}
      {/* Ensure you have a RightSidebar component created, or remove this if not ready */}
      <aside className={styles.rightSidebar}>
         {/* <RightSidebar /> */} 
         <div className="p-6 text-[var(--text-muted)] text-sm">
            <p>Trending & Suggestions coming soon.</p>
         </div>
      </aside>

      {/* 5. BOTTOM NAV (Mobile) */}
      <div className={styles.mobileNavWrapper}>
        <MobileBottomNav />
      </div>

    </div>
  );
}
