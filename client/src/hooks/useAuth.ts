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

const ALL_NAV_SECTIONS = ['crm', 'cms', 'management', 'finance', 'people', 'tools'] as const;

const ROLE_NAV_SECTIONS: Record<string, readonly string[]> = {
  cto: ALL_NAV_SECTIONS,
  ceo: ['crm', 'cms', 'finance', 'people'],
  cfo: ['crm', 'finance'],
  branch_manager: ['crm', 'people'],
  marketing_executive: ['crm', 'cms'],
  senior_consultant: ['crm'],
  junior_consultant: ['crm'],
  support_staff: ['crm'],
  operations_staff: ['crm', 'finance'],
  accounts_officer: ['crm', 'cms', 'finance'],
  admissions_director: ['crm', 'cms', 'finance', 'people'],
};

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
        id: "0",
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
  
  const isCTO = adminRole === "cto" || adminRole === "ceo";
  const isBranchManager = adminRole === "branch_manager";
  const isConsultant = adminRole === "senior_consultant" || adminRole === "junior_consultant";
  const isAccountsOfficer = adminRole === "accounts_officer";
  const isMarketingExecutive = adminRole === "marketing_executive";
  const isAdmissionsDirector = adminRole === "admissions_director";
  
  const hasFullAdminAccess = isCTO || isBranchManager;

  const allowedNavSections = useMemo(() => {
    if (user?.userType === 'platform_admin') return new Set(ALL_NAV_SECTIONS);
    const sections = ROLE_NAV_SECTIONS[adminRole ?? ''] ?? ['crm'];
    return new Set(sections);
  }, [user?.userType, adminRole]);

  // Auth is resolved when Supabase has finished loading
  // If there's a session, also wait for the DB user to be fetched
  const isAuthResolved = !supabaseLoading && isConfigured && (!session || isFetched);
  
  // User is authenticated if we have a valid Supabase session
  const isAuthenticated = !!supabaseUser && !!session;

  const STAFF_USER_TYPES = ["admin", "platform_admin", "cto", "super_admin"];
  // adminRole = user?.adminRole || user?.role || null.
  // We exclude "user" because that is the default role for students/non-staff.
  const isStaff = STAFF_USER_TYPES.includes(user?.userType ?? "") ||
    (!!adminRole && adminRole !== "user");

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
    isAccountsOfficer,
    isAdmissionsDirector,
    hasFullAdminAccess,
    regionId: user?.regionId || null,
    regionName: user?.regionName || null,
    regionCode: user?.regionCode || null,
    branchId: user?.branchId || null,
    branchName: user?.branchName || null,
    defaultScope: user?.defaultScope || null,
    isGlobalScope: user?.defaultScope === 'global' || isCTO || isAccountsOfficer || isAdmissionsDirector,
    allowedNavSections,
  };
}
