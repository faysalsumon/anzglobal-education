import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

interface UserWithAdminRole extends User {
  adminRole?: string | null;
}

export function useAuth() {
  const { data: user, isLoading, error, isFetched, isSuccess } = useQuery<UserWithAdminRole>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale so it refetches after login
  });

  // Fallback to user.role if adminRole is not set (for compatibility with backend)
  const adminRole = user?.adminRole || user?.role || null;
  
  // Permission flags
  const isSuperAdmin = adminRole === "super_admin";
  const isSupportManager = adminRole === "support_manager";
  const isConsultant = adminRole === "support_staff";
  
  // Full admin access for super_admin and support_manager
  const hasFullAdminAccess = isSuperAdmin || isSupportManager;

  // Auth is definitively resolved when:
  // 1. Query has fetched at least once AND
  // 2. Either succeeded with data OR failed with error (not still loading)
  // This ensures we wait for a definitive result before rendering routes
  const isAuthResolved = isFetched && !isLoading;
  
  // Authenticated only if we have a successful user response
  const isAuthenticated = isSuccess && !!user;

  return {
    user,
    isLoading,
    isAuthResolved, // Auth status is definitively known
    isAuthenticated, // User is successfully authenticated
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
