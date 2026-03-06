import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type CallbackStatus = "loading" | "success" | "error";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        if (!supabase) {
          throw new Error("Authentication not configured");
        }

        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");
        const type = hashParams.get("type") || queryParams.get("type");
        const errorParam = hashParams.get("error") || queryParams.get("error");
        const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");

        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        if (type === "recovery") {
          // Preserve the full query string so the token_hash reaches the reset-password page
          window.location.href = "/reset-password" + window.location.search;
          return;
        }

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          if (data.session?.user) {
            const sessionUser = data.session.user;
            const syncResult = await syncUserToDatabase(sessionUser);
            setUserType(syncResult.userType);
            setStatus("success");
            
            queryClient.invalidateQueries({ queryKey: ["/api/supabase-auth/user"] });
            
            setTimeout(() => {
              redirectToDashboard(syncResult.userType, syncResult.approvalStatus);
            }, 1500);
            return;
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          const syncResult = await syncUserToDatabase(sessionData.session.user);
          setUserType(syncResult.userType);
          setStatus("success");
          
          queryClient.invalidateQueries({ queryKey: ["/api/supabase-auth/user"] });
          
          setTimeout(() => {
            redirectToDashboard(syncResult.userType, syncResult.approvalStatus);
          }, 1500);
          return;
        }

        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw new Error("Unable to verify your email. Please try logging in.");
        }

        if (session?.user) {
          const syncResult = await syncUserToDatabase(session.user);
          setUserType(syncResult.userType);
          setStatus("success");
          
          queryClient.invalidateQueries({ queryKey: ["/api/supabase-auth/user"] });
          
          setTimeout(() => {
            redirectToDashboard(syncResult.userType, syncResult.approvalStatus);
          }, 1500);
        } else {
          throw new Error("Unable to complete authentication. Please try logging in.");
        }
      } catch (err: any) {
        console.error("[Auth Callback] Error:", err);
        setStatus("error");
        setErrorMessage(err.message || "Authentication failed");
      }
    }

    async function syncUserToDatabase(supabaseUser: any): Promise<{ approvalStatus?: string | null; userType: string }> {
      // Check for stored OAuth intended user type (set before redirecting to Google)
      const storedUserType = localStorage.getItem('oauth_intended_user_type');
      // Check for stored referral code (set when user visits via referral link)
      // Fall back to Supabase metadata (for email signups where user verifies on different device)
      const storedReferralCode = localStorage.getItem('referral_code') || 
                                  supabaseUser.user_metadata?.referral_code || undefined;
      
      // Use stored type, then Supabase metadata, then default to student
      const userType = storedUserType || supabaseUser.user_metadata?.user_type || "student";
      
      // Clear the stored values after using them
      if (storedUserType) {
        localStorage.removeItem('oauth_intended_user_type');
      }
      // Only clear localStorage if a code was stored there
      if (localStorage.getItem('referral_code')) {
        localStorage.removeItem('referral_code');
      }
      
      // Extract profile picture from OAuth provider metadata
      // Google: avatar_url or picture, Facebook: avatar_url or picture
      const profileImageUrl = supabaseUser.user_metadata?.avatar_url || 
                              supabaseUser.user_metadata?.picture ||
                              supabaseUser.user_metadata?.profile_image_url ||
                              null;
      
      try {
        const response = await apiRequest("POST", "/api/supabase-auth/sync-user", {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email,
          firstName: supabaseUser.user_metadata?.first_name || supabaseUser.user_metadata?.full_name?.split(' ')[0],
          lastName: supabaseUser.user_metadata?.last_name || supabaseUser.user_metadata?.full_name?.split(' ').slice(1).join(' '),
          userType,
          emailVerified: !!supabaseUser.email_confirmed_at,
          profileImageUrl,
          referralCode: storedReferralCode || undefined,
          branchId: supabaseUser.user_metadata?.branch_id || localStorage.getItem('walk_in_branch_id') || undefined,
          entrySource: supabaseUser.user_metadata?.entry_source || (localStorage.getItem('walk_in_branch_id') ? 'walk_in' : undefined),
        }) as { approvalStatus?: string | null };
        return { ...response, userType };
      } catch (err) {
        console.warn("[Auth Callback] Failed to sync user to database:", err);
        return { userType };
      }
    }

    function redirectToDashboard(userType?: string, approvalStatus?: string | null) {
      switch (userType) {
        case "platform_admin":
        case "admin":
          if (approvalStatus === "pending" || approvalStatus === "rejected") {
            setLocation("/admin/pending-approval");
          } else {
            setLocation("/admin/dashboard");
          }
          break;
        case "institution_admin":
        case "institution_user": // Legacy support
          setLocation("/university/dashboard");
          break;
        case "student":
        default:
          setLocation("/student/dashboard");
          break;
      }
    }

    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>Verifying your account...</CardTitle>
              <CardDescription>Please wait while we complete your authentication.</CardDescription>
            </>
          )}
          
          {status === "success" && (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle>Email Verified!</CardTitle>
              <CardDescription>
                Your account has been verified. Redirecting to your {userType === "student" ? "student" : (userType === "institution_admin" || userType === "institution_user") ? "institution" : "admin"} dashboard...
              </CardDescription>
            </>
          )}
          
          {status === "error" && (
            <>
              <div className="mx-auto mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription className="text-destructive">{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>
        
        {status === "error" && (
          <CardContent className="flex flex-col gap-3">
            <Button 
              onClick={() => setLocation("/auth")}
              className="w-full"
              data-testid="button-go-to-login"
            >
              Go to Login
            </Button>
            <Button 
              variant="outline"
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="button-go-home"
            >
              Go to Home
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
