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
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

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

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // On mobile, sidebar visibility is controlled by isMobileMenuOpen prop
  const isSidebarVisible = isMobile ? (isMobileMenuOpen ?? false) : true;
  
  // Submenu visibility: on desktop follows isSubmenuOpen, on mobile requires sidebar to be visible too
  const showSubmenu = isSubmenuOpen && (isMobile ? isSidebarVisible : true);

  return (
    <>
      {/* Overlay for mobile when sidebar or submenu is open */}
      {(isSidebarVisible || isSubmenuOpen) && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => {
            setIsSubmenuOpen(false);
            onMobileMenuClose?.();
          }}
        />
      )}

      {/* Icon panel - hidden on mobile unless menu is open, always visible on desktop */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-16 flex flex-col items-center py-4 border-r bg-background transition-transform duration-300",
        "lg:translate-x-0",
        isSidebarVisible ? "translate-x-0" : "-translate-x-full"
      )}>
        <Link href="/" className="mb-4" aria-label="Go to homepage" data-testid="link-logo">
          <img src={logoUrl} alt="ANZ Global Education logo" width={32} height={32} className="h-8 w-8 object-contain" />
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

      </div>

      {/* Submenu panel - slides in from left of icon panel */}
      <aside className={cn(
        "fixed inset-y-0 left-16 z-40 w-56 flex flex-col bg-background border-r transition-transform duration-300",
        showSubmenu ? "translate-x-0" : "-translate-x-full",
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
