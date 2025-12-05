import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import {
  DashboardShell,
  DashboardWelcome,
  WidgetRow,
  UniversityApplicationsWidget,
  UniversityCoursesWidget,
  UniversityTeamWidget,
  UniversityPendingActionsWidget,
  UniversityQuickStatsWidget,
} from "@/components/dashboard";
import type { NavItem, ModuleTab } from "@/components/dashboard";
import {
  Home,
  GraduationCap,
  ClipboardList,
  Users,
  Brain,
  Settings,
  Building,
  BarChart3,
  FileText,
} from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

export default function UniversityHomePage() {
  const { user, isLoading, isAuthenticated, isUniversity, isAuthResolved } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: university } = useQuery<any>({
    queryKey: ["/api/university/profile"],
    enabled: isAuthenticated && isUniversity,
  });

  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["/api/university/applications"],
    enabled: isAuthenticated && isUniversity,
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["/api/university/courses"],
    enabled: isAuthenticated && isUniversity,
  });

  useEffect(() => {
    if (isAuthResolved && !isLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
        return;
      }
      if (!isUniversity) {
        setLocation("/");
        return;
      }
    }
  }, [isAuthResolved, isLoading, isAuthenticated, isUniversity, setLocation]);

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

  if (!isAuthenticated || !isUniversity) {
    return null;
  }

  const userName = university?.name || user?.email || "Institution";

  const pinnedItems: NavItem[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="h-4 w-4" />,
      onClick: () => setLocation("/university/home"),
    },
    {
      id: "applications",
      label: "Applications",
      icon: <ClipboardList className="h-4 w-4" />,
      badge: applications.length,
      onClick: () => setLocation("/university/applications"),
    },
  ];

  const navItems: NavItem[] = [
    {
      id: "courses",
      label: "Courses",
      icon: <GraduationCap className="h-4 w-4" />,
      badge: courses.length,
      onClick: () => setLocation("/university/courses"),
    },
    {
      id: "team",
      label: "Team",
      icon: <Users className="h-4 w-4" />,
      onClick: () => setLocation("/university/team"),
    },
    {
      id: "ai-assistant",
      label: "AI Assistant",
      icon: <Brain className="h-4 w-4" />,
      onClick: () => setLocation("/university/ai-assistant"),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: () => setLocation("/university/analytics"),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      onClick: () => setLocation("/university/settings"),
    },
  ];

  const moduleTabs: ModuleTab[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "courses", label: "Courses", onClick: () => setLocation("/university/courses") },
    { id: "applications", label: "Applications", onClick: () => setLocation("/university/applications") },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <DashboardShell
      user={{
        name: userName,
        email: user?.email || "",
        role: "Institution",
      }}
      navItems={navItems}
      pinnedItems={pinnedItems}
      moduleTabs={moduleTabs}
      activeModuleTab={activeTab}
      onModuleTabChange={setActiveTab}
      showSearch={true}
      onSearch={(query) => console.log("Search:", query)}
      onLogout={handleLogout}
      onProfileClick={() => setLocation("/university/profile")}
      onSettingsClick={() => setLocation("/university/settings")}
    >
      <div className="space-y-6">
        <DashboardWelcome
          title={`${getGreeting()}, ${university?.name || "Welcome"}!`}
          subtitle="Manage your courses and student applications from one place."
          logo={logoUrl}
        />

        <UniversityQuickStatsWidget />

        <WidgetRow>
          <UniversityApplicationsWidget
            onViewAll={() => setLocation("/university/applications")}
          />
          <UniversityPendingActionsWidget />
        </WidgetRow>

        <WidgetRow>
          <UniversityCoursesWidget
            onViewAll={() => setLocation("/university/courses")}
          />
          <UniversityTeamWidget
            onViewAll={() => setLocation("/university/team")}
          />
        </WidgetRow>
      </div>
    </DashboardShell>
  );
}
