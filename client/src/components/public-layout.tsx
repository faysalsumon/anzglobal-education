import { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";
import { ChatWidget } from "@/components/chat-widget";
import { useAuth } from "@/hooks/useAuth";

interface PublicLayoutProps {
  children: ReactNode;
  onStudentLoginClick?: () => void;
}

export function PublicLayout({ children, onStudentLoginClick }: PublicLayoutProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  // Only show PublicHeader for unauthenticated users
  // Authenticated users with userType get TopNavBar from App.tsx
  // Don't show during loading to prevent header flash
  // Show PublicHeader if: NOT loading AND (not authenticated OR no user OR no userType)
  const showPublicHeader = !isLoading && (!isAuthenticated || !user || !user.userType);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showPublicHeader && <PublicHeader onStudentLoginClick={onStudentLoginClick} />}
      <main className="flex-1">
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}
