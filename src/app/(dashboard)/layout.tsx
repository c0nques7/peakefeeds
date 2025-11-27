import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { Sidebar } from "@/components/layout/Sidebar"; // ✅ FIXED IMPORT PATH
import { RightSidebar } from "@/components/layout/RightSidebar"; 
import { Providers } from "@/components/Providers";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import styles from "./dashboard.module.css"; 

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 1. Fetch User Data Here (So we can pass it to the Sidebar)
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <div className={styles.layoutContainer}>
      
      {/* 2. LEFT SIDEBAR (Desktop Only) */}
      <aside className={styles.desktopSidebar}>
        {/* Pass the user data down */}
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