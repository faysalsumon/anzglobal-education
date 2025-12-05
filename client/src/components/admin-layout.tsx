import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { AdminMegaSidebar } from "@/components/admin-mega-sidebar";
import { useAuth } from "@/hooks/useAuth";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  breadcrumbTitle: string;
  showPublicSiteButton?: boolean;
}

export function AdminLayout({ 
  children, 
  activeTab = "overview",
  breadcrumbTitle,
  showPublicSiteButton = true
}: AdminLayoutProps) {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(activeTab);

  const hasFullAdminAccess = user?.role === "super_admin" || user?.role === "support_manager";

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <AdminMegaSidebar 
        activeTab={currentTab} 
        onTabChange={handleTabChange} 
        hasFullAdminAccess={hasFullAdminAccess} 
      />

      <div className="flex flex-col flex-1 lg:ml-0">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background px-4 md:px-6 py-3">
          <div className="flex flex-1 items-center justify-between gap-4 lg:pl-0 pl-10">
            <Breadcrumb data-testid="breadcrumb">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/admin/dashboard" data-testid="breadcrumb-home">
                      <Home className="h-4 w-4" />
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage data-testid="breadcrumb-current">{breadcrumbTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {showPublicSiteButton && (
              <Button variant="outline" size="sm" asChild data-testid="button-public-site" className="hidden md:flex">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Public Site
                </Link>
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
