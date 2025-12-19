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
  
  // Try to get user from legacy Replit auth
  const { data: legacyUser, isLoading: legacyLoading, isFetched, isSuccess } = useQuery<UserWithAdminRole | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Get user from database via Supabase token when we have a Supabase session
  const { data: supabaseDbUser, isLoading: supabaseDbLoading } = useQuery<UserWithAdminRole | null>({
    queryKey: ["/api/supabase-auth/user"],
    queryFn: async () => {
      if (!session?.access_token) return null;
      
      const response = await fetch("/api/supabase-auth/user", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch user");
      }
      
      return response.json();
    },
    enabled: !!session?.access_token && isConfigured,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const isLoading = supabaseLoading || legacyLoading || (!!session && supabaseDbLoading);

  const user = useMemo(() => {
    // Priority: legacyUser > supabaseDbUser > supabase metadata fallback
    if (legacyUser) {
      return legacyUser;
    }
    
    if (supabaseDbUser) {
      return supabaseDbUser;
    }
    
    // Fallback to Supabase metadata only if we have a session but no DB user yet
    // This handles the brief window during first login before sync completes
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
  }, [legacyUser, supabaseDbUser, supabaseUser, session]);

  const adminRole = user?.adminRole || user?.role || null;
  
  const isSuperAdmin = adminRole === "super_admin";
  const isSupportManager = adminRole === "support_manager";
  const isConsultant = adminRole === "support_staff";
  
  const hasFullAdminAccess = isSuperAdmin || isSupportManager;

  const isAuthResolved = (isFetched && !legacyLoading) || (!supabaseLoading && isConfigured && !supabaseDbLoading);
  
  const isAuthenticated = (isSuccess && !!legacyUser) || (!!supabaseUser && !!session);

  return {
    user,
    isLoading,
    isAuthResolved,
    isAuthenticated,
    isUniversity: user?.userType === "university" || user?.userType === "institution_admin",
    isStudent: user?.userType === "student",
    isAdmin: user?.userType === "admin" || user?.userType === "platform_admin",
    adminRole,
    isSuperAdmin,
    isSupportManager,
    isConsultant,
    hasFullAdminAccess,
  };
}
