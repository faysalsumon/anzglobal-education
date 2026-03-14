import { useState, useEffect } from "react";
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
import { GraduationCap, BookOpen, Users, Info, LayoutDashboard, User, LogOut, Settings, Home, Globe } from "lucide-react";
import logoUrl from "@assets/ANZ_logo.webp";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import type { StudentProfile } from "@shared/schema";
import { useRegion } from "@/context/RegionContext";
import { getRegionConfig } from "@/lib/region-config";
import { useTranslation } from "@/hooks/useTranslation";

function AnimatedMenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <span className="flex flex-col justify-center items-center w-5 h-5 gap-[5px]">
      <span
        className="block h-0.5 w-5 rounded-full bg-blue-600 transition-all duration-300 ease-in-out origin-center"
        style={{ transform: isOpen ? "rotate(45deg) translateY(7px)" : "none" }}
      />
      <span
        className="block h-0.5 w-5 rounded-full bg-blue-600 transition-all duration-300 ease-in-out"
        style={{ opacity: isOpen ? 0 : 1, transform: isOpen ? "scaleX(0)" : "scaleX(1)" }}
      />
      <span
        className="block h-0.5 w-5 rounded-full bg-blue-600 transition-all duration-300 ease-in-out origin-center"
        style={{ transform: isOpen ? "rotate(-45deg) translateY(-7px)" : "none" }}
      />
    </span>
  );
}

interface PublicHeaderProps {
  onStudentLoginClick?: () => void;
}

export function PublicHeader({ onStudentLoginClick }: PublicHeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (e: Event) => setIsMenuOpen((e as CustomEvent<{ open: boolean }>).detail.open);
    window.addEventListener("mobile-menu-state-change", handler);
    return () => window.removeEventListener("mobile-menu-state-change", handler);
  }, []);
  const { user, isAuthenticated, isAdmin, isStudent } = useAuth();
  const { signOut } = useSupabaseAuth();
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 10 });

  const handleLogout = async () => {
    try {
      // Sign out from Supabase first
      await signOut();
      
      // Destroy legacy session - use redirect: 'manual' to handle 302 redirect gracefully
      try {
        await fetch("/api/logout", { 
          method: "GET", 
          credentials: "include",
          redirect: "manual" 
        });
      } catch {
        // Ignore errors from legacy logout endpoint
      }
      
      // Clear all query cache
      queryClient.clear();
      
      // Force full page reload to clear all in-memory React state
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even on error
      window.location.href = "/";
    }
  };

  // Fetch student profile for profile picture
  const { data: studentProfile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
    enabled: isAuthenticated && isStudent,
  });

  // Get the profile image URL - prefer student profile picture, fallback to auth user picture
  const getProfileImageUrl = () => {
    if (isStudent && studentProfile?.profileImageUrl) {
      return studentProfile.profileImageUrl;
    }
    return user?.profileImageUrl || null;
  };

  const profileImageUrl = getProfileImageUrl();

  const { region, regionCode } = useRegion();
  const effectiveRegionCode = region?.code || regionCode;
  const regionConfig = getRegionConfig(effectiveRegionCode);

  const iconMap: Record<string, any> = {
    "/": Home,
    "/courses": BookOpen,
    "/institutions": GraduationCap,
    "/blog": Users,
    "/our-story": Info,
    "/study-in-australia": Globe,
    "/study-abroad": Globe,
  };

  const navItems = regionConfig.publicNavItems.map(item => ({
    title: item.title,
    href: item.href,
    icon: iconMap[item.href] || Info,
  }));

  const getUserInitials = () => {
    if (!user?.email) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const getUserRoleDisplay = () => {
    if (!user?.userType) return "User";
    
    // Show the actual role name if available (from RBAC system)
    if (user.roleName) {
      // Format role name nicely (capitalize each word)
      return user.roleName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Fallback to user type display
    if (user.userType === "admin" || user.userType === "platform_admin") {
      return "Platform Admin";
    }
    if (user.userType === "student") return "Student";
    return user.userType.replace('_', ' ');
  };

  const getDashboardUrl = () => {
    if (isAdmin) return "/admin/dashboard";
    return "/dashboard";
  };

  const getProfileUrl = () => {
    if (isAdmin) return "/admin/profile";
    if (isStudent) return "/student/profile";
    return "/dashboard";
  };

  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        data-testid="link-skip-navigation"
      >
        Skip to main content
      </a>
      <header 
        className={cn(
          "sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40",
          "transform transition-transform duration-300 ease-out",
          scrollDirection === "down" && !isAtTop ? "md:translate-y-0 -translate-y-full" : "translate-y-0"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center" aria-label="Go to homepage" data-testid="link-logo">
              <img src={logoUrl} alt="ANZ Global Education logo" width={74} height={36} className="h-9" />
            </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50"
                data-testid={`link-nav-${item.title.toLowerCase()}`}
              >
                {item.titleKey ? t(item.titleKey) : item.title}
              </Link>
            ))}
          </nav>

          {/* Desktop Right Side: Login or Profile */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />
                
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open user menu" data-testid="button-user-menu">
                      <Avatar className="h-9 w-9">
                        {profileImageUrl && (
                          <AvatarImage src={profileImageUrl} alt={user?.email || "User"} />
                        )}
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
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
                    
                    {/* Dashboard Link */}
                    <DropdownMenuItem asChild>
                      <Link href={getDashboardUrl()} data-testid="menu-dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Profile / Account Link */}
                    <DropdownMenuItem asChild>
                      <Link href={isStudent ? "/student/account" : getProfileUrl()} data-testid="menu-profile">
                        <Settings className="mr-2 h-4 w-4" />
                        {isStudent ? "My Account" : "My Profile"}
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Logout */}
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="text-destructive cursor-pointer" 
                      data-testid="menu-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              /* Show Login and Sign up buttons when not authenticated */
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-accent text-white border-accent-border"
                  asChild
                  data-testid="button-login"
                >
                  <a href="/auth?mode=login">{t("navigation.login")}</a>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  data-testid="button-signup"
                >
                  <a href="/auth?mode=signup">{t("navigation.signup")}</a>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile: Menu button at top right (Semrush-style) */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                <NotificationBell />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                  data-testid="button-mobile-menu"
                  aria-label="Open menu"
                >
                  <AnimatedMenuIcon isOpen={isMenuOpen} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className="bg-accent text-white border-accent-border font-medium"
                  asChild
                  data-testid="button-mobile-login"
                >
                  <a href="/auth?mode=login">Login</a>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                  data-testid="button-mobile-menu"
                  aria-label="Open menu"
                >
                  <AnimatedMenuIcon isOpen={isMenuOpen} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
