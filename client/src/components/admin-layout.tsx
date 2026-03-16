import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Home } from "lucide-react";
import { AdminMegaSidebar } from "@/components/admin-mega-sidebar";
import { FloatingChatBar } from "@/components/floating-chat-bar";
import { AdminBottomBar } from "@/components/admin-bottom-bar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AdminMessagesTab } from "@/components/admin-messages-tab";
import { useAuth } from "@/hooks/useAuth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  breadcrumbTitle: string;
}

const TAB_TO_ROUTE_MAP: Record<string, string> = {
  "profile": "/admin/profile",
  "data-import": "/admin/csv-import",
  "overview": "/admin/dashboard",
  "my-tasks": "/admin/dashboard?tab=my-tasks",
  "team-workload": "/admin/dashboard?tab=team-workload",
  "crm-contacts": "/admin/dashboard?tab=crm-contacts",
  "applications": "/admin/dashboard?tab=applications",
  "courses": "/admin/dashboard?tab=courses",
  "blogs": "/admin/dashboard?tab=blogs",
  "website-content": "/admin/dashboard?tab=website-content",
  "users": "/admin/dashboard?tab=users",
  "institutions": "/admin/dashboard?tab=institutions",
  "web-scraping": "/admin/dashboard?tab=web-scraping",
  "activity-logs": "/admin/dashboard?tab=activity-logs",
  "scraping": "/admin/dashboard?tab=web-scraping",
  "finance-dashboard": "/admin/dashboard?tab=finance-dashboard",
  "finance-invoices": "/admin/dashboard?tab=finance-invoices",
  "finance-customers": "/admin/dashboard?tab=finance-customers",
  "finance-items": "/admin/dashboard?tab=finance-items",
  "finance-accounts": "/admin/dashboard?tab=finance-accounts",
};

function getTabFromPath(pathname: string): string {
  if (pathname.includes("/admin/profile")) return "profile";
  if (pathname.includes("/admin/scraping")) return "web-scraping";
  if (pathname.includes("/admin/csv-import")) return "data-import";
  if (pathname.includes("/admin/dashboard")) return "overview";
  return "overview";
}

export function AdminLayout({ 
  children, 
  activeTab,
  breadcrumbTitle
}: AdminLayoutProps) {
  const { hasFullAdminAccess, isCTO, adminRole } = useAuth();
  const [location, setLocation] = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const derivedTab = activeTab || getTabFromPath(location);
  const isMarketingExecutive = adminRole === "marketing_executive" || adminRole === "support_staff";

  const { showWarning, secondsRemaining, stayLoggedIn } = useInactivityLogout({
    enabled: hasFullAdminAccess,
  });

  const handleTabChange = useCallback((tab: string) => {
    const route = TAB_TO_ROUTE_MAP[tab];
    if (route) {
      if (route.includes("?tab=")) {
        const [path, query] = route.split("?");
        const tabValue = new URLSearchParams(query).get("tab");
        setLocation(`${path}?tab=${tabValue}`);
      } else {
        setLocation(route);
      }
    } else {
      setLocation(`/admin/dashboard?tab=${tab}`);
    }
  }, [setLocation]);

  useEffect(() => {
    const handler = () => setIsChatOpen(true);
    window.addEventListener("open-admin-chat", handler);

    const tabHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab) {
        handleTabChange(detail.tab);
      }
    };
    window.addEventListener("admin-tab-change", tabHandler);

    return () => {
      window.removeEventListener("open-admin-chat", handler);
      window.removeEventListener("admin-tab-change", tabHandler);
    };
  }, [handleTabChange]);

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <AdminMegaSidebar 
        activeTab={derivedTab} 
        onTabChange={handleTabChange} 
        hasFullAdminAccess={hasFullAdminAccess}
        isCTO={isCTO}
        isMarketingExecutive={isMarketingExecutive}
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
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 pb-14 overflow-auto">
          {children}
        </main>
      </div>

      <FloatingChatBar />
      <AdminBottomBar />

      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col [&>button]:z-50">
          <AdminMessagesTab inSheet />
        </SheetContent>
      </Sheet>

      <AlertDialog open={showWarning}>
        <AlertDialogContent data-testid="dialog-inactivity-warning">
          <AlertDialogHeader>
            <AlertDialogTitle>You're about to be signed out</AlertDialogTitle>
            <AlertDialogDescription>
              You've been inactive for a while. You will be automatically signed out in{" "}
              <span className="font-semibold text-foreground" data-testid="text-seconds-remaining">
                {secondsRemaining} second{secondsRemaining !== 1 ? "s" : ""}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction type="button" onClick={stayLoggedIn} data-testid="button-stay-signed-in">
              Stay Signed In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
