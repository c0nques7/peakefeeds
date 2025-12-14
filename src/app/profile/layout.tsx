import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import styles from "../(dashboard)/dashboard.module.css"; // Reuse dashboard styles if possible

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20"> {/* Add padding-bottom so content isn't hidden behind nav */}
      {children}
      
      {/* Mobile Nav Only */}
      <div className="lg:hidden block fixed bottom-0 left-0 right-0 z-50">
        <MobileBottomNav />
      </div>
    </div>
  );
}