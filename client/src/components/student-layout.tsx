import { Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { StudentSidebar } from "@/components/student-sidebar";
import { ChatWidget } from "@/components/chat-widget";

interface StudentLayoutProps {
  children: React.ReactNode;
  breadcrumbTitle: string;
  breadcrumbParent?: {
    title: string;
    href: string;
  };
}

export function StudentLayout({ 
  children, 
  breadcrumbTitle,
  breadcrumbParent
}: StudentLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <StudentSidebar />

      <div className="flex flex-col flex-1 lg:ml-[288px] ml-0">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background px-4 md:px-6 py-3">
          <div className="flex flex-1 items-center gap-4 lg:pl-0 pl-10">
            <Breadcrumb data-testid="breadcrumb">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/student/courses" data-testid="breadcrumb-home">
                      <Home className="h-4 w-4" />
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbParent && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href={breadcrumbParent.href} data-testid="breadcrumb-parent">
                          {breadcrumbParent.title}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage data-testid="breadcrumb-current">{breadcrumbTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}
