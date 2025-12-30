import { queryClient } from "./queryClient";

export async function performLogout(signOutFromSupabase?: () => Promise<unknown>): Promise<void> {
  try {
    if (signOutFromSupabase) {
      await signOutFromSupabase();
    }
    
    try {
      await fetch("/api/logout", { 
        method: "GET", 
        credentials: "include",
        redirect: "manual" 
      });
    } catch {
    }
    
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/supabase-auth/user"] });
    queryClient.clear();
    
    window.location.href = "/";
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = "/";
  }
}
