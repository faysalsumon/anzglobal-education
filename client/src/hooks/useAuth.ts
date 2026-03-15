import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { useMemo } from "react";

interface UserWithAdminRole extends User {
  adminRole?: string | null;
  roleName?: string | null;
  regionName?: string | null;
  regionCode?: string | null;
  branchName?: string | null;
  defaultScope?: string | null;
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
  
  const isCTO = adminRole === "cto";
  const isBranchManager = adminRole === "branch_manager";
  const isConsultant = adminRole === "support_staff";
  // Check both display name and internal name formats for marketing executive
  const isMarketingExecutive = user?.roleName === "Marketing Executive" || user?.roleName === "marketing_executive";
  
  const hasFullAdminAccess = isCTO || isBranchManager;

  // Auth is resolved when Supabase has finished loading
  // If there's a session, also wait for the DB user to be fetched
  const isAuthResolved = !supabaseLoading && isConfigured && (!session || isFetched);
  
  // User is authenticated if we have a valid Supabase session
  const isAuthenticated = !!supabaseUser && !!session;

  const STAFF_USER_TYPES = ["admin", "platform_admin", "cto", "super_admin"];
  const isStaff = STAFF_USER_TYPES.includes(user?.userType ?? "") || !!user?.adminRole;

  return {
    user,
    isLoading,
    isAuthResolved,
    isAuthenticated,
    isStudent: user?.userType === "student",
    isAdmin: user?.userType === "admin" || user?.userType === "platform_admin",
    isStaff,
    adminRole,
    isCTO,
    isBranchManager,
    isConsultant,
    isMarketingExecutive,
    hasFullAdminAccess,
    regionId: user?.regionId || null,
    regionName: user?.regionName || null,
    regionCode: user?.regionCode || null,
    branchId: user?.branchId || null,
    branchName: user?.branchName || null,
    defaultScope: user?.defaultScope || null,
    isGlobalScope: user?.defaultScope === 'global' || isCTO,
  };
}
