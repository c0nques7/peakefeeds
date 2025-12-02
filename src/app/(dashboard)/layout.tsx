import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { Sidebar } from "@/components/layout/Sidebar"; 
import { RightSidebar } from "@/components/layout/RightSidebar"; 
import { Providers } from "@/components/Providers"; 
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import styles from "./dashboard.module.css"; 

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <div className={styles.layoutContainer}>

      {/* 1. BACKGROUND LAYER (Fixed & Animated) */}
      <div className={styles.backgroundLayer}>
          <div className={styles.orbTeal} />
          <div className={styles.orbPurple} />
      </div>

      {/* 2. LEFT SIDEBAR (Desktop/Tablet Only) */}
      {/* Hidden on Mobile via styles.desktopSidebar display:none */}
      <aside className={styles.desktopSidebar}>
        <Sidebar user={user} /> 
      </aside>

      {/* 3. MAIN CONTENT (Scrollable Center) */}
      <main className={styles.mainContent}>
        <div className={styles.feedWrapper}>
          <Providers>
            {children}
          </Providers>
        </div>
      </main>

      {/* 4. RIGHT SIDEBAR (Large Desktop Only) */}
      {/* Our CSS should hide this on Tablet (768px) and show on XL (1280px) */}
      <aside className={styles.rightSidebar}>
        <RightSidebar />
      </aside>

      {/* 5. BOTTOM NAV (Mobile Only) */}
      {/* Hidden on Desktop via styles.mobileNavWrapper display:none */}
      <div className={styles.mobileNavWrapper}>
        <MobileBottomNav />
      </div>

    </div>
  );
}

