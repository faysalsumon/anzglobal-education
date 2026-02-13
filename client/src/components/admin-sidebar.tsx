import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  Upload,
  Settings,
  Newspaper,
  Globe,
  Activity,
  ListTodo,
  ClipboardList,
  BarChart3,
  Contact,
  FileText,
  LogOut,
} from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { performLogout } from "@/lib/logout";
import { useSupabaseAuth } from "@/lib/supabase-auth";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasFullAdminAccess: boolean;
  isCTO?: boolean;
}

export function AdminSidebar({ activeTab, onTabChange, hasFullAdminAccess, isCTO = false }: AdminSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { signOut } = useSupabaseAuth();

  const handleLogout = () => {
    performLogout(signOut);
  };
  
  // Core management items (only for full admin access)
  const managementItems = [
    {
      icon: Users,
      label: "Users",
      value: "users",
      show: hasFullAdminAccess,
    },
  ];

  // CRM items (visible to all admins - their work assignments)
  const crmItems = [
    {
      icon: ListTodo,
      label: "My Tasks",
      value: "my-tasks",
      show: true,
    },
    {
      icon: BarChart3,
      label: "Team Workload",
      value: "team-workload",
      show: isCTO, // Only CTO
    },
    {
      icon: Contact,
      label: "Contacts",
      value: "crm-contacts",
      show: true,
    },
    {
      icon: ClipboardList,
      label: "Applications",
      value: "applications",
      show: true,
    },
  ];

  // Content & workflow items (visible to all admins)
  const contentItems = [
    {
      icon: BookOpen,
      label: "Courses",
      value: "courses",
      show: true,
    },
    {
      icon: Building2,
      label: "Institutions",
      value: "institutions",
      show: hasFullAdminAccess,
    },
    {
      icon: Newspaper,
      label: "Blogs",
      value: "blogs",
      show: true,
    },
    {
      icon: FileText,
      label: "Website Content",
      value: "website-content",
      show: true,
    },
  ];

  // Tools items
  const toolsItems = [
    {
      icon: Upload,
      label: "Data Import",
      value: "data-import",
      show: hasFullAdminAccess,
    },
    {
      icon: Globe,
      label: "Web Scraping",
      value: "web-scraping",
      show: hasFullAdminAccess,
    },
    {
      icon: Activity,
      label: "Activity Logs",
      value: "activity-logs",
      show: hasFullAdminAccess,
    },
  ];

  const visibleCRM = crmItems.filter(item => item.show);
  const visibleManagement = managementItems.filter(item => item.show);
  const visibleContent = contentItems.filter(item => item.show);
  const visibleTools = toolsItems.filter(item => item.show);

  const handleItemClick = (value: string) => {
    onTabChange(value);
    // Always close sidebar after selection for better UX
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" data-testid="admin-sidebar">
      <SidebarHeader className="border-b border-border/40 px-2 py-3">
        <div className="flex items-center gap-2 px-1">
          <img src={logoUrl} alt="ANZ Global Education logo" width={80} height={24} className="h-6 w-auto group-data-[collapsible=icon]:hidden" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-semibold">Admin</span>
            <span className="text-[10px] text-muted-foreground">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-1.5 py-3">
        {/* CRM Section - My Work */}
        {visibleCRM.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-1.5 text-[10px] uppercase tracking-wide">My Work</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleCRM.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => handleItemClick(item.value)}
                        isActive={activeTab === item.value}
                        tooltip={item.label}
                        size="default"
                        data-testid={`sidebar-${item.value}`}
                        className="h-9 text-sm"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Management Section - Only for full admin access */}
        {visibleManagement.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-1.5 text-[10px] uppercase tracking-wide">Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleManagement.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => handleItemClick(item.value)}
                        isActive={activeTab === item.value}
                        tooltip={item.label}
                        size="default"
                        data-testid={`sidebar-${item.value}`}
                        className="h-9 text-sm"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Content & Workflows Section */}
        {visibleContent.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-1.5 text-[10px] uppercase tracking-wide">Content</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleContent.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => handleItemClick(item.value)}
                        isActive={activeTab === item.value}
                        tooltip={item.label}
                        size="default"
                        data-testid={`sidebar-${item.value}`}
                        className="h-9 text-sm"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Tools Section */}
        {visibleTools.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-1.5 text-[10px] uppercase tracking-wide">Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleTools.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => handleItemClick(item.value)}
                        isActive={activeTab === item.value}
                        tooltip={item.label}
                        size="default"
                        data-testid={`sidebar-${item.value}`}
                        className="h-9 text-sm"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Logout">
              <Button
                variant="destructive"
                size="default"
                className="h-9 justify-start"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="truncate">Logout</span>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
