import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, Sparkles, Settings, X, LayoutDashboard, Info, Users, LogOut, GraduationCap, Scale, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { StudentProfile } from "@shared/schema";

interface PublicMobileNavProps {
  onMatchClick?: () => void;
}

export function PublicMobileNav({ onMatchClick }: PublicMobileNavProps) {
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, isStudent, isUniversity } = useAuth();
  const { signOut } = useSupabaseAuth();

  const { data: studentProfile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
    enabled: isAuthenticated && isStudent,
  });

  const getProfileImageUrl = () => {
    if (isStudent && studentProfile?.profileImageUrl) {
      return studentProfile.profileImageUrl;
    }
    return user?.profileImageUrl || null;
  };

  const profileImageUrl = getProfileImageUrl();

  const getUserInitials = () => {
    if (!user?.email) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const getDashboardUrl = () => {
    if (isAdmin) return "/admin/dashboard";
    return "/dashboard";
  };

  const getProfileUrl = () => {
    if (isAdmin) return "/admin/profile";
    if (isUniversity) return "/university/profile";
    if (isStudent) return "/student/profile";
    return "/dashboard";
  };

  const handleLogout = async () => {
    try {
      await signOut();
      try {
        await fetch("/api/logout", { method: "GET", credentials: "include", redirect: "manual" });
      } catch {}
      queryClient.clear();
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const handleChatClick = () => {
    if (isAdmin) {
      setLocation('/admin/dashboard?tab=messages');
    } else {
      window.dispatchEvent(new CustomEvent("open-chat-widget"));
    }
  };

  const handleMatchClick = () => {
    if (onMatchClick) {
      onMatchClick();
    } else {
      window.dispatchEvent(new CustomEvent("open-course-quiz"));
    }
  };

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  useEffect(() => {
    const handler = () => setMenuOpen(true);
    window.addEventListener("open-mobile-menu", handler);
    return () => window.removeEventListener("open-mobile-menu", handler);
  }, []);

  return (
    <>
      {/* Bottom sheet overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
          data-testid="overlay-mobile-menu"
        />
      )}

      {/* Bottom sheet menu */}
      <div
        className={cn(
          "fixed left-0 right-0 z-[95] md:hidden",
          "transform transition-transform duration-300 ease-out",
          menuOpen ? "bottom-0 translate-y-0" : "bottom-0 translate-y-full pointer-events-none"
        )}
      >
        <div className="bg-background rounded-t-2xl border-t border-x border-border shadow-2xl max-h-[70vh] overflow-y-auto pointer-events-auto">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-5 pb-3 pt-1 flex items-center justify-between">
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
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.userType === "student" ? "Student" : user?.userType === "admin" || user?.userType === "platform_admin" ? "Admin" : "User"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm font-semibold text-foreground">Menu</p>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMenuOpen(false)}
              data-testid="button-close-mobile-sheet"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="border-t border-border" />

          {/* Auth actions for logged-in users */}
          {isAuthenticated && user && (
            <>
              <div className="px-3 py-2">
                <Link
                  href={getDashboardUrl()}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover-elevate"
                  data-testid="mobile-sheet-dashboard"
                >
                  <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                  Dashboard
                </Link>
                <Link
                  href={isStudent ? "/student/account" : getProfileUrl()}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover-elevate"
                  data-testid="mobile-sheet-profile"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  {isStudent ? "My Account" : "My Profile"}
                </Link>
              </div>
              <div className="border-t border-border mx-5" />
            </>
          )}

          {/* Navigation links */}
          <div className="px-3 py-2">
            <Link
              href="/institutions"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover-elevate"
              data-testid="mobile-sheet-institutions"
            >
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              Institutions
            </Link>
            <Link
              href="/blog"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover-elevate"
              data-testid="mobile-sheet-blog"
            >
              <Users className="h-5 w-5 text-muted-foreground" />
              Blog
            </Link>
            <Link
              href="/our-story"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover-elevate"
              data-testid="mobile-sheet-about"
            >
              <Info className="h-5 w-5 text-muted-foreground" />
              About Us
            </Link>
          </div>

          <div className="border-t border-border mx-5" />

          {/* Auth section */}
          <div className="px-5 py-4">
            {isAuthenticated && user ? (
              <Button
                variant="outline"
                className="w-full text-destructive"
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                data-testid="button-mobile-sheet-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-accent text-accent-foreground border-accent-border"
                  asChild
                >
                  <a href="/auth?mode=login" onClick={() => setMenuOpen(false)} data-testid="button-mobile-sheet-login">
                    Login
                  </a>
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  asChild
                >
                  <a href="/auth?mode=signup" onClick={() => setMenuOpen(false)} data-testid="button-mobile-sheet-signup">
                    Sign up
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Bottom spacer so content isn't behind the tab bar */}
          <div className="h-16" />
          <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[80] md:hidden bg-background/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Mobile navigation"
        data-testid="nav-mobile-bottom"
      >
        <div className="flex items-center justify-around h-14 px-1">
          {/* Home */}
          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1"
            data-testid="tab-home"
          >
            <Home className={cn("h-5 w-5 transition-colors", isActive("/") ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-[10px] font-medium transition-colors", isActive("/") ? "text-primary" : "text-muted-foreground")}>
              Home
            </span>
          </Link>

          {/* Courses */}
          <Link
            href="/courses"
            className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1"
            data-testid="tab-courses"
          >
            <BookOpen className={cn("h-5 w-5 transition-colors", isActive("/courses") ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-[10px] font-medium transition-colors", isActive("/courses") ? "text-primary" : "text-muted-foreground")}>
              Courses
            </span>
          </Link>

          {/* Match - Center elevated */}
          <button
            onClick={handleMatchClick}
            className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 -mt-3"
            data-testid="tab-match"
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-accent shadow-lg shadow-accent/30">
              <Sparkles className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-[10px] font-semibold text-accent">
              Match
            </span>
          </button>

          {/* Compare */}
          <Link
            href="/compare-courses"
            className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1"
            data-testid="tab-compare"
          >
            <Scale className={cn("h-5 w-5 transition-colors", isActive("/compare-courses") ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-[10px] font-medium transition-colors", isActive("/compare-courses") ? "text-primary" : "text-muted-foreground")}>
              Compare
            </span>
          </Link>

          {/* Chat */}
          <button
            onClick={handleChatClick}
            className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1"
            data-testid="tab-chat"
          >
            <MessageCircle className="h-5 w-5 transition-colors text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">
              Chat
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
