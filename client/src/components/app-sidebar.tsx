import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Building2, LayoutDashboard, GraduationCap, FileText, User, LogOut, Sparkles, Search, BookOpen, Users, MessageSquare, PlusCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { type StudentProfile } from "@shared/schema";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isUniversity, isStudent } = useAuth();
  const isAdmin = user?.userType === "admin";
  const hasFullAdminAccess = isAdmin && (user?.role === "super_admin" || user?.role === "support_manager");

  // Helper to get portal label based on user type and role
  const getPortalLabel = () => {
    if (isAdmin) {
      if (user?.role === "super_admin") return "Super Admin Portal";
      if (user?.role === "support_manager") return "Support Manager Portal";
      if (user?.role === "support_staff") return "Support Staff Portal";
      if (user?.role === "operations_staff") return "Operations Staff Portal";
      return "Admin Portal";
    }
    if (isUniversity) return "Institution Portal";
    return "Student Portal";
  };

  // Fetch student profile for profile photo
  const { data: studentProfile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
    enabled: isStudent,
    retry: false,
  });

  // Fetch unread message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/conversations/unread-count"],
    enabled: !!user && !isAdmin,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  const universityItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Institutions", url: "/university/institutions", icon: Building2 },
    { title: "Courses", url: "/university/courses", icon: BookOpen },
    { title: "Applications", url: "/university/applications", icon: FileText },
    { title: "Team Management", url: "/university/team", icon: Users },
    { title: "Messages", url: "/chat", icon: MessageSquare },
    { title: "AI Assistant", url: "/university/ai-assistant", icon: Sparkles },
  ];

  const studentItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Browse Courses", url: "/student/courses", icon: Search },
    { title: "My Applications", url: "/student/applications", icon: FileText },
    { title: "My Profile", url: "/student/profile", icon: User },
    { title: "Messages", url: "/chat", icon: MessageSquare },
    { title: "AI Assistant", url: "/student/ai-assistant", icon: Sparkles },
  ];

  const baseAdminItems = [
    { title: "Admin Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Browse Courses", url: "/courses", icon: Search },
    { title: "Browse Institutions", url: "/institutions", icon: Building2 },
  ];

  // Add institution management for full admins only
  const adminItems = hasFullAdminAccess 
    ? [
        ...baseAdminItems,
        { title: "Manage Institutions", url: "/admin/dashboard#institutions", icon: PlusCircle },
      ]
    : baseAdminItems;

  const items = isAdmin ? adminItems : (isUniversity ? universityItems : studentItems);

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Link href="/" className="flex items-center gap-3 cursor-pointer hover-elevate active-elevate-2 rounded px-2 py-1 -mx-2 -my-1" data-testid="link-logo">
          <img src={logoUrl} alt="ANZ Global Education" className="h-8 w-auto" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {getPortalLabel()}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.title === "Messages" && unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs" data-testid="badge-unread-messages">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={isStudent ? (studentProfile?.profileImageUrl || undefined) : undefined} 
              alt={user?.firstName || "User"} 
            />
            <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full gap-2" asChild data-testid="button-logout">
          <a href="/api/logout">
            <LogOut className="h-4 w-4" />
            Logout
          </a>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
