import { queryClient } from "./queryClient";
import { supabase } from "./supabase";

export async function performLogout(signOutFromSupabase?: () => Promise<unknown>): Promise<void> {
  try {
    // FIRST: Clear Supabase local storage items synchronously before anything else
    // This prevents WebSocket and other components from using stale tokens
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      // Also clear session storage
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore storage errors
    }
    
    // Clear all cached queries immediately
    queryClient.clear();
    
    // Sign out from Supabase (primary auth) - non-blocking
    const signOutPromises: Promise<unknown>[] = [];
    
    if (signOutFromSupabase) {
      signOutPromises.push(signOutFromSupabase().catch(() => {}));
    }
    
    if (supabase) {
      signOutPromises.push(supabase.auth.signOut({ scope: 'local' }).catch(() => {}));
    }
    
    // Clear the session cookie - non-blocking
    signOutPromises.push(
      fetch("/api/logout", { 
        method: "GET", 
        credentials: "include",
        redirect: "manual" 
      }).catch(() => {})
    );
    
    // Wait for all signout operations with a timeout
    await Promise.race([
      Promise.allSettled(signOutPromises),
      new Promise(resolve => setTimeout(resolve, 1000)) // 1 second timeout
    ]);
    
    // Small delay to ensure browser has processed all changes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Full page reload to clear all React state
    window.location.href = "/";
  } catch (error) {
    console.error("Logout error:", error);
    // Force clear storage and redirect even on error
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
    window.location.href = "/";
  }
}
