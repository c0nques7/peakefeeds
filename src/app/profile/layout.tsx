import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { Sidebar } from "@/components/layout/Sidebar"; 
import { RightSidebar } from "@/components/layout/RightSidebar";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import styles from "../(dashboard)/dashboard.module.css"; 

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  const user = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    username: session.user.username,
    role: session.user.role 
  } : undefined;

  return (
    <div className={styles.layoutContainer}>

      {/* 1. BACKGROUND LAYER */}
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
        {children}
      </main>

      {/* 4. RIGHT SIDEBAR (Desktop) */}
      <aside className={styles.rightSidebar}>
        <RightSidebar />
      </aside>

      {/* 5. BOTTOM NAV (Mobile) */}
      <div className={styles.mobileNavWrapper}>
        <MobileBottomNav />
      </div>

    </div>
  );
}