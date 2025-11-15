import { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";
import { useAuth } from "@/hooks/useAuth";

interface PublicLayoutProps {
  children: ReactNode;
  onStudentLoginClick?: () => void;
}

export function PublicLayout({ children, onStudentLoginClick }: PublicLayoutProps) {
  const { isAuthenticated, user } = useAuth();
  
  // Only show PublicHeader for unauthenticated users
  // Authenticated users get TopNavBar from App.tsx
  const showPublicHeader = !isAuthenticated || !user?.userType;
  
  return (
    <div className="min-h-screen bg-background">
      {showPublicHeader && <PublicHeader onStudentLoginClick={onStudentLoginClick} />}
      <main>
        {children}
      </main>
    </div>
  );
}
