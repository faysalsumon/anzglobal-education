import { StudentSidebar } from "@/components/student-sidebar";
import { ChatWidget } from "@/components/chat-widget";

interface StudentLayoutProps {
  children: React.ReactNode;
  breadcrumbTitle?: string;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <StudentSidebar />

      <div className="flex flex-col flex-1 ml-16">
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}
