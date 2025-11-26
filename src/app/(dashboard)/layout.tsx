import { Sidebar } from "@/components/layout/Sidebar"; 
import { RightSidebar } from "@/components/layout/RightSidebar"; // 👈 NEW
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import styles from "./dashboard.module.css"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layoutContainer}>
      
      {/* 1. LEFT SIDEBAR (Desktop Only) */}
      <aside className={styles.desktopSidebar}>
        <Sidebar /> 
      </aside>

      {/* 2. MAIN CONTENT (Scrollable) */}
      <main className={styles.mainContent}>
        {/* We wrap children in a max-width container to prevent "Mega-Wide" posts */}
        <div className={styles.feedWrapper}>
            {children}
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR (Desktop Only - New!) */}
      <aside className={styles.rightSidebar}>
        <RightSidebar />
      </aside>

      {/* 4. BOTTOM NAV (Mobile Only) */}
      <div className={styles.mobileNavWrapper}>
        <MobileBottomNav />
      </div>
      
    </div>
  );
}