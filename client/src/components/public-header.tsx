import { useState } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, GraduationCap, BookOpen, Users, Info, LayoutDashboard, User, LogOut, MessageSquare, Settings } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { NotificationBell } from "@/components/NotificationBell";
import type { StudentProfile } from "@shared/schema";

interface PublicHeaderProps {
  onStudentLoginClick?: () => void;
}

export function PublicHeader({ onStudentLoginClick }: PublicHeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isAdmin, isStudent, isUniversity } = useAuth();
  const { signOut } = useSupabaseAuth();

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

  const navItems = [
    { title: "Courses", href: "/courses", icon: BookOpen },
    { title: "Institutions", href: "/institutions", icon: GraduationCap },
    { title: "Blog", href: "/blog", icon: Users },
    { title: "About", href: "/our-story", icon: Info },
  ];

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
    if (user.userType === "university" || user.userType === "institution_admin") return "Institution Admin";
    if (user.userType === "student") return "Student";
    return user.userType.replace('_', ' ');
  };

  const getDashboardUrl = () => {
    if (isAdmin) return "/admin/dashboard";
    if (isUniversity) return "/dashboard";
    if (isStudent) return "/dashboard";
    return "/dashboard";
  };

  const getProfileUrl = () => {
    if (isAdmin) return "/admin/profile";
    if (isUniversity) return "/university/profile";
    if (isStudent) return "/student/profile";
    return "/dashboard";
  };

  const getMessagesUrl = () => {
    if (isAdmin) return "/admin/dashboard#messages";
    return "/chat";
  };

  return (
    <header className="sticky top-0 z-[9999] bg-background/95 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center" data-testid="link-logo">
            <img src={logoUrl} alt="ANZ Global Education" className="h-9 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50"
                data-testid={`link-nav-${item.title.toLowerCase()}`}
              >
                {item.title}
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
                    <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
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
                    
                    {/* Messages Link */}
                    <DropdownMenuItem asChild>
                      <Link href={getMessagesUrl()} data-testid="menu-messages">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Messages
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Profile Link */}
                    <DropdownMenuItem asChild>
                      <Link href={getProfileUrl()} data-testid="menu-profile">
                        <User className="mr-2 h-4 w-4" />
                        My Profile
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
              /* Show Login button when not authenticated */
              onStudentLoginClick ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onStudentLoginClick}
                  data-testid="button-student-login"
                >
                  Login / Sign up
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  data-testid="button-student-login"
                >
                  <a href="/auth">Login / Sign up</a>
                </Button>
              )
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            {/* Show notification bell on mobile for logged-in users */}
            {isAuthenticated && user && <NotificationBell />}
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                {isAuthenticated && user ? (
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-mobile-menu">
                    <Avatar className="h-8 w-8">
                      {profileImageUrl && (
                        <AvatarImage src={profileImageUrl} alt={user?.email || "User"} />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <SheetHeader className="p-4 border-b">
                  {isAuthenticated && user ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {profileImageUrl && (
                          <AvatarImage src={profileImageUrl} alt={user?.email || "User"} />
                        )}
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <SheetTitle className="text-left text-sm">
                          {user?.firstName && user?.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user?.email}
                        </SheetTitle>
                        <p className="text-xs text-muted-foreground">{getUserRoleDisplay()}</p>
                      </div>
                    </div>
                  ) : (
                    <SheetTitle className="text-left">Menu</SheetTitle>
                  )}
                </SheetHeader>
                <nav className="flex flex-col p-4">
                  {/* User actions for logged-in users */}
                  {isAuthenticated && user && (
                    <>
                      <Link
                        href={getDashboardUrl()}
                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="mobile-link-dashboard"
                      >
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                        Dashboard
                      </Link>
                      <Link
                        href={getMessagesUrl()}
                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="mobile-link-messages"
                      >
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        Messages
                      </Link>
                      <Link
                        href={getProfileUrl()}
                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="mobile-link-profile"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        My Profile
                      </Link>
                      <div className="my-2 border-t" />
                    </>
                  )}
                  
                  {/* Navigation items */}
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid={`mobile-link-${item.title.toLowerCase()}`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {item.title}
                      </Link>
                    );
                  })}
                  
                  <div className="mt-4 pt-4 border-t">
                    {isAuthenticated && user ? (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        data-testid="button-mobile-logout"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    ) : (
                      onStudentLoginClick ? (
                        <Button
                          variant="default"
                          className="w-full"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onStudentLoginClick();
                          }}
                          data-testid="button-mobile-student-login"
                        >
                          Login / Sign up
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          className="w-full"
                          asChild
                          data-testid="button-mobile-student-login"
                        >
                          <a href="/auth">Login / Sign up</a>
                        </Button>
                      )
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
