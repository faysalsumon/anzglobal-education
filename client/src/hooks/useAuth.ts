import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { useMemo } from "react";

interface UserWithAdminRole extends User {
  adminRole?: string | null;
  roleName?: string | null;
}

export function useAuth() {
  const { user: supabaseUser, session, isLoading: supabaseLoading, isConfigured } = useSupabaseAuth();

  // Get user from database via Supabase token when we have a Supabase session
  const { data: supabaseDbUser, isLoading: supabaseDbLoading, isFetched } = useQuery<UserWithAdminRole | null>({
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

  const isLoading = supabaseLoading || (!!session && supabaseDbLoading);

  const user = useMemo(() => {
    // Primary: Use database user from Supabase auth
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
  }, [supabaseDbUser, supabaseUser, session]);

  const adminRole = user?.adminRole || user?.role || null;
  
  const isSuperAdmin = adminRole === "super_admin";
  const isSupportManager = adminRole === "support_manager";
  const isConsultant = adminRole === "support_staff";
  
  const hasFullAdminAccess = isSuperAdmin || isSupportManager;

  // Auth is resolved when Supabase has finished loading
  // If there's a session, also wait for the DB user to be fetched
  const isAuthResolved = !supabaseLoading && isConfigured && (!session || isFetched);
  
  // User is authenticated if we have a valid Supabase session
  const isAuthenticated = !!supabaseUser && !!session;

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
