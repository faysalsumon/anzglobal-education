import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import {
  LayoutDashboard,
  Search,
  FileText,
  Building2,
  User,
  LogOut,
  MessageSquare,
  Sparkles,
  FolderOpen,
  BookOpen,
  Users,
  PlusCircle,
  Home,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface UnreadCountResponse {
  count: number;
}

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badge?: number;
}

export function TopNavBar() {
  const { user, isUniversity, isStudent } = useAuth();
  const [location] = useLocation();
  const isAdmin = user?.userType === "admin";

  const { data: unreadData } = useQuery<UnreadCountResponse>({
    queryKey: ["/api/conversations/unread-count"],
    enabled: !!user,
  });
  const unreadCount = unreadData?.count || 0;

  const hasFullAdminAccess = isAdmin && (
    user?.adminRole === "super_admin" ||
    user?.adminRole === "support_manager"
  );

  const universityNavItems: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Institutions", url: "/university/institutions", icon: Building2 },
    { title: "Courses", url: "/university/courses", icon: BookOpen },
    { title: "Applications", url: "/university/applications", icon: FileText },
    { title: "Team", url: "/university/team", icon: Users },
    { title: "Messages", url: "/chat", icon: MessageSquare, badge: unreadCount },
  ];

  const studentNavItems: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Courses", url: "/student/courses", icon: Search },
    { title: "Applications", url: "/student/applications", icon: FileText },
    { title: "Documents", url: "/student/documents", icon: FolderOpen },
    { title: "Messages", url: "/chat", icon: MessageSquare, badge: unreadCount },
    { title: "Profile", url: "/student/profile", icon: User },
  ];

  const adminNavItems: NavItem[] = [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Courses", url: "/courses", icon: Search },
    { title: "Institutions", url: "/institutions", icon: Building2 },
    { title: "Messages", url: "/chat", icon: MessageSquare, badge: unreadCount },
    { title: "Profile", url: "/admin/profile", icon: User },
    ...(hasFullAdminAccess ? [{ title: "Manage", url: "/admin/dashboard#institutions", icon: PlusCircle }] : []),
  ];

  const navItems = isAdmin ? adminNavItems : isUniversity ? universityNavItems : studentNavItems;

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.substring(0, 2).toUpperCase();
  };

  const getUserRoleDisplay = () => {
    if (!user?.userType) return "User";
    
    // For admin users, show their specific admin role
    if (user.userType === "admin") {
      const adminRole = user.adminRole || user.role;
      if (adminRole === "super_admin") return "Super Admin";
      if (adminRole === "support_manager") return "Support Manager";
      if (adminRole === "support_staff") return "Consultant";
      return "Admin";
    }
    
    // For other user types, display normally
    return user.userType.replace('_', ' ');
  };

  return (
    <header className="sticky top-0 z-[9999] border-b border-border/40 bg-background shadow-sm backdrop-blur-sm isolate">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer hover-elevate active-elevate-2 rounded px-2 py-1.5 -mx-2" data-testid="link-logo">
          <img src={logoUrl} alt="ANZ Global Education" className="h-8 w-auto" />
          <span className="hidden lg:inline-block text-xs font-medium text-muted-foreground">
            AI-Powered Platform
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location === item.url || 
                           (item.url !== "/dashboard" && location.startsWith(item.url));
            return (
              <Link key={item.title} href={item.url}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 relative"
                  data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.title}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs" data-testid="badge-unread-messages">
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right side: Notifications + User Menu */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  {user?.profileImageUrl && (
                    <AvatarImage src={user.profileImageUrl} alt={user.email || "User"} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {getUserRoleDisplay()}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isStudent && (
                <DropdownMenuItem asChild>
                  <Link href="/student/profile" data-testid="menu-profile">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
              )}
              {isUniversity && (
                <DropdownMenuItem asChild>
                  <Link href="/university/profile" data-testid="menu-profile">
                    <User className="mr-2 h-4 w-4" />
                    University Profile
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/" data-testid="menu-public-site">
                  <Home className="mr-2 h-4 w-4" />
                  Public Site
                </Link>
              </DropdownMenuItem>
              {(isStudent || isUniversity) && (
                <DropdownMenuItem asChild>
                  <Link href={isStudent ? "/student/ai-assistant" : "/university/ai-assistant"} data-testid="menu-ai-assistant">
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Assistant
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/api/logout" className="text-destructive cursor-pointer" data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
