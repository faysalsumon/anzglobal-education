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
  StatsWidget,
  StudentApplicationsWidget,
  StudentDocumentsWidget,
  StudentSavedCoursesWidget,
  StudentProgressWidget,
  StudentUpcomingWidget,
} from "@/components/dashboard";
import type { NavItem, ModuleTab } from "@/components/dashboard";
import {
  Home,
  Search,
  ClipboardList,
  FileText,
  Heart,
  User,
  Brain,
  Gift,
  Settings,
  GraduationCap,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import type { StudentProfile, Application } from "@shared/schema";

export default function StudentHomePage() {
  const { user, isLoading, isAuthenticated, isStudent, isAuthResolved } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: profile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
    enabled: isAuthenticated && isStudent,
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/student/applications"],
    enabled: isAuthenticated && isStudent,
  });

  useEffect(() => {
    if (isAuthResolved && !isLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
        return;
      }
      if (!isStudent) {
        setLocation("/");
        return;
      }
    }
  }, [isAuthResolved, isLoading, isAuthenticated, isStudent, setLocation]);

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

  if (!isAuthenticated || !isStudent) {
    return null;
  }

  const userName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : user?.email || "Student";

  const pinnedItems: NavItem[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="h-4 w-4" />,
      onClick: () => setLocation("/student/home"),
    },
    {
      id: "courses",
      label: "Browse Courses",
      icon: <Search className="h-4 w-4" />,
      onClick: () => setLocation("/student/courses"),
    },
  ];

  const navItems: NavItem[] = [
    {
      id: "applications",
      label: "My Applications",
      icon: <ClipboardList className="h-4 w-4" />,
      badge: applications.length,
      onClick: () => setLocation("/student/applications"),
    },
    {
      id: "documents",
      label: "Documents",
      icon: <FileText className="h-4 w-4" />,
      onClick: () => setLocation("/student/documents"),
    },
    {
      id: "saved",
      label: "Saved Courses",
      icon: <Heart className="h-4 w-4" />,
      onClick: () => setLocation("/student/courses"),
    },
    {
      id: "profile",
      label: "My Profile",
      icon: <User className="h-4 w-4" />,
      onClick: () => setLocation("/student/profile"),
    },
    {
      id: "ai-assistant",
      label: "AI Assistant",
      icon: <Brain className="h-4 w-4" />,
      onClick: () => setLocation("/student/ai-assistant"),
    },
    {
      id: "referrals",
      label: "Referrals",
      icon: <Gift className="h-4 w-4" />,
      onClick: () => setLocation("/student/referrals"),
    },
  ];

  const moduleTabs: ModuleTab[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "courses", label: "Courses", onClick: () => setLocation("/student/courses") },
    { id: "help", label: "Help" },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const stats = [
    {
      label: "Applications",
      value: applications.length,
      icon: <ClipboardList className="h-5 w-5 text-blue-600" />,
      color: "primary" as const,
    },
    {
      label: "Pending",
      value: applications.filter((a) => a.status === "pending").length,
      icon: <GraduationCap className="h-5 w-5 text-yellow-600" />,
      color: "warning" as const,
    },
    {
      label: "Accepted",
      value: applications.filter((a) => a.status === "accepted").length,
      icon: <BookOpen className="h-5 w-5 text-green-600" />,
      color: "success" as const,
    },
    {
      label: "Documents",
      value: 0,
      icon: <FileText className="h-5 w-5 text-purple-600" />,
    },
  ];

  return (
    <DashboardShell
      user={{
        name: userName,
        email: user?.email || "",
        role: "Student",
      }}
      navItems={navItems}
      pinnedItems={pinnedItems}
      moduleTabs={moduleTabs}
      activeModuleTab={activeTab}
      onModuleTabChange={setActiveTab}
      showSearch={true}
      onSearch={(query) => setLocation(`/student/courses?q=${encodeURIComponent(query)}`)}
      onLogout={handleLogout}
      onProfileClick={() => setLocation("/student/profile")}
      onSettingsClick={() => setLocation("/student/profile")}
    >
      <div className="space-y-6">
        <DashboardWelcome
          title={`${getGreeting()}, ${profile?.firstName || "Student"}!`}
          subtitle="Your AI-powered journey to the perfect course starts here."
          logo={logoUrl}
        />

        <StatsWidget stats={stats} columns={4} />

        <WidgetRow>
          <StudentApplicationsWidget
            onViewAll={() => setLocation("/student/applications")}
          />
          <StudentProgressWidget />
        </WidgetRow>

        <WidgetRow>
          <StudentDocumentsWidget
            onViewAll={() => setLocation("/student/documents")}
          />
          <StudentSavedCoursesWidget
            onViewAll={() => setLocation("/student/courses")}
          />
        </WidgetRow>

        <WidgetRow>
          <StudentUpcomingWidget />
        </WidgetRow>
      </div>
    </DashboardShell>
  );
}
