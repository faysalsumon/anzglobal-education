import { UniversitySidebar } from "@/components/university-sidebar";
import { ChatWidget } from "@/components/chat-widget";

interface UniversityLayoutProps {
  children: React.ReactNode;
  breadcrumbTitle?: string;
}

export function UniversityLayout({ children }: UniversityLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <UniversitySidebar />

      <div className="flex flex-col flex-1 lg:ml-[288px] ml-0">
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}
