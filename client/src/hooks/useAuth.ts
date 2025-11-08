import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

interface UserWithAdminRole extends User {
  adminRole?: string | null;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<UserWithAdminRole>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const adminRole = user?.adminRole || null;
  
  // Permission flags
  const isSuperAdmin = adminRole === "super_admin";
  const isSupportManager = adminRole === "support_manager";
  const isConsultant = adminRole === "support_staff";
  
  // Full admin access for super_admin and support_manager
  const hasFullAdminAccess = isSuperAdmin || isSupportManager;

  return {
    user,
    isLoading,
    isAuthenticated: !isLoading && !error && !!user,
    isUniversity: user?.userType === "university",
    isStudent: user?.userType === "student",
    isAdmin: user?.userType === "admin",
    adminRole,
    isSuperAdmin,
    isSupportManager,
    isConsultant,
    hasFullAdminAccess,
  };
}
