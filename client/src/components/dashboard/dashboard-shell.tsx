import { useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  Menu,
  Home,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Plus,
  HelpCircle,
} from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { Link, useLocation } from "wouter";

interface DashboardShellContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  activeModule: string;
  setActiveModule: (module: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

export function useDashboardShell() {
  const context = useContext(DashboardShellContext);
  if (!context) {
    throw new Error("useDashboardShell must be used within a DashboardShell");
  }
  return context;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: NavItem[];
}

export interface ModuleTab {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  navItems: NavItem[];
  pinnedItems?: NavItem[];
  moduleTabs?: ModuleTab[];
  activeModuleTab?: string;
  onModuleTabChange?: (tabId: string) => void;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  notifications?: number;
  onNotificationClick?: () => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  headerActions?: React.ReactNode;
  className?: string;
}

export function DashboardShell({
  children,
  user,
  navItems,
  pinnedItems = [],
  moduleTabs = [],
  activeModuleTab,
  onModuleTabChange,
  title,
  subtitle,
  showSearch = true,
  onSearch,
  notifications = 0,
  onNotificationClick,
  onLogout,
  onProfileClick,
  onSettingsClick,
  headerActions,
  className,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState(navItems[0]?.id || "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleNavClick = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.id);
    } else if (item.onClick) {
      item.onClick();
      setMobileMenuOpen(false);
    } else if (item.href) {
      setLocation(item.href);
      setMobileMenuOpen(false);
    }
    setActiveModule(item.id);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const userInitials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardShellContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        activeModule,
        setActiveModule,
        mobileMenuOpen,
        setMobileMenuOpen,
      }}
    >
      <div className={cn("flex h-screen w-full overflow-hidden bg-background", className)}>
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/50 bg-slate-900 dark:bg-slate-950 text-slate-100 transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "w-14" : "w-60",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
          data-testid="dashboard-sidebar"
        >
          <div className="flex h-14 items-center justify-between border-b border-slate-800 px-3">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <img src={logoUrl} alt="ANZ Global" className="h-6 w-auto" />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              data-testid="toggle-sidebar"
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {!sidebarCollapsed && (
              <div className="px-3 mb-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Search..."
                    className="h-8 bg-slate-800 border-slate-700 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500"
                    data-testid="sidebar-search"
                  />
                </div>
              </div>
            )}

            {pinnedItems.length > 0 && (
              <div className="mb-2">
                {!sidebarCollapsed && (
                  <div className="px-3 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Pinned
                    </span>
                  </div>
                )}
                <nav className="space-y-0.5 px-2">
                  {pinnedItems.map((item) => (
                    <NavItemButton
                      key={item.id}
                      item={item}
                      isActive={activeModule === item.id}
                      isCollapsed={sidebarCollapsed}
                      isExpanded={expandedItems.has(item.id)}
                      onClick={() => handleNavClick(item)}
                      onToggle={() => toggleExpanded(item.id)}
                    />
                  ))}
                </nav>
              </div>
            )}

            <div className="space-y-0.5 px-2">
              {!sidebarCollapsed && (
                <div className="px-1 mb-1 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Modules
                  </span>
                </div>
              )}
              {navItems.map((item) => (
                <NavItemButton
                  key={item.id}
                  item={item}
                  isActive={activeModule === item.id}
                  isCollapsed={sidebarCollapsed}
                  isExpanded={expandedItems.has(item.id)}
                  onClick={() => handleNavClick(item)}
                  onToggle={() => toggleExpanded(item.id)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 p-2">
            {sidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                    onClick={onSettingsClick}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start h-8 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                onClick={onSettingsClick}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </aside>

        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "lg:ml-14" : "lg:ml-60"
          )}
        >
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8"
                onClick={() => setMobileMenuOpen(true)}
                data-testid="mobile-menu-toggle"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {moduleTabs.length > 0 && (
                <nav className="hidden md:flex items-center gap-1">
                  {moduleTabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 px-3 text-sm font-medium",
                        activeModuleTab === tab.id
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => {
                        if (tab.onClick) tab.onClick();
                        else onModuleTabChange?.(tab.id);
                      }}
                      data-testid={`module-tab-${tab.id}`}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </nav>
              )}

              {title && (
                <div className="hidden sm:block">
                  <h1 className="text-sm font-semibold">{title}</h1>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showSearch && (
                <form onSubmit={handleSearch} className="hidden lg:block">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 h-8 pl-8 text-sm"
                      data-testid="header-search"
                    />
                  </div>
                </form>
              )}

              {headerActions}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative"
                onClick={onNotificationClick}
                data-testid="notifications-button"
              >
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                    {notifications > 9 ? "9+" : notifications}
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 gap-2 px-2"
                    data-testid="user-menu-trigger"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-sm font-medium max-w-[100px] truncate">
                      {user.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                      {user.role && (
                        <span className="text-xs text-muted-foreground mt-1 capitalize">
                          {user.role.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onProfileClick} data-testid="profile-menu-item">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSettingsClick} data-testid="settings-menu-item">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-red-600 focus:text-red-600"
                    data-testid="logout-menu-item"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardShellContext.Provider>
  );
}

interface NavItemButtonProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggle: () => void;
  depth?: number;
}

function NavItemButton({
  item,
  isActive,
  isCollapsed,
  isExpanded,
  onClick,
  onToggle,
  depth = 0,
}: NavItemButtonProps) {
  const hasChildren = item.children && item.children.length > 0;

  const buttonContent = (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-blue-600 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
        depth > 0 && "ml-4"
      )}
      onClick={onClick}
      data-testid={`nav-item-${item.id}`}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge !== undefined && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-medium text-white">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          )}
        </>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent side="right">
          {item.label}
          {item.badge !== undefined && ` (${item.badge})`}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      {buttonContent}
      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {item.children!.map((child) => (
            <NavItemButton
              key={child.id}
              item={child}
              isActive={false}
              isCollapsed={isCollapsed}
              isExpanded={false}
              onClick={() => {
                if (child.onClick) child.onClick();
              }}
              onToggle={() => {}}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardWelcome({
  title,
  subtitle,
  logo,
}: {
  title: string;
  subtitle?: string;
  logo?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {logo && (
        <img src={logo} alt="" className="h-10 w-auto" />
      )}
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
