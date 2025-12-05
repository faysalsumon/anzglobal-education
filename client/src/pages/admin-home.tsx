import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import {
  DashboardShell,
  DashboardWelcome,
  WidgetGrid,
  WidgetRow,
  MyTasksWidget,
  TeamTasksWidget,
  ApplicationsWidget,
  LeadsWidget,
  MeetingsWidget,
  InboxWidget,
  StatsWidget,
} from "@/components/dashboard";
import type { NavItem, ModuleTab } from "@/components/dashboard";
import {
  Home,
  LayoutDashboard,
  UserPlus,
  Contact,
  ClipboardList,
  Users,
  Building2,
  BookOpen,
  Newspaper,
  FileText,
  Upload,
  Globe,
  Activity,
  ListTodo,
  BarChart3,
  Settings,
  HelpCircle,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

export default function AdminHomePage() {
  const { user, hasFullAdminAccess, isAdmin, isLoading, isAuthenticated, isAuthResolved } = useAuth();
  const [, setLocation] = useLocation();
  const [activeModule, setActiveModule] = useState("home");
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: statsData } = useQuery<{
    institutionCount: number;
    courseCount: number;
    userCount?: number;
    applicationCount?: number;
  }>({
    queryKey: ["/api/platform/stats"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: usersData } = useQuery<any[]>({
    queryKey: ["/api/super-admin/users"],
    enabled: isAuthenticated && isAdmin && hasFullAdminAccess,
  });

  const { data: applicationsData } = useQuery<{ applications: any[] }>({
    queryKey: ["/api/admin/applications"],
    enabled: isAuthenticated && isAdmin,
  });

  useEffect(() => {
    if (isAuthResolved && !isLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
        return;
      }
      if (!isAdmin) {
        setLocation("/");
        return;
      }
    }
  }, [isAuthResolved, isLoading, isAuthenticated, isAdmin, setLocation]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      queryClient.clear();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
      setLocation("/");
    }
  };

  if (isLoading || !isAuthResolved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "Admin User";

  const pinnedItems: NavItem[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="h-4 w-4" />,
      onClick: () => setActiveModule("home"),
    },
  ];

  const navItems: NavItem[] = [
    {
      id: "my-work",
      label: "My Work",
      icon: <ListTodo className="h-4 w-4" />,
      children: [
        {
          id: "my-tasks",
          label: "My Tasks",
          icon: <ListTodo className="h-4 w-4" />,
          onClick: () => {
            setActiveModule("my-tasks");
            setLocation("/admin?tab=my-tasks");
          },
        },
        {
          id: "my-reminders",
          label: "Reminders",
          icon: <Activity className="h-4 w-4" />,
          onClick: () => setActiveModule("reminders"),
        },
      ],
    },
    {
      id: "crm",
      label: "CRM",
      icon: <UserPlus className="h-4 w-4" />,
      children: [
        {
          id: "leads",
          label: "Leads",
          icon: <UserPlus className="h-4 w-4" />,
          onClick: () => {
            setActiveModule("leads");
            setLocation("/admin?tab=crm-leads");
          },
        },
        {
          id: "contacts",
          label: "Contacts",
          icon: <Contact className="h-4 w-4" />,
          onClick: () => {
            setActiveModule("contacts");
            setLocation("/admin?tab=crm-contacts");
          },
        },
        {
          id: "applications",
          label: "Applications",
          icon: <ClipboardList className="h-4 w-4" />,
          onClick: () => {
            setActiveModule("applications");
            setLocation("/admin?tab=applications");
          },
        },
      ],
    },
    ...(hasFullAdminAccess
      ? [
          {
            id: "management",
            label: "Management",
            icon: <Users className="h-4 w-4" />,
            children: [
              {
                id: "users",
                label: "Users",
                icon: <Users className="h-4 w-4" />,
                onClick: () => {
                  setActiveModule("users");
                  setLocation("/admin?tab=users");
                },
              },
              {
                id: "institutions",
                label: "Institutions",
                icon: <Building2 className="h-4 w-4" />,
                onClick: () => {
                  setActiveModule("institutions");
                  setLocation("/admin?tab=institutions");
                },
              },
              {
                id: "team-workload",
                label: "Team Workload",
                icon: <BarChart3 className="h-4 w-4" />,
                onClick: () => {
                  setActiveModule("team-workload");
                  setLocation("/admin?tab=team-workload");
                },
              },
            ],
          },
        ]
      : []),
    {
      id: "content",
      label: "Content",
      icon: <BookOpen className="h-4 w-4" />,
      children: [
        {
          id: "courses",
          label: "Courses",
          icon: <GraduationCap className="h-4 w-4" />,
          onClick: () => {
            setActiveModule("courses");
            setLocation("/admin?tab=courses");
          },
        },
        {
          id: "blogs",
          label: "Blogs",
          icon: <Newspaper className="h-4 w-4" />,
          onClick: () => {
            setActiveModule("blogs");
            setLocation("/admin?tab=blogs");
          },
        },
        {
          id: "website-content",
          label: "Website Content",
          icon: <FileText className="h-4 w-4" />,
          onClick: () => {
            setActiveModule("website-content");
            setLocation("/admin?tab=website-content");
          },
        },
      ],
    },
    ...(hasFullAdminAccess
      ? [
          {
            id: "tools",
            label: "Tools",
            icon: <Settings className="h-4 w-4" />,
            children: [
              {
                id: "data-import",
                label: "Data Import",
                icon: <Upload className="h-4 w-4" />,
                onClick: () => {
                  setActiveModule("data-import");
                  setLocation("/admin?tab=data-import");
                },
              },
              {
                id: "web-scraping",
                label: "Web Scraping",
                icon: <Globe className="h-4 w-4" />,
                onClick: () => {
                  setActiveModule("web-scraping");
                  setLocation("/admin?tab=web-scraping");
                },
              },
              {
                id: "activity-logs",
                label: "Activity Logs",
                icon: <Activity className="h-4 w-4" />,
                onClick: () => {
                  setActiveModule("activity-logs");
                  setLocation("/admin?tab=activity-logs");
                },
              },
            ],
          },
        ]
      : []),
  ];

  const moduleTabs: ModuleTab[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "my-requests", label: "My Requests" },
    { id: "help", label: "Help" },
  ];

  const stats = [
    {
      label: "Institutions",
      value: statsData?.institutionCount || 0,
      icon: <Building2 className="h-5 w-5 text-blue-600" />,
      color: "primary" as const,
    },
    {
      label: "Courses",
      value: statsData?.courseCount || 0,
      icon: <GraduationCap className="h-5 w-5 text-green-600" />,
      color: "success" as const,
    },
    {
      label: "Users",
      value: usersData?.length || 0,
      icon: <Users className="h-5 w-5 text-purple-600" />,
    },
    {
      label: "Applications",
      value: applicationsData?.applications?.length || 0,
      icon: <ClipboardList className="h-5 w-5 text-orange-600" />,
      color: "warning" as const,
    },
  ];

  return (
    <DashboardShell
      user={{
        name: userName,
        email: user?.email || "",
        role: user?.role || undefined,
      }}
      navItems={navItems}
      pinnedItems={pinnedItems}
      moduleTabs={moduleTabs}
      activeModuleTab={activeTab}
      onModuleTabChange={setActiveTab}
      showSearch={true}
      onLogout={handleLogout}
      onProfileClick={() => setLocation("/admin/profile")}
      onSettingsClick={() => setLocation("/admin?tab=settings")}
    >
      <div className="space-y-6">
        <DashboardWelcome
          title={`Welcome ${user?.firstName || "Admin"}`}
          subtitle="Here's what's happening with your platform today."
          logo={logoUrl}
        />

        <StatsWidget stats={stats} columns={4} />

        <WidgetRow>
          <MyTasksWidget
            onViewAll={() => setLocation("/admin?tab=my-tasks")}
            onCreateTask={() => {}}
          />
          <TeamTasksWidget
            onViewAll={() => setLocation("/admin?tab=team-workload")}
          />
        </WidgetRow>

        <WidgetRow>
          <ApplicationsWidget
            title="Open Applications"
            onViewAll={() => setLocation("/admin?tab=applications")}
          />
          <LeadsWidget
            title="All Leads (CRM)"
            onViewAll={() => setLocation("/admin?tab=crm-leads")}
          />
        </WidgetRow>

        <WidgetRow>
          <MeetingsWidget
            meetings={[]}
            onViewAll={() => {}}
          />
          <InboxWidget
            messages={[]}
            onViewAll={() => {}}
          />
        </WidgetRow>
      </div>
    </DashboardShell>
  );
}
