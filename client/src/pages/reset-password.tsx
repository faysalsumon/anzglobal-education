import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { useSupabaseAuth } from "@/lib/supabase-auth";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { updatePassword, isConfigured, isPasswordRecovery, session, isLoading: authLoading, clearPasswordRecovery } = useSupabaseAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // Check if we have a valid session (from password recovery link)
    // Either the PASSWORD_RECOVERY event was fired or we have a session with recovery token in URL
    const hash = window.location.hash;
    const hasRecoveryToken = hash && (hash.includes("access_token") || hash.includes("type=recovery"));
    
    if (isPasswordRecovery || session || hasRecoveryToken) {
      setIsValidSession(true);
      setError(null);
    } else {
      setError("Invalid or expired reset link. Please request a new password reset.");
    }
  }, [authLoading, isPasswordRecovery, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured) {
      toast({
        title: "Error",
        description: "Password reset is not available at this time.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await updatePassword(password);

      if (error) {
        setError(error.message || "Failed to reset password.");
        toast({
          title: "Error",
          description: error.message || "Failed to reset password.",
          variant: "destructive",
        });
      } else {
        setIsSuccess(true);
        clearPasswordRecovery(); // Clear the recovery state
        toast({
          title: "Password Updated",
          description: "Your password has been successfully reset.",
        });
        setTimeout(() => {
          setLocation("/auth");
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <header className="border-b bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="flex items-center" data-testid="link-logo">
            <img src={logoUrl} alt="ANZ Global Education" className="h-9 w-auto" />
          </a>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background rounded-2xl shadow-xl p-8">
          {authLoading ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Verifying reset link...</p>
            </div>
          ) : isSuccess ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-success-title">
                Password Reset Successful
              </h1>
              <p className="text-muted-foreground">
                Your password has been updated. Redirecting you to login...
              </p>
              <Button
                onClick={() => setLocation("/auth")}
                className="w-full"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </div>
          ) : !isValidSession ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-error-title">
                Invalid Reset Link
              </h1>
              <p className="text-muted-foreground">{error}</p>
              <Button
                onClick={() => setLocation("/auth")}
                className="w-full"
                data-testid="button-back-to-auth"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-8">
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
                  Set New Password
                </h1>
                <p className="text-muted-foreground">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-confirm-password"
                  />
                </div>

                {error && password && (
                  <p className="text-sm text-red-600 dark:text-red-400" data-testid="text-error">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={isLoading}
                  data-testid="button-submit-reset"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <footer className="border-t py-4 bg-background">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Copyright {new Date().getFullYear()} | ANZ Global Education</p>
        </div>
      </footer>
    </div>
  );
}
