import { useState, useEffect } from "react";
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
  Home,
  MessageSquare,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";

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

interface StudentSidebarProps {
  className?: string;
}

export function StudentSidebar({ className }: StudentSidebarProps) {
  const [location, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<string | null>("discover");
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(true);
  const { user, logout } = useAuth();

  const navConfig: NavSection[] = [
    {
      id: "discover",
      label: "Discover",
      icon: Search,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
      routes: [
        { icon: Search, label: "Browse Courses", path: "/student/courses" },
        { icon: Heart, label: "My Favorites", path: "/student/favorites" },
      ],
    },
    {
      id: "applications",
      label: "Applications",
      icon: FileText,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400",
      routes: [
        { icon: FileText, label: "My Applications", path: "/student/applications" },
        { icon: FolderOpen, label: "My Documents", path: "/student/documents" },
      ],
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
      routes: [
        { icon: User, label: "My Profile", path: "/student/profile" },
        { icon: GraduationCap, label: "Education History", path: "/student/profile#education" },
      ],
    },
    {
      id: "connect",
      label: "Connect",
      icon: MessageSquare,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
      routes: [
        { icon: MessageSquare, label: "Messages", path: "/chat" },
        { icon: Sparkles, label: "AI Assistant", path: "/student/ai-assistant" },
        { icon: Users, label: "Affiliate Program", path: "/affiliate" },
      ],
    },
  ];

  const findSectionForPath = (path: string) => {
    for (const section of navConfig) {
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
      setIsSubmenuOpen(true);
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
  };

  const currentSection = navConfig.find(s => s.id === activeSection);
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

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
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
        <Link href="/" className="mb-6" data-testid="link-logo">
          <img src={logoUrl} alt="ANZ" className="h-8 w-8 object-contain" />
        </Link>

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
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
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
          <div className="h-16 flex items-center px-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {user?.profileImageUrl && (
                  <AvatarImage src={user.profileImageUrl} alt={user.email || "Student"} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email?.split('@')[0]}
                </span>
                <span className="text-xs text-muted-foreground">Student</span>
              </div>
            </div>
          </div>

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

        <div className="p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setLocation("/")}
            data-testid="button-public-site"
          >
            <Home className="h-4 w-4" />
            Public Site
          </Button>
        </div>

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
