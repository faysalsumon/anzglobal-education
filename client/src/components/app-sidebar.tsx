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
import { Building2, LayoutDashboard, GraduationCap, FileText, User, LogOut, Sparkles, Search, BookOpen, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isUniversity, isStudent } = useAuth();

  const universityItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My University", url: "/university/profile", icon: Building2 },
    { title: "Courses", url: "/university/courses", icon: BookOpen },
    { title: "Applications", url: "/university/applications", icon: FileText },
    { title: "Team Management", url: "/university/team", icon: Users },
    { title: "AI Assistant", url: "/university/ai-assistant", icon: Sparkles },
  ];

  const studentItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Browse Courses", url: "/student/courses", icon: Search },
    { title: "My Applications", url: "/student/applications", icon: FileText },
    { title: "My Profile", url: "/student/profile", icon: User },
    { title: "AI Assistant", url: "/student/ai-assistant", icon: Sparkles },
  ];

  const items = isUniversity ? universityItems : studentItems;

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="ANZ Global Education" className="h-8 w-auto" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isUniversity ? "University Portal" : "Student Portal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
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
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
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
