import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { Sidebar } from "@/components/layout/Sidebar"; 
import { RightSidebar } from "@/components/layout/RightSidebar"; 
import { Providers } from "@/components/Providers"; // Assuming this handles client-side context like Tooltips
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import styles from "./dashboard.module.css"; 

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <div className={styles.layoutContainer}>
      
      {/* 🌬️ NEW: ANIMATED BACKGROUND LAYER */}
      {/* This allows the breathing orbs to show behind the glass UI */}
      <div className={styles.backgroundLayer}>
          <div className={styles.orbTeal} />
          <div className={styles.orbPurple} />
      </div>
      
      {/* 2. LEFT SIDEBAR (Desktop Only) */}
      <aside className={styles.desktopSidebar}>
        <Sidebar user={user} /> 
      </aside>

      {/* 3. MAIN CONTENT (Scrollable) */}
      <main className={styles.mainContent}>
        <div className={styles.feedWrapper}>
          <Providers>
            {children}
          </Providers>
        </div>
      </main>

      {/* 4. RIGHT SIDEBAR (Desktop Only) */}
      <aside className={styles.rightSidebar}>
        <RightSidebar />
      </aside>

      {/* 5. BOTTOM NAV (Mobile Only) */}
      <div className={styles.mobileNavWrapper}>
        <MobileBottomNav />
      </div>
      
    </div>
  );
}