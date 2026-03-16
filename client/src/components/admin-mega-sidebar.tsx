import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { isAdminFeatureVisible } from "@/lib/region-config";
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
  Contact,
  FileText,
  Briefcase,
  Layers,
  Settings,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Link2,
  UsersRound,
  Shield,
  MapPin,
  LayoutDashboard,
  UserCircle,
  Tag,
  UserCog,
  Bot,
  GraduationCap,
  FileCheck,
  Search,
  Key,
  Bell,
  UserCheck,
  Mail,
  DollarSign,
  Package,
  ImageIcon,
} from "lucide-react";
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
  showSection: boolean;
  routes: NavRoute[];
}

interface AdminMegaSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasFullAdminAccess: boolean;
  isCTO?: boolean;
  isMarketingExecutive?: boolean;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

export function AdminMegaSidebar({ 
  activeTab, 
  onTabChange, 
  hasFullAdminAccess, 
  isCTO = false,
  isMarketingExecutive = false,
  isMobileMenuOpen = false,
  onMobileMenuToggle
}: AdminMegaSidebarProps) {
  const [location] = useLocation();
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(true);
  const isOnProfilePage = location === "/admin/profile";

  const { user, allowedNavSections, isBranchManager } = useAuth();
  const adminRegionCode = user?.regionCode || null;
  const isGlobalScope = user?.defaultScope === 'global' || !adminRegionCode;

  const canSeeFeature = (feature: Parameters<typeof isAdminFeatureVisible>[0]) =>
    isAdminFeatureVisible(feature, adminRegionCode, isGlobalScope);
  
  const canSeeNav = (sectionId: string) => allowedNavSections.has(sectionId);

  const navConfig: NavDomain[] = [
    {
      id: "crm",
      label: "CRM",
      icon: Briefcase,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
      showSection: canSeeNav("crm"),
      routes: [
        { icon: ListTodo, label: "My Tasks", value: "my-tasks", show: true },
        { icon: BarChart3, label: "Team Workload", value: "team-workload", show: isCTO },
        { icon: Mail, label: "Email", value: "email", show: true },
        { icon: Contact, label: "Contacts", value: "crm-contacts", show: true },
        { icon: ClipboardList, label: "Applications", value: "applications", show: true },
      ],
    },
    {
      id: "cms",
      label: "CMS",
      icon: Layers,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
      showSection: canSeeNav("cms"),
      routes: [
        { icon: Building2, label: "Institutions", value: "institutions", show: hasFullAdminAccess || isMarketingExecutive },
        { icon: BookOpen, label: "Courses", value: "courses", show: true },
        { icon: GraduationCap, label: "Qualification Types", value: "qualification-types", show: hasFullAdminAccess && canSeeFeature('qualificationTypes') },
        { icon: FileCheck, label: "Entry Requirement Templates", value: "entry-requirement-templates", show: hasFullAdminAccess && canSeeFeature('entryRequirements') },
        { icon: Newspaper, label: "Blogs", value: "blogs", show: true },
        { icon: FileText, label: "Website Content", value: "website-content", show: true },
        { icon: Search, label: "SEO Management", value: "seo-metadata", show: (hasFullAdminAccess || isMarketingExecutive) && canSeeFeature('seoManagement') },
        { icon: Tag, label: "Tag Manager", value: "tags", show: (hasFullAdminAccess || isMarketingExecutive) && canSeeFeature('tagManager') },
      ],
    },
    {
      id: "management",
      label: "Management",
      icon: Settings,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400",
      showSection: canSeeNav("management"),
      routes: [
        { icon: Users, label: "Users", value: "users", show: hasFullAdminAccess },
        { icon: Shield, label: "Role Management", value: "role-management", show: isCTO },
        { icon: UserCog, label: "Profiles", value: "profile-management", show: isCTO },
        { icon: UsersRound, label: "Team", value: "team", show: hasFullAdminAccess },
        { icon: MapPin, label: "Branches", value: "branches", show: hasFullAdminAccess && canSeeFeature('branches') },
        { icon: Globe, label: "Regions", value: "regions", show: hasFullAdminAccess && canSeeFeature('regions') },
        { icon: Link2, label: "Affiliates", value: "affiliates", show: hasFullAdminAccess },
      ],
    },
    {
      id: "finance",
      label: "Finance",
      icon: DollarSign,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400",
      showSection: canSeeNav("finance"),
      routes: [
        { icon: BarChart3, label: "Dashboard", value: "finance-dashboard", show: hasFullAdminAccess },
        { icon: FileText, label: "Invoices", value: "finance-invoices", show: hasFullAdminAccess },
        { icon: Users, label: "Customers", value: "finance-customers", show: hasFullAdminAccess },
        { icon: Package, label: "Items", value: "finance-items", show: hasFullAdminAccess },
        { icon: BookOpen, label: "Chart of Accounts", value: "finance-accounts", show: hasFullAdminAccess },
        { icon: DollarSign, label: "Accounting", value: "accounting", show: hasFullAdminAccess },
      ],
    },
    {
      id: "people",
      label: "People",
      icon: UsersRound,
      color: "text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400",
      showSection: canSeeNav("people"),
      routes: [
        { icon: UserCheck, label: "Attendance", value: "attendance", show: hasFullAdminAccess },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      icon: Wrench,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
      showSection: canSeeNav("tools"),
      routes: [
        { icon: Upload, label: "Data Import", value: "data-import", show: hasFullAdminAccess && canSeeFeature('dataImport') },
        { icon: Globe, label: "Web Scraping", value: "web-scraping", show: hasFullAdminAccess && canSeeFeature('webScraping') },
        { icon: ImageIcon, label: "Thumbnails", value: "thumbnails", show: hasFullAdminAccess },
        { icon: Activity, label: "Activity Logs", value: "activity-logs", show: hasFullAdminAccess },
        { icon: Bot, label: "AI Settings", value: "ai-settings", show: isCTO && canSeeFeature('aiSettings') },
        { icon: Key, label: "Partner API", value: "api-keys", show: (hasFullAdminAccess || isCTO) && canSeeFeature('partnerApi') },
        { icon: Bell, label: "Notifications", value: "notification-settings", show: hasFullAdminAccess },
      ],
    },
  ];

  const visibleDomains = navConfig.filter(domain => 
    domain.showSection && domain.routes.some(route => route.show)
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
    // Close mobile menu when route is clicked
    if (onMobileMenuToggle && isMobileMenuOpen) {
      onMobileMenuToggle();
    }
  };

  const currentDomain = visibleDomains.find(d => d.id === activeDomain);
  const visibleRoutes = currentDomain?.routes.filter(r => r.show) || [];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileMenuToggle}
        />
      )}

      {/* Sidebar Container - Fixed on mobile, relative on desktop */}
      <div 
        className={cn(
          "flex flex-shrink-0 transition-all duration-200 ease-out h-full",
          // Mobile: fixed position with slide-in/out
          "fixed left-0 top-0 z-40 lg:relative lg:z-auto",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        data-testid="admin-mega-sidebar"
      >
        {/* Icon Rail - Column 1 */}
        <div className="w-16 bg-card border-r border-border flex flex-col h-full">
          {/* Logo - Fixed header height to match main header */}
          <div className="h-14 flex-shrink-0 flex items-center justify-center border-b border-border">
            <Link href="/" data-testid="link-logo-home">
              <img src={logoUrl} alt="ANZ" className="h-8 w-8 object-contain cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
          </div>

          {/* Domain Icons - Scrollable if needed, but typically fits */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center py-2 gap-1">
              {/* Dashboard Button - Always at top */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "w-12 h-12 rounded-xl transition-all",
                      activeTab === "overview" && "text-primary bg-primary/10 ring-2 ring-primary/30"
                    )}
                    onClick={() => {
                      onTabChange("overview");
                      setActiveDomain(null);
                      setIsSubmenuOpen(false);
                    }}
                    data-testid="button-dashboard-overview"
                  >
                    {isBranchManager ? <Building2 className="h-5 w-5" /> : <LayoutDashboard className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {isBranchManager ? "Branch Overview" : "Dashboard"}
                </TooltipContent>
              </Tooltip>

              {/* Separator */}
              <div className="w-8 h-px bg-border my-1" />

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

              {/* Separator before Profile */}
              <div className="w-8 h-px bg-border my-1" />

              {adminRegionCode && !isGlobalScope && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-12 flex items-center justify-center py-1" data-testid="badge-region-scope">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        {adminRegionCode}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    Region: {user?.regionName || adminRegionCode}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Profile Button with Status Dot */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "w-12 h-12 rounded-xl transition-all relative",
                      isOnProfilePage && "text-primary bg-primary/10 ring-2 ring-primary/30"
                    )}
                    data-testid="button-admin-profile"
                    asChild
                  >
                    <Link href="/admin/profile">
                      <UserCircle className="h-5 w-5" />
                      <span
                        className={cn(
                          "absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-background",
                          user?.availabilityStatus === 'away' && 'bg-yellow-500',
                          user?.availabilityStatus === 'busy' && 'bg-red-500',
                          user?.availabilityStatus === 'do_not_disturb' && 'bg-red-600',
                          user?.availabilityStatus === 'invisible' && 'bg-gray-400',
                          (!user?.availabilityStatus || user?.availabilityStatus === 'available') && 'bg-green-500'
                        )}
                        data-testid="status-dot-sidebar"
                      />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  My Profile {user?.customStatusText ? `- ${user.customStatusText}` : ''}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

        </div>

        {/* Submenu Panel - Column 2 */}
        <div 
          className={cn(
            "bg-background border-r border-border transition-all duration-200 ease-out overflow-hidden h-full",
            isSubmenuOpen && activeDomain ? "w-48" : "w-0"
          )}
        >
          <div className="w-48 h-full flex flex-col">
            {/* Domain Header - Fixed height to match main header */}
            {currentDomain && (
              <div className="h-14 flex-shrink-0 px-3 flex items-center justify-between border-b border-border">
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

            {/* Route List - Scrollable */}
            <div className="flex-1 overflow-y-auto">
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
                      {route.value === "email" && (
                        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-4 font-medium no-default-active-elevate shrink-0">Beta</Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
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
