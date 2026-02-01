import { useState, useEffect, createContext, useContext, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FileText,
  User,
  FolderOpen,
  Heart,
  Sparkles,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Link2,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";

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
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export function StudentSidebar({ className, isMobileMenuOpen, onMobileMenuClose }: StudentSidebarProps) {
  const [location, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<string | null>("profile");
  const { isSubmenuOpen, setIsSubmenuOpen } = useStudentSidebar();

  // Close submenu when mobile menu closes
  const prevMobileMenuOpen = useRef(isMobileMenuOpen);
  useEffect(() => {
    if (prevMobileMenuOpen.current === true && isMobileMenuOpen === false) {
      // Mobile menu just closed, also close submenu
      setIsSubmenuOpen(false);
    }
    prevMobileMenuOpen.current = isMobileMenuOpen;
  }, [isMobileMenuOpen, setIsSubmenuOpen]);

  const navConfig: NavSection[] = [
    {
      id: "profile",
      label: "My Profile",
      icon: User,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
      routes: [
        { icon: User, label: "Smart Form", path: "/student/profile" },
        { icon: Settings, label: "My Account", path: "/student/account" },
      ],
    },
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
      icon: Link2,
      color: "text-pink-600 bg-pink-50 dark:bg-pink-950 dark:text-pink-400",
      routes: [
        { icon: Link2, label: "Affiliate Program", path: "/affiliate" },
      ],
    },
  ];

  // All sections for lookups
  const allSections = navConfig;

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


  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => {
            setIsSubmenuOpen(false);
            onMobileMenuClose?.();
          }}
        />
      )}

      {/* Sidebar Container - Fixed on mobile, relative on desktop */}
      <div 
        className={cn(
          "flex flex-shrink-0 transition-all duration-200 ease-out",
          "fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)]",
          "lg:relative lg:top-0 lg:z-auto lg:h-full",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        data-testid="student-sidebar"
      >
        {/* Icon Rail - No header, starts directly with navigation */}
        <div className="w-16 bg-card border-r border-border flex flex-col h-full">
          {/* Navigation Icons */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center py-2 gap-1">
              {/* Dashboard Button */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "w-12 h-12 rounded-xl transition-all",
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

              {/* Separator */}
              <div className="w-8 h-px bg-border my-1" />

              {/* Section Icons */}
              {navConfig.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <Tooltip key={section.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "w-12 h-12 rounded-xl transition-all",
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
          </div>
        </div>

        {/* Submenu Panel */}
        <div 
          className={cn(
            "bg-background border-r border-border transition-all duration-200 ease-out overflow-hidden h-full",
            isSubmenuOpen && activeSection ? "w-56" : "w-0"
          )}
        >
          <div className="w-56 h-full flex flex-col">
            {/* Section Header - Fixed height to match main header */}
            {currentSection && (
              <div className="h-14 flex-shrink-0 px-4 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <currentSection.icon className="h-4 w-4" />
                  <span className="font-semibold text-sm">{currentSection.label}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsSubmenuOpen(false)}
                  data-testid="button-close-submenu"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Route List - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-2 space-y-0.5">
                {visibleRoutes.map((route) => {
                  const isActive = location === route.path || location.startsWith(route.path.split('#')[0]);
                  return (
                    <Button
                      key={route.path}
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start h-9 px-3 text-sm font-normal",
                        isActive && "font-medium bg-primary/10 text-primary"
                      )}
                      onClick={() => handleRouteClick(route.path)}
                      data-testid={`nav-${route.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <route.icon className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate">{route.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Expand Button (when submenu is closed) */}
        {!isSubmenuOpen && activeSection && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-16 top-4 h-6 w-6 rounded-full bg-background border shadow-sm z-10 lg:top-4"
            onClick={() => setIsSubmenuOpen(true)}
            data-testid="button-expand-submenu"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </>
  );
}
