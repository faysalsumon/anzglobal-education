import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { useMemo } from "react";

interface UserWithAdminRole extends User {
  adminRole?: string | null;
}

export function useAuth() {
  const { user: supabaseUser, session, isLoading: supabaseLoading, isConfigured } = useSupabaseAuth();
  
  const { data: legacyUser, isLoading: legacyLoading, isFetched, isSuccess } = useQuery<UserWithAdminRole | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const isLoading = supabaseLoading || legacyLoading;

  const user = useMemo(() => {
    if (legacyUser) {
      return legacyUser;
    }
    
    if (supabaseUser && session) {
      const metadata = supabaseUser.user_metadata;
      return {
        id: 0,
        email: supabaseUser.email || "",
        firstName: metadata?.first_name || null,
        lastName: metadata?.last_name || null,
        userType: metadata?.user_type || "student",
        role: null,
        profileImageUrl: metadata?.avatar_url || null,
        isActive: true,
        emailVerified: !!supabaseUser.email_confirmed_at,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserWithAdminRole;
    }
    
    return null;
  }, [legacyUser, supabaseUser, session]);

  const adminRole = user?.adminRole || user?.role || null;
  
  const isSuperAdmin = adminRole === "super_admin";
  const isSupportManager = adminRole === "support_manager";
  const isConsultant = adminRole === "support_staff";
  
  const hasFullAdminAccess = isSuperAdmin || isSupportManager;

  const isAuthResolved = (isFetched && !legacyLoading) || (!supabaseLoading && isConfigured);
  
  const isAuthenticated = (isSuccess && !!legacyUser) || (!!supabaseUser && !!session);

  return {
    user,
    isLoading,
    isAuthResolved,
    isAuthenticated,
    isUniversity: user?.userType === "university" || user?.userType === "institution_user",
    isStudent: user?.userType === "student",
    isAdmin: user?.userType === "admin" || user?.userType === "platform_admin",
    adminRole,
    isSuperAdmin,
    isSupportManager,
    isConsultant,
    hasFullAdminAccess,
  };
}
