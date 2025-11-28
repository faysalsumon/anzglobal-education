import { ReactNode } from "react";
import { ChatWidget } from "@/components/chat-widget";

interface PublicLayoutProps {
  children: ReactNode;
  onStudentLoginClick?: () => void;
}

export function PublicLayout({ children, onStudentLoginClick }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}
