import { StudentSidebar, StudentSidebarProvider, useStudentSidebar } from "@/components/student-sidebar";
import { ChatWidget } from "@/components/chat-widget";

interface StudentLayoutProps {
  children: React.ReactNode;
  breadcrumbTitle?: string;
}

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const { isSubmenuOpen, closeSubmenu } = useStudentSidebar();

  // Calculate margin based on submenu state
  // Icon panel: 64px (w-16)
  // Submenu panel: 224px (w-56) when open
  const marginLeft = isSubmenuOpen ? "18rem" : "4rem"; // 18rem = 64px + 224px, 4rem = 64px

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <StudentSidebar />

      {/* Main content area - adjusts margin based on submenu state */}
      <div 
        className="flex flex-col flex-1 transition-all duration-300 min-w-0"
        style={{ marginLeft }}
        onClick={(e) => {
          // Close submenu when clicking on main content on mobile/tablet
          // Only close if clicking directly on the main area, not on interactive elements
          if (window.innerWidth < 1024 && isSubmenuOpen) {
            const target = e.target as HTMLElement;
            // Don't close if clicking on buttons, inputs, or other interactive elements
            if (!target.closest('button, a, input, select, textarea, [role="button"]')) {
              closeSubmenu();
            }
          }
        }}
      >
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}

export function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <StudentSidebarProvider>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </StudentSidebarProvider>
  );
}
