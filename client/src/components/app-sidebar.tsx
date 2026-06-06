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
import { Building2, LayoutDashboard, GraduationCap, FileText, User, LogOut, Sparkles, Search, BookOpen, Users, MessageSquare, PlusCircle, FolderOpen, Camera, Home as HomeIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { type StudentProfile } from "@shared/schema";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { ProfilePictureDialog } from "@/components/profile-picture-dialog";
import { performLogout } from "@/lib/logout";
import { useSupabaseAuth } from "@/lib/supabase-auth";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isStudent, isAdmin, isCTO, hasFullAdminAccess, adminRole } = useAuth();
  const { signOut } = useSupabaseAuth();
  const [profilePictureDialogOpen, setProfilePictureDialogOpen] = useState(false);

  // Helper to get portal label based on user type and role
  const getPortalLabel = () => {
    if (isAdmin) {
      if (isCTO) return "CTO Portal";
      if (adminRole === "branch_manager") return "Branch Manager Portal";
      if (adminRole === "support_staff") return "Support Staff Portal";
      if (adminRole === "operations_staff") return "Operations Staff Portal";
      if (adminRole === "accounts_officer") return "Accounts Officer Portal";
      return "Admin Portal";
    }
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

  const studentItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Browse Courses", url: "/student/courses", icon: Search },
    { title: "My Applications", url: "/student/applications", icon: FileText },
    { title: "My Documents", url: "/student/documents", icon: FolderOpen },
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

  const items = isAdmin ? adminItems : studentItems;

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer hover-elevate active-elevate-2 rounded px-2 py-1 -mx-2 -my-1" data-testid="link-logo">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0" data-testid="button-profile-menu">
                <Avatar className="h-9 w-9">
                  <AvatarImage 
                    src={
                      isStudent 
                        ? (studentProfile?.profileImageUrl || undefined) 
                        : isAdmin 
                        ? (user?.profileImageUrl || undefined)
                        : undefined
                    } 
                    alt={user?.firstName || "User"} 
                  />
                  <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => setProfilePictureDialogOpen(true)} data-testid="menu-change-profile-picture">
                  <Camera className="h-4 w-4 mr-2" />
                  Change Profile Picture
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => performLogout(signOut)} 
                className="cursor-pointer" 
                data-testid="menu-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </SidebarFooter>

      {isAdmin && (
        <ProfilePictureDialog 
          open={profilePictureDialogOpen}
          onOpenChange={setProfilePictureDialogOpen}
        />
      )}
    </Sidebar>
  );
}
