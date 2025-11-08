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

  return {
    user,
    isLoading,
    isAuthenticated: !isLoading && !error && !!user,
    isUniversity: user?.userType === "university",
    isStudent: user?.userType === "student",
    isAdmin: user?.userType === "admin",
    adminRole: user?.adminRole || null,
    isSuperAdmin: user?.adminRole === "super_admin",
    isConsultant: user?.adminRole === "support_staff",
  };
}
