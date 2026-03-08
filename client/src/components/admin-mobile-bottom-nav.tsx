import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isAdminFeatureVisible } from "@/lib/region-config";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  MessageCircle,
  Contact,
  ClipboardList,
  MoreHorizontal,
  Building2,
  BookOpen,
  GraduationCap,
  FileCheck,
  Newspaper,
  FileText,
  Search,
  Tag,
  Users,
  Shield,
  UserCog,
  UsersRound,
  MapPin,
  Globe,
  Link2,
  Upload,
  Activity,
  Bot,
  Key,
  Bell,
  ListTodo,
  BarChart3,
  LogOut,
  User,
  Briefcase,
  Layers,
  Settings,
  Wrench,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AdminMobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasFullAdminAccess: boolean;
  isCTO?: boolean;
  isMarketingExecutive?: boolean;
  onLogout: () => void;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  value: string;
  show: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  items: NavItem[];
}

const PRIMARY_TABS = ["overview", "messages", "crm-contacts", "applications"];

export function AdminMobileBottomNav({
  activeTab,
  onTabChange,
  hasFullAdminAccess,
  isCTO = false,
  isMarketingExecutive = false,
  onLogout,
}: AdminMobileBottomNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { user } = useAuth();

  const adminRegionCode = user?.regionCode || null;
  const isGlobalScope = user?.defaultScope === "global" || !adminRegionCode;
  const canSeeFeature = (feature: Parameters<typeof isAdminFeatureVisible>[0]) =>
    isAdminFeatureVisible(feature, adminRegionCode, isGlobalScope);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/conversations/unread-count"],
    enabled: !!user,
  });
  const unreadCount = unreadData?.count || 0;

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "A";
  };

  const getAvailabilityColor = () => {
    switch (user?.availabilityStatus) {
      case "away": return "bg-yellow-500";
      case "busy":
      case "do_not_disturb": return "bg-red-500";
      case "invisible": return "bg-gray-400";
      default: return "bg-green-500";
    }
  };

  const getAvailabilityLabel = () => {
    switch (user?.availabilityStatus) {
      case "away": return "Away";
      case "busy": return "Busy";
      case "do_not_disturb": return "Do Not Disturb";
      case "invisible": return "Invisible";
      default: return "Available";
    }
  };

  const getRoleLabel = () => {
    if (!user?.adminRole) return "Admin";
    const roleMap: Record<string, string> = {
      cto: "CTO",
      support_manager: "Support Manager",
      branch_manager: "Branch Manager",
      asst_branch_manager: "Asst. Branch Manager",
      senior_consultant: "Senior Consultant",
      junior_consultant: "Consultant",
      receptionist: "Receptionist",
      marketing_executive: "Marketing Executive",
    };
    return roleMap[user.adminRole] || user.adminRole;
  };

  const secondarySections: NavSection[] = [
    {
      id: "crm-more",
      label: "CRM",
      icon: Briefcase,
      colorClass: "text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400",
      items: [
        { icon: ListTodo, label: "My Tasks", value: "my-tasks", show: true },
        { icon: BarChart3, label: "Team Workload", value: "team-workload", show: isCTO },
      ],
    },
    {
      id: "cms",
      label: "CMS",
      icon: Layers,
      colorClass: "text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400",
      items: [
        { icon: Building2, label: "Institutions", value: "institutions", show: hasFullAdminAccess || isMarketingExecutive },
        { icon: BookOpen, label: "Courses", value: "courses", show: true },
        { icon: GraduationCap, label: "Qualification Types", value: "qualification-types", show: hasFullAdminAccess && canSeeFeature("qualificationTypes") },
        { icon: FileCheck, label: "Entry Requirements", value: "entry-requirement-templates", show: hasFullAdminAccess && canSeeFeature("entryRequirements") },
        { icon: Newspaper, label: "Blogs", value: "blogs", show: true },
        { icon: FileText, label: "Website Content", value: "website-content", show: true },
        { icon: Search, label: "SEO Management", value: "seo-metadata", show: (hasFullAdminAccess || isMarketingExecutive) && canSeeFeature("seoManagement") },
        { icon: Tag, label: "Tag Manager", value: "tags", show: (hasFullAdminAccess || isMarketingExecutive) && canSeeFeature("tagManager") },
      ],
    },
    {
      id: "management",
      label: "Management",
      icon: Settings,
      colorClass: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400",
      items: [
        { icon: Users, label: "Users", value: "users", show: hasFullAdminAccess },
        { icon: Shield, label: "Role Management", value: "role-management", show: isCTO },
        { icon: UserCog, label: "Permission Profiles", value: "profile-management", show: isCTO },
        { icon: UsersRound, label: "Team", value: "team", show: hasFullAdminAccess },
        { icon: MapPin, label: "Branches", value: "branches", show: hasFullAdminAccess && canSeeFeature("branches") },
        { icon: Globe, label: "Regions", value: "regions", show: hasFullAdminAccess && canSeeFeature("regions") },
        { icon: Link2, label: "Affiliates", value: "affiliates", show: hasFullAdminAccess },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      icon: Wrench,
      colorClass: "text-orange-600 bg-orange-50 dark:bg-orange-950/60 dark:text-orange-400",
      items: [
        { icon: Upload, label: "Data Import", value: "data-import", show: hasFullAdminAccess && canSeeFeature("dataImport") },
        { icon: Globe, label: "Web Scraping", value: "web-scraping", show: hasFullAdminAccess && canSeeFeature("webScraping") },
        { icon: Activity, label: "Activity Logs", value: "activity-logs", show: hasFullAdminAccess },
        { icon: Bot, label: "AI Settings", value: "ai-settings", show: isCTO && canSeeFeature("aiSettings") },
        { icon: Key, label: "Partner API", value: "api-keys", show: (hasFullAdminAccess || isCTO) && canSeeFeature("partnerApi") },
        { icon: Bell, label: "Notifications", value: "notification-settings", show: hasFullAdminAccess },
      ],
    },
  ];

  const handleNavItem = (value: string) => {
    onTabChange(value);
    setIsMoreOpen(false);
  };

  const isMoreActive = !PRIMARY_TABS.includes(activeTab) && activeTab !== "overview";

  const primaryTabs = [
    {
      value: "overview",
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: 0,
      testId: "mobile-tab-dashboard",
    },
    {
      value: "messages",
      label: "Chat",
      icon: MessageCircle,
      badge: unreadCount,
      testId: "mobile-tab-chat",
    },
    {
      value: "crm-contacts",
      label: "Leads",
      icon: Contact,
      badge: 0,
      testId: "mobile-tab-leads",
    },
    {
      value: "applications",
      label: "Applications",
      icon: ClipboardList,
      badge: 0,
      testId: "mobile-tab-applications",
    },
  ];

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-background border-t"
        aria-label="Admin mobile navigation"
      >
        <div className="flex items-stretch h-16" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {/* Primary 4 tabs */}
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.value;
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                data-testid={tab.testId}
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors cursor-pointer min-h-[44px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Top active indicator */}
                <span
                  className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-b-full transition-all duration-200",
                    isActive ? "w-8 bg-primary" : "w-0 bg-transparent"
                  )}
                />
                {/* Icon with badge */}
                <span className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-150",
                      isActive ? "stroke-[2.25px]" : "stroke-[1.75px]"
                    )}
                  />
                  {tab.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2.5 h-4 min-w-4 px-1 text-[10px] rounded-full leading-none flex items-center justify-center"
                      data-testid="badge-mobile-chat-unread"
                    >
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </Badge>
                  )}
                </span>
                <span className={cn("text-[10px] font-medium leading-none", isActive && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More tab */}
          <button
            type="button"
            data-testid="mobile-tab-more"
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors cursor-pointer min-h-[44px]",
              isMoreActive ? "text-primary" : "text-muted-foreground"
            )}
            aria-label="More navigation options"
          >
            <span
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-b-full transition-all duration-200",
                isMoreActive ? "w-8 bg-primary" : "w-0 bg-transparent"
              )}
            />
            <MoreHorizontal
              className={cn(
                "h-5 w-5 transition-all duration-150",
                isMoreActive ? "stroke-[2.25px]" : "stroke-[1.75px]"
              )}
            />
            <span className={cn("text-[10px] font-medium leading-none", isMoreActive && "font-semibold")}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More Sheet */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent
          side="bottom"
          className="h-[85dvh] rounded-t-2xl px-0 pb-0 flex flex-col"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

          <SheetHeader className="px-4 pb-3 flex-shrink-0">
            {/* User profile card */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="relative flex-shrink-0">
                <Avatar className="h-11 w-11">
                  {user?.profileImageUrl && (
                    <AvatarImage src={user.profileImageUrl} alt={user.email || "Admin"} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                    getAvailabilityColor()
                  )}
                  title={getAvailabilityLabel()}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "Admin"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{getRoleLabel()}</p>
                <p className="text-xs text-muted-foreground/70 truncate">{user?.email}</p>
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable nav sections */}
          <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
            {secondarySections.map((section) => {
              const visibleItems = section.items.filter((item) => item.show);
              if (visibleItems.length === 0) return null;
              const SectionIcon = section.icon;
              return (
                <div key={section.id}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn("p-1 rounded-md", section.colorClass)}>
                      <SectionIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.label}
                    </span>
                  </div>
                  {/* Items grid — 2 columns */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {visibleItems.map((item) => {
                      const isActive = activeTab === item.value;
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          data-testid={`mobile-more-${item.value}`}
                          onClick={() => handleNavItem(item.value)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-muted/50 text-foreground hover-elevate"
                          )}
                        >
                          <ItemIcon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn("text-xs font-medium leading-tight", isActive && "font-semibold")}>
                            {item.label}
                          </span>
                          {isActive && <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div
            className="flex-shrink-0 border-t px-4 py-3 flex items-center gap-2"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            <Link href="/admin/profile" onClick={() => setIsMoreOpen(false)} className="flex-1">
              <Button
                variant="outline"
                className="w-full gap-2"
                data-testid="mobile-more-profile"
              >
                <User className="h-4 w-4" />
                My Profile
              </Button>
            </Link>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={() => {
                setIsMoreOpen(false);
                onLogout();
              }}
              data-testid="mobile-more-logout"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
