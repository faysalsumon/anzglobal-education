import { queryClient } from "./queryClient";
import { supabase } from "./supabase";

export async function performLogout(signOutFromSupabase?: () => Promise<unknown>): Promise<void> {
  try {
    // Sign out from Supabase (primary auth)
    if (signOutFromSupabase) {
      await signOutFromSupabase();
    }
    
    // Also call signOut directly on the supabase client to ensure it's cleared
    if (supabase) {
      await supabase.auth.signOut({ scope: 'local' });
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
    
    // Clear Supabase local storage items
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore localStorage errors
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
