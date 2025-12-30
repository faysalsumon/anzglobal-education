import { useState, useEffect, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  FileText,
  User,
  FolderOpen,
  Heart,
  Sparkles,
  Users,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { NotificationBell } from "@/components/NotificationBell";
import type { StudentProfile } from "@shared/schema";
import { performLogout } from "@/lib/logout";
import { useSupabaseAuth } from "@/lib/supabase-auth";

interface NavRoute {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  routes: NavRoute[];
}

interface StudentSidebarContextValue {
  isSubmenuOpen: boolean;
  setIsSubmenuOpen: (open: boolean) => void;
  closeSubmenu: () => void;
}

const StudentSidebarContext = createContext<StudentSidebarContextValue | null>(null);

export function useStudentSidebar() {
  const context = useContext(StudentSidebarContext);
  if (!context) {
    return { isSubmenuOpen: false, setIsSubmenuOpen: () => {}, closeSubmenu: () => {} };
  }
  return context;
}

interface StudentSidebarProviderProps {
  children: React.ReactNode;
}

export function StudentSidebarProvider({ children }: StudentSidebarProviderProps) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(true);

  const closeSubmenu = () => {
    setIsSubmenuOpen(false);
  };

  return (
    <StudentSidebarContext.Provider value={{ isSubmenuOpen, setIsSubmenuOpen, closeSubmenu }}>
      {children}
    </StudentSidebarContext.Provider>
  );
}

interface StudentSidebarProps {
  className?: string;
}

export function StudentSidebar({ className }: StudentSidebarProps) {
  const [location, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<string | null>("discover");
  const { isSubmenuOpen, setIsSubmenuOpen } = useStudentSidebar();
  const { user } = useAuth();

  // Fetch student profile for profile picture
  const { data: studentProfile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
  });

  // Fetch profile completion from API (same source as profile page)
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

  // Get the profile image URL - prefer student profile picture
  const profileImageUrl = studentProfile?.profileImageUrl || user?.profileImageUrl || null;

  const profileCompletion = completion?.percentage || 0;
  const isProfileComplete = completion?.isComplete || false;

  const navConfig: NavSection[] = [
    {
      id: "discover",
      label: "Discover",
      icon: Search,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
      routes: [
        { icon: Heart, label: "My Favourites", path: "/student/favorites" },
        { icon: Search, label: "Browse Courses", path: "/student/courses" },
        { icon: GraduationCap, label: "Compare Courses", path: "/compare-courses" },
      ],
    },
    {
      id: "applications",
      label: "My Applications",
      icon: FileText,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400",
      routes: [
        { icon: FileText, label: "View Applications", path: "/student/applications" },
        { icon: FolderOpen, label: "My Documents", path: "/student/documents" },
      ],
    },
    {
      id: "ai-assistant",
      label: "AI Assistant",
      icon: Sparkles,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
      routes: [
        { icon: Sparkles, label: "Ask Zan", path: "/student/ai-assistant" },
      ],
    },
    {
      id: "affiliate",
      label: "Affiliate",
      icon: Users,
      color: "text-pink-600 bg-pink-50 dark:bg-pink-950 dark:text-pink-400",
      routes: [
        { icon: Users, label: "Affiliate Program", path: "/affiliate" },
      ],
    },
  ];

  // Profile section (shown via bottom avatar, not in main nav)
  const profileSection: NavSection = {
    id: "profile",
    label: "Profile",
    icon: User,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
    routes: [
      { icon: User, label: "My Profile", path: "/student/profile" },
    ],
  };

  // All sections including profile for lookups
  const allSections = [...navConfig, profileSection];

  const findSectionForPath = (path: string) => {
    for (const section of allSections) {
      if (section.routes.some(route => path.startsWith(route.path.split('#')[0]))) {
        return section.id;
      }
    }
    return null;
  };

  useEffect(() => {
    const sectionId = findSectionForPath(location);
    if (sectionId) {
      setActiveSection(sectionId);
    }
  }, [location]);

  const handleSectionClick = (sectionId: string) => {
    if (activeSection === sectionId) {
      setIsSubmenuOpen(!isSubmenuOpen);
    } else {
      setActiveSection(sectionId);
      setIsSubmenuOpen(true);
    }
  };

  const handleRouteClick = (path: string) => {
    setLocation(path);
    // On mobile, close the submenu when navigating
    if (window.innerWidth < 1024) {
      setIsSubmenuOpen(false);
    }
  };

  const currentSection = allSections.find(s => s.id === activeSection);
  const visibleRoutes = currentSection?.routes || [];

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "ST";
  };

  const { signOut } = useSupabaseAuth();

  const handleLogout = () => {
    performLogout(signOut);
  };

  return (
    <>
      {/* Overlay for mobile when submenu is open */}
      {isSubmenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSubmenuOpen(false)}
        />
      )}

      {/* Icon panel - always visible */}
      <div className="fixed inset-y-0 left-0 z-50 w-16 flex flex-col items-center py-4 border-r bg-background">
        <Link href="/" className="mb-4" data-testid="link-logo">
          <img src={logoUrl} alt="ANZ" className="h-8 w-8 object-contain" />
        </Link>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-lg transition-all",
                location === "/student/dashboard" && "text-primary bg-primary/10"
              )}
              onClick={() => {
                setIsSubmenuOpen(false);
                setActiveSection(null);
                setLocation("/student/dashboard");
              }}
              data-testid="nav-dashboard"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            Dashboard
          </TooltipContent>
        </Tooltip>

        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col items-center gap-2 px-2">
            {navConfig.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <Tooltip key={section.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-10 w-10 rounded-lg transition-all",
                        isActive && section.color
                      )}
                      onClick={() => handleSectionClick(section.id)}
                      data-testid={`nav-section-${section.id}`}
                    >
                      <section.icon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {section.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>

        <div className="mt-auto flex flex-col items-center gap-2 pt-4 border-t w-full px-2">
          <NotificationBell />
          
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSectionClick("profile")}
                className={cn(
                  "relative rounded-full transition-all",
                  activeSection === "profile" && "ring-2 ring-purple-500"
                )}
                data-testid="nav-profile-avatar"
              >
                <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
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
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="text-sm">
                <p className="font-medium">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email?.split('@')[0]}
                </p>
                <p className={cn(
                  "text-xs",
                  isProfileComplete ? "text-green-500" : "text-muted-foreground"
                )}>
                  {isProfileComplete 
                    ? "Profile Complete" 
                    : `Profile ${profileCompletion}% complete`}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="h-10 w-10 rounded-lg"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Submenu panel - slides in from left of icon panel */}
      <aside className={cn(
        "fixed inset-y-0 left-16 z-40 w-56 flex flex-col bg-background border-r transition-transform duration-300",
        isSubmenuOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>
          {currentSection && (
            <div className="px-3 py-2 border-b">
              <h3 className={cn(
                "text-xs font-semibold uppercase tracking-wider flex items-center gap-2",
                currentSection.color.split(' ')[0]
              )}>
                <currentSection.icon className="h-3.5 w-3.5" />
                {currentSection.label}
              </h3>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {visibleRoutes.map((route) => {
                const isActive = location === route.path || location.startsWith(route.path.split('#')[0]);
                return (
                  <Button
                    key={route.path}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10",
                      isActive && "bg-secondary"
                    )}
                    onClick={() => handleRouteClick(route.path)}
                    data-testid={`nav-${route.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <route.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{route.label}</span>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>

        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background border shadow-sm"
          onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
          data-testid="button-toggle-submenu"
        >
          {isSubmenuOpen ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </>
  );
}
