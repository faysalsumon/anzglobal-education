import { useState, lazy, Suspense } from "react";
import { StudentSidebar, StudentSidebarProvider } from "@/components/student-sidebar";
import { ChatWidget } from "@/components/chat-widget";
const AdminChatWidget = lazy(() => import("@/components/admin-chat-widget").then(m => ({ default: m.AdminChatWidget })));
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { LogOut, Settings, Home, Menu, LayoutDashboard } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { StudentProfile } from "@shared/schema";
import { performLogout } from "@/lib/logout";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { Link } from "wouter";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

interface StudentLayoutProps {
  children: React.ReactNode;
  breadcrumbTitle?: string;
}

const getBreadcrumbTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    "/student/dashboard": "Dashboard",
    "/student/profile": "Smart Form",
    "/student/preferences": "About Me & Preferences",
    "/student/account": "My Account",
    "/student/courses": "Browse Courses",
    "/student/applications": "My Applications",
    "/student/documents": "My Documents",
    "/student/favorites": "My Favourites",
    "/student/ai-assistant": "AI Assistant",
    "/student/referrals": "Referrals",
    "/compare-courses": "Compare Courses",
    "/affiliate": "Affiliate Program",
  };
  return routes[pathname] || "Dashboard";
};

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { signOut } = useSupabaseAuth();

  const { data: studentProfile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
  });

  const profileImageUrl = studentProfile?.profileImageUrl || user?.profileImageUrl || null;

  interface ProfileCompletionResult {
    isComplete: boolean;
    percentage: number;
    missingFields: string[];
    completedSections: {
      personalInfo: boolean;
      education: boolean;
      languageTest: boolean;
    };
  }

  const { data: completion } = useQuery<ProfileCompletionResult>({
    queryKey: ["/api/student/profile/completion"],
  });

  const isProfileComplete = completion?.isComplete || false;

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "ST";
  };

  const handleLogout = () => {
    performLogout(signOut);
  };

  const breadcrumbTitle = getBreadcrumbTitle(location);

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow, noai, noimageai" />
      </Helmet>

      {/* Full-screen flex row — sidebar + main column side by side (matches admin layout) */}
      <div className="flex h-screen w-full overflow-hidden bg-muted/30">

        {/* Left Sidebar — full height, includes its own logo header */}
        <StudentSidebar
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Right: flex column with fixed header + scrollable content */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Top Header — fixed height h-14, aligns with sidebar headers */}
          <header className="flex-shrink-0 h-14 flex items-center gap-3 border-b bg-background px-4 md:px-6">

            {/* Mobile: hamburger + logo (hidden on desktop since sidebar shows logo) */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/" aria-label="Go to homepage" data-testid="link-logo" className="flex items-center lg:hidden">
              <img src={logoUrl} alt="ANZ Global Education" className="h-8 w-8 object-contain" />
            </Link>

            {/* Breadcrumb */}
            <Breadcrumb data-testid="breadcrumb">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/student/dashboard" data-testid="breadcrumb-home">
                      <Home className="h-4 w-4" />
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage data-testid="breadcrumb-current">
                    {breadcrumbTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Right: Notifications + User Menu */}
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-9 w-9">
                      {profileImageUrl && (
                        <AvatarImage src={profileImageUrl} alt={user?.email || "Student"} />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {isProfileComplete ? (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-4 px-0.5 rounded-full bg-green-500 text-[8px] font-bold text-white" data-testid="badge-profile-complete">
                        100%
                      </span>
                    ) : (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border-2 border-background" data-testid="badge-profile-incomplete" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none" data-testid="user-name">
                        {user?.firstName && user?.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : "Student"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground" data-testid="user-email">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setLocation("/student/dashboard")}
                    data-testid="menu-dashboard"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocation("/student/account")}
                    data-testid="menu-account"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>My Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Scrollable page content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>

      {user?.userType && ["admin", "platform_admin", "cto", "super_admin"].includes(user.userType) ? (
        <Suspense fallback={null}><AdminChatWidget /></Suspense>
      ) : (
        <ChatWidget />
      )}
    </>
  );
}

export function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <StudentSidebarProvider>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </StudentSidebarProvider>
  );
}
