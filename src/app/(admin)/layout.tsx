import { requireStaff } from "@/lib/rbac"; // Preserving your existing import path
import { AdminSidebar } from "./_components/admin-sidebar"; // The new Client Component
import styles from "@/app/(admin)/admin/admin.module.css"; // Preserving your existing CSS path

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🔒 Security Check
  await requireStaff();

  return (
    <div className={styles.adminContainer}>
      {/* Background Orb */}
      <div className={styles.orbAdmin} />

      {/* 🟢 UPDATED: We replaced the static <aside> with the responsive 
        <AdminSidebar /> component. This handles the mobile hamburger 
        menu state which requires 'use client'.
      */}
      <AdminSidebar />

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Added padding-bottom to prevent content from being hidden behind mobile navs if needed */}
        <div className="max-w-7xl mx-auto pb-20 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}