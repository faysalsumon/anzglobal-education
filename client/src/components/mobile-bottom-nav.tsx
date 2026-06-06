import React from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Search,
  FileText,
  MessageSquare,
  User,
  Building2,
  BookOpen,
  Users,
  FolderOpen,
  PlusCircle,
} from "lucide-react";

interface UnreadCountResponse {
  count: number;
}

export function MobileBottomNav() {
  const { user, isStudent } = useAuth();
  const [location] = useLocation();
  const isAdmin = user?.userType === "admin";

  const { data: unreadData } = useQuery<UnreadCountResponse>({
    queryKey: ["/api/conversations/unread-count"],
    enabled: !!user,
  });
  const unreadCount = unreadData?.count || 0;

  const hasFullAdminAccess = isAdmin && (
    user?.adminRole === "cto" ||
    user?.adminRole === "branch_manager"
  );

  const studentNavItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Courses", url: "/student/courses", icon: Search },
    { title: "Applications", url: "/student/applications", icon: FileText },
    { title: "Documents", url: "/student/documents", icon: FolderOpen },
    { title: "Messages", url: "/chat", icon: MessageSquare, badge: unreadCount },
    { title: "Profile", url: "/student/profile", icon: User },
  ];

  const adminNavItems: Array<{ title: string; url: string; icon: React.ElementType; badge?: number; action?: () => void }> = [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Courses", url: "/courses", icon: Search },
    { title: "Institutions", url: "/institutions", icon: Building2 },
    { title: "Chat", url: "#", icon: MessageSquare, badge: unreadCount, action: () => window.dispatchEvent(new CustomEvent("open-admin-chat")) },
    { title: "Profile", url: "/admin/profile", icon: User },
    ...(hasFullAdminAccess ? [{ title: "Manage", url: "/admin/dashboard#institutions", icon: PlusCircle }] : []),
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-background border-t shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = !(item as any).action && (location === item.url || 
                         (item.url !== "/dashboard" && location.startsWith(item.url)));
          const innerContent = (
            <button
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`mobile-nav-${item.title.toLowerCase()}`}
              onClick={(item as any).action}
            >
              <div className="relative">
                <item.icon className={`h-5 w-5 ${isActive ? "fill-primary/10" : ""}`} />
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] rounded-full"
                    data-testid="badge-mobile-unread"
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
                {item.title}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-b-full" />
              )}
            </button>
          );
          return (item as any).action ? (
            <div key={item.title} className="flex-1">
              {innerContent}
            </div>
          ) : (
            <Link key={item.title} href={item.url} className="flex-1">
              {innerContent}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
