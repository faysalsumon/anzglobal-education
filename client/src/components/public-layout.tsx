import { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";

interface PublicLayoutProps {
  children: ReactNode;
  onStudentLoginClick?: () => void;
}

export function PublicLayout({ children, onStudentLoginClick }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader onStudentLoginClick={onStudentLoginClick} />
      <main>
        {children}
      </main>
    </div>
  );
}
