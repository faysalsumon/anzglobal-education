import { useState } from "react";
import { StudentSidebar, StudentSidebarProvider } from "@/components/student-sidebar";
import { ChatWidget } from "@/components/chat-widget";
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
import { LogOut, User, Settings, Home, Menu } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { StudentProfile } from "@shared/schema";
import { performLogout } from "@/lib/logout";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { Link } from "wouter";

interface StudentLayoutProps {
  children: React.ReactNode;
  breadcrumbTitle?: string;
}

const getBreadcrumbTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    "/student/dashboard": "Dashboard",
    "/student/profile": "Smart Form",
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

  // Fetch student profile for profile picture
  const { data: studentProfile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
  });

  // Get the profile image URL - prefer student profile picture
  const profileImageUrl = studentProfile?.profileImageUrl || user?.profileImageUrl || null;

  // Fetch profile completion from API
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

  const profileCompletion = completion?.percentage || 0;
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
      <div className="flex min-h-screen w-full bg-muted/30">
        <StudentSidebar 
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 lg:ml-0">
          {/* Top Header with Breadcrumb */}
          <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background px-4 md:px-6 py-3">
            {/* Mobile menu toggle - fixed position, doesn't affect layout */}
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-2 top-3 z-50 lg:hidden h-9 w-9"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex flex-1 items-center justify-between gap-4 lg:pl-0 pl-10">
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

              {/* Right side - Notifications and User Menu */}
              <div className="flex items-center gap-2">
                <NotificationBell />
                
                {/* User Dropdown Menu */}
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
                      {/* Profile completion badge */}
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
                      onClick={() => setLocation("/student/profile")}
                      data-testid="menu-profile"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Smart Form</span>
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
            </div>
          </header>

          {/* Main scrollable content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>

        <ChatWidget />
      </div>
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
