import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasFullAdminAccess: boolean;
}

export function AdminSidebar({ activeTab, onTabChange, hasFullAdminAccess }: AdminSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const menuItems = [
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
      icon: Upload,
      label: "Data Import",
      value: "data-import",
      show: hasFullAdminAccess,
    },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <Sidebar collapsible="icon" data-testid="admin-sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      onClick={() => {
                        onTabChange(item.value);
                        // Close sidebar drawer on mobile after selection
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
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
      </SidebarContent>
    </Sidebar>
  );
}
