import { queryClient } from "./queryClient";

export async function performLogout(signOutFromSupabase?: () => Promise<unknown>): Promise<void> {
  try {
    // Sign out from Supabase (primary auth)
    if (signOutFromSupabase) {
      await signOutFromSupabase();
    }
    
    // Clear the session cookie by hitting the logout endpoint
    try {
      await fetch("/api/logout", { 
        method: "GET", 
        credentials: "include",
        redirect: "manual" 
      });
    } catch {
      // Ignore fetch errors - session might already be cleared
    }
    
    // Clear all cached queries
    queryClient.invalidateQueries({ queryKey: ["/api/supabase-auth/user"] });
    queryClient.clear();
    
    // Full page reload to clear all React state
    window.location.href = "/";
  } catch (error) {
    console.error("Logout error:", error);
    // Force redirect even on error
    window.location.href = "/";
  }
}
