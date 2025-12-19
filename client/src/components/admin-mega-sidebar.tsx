import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Building2,
  BookOpen,
  Upload,
  Newspaper,
  Globe,
  Activity,
  ListTodo,
  ClipboardList,
  BarChart3,
  UserPlus,
  Contact,
  FileText,
  Briefcase,
  LayoutGrid,
  Settings,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User,
  Link2,
  LogOut,
} from "lucide-react";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

interface NavRoute {
  icon: LucideIcon;
  label: string;
  value: string;
  show: boolean;
}

interface NavDomain {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  routes: NavRoute[];
}

interface AdminMegaSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasFullAdminAccess: boolean;
}

export function AdminMegaSidebar({ activeTab, onTabChange, hasFullAdminAccess }: AdminMegaSidebarProps) {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const navConfig: NavDomain[] = [
    {
      id: "crm",
      label: "CRM",
      icon: Briefcase,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
      routes: [
        { icon: ListTodo, label: "My Tasks", value: "my-tasks", show: true },
        { icon: BarChart3, label: "Team Workload", value: "team-workload", show: hasFullAdminAccess },
        { icon: UserPlus, label: "Leads", value: "crm-leads", show: true },
        { icon: Contact, label: "Contacts", value: "crm-contacts", show: true },
        { icon: ClipboardList, label: "Applications", value: "applications", show: true },
      ],
    },
    {
      id: "cms",
      label: "CMS",
      icon: LayoutGrid,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
      routes: [
        { icon: BookOpen, label: "Courses", value: "courses", show: true },
        { icon: Building2, label: "Institutions", value: "institutions", show: hasFullAdminAccess },
        { icon: Newspaper, label: "Blogs", value: "blogs", show: true },
        { icon: FileText, label: "Website Content", value: "website-content", show: true },
      ],
    },
    {
      id: "management",
      label: "Management",
      icon: Settings,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400",
      routes: [
        { icon: Users, label: "Users", value: "users", show: hasFullAdminAccess },
        { icon: Globe, label: "Regions", value: "regions", show: hasFullAdminAccess },
        { icon: Link2, label: "Affiliates", value: "affiliates", show: hasFullAdminAccess },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      icon: Wrench,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
      routes: [
        { icon: Upload, label: "Data Import", value: "data-import", show: hasFullAdminAccess },
        { icon: Globe, label: "Web Scraping", value: "web-scraping", show: hasFullAdminAccess },
        { icon: Activity, label: "Activity Logs", value: "activity-logs", show: hasFullAdminAccess },
      ],
    },
  ];

  const visibleDomains = navConfig.filter(domain => 
    domain.routes.some(route => route.show)
  );

  const findDomainForTab = (tab: string) => {
    for (const domain of navConfig) {
      if (domain.routes.some(route => route.value === tab)) {
        return domain.id;
      }
    }
    return null;
  };

  // Track only activeTab changes to sync activeDomain
  // This effect should NOT run when activeDomain changes (user clicks domain icon)
  // Only sync when the actual tab changes
  useEffect(() => {
    const domainId = findDomainForTab(activeTab);
    if (domainId) {
      // Sync activeDomain to match the domain containing activeTab
      setActiveDomain(domainId);
      setIsSubmenuOpen(true);
    } else if (visibleDomains.length > 0) {
      // Fallback: set first visible domain if no matching domain
      setActiveDomain(visibleDomains[0].id);
    }
    // Only depend on activeTab - NOT on activeDomain
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleDomainClick = (domainId: string) => {
    if (activeDomain === domainId) {
      setIsSubmenuOpen(!isSubmenuOpen);
    } else {
      setActiveDomain(domainId);
      setIsSubmenuOpen(true);
    }
  };

  const handleRouteClick = (value: string) => {
    onTabChange(value);
    setIsMobileMenuOpen(false);
  };

  const currentDomain = visibleDomains.find(d => d.id === activeDomain);
  const visibleRoutes = currentDomain?.routes.filter(r => r.show) || [];

  return (
    <>
      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        data-testid="button-mobile-menu-toggle"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container - Fixed on mobile, relative on desktop */}
      <div 
        className={cn(
          "h-screen flex flex-shrink-0 transition-all duration-200 ease-out",
          // Mobile: fixed position with slide-in/out
          "fixed left-0 top-0 z-40 lg:relative lg:z-auto",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        data-testid="admin-mega-sidebar"
      >
        {/* Icon Rail - Column 1 */}
        <div className="w-16 bg-card border-r border-border flex flex-col h-full">
          {/* Logo */}
          <div className="h-14 flex items-center justify-center border-b border-border">
            <img src={logoUrl} alt="ANZ" className="h-8 w-8 object-contain" />
          </div>

          {/* Domain Icons */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col items-center py-2 gap-1">
              {visibleDomains.map((domain) => {
                const Icon = domain.icon;
                const isActive = activeDomain === domain.id;
                const hasActiveRoute = domain.routes.some(r => r.value === activeTab && r.show);
                
                return (
                  <Tooltip key={domain.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "w-12 h-12 rounded-xl transition-all",
                          isActive && domain.color,
                          hasActiveRoute && "ring-2 ring-primary/30"
                        )}
                        onClick={() => handleDomainClick(domain.id)}
                        data-testid={`button-domain-${domain.id}`}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {domain.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </ScrollArea>

          {/* Profile and Logout at Bottom */}
          <div className="p-2 border-t border-border space-y-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link href="/admin/profile">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12 rounded-xl transition-all text-gray-600 bg-gray-50 dark:bg-gray-950 dark:text-gray-400"
                    data-testid="button-admin-profile"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                My Profile
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  className="w-12 h-12 rounded-xl"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Logout
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Submenu Panel - Column 2 */}
        <div 
          className={cn(
            "bg-background border-r border-border transition-all duration-200 ease-out overflow-hidden",
            isSubmenuOpen && activeDomain ? "w-48" : "w-0"
          )}
        >
          <div className="w-48 h-full flex flex-col">
            {/* Domain Header */}
            {currentDomain && (
              <div className="h-14 px-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <currentDomain.icon className="h-4 w-4" />
                  <span className="font-semibold text-sm">{currentDomain.label}</span>
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

            {/* Route List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {visibleRoutes.map((route) => {
                  const Icon = route.icon;
                  const isActive = activeTab === route.value;
                  
                  return (
                    <Button
                      key={route.value}
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start h-9 px-3 text-sm font-normal",
                        isActive && "font-medium bg-primary/10 text-primary"
                      )}
                      onClick={() => handleRouteClick(route.value)}
                      data-testid={`sidebar-${route.value}`}
                    >
                      <Icon className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate">{route.label}</span>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Expand Button (when submenu is closed) */}
        {!isSubmenuOpen && activeDomain && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-16 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background border shadow-sm z-10"
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
