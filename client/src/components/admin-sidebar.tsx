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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  FileText,
  Upload,
  Settings,
  Newspaper,
} from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasFullAdminAccess: boolean;
}

export function AdminSidebar({ activeTab, onTabChange, hasFullAdminAccess }: AdminSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  
  // Core management items (only for full admin access)
  const managementItems = [
    {
      icon: Users,
      label: "Users",
      value: "users",
      show: hasFullAdminAccess,
    },
    {
      icon: Building2,
      label: "Institutions",
      value: "institutions",
      show: hasFullAdminAccess,
    },
  ];

  // Content & leads items (visible to all admins)
  const contentItems = [
    {
      icon: BookOpen,
      label: "Courses",
      value: "courses",
      show: true,
    },
    {
      icon: GraduationCap,
      label: "Student Leads",
      value: "student-leads",
      show: true,
    },
    {
      icon: FileText,
      label: "Inquiry Leads",
      value: "inquiry-leads",
      show: true,
    },
    {
      icon: FileText,
      label: "Applications",
      value: "applications",
      show: true,
    },
    {
      icon: Newspaper,
      label: "Blogs",
      value: "blogs",
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
  ];

  const visibleManagement = managementItems.filter(item => item.show);
  const visibleContent = contentItems.filter(item => item.show);
  const visibleTools = toolsItems.filter(item => item.show);

  const handleItemClick = (value: string) => {
    onTabChange(value);
    // Close sidebar drawer on mobile after selection
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" data-testid="admin-sidebar">
      <SidebarHeader className="border-b border-border/40 px-3 py-4">
        <div className="flex items-center gap-2 px-1">
          <img src={logoUrl} alt="ANZ Global" className="h-7 w-auto group-data-[collapsible=icon]:hidden" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-semibold">Admin Panel</span>
            <span className="text-[10px] text-muted-foreground">Management Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        {/* Management Section - Only for full admin access */}
        {visibleManagement.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs">Management</SidebarGroupLabel>
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
                        data-testid={`sidebar-${item.value}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Content & Leads Section */}
        {visibleContent.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs">Content & Leads</SidebarGroupLabel>
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
                        data-testid={`sidebar-${item.value}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
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
            <SidebarGroupLabel className="px-2 text-xs">Tools</SidebarGroupLabel>
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
                        data-testid={`sidebar-${item.value}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
