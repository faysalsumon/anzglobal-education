/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { trackCompleteRegistration } from "@/lib/meta-pixel";
import { ChevronLeft, Mail, X, Loader2, AlertCircle, RefreshCw, KeyRound, Eye, EyeOff, ShieldCheck, Pencil } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import logoUrl from "@assets/ANZ_logo.webp";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";

type AuthView = "email-entry" | "password" | "signup" | "forgot-password" | "email-exists";
type UserType = "student" | null;

function AdminRedirectOverlay() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background animate-in fade-in duration-300"
      data-testid="admin-redirect-overlay"
    >
      <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="mx-auto h-20 w-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
          <ShieldCheck className="h-10 w-10 text-primary-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Admin Portal Access</h2>
          <p className="text-muted-foreground max-w-sm">Redirecting you to the admin dashboard...</p>
        </div>
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [view, setView] = useState<AuthView>("email-entry");
  const [userType, setUserType] = useState<UserType>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailExistsError, setEmailExistsError] = useState<{ verified: boolean; email: string } | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [redirectingToAdmin, setRedirectingToAdmin] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [walkInBranchId, setWalkInBranchId] = useState("");
  const [walkInSource, setWalkInSource] = useState("");
  const [emailError, setEmailError] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signIn, signUp, resetPassword, resendVerification, signInWithOAuth, isConfigured } = useSupabaseAuth();
  const { user, isAuthenticated, isAuthResolved } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const urlReferralCode = urlParams.get('ref');
    const urlSource = urlParams.get('source');
    const urlBranchId = urlParams.get('branch_id');

    if (mode === 'signup') {
      setIsSignup(true);
      setView("signup");
    } else if (mode === 'login') {
      setIsSignup(false);
      setView("email-entry");
    }

    if (urlSource === 'walk_in' && urlBranchId) {
      localStorage.setItem('walk_in_branch_id', urlBranchId);
      localStorage.setItem('walk_in_source', 'walk_in');
      setWalkInBranchId(urlBranchId);
      setWalkInSource('walk_in');
      setIsSignup(true);
      setView("signup");
      setUserType("student");
    } else {
      const storedBranchId = localStorage.getItem('walk_in_branch_id');
      const storedSource = localStorage.getItem('walk_in_source');
      if (storedBranchId && storedSource) {
        setWalkInBranchId(storedBranchId);
        setWalkInSource(storedSource);
      }
    }

    if (urlReferralCode) {
      localStorage.setItem('referral_code', urlReferralCode);
      setReferralCode(urlReferralCode);
      setIsSignup(true);
      setView("signup");
    } else {
      const storedCode = localStorage.getItem('referral_code');
      if (storedCode) setReferralCode(storedCode);
    }
  }, []);

  useEffect(() => {
    if (isAuthResolved && isAuthenticated && user && !redirectingToAdmin) {
      if (user.userType === "platform_admin" || user.userType === "admin") {
        setRedirectingToAdmin(true);
        setTimeout(() => { window.location.href = "/admin/dashboard"; }, 800);
      } else if (user.userType === "student") {
        window.location.href = "/student/dashboard";
      }
    }
  }, [isAuthResolved, isAuthenticated, user, redirectingToAdmin]);

  const handleGoogleLogin = async () => {
    if (!isConfigured) {
      toast({ title: "Not Available", description: "Google authentication is not configured yet.", variant: "destructive" });
      return;
    }
    localStorage.setItem('oauth_intended_user_type', 'student');
    setIsLoading(true);
    try {
      const { error } = await signInWithOAuth("google");
      if (error) {
        toast({ title: "Google Sign-In Failed", description: error.message || "Failed to initiate Google sign-in.", variant: "destructive" });
        localStorage.removeItem('oauth_intended_user_type');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "An unexpected error occurred.", variant: "destructive" });
      localStorage.removeItem('oauth_intended_user_type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    if (!isConfigured) {
      toast({ title: "Not Available", description: "Facebook authentication is not configured yet.", variant: "destructive" });
      return;
    }
    localStorage.setItem('oauth_intended_user_type', 'student');
    setIsLoading(true);
    try {
      const { error } = await signInWithOAuth("facebook");
      if (error) {
        toast({ title: "Facebook Sign-In Failed", description: error.message || "Failed to initiate Facebook sign-in.", variant: "destructive" });
        localStorage.removeItem('oauth_intended_user_type');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "An unexpected error occurred.", variant: "destructive" });
      localStorage.removeItem('oauth_intended_user_type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setEmail(trimmedEmail);
    setIsSignup(false);
    setView("password");
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured) {
      toast({ title: "Not Available", description: "Email authentication is not configured. Please use Google sign-in instead.", variant: "destructive" });
      return;
    }

    if (!email || !password) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setEmailExistsError(null);

    try {
      if (isSignup) {
        if (!firstName || !lastName) {
          toast({ title: "Error", description: "Please enter your first and last name.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, {
          firstName,
          lastName,
          userType: userType || "student",
          referralCode: referralCode || undefined,
          branchId: walkInBranchId || undefined,
          entrySource: walkInSource || undefined,
        });

        if (error) {
          const errorMsg = error.message?.toLowerCase() || "";
          const errorDetails = (error as any).error_description?.toLowerCase() ||
            (error as any).__isAuthError ? JSON.stringify(error).toLowerCase() : "";
          const errorCode = (error as any).code?.toLowerCase() || "";
          const fullError = `${errorMsg} ${errorDetails} ${errorCode}`.replace(/_/g, " ");
          const status = (error as any).status;
          const isRateLimitOrDuplicate = status === 400 || status === 429;

          if (fullError.includes("security purposes") ||
            fullError.includes("rate limit") ||
            fullError.includes("too many requests") ||
            fullError.includes("only request this after") ||
            fullError.includes("signups not allowed") ||
            (isRateLimitOrDuplicate && fullError.includes("signup"))) {
            setEmailExistsError({ verified: false, email });
            setView("email-exists");
          } else if (fullError.includes("already registered") ||
            fullError.includes("user already exists") ||
            fullError.includes("email already") ||
            fullError.includes("already been registered")) {
            setEmailExistsError({ verified: true, email });
            setView("email-exists");
          } else if (fullError.includes("confirm") || fullError.includes("verify")) {
            setEmailExistsError({ verified: false, email });
            setView("email-exists");
          } else {
            toast({ title: "Signup Failed", description: error.message || "Failed to create account.", variant: "destructive" });
          }
        } else {
          localStorage.removeItem('walk_in_branch_id');
          localStorage.removeItem('walk_in_source');
          trackCompleteRegistration("registered");
          toast({ title: "Check Your Email", description: "We've sent you a verification link. Please check your email to complete signup." });
          setView("email-entry");
        }
      } else {
        const { error } = await signIn(email, password);

        if (error) {
          const errorMsg = error.message?.toLowerCase() || "";
          if (errorMsg.includes("email not confirmed") || errorMsg.includes("not verified")) {
            setEmailExistsError({ verified: false, email });
            setView("email-exists");
          } else {
            toast({ title: "Login Failed", description: error.message || "Invalid email or password.", variant: "destructive" });
          }
        } else {
          try {
            const { supabase } = await import("@/lib/supabase");
            const { data: sessionData } = await supabase?.auth.getSession() || { data: null };
            const accessToken = sessionData?.session?.access_token;

            if (!accessToken) {
              toast({ title: "Login Error", description: "Unable to verify your account. Please try again.", variant: "destructive" });
              return;
            }

            const response = await fetch("/api/supabase-auth/user", {
              credentials: "include",
              headers: { "Authorization": `Bearer ${accessToken}` },
            });

            if (!response.ok) {
              if (supabase) await supabase.auth.signOut();
              toast({ title: "Login Error", description: "Unable to verify your account. Please try again.", variant: "destructive" });
              return;
            }

            const responseData = await response.json();
            const detectedUserType = responseData.userType;

            if (detectedUserType === "platform_admin" || detectedUserType === "admin") {
              setRedirectingToAdmin(true);
              setIsLoading(false);
              setTimeout(() => { window.location.href = "/admin/dashboard"; }, 800);
              return;
            }

            toast({ title: "Welcome back!", description: "Successfully signed in." });
            window.location.href = "/student/dashboard";
          } catch (fetchError) {
            console.error("Error fetching user data:", fetchError);
            const { supabase } = await import("@/lib/supabase");
            if (supabase) await supabase.auth.signOut();
            toast({ title: "Login Error", description: "Unable to verify your account. Please try again.", variant: "destructive" });
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!emailExistsError?.email) return;
    setIsResending(true);
    try {
      const { error } = await resendVerification(emailExistsError.email);
      if (error) {
        toast({ title: "Error", description: error.message || "Failed to resend verification email.", variant: "destructive" });
      } else {
        toast({ title: "Verification Email Sent", description: "Please check your inbox for the verification link." });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Error", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast({ title: "Error", description: error.message || "Failed to send reset email.", variant: "destructive" });
      } else {
        toast({ title: "Email Sent", description: "Check your inbox for password reset instructions." });
        setView("password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => setLocation("/");

  const handleBack = () => {
    if (view === "password" || view === "signup") {
      setView("email-entry");
    } else if (view === "forgot-password") {
      setView("password");
    } else if (view === "email-exists") {
      setEmailExistsError(null);
      setView("password");
    }
  };

  if (redirectingToAdmin) return <AdminRedirectOverlay />;

  const SocialButtons = () => (
    <div className="space-y-2.5">
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 justify-start gap-3 text-sm font-medium"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        data-testid="button-google-login"
      >
        <FaGoogle className="h-4 w-4 text-[#4285F4] shrink-0" />
        <span className="flex-1 text-center">Continue with Google</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 justify-start gap-3 text-sm font-medium"
        onClick={handleFacebookLogin}
        disabled={isLoading}
        data-testid="button-facebook-login"
      >
        <FaFacebook className="h-4 w-4 text-[#1877F2] shrink-0" />
        <span className="flex-1 text-center">Continue with Facebook</span>
      </Button>
    </div>
  );

  const OrDivider = ({ label = "Or continue with" }: { label?: string }) => (
    <div className="flex items-center gap-3 my-5">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <Separator className="flex-1" />
    </div>
  );

  const TermsFooter = () => (
    <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
      By continuing, you agree to ANZ Global Education's{" "}
      <button onClick={() => setShowTerms(true)} className="text-primary hover:underline" data-testid="link-terms">Terms of Use</button>
      {" "}and{" "}
      <button onClick={() => setShowPrivacy(true)} className="text-primary hover:underline" data-testid="link-privacy">Privacy Policy</button>.
    </p>
  );

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-sm">
          <div className="bg-background rounded-xl border border-border shadow-sm p-8 relative">

            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              data-testid="button-close-auth"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Back */}
            {view !== "email-entry" && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
                data-testid="button-back"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            {/* Logo */}
            <div className="flex justify-center mb-7">
              <img src={logoUrl} alt="ANZ Global Education" className="h-10 w-auto" />
            </div>

            {/* ── EMAIL ENTRY ── */}
            {view === "email-entry" && (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-foreground">Sign in to ANZ Global Education</h1>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email-input" className="text-sm font-medium">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email-input"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                      autoFocus
                      data-testid="input-email"
                      className={emailError ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                  </div>

                  <Button
                    type="button"
                    className="w-full h-11"
                    onClick={handleContinue}
                    disabled={isLoading}
                    data-testid="button-continue"
                  >
                    Continue
                  </Button>
                </div>

                <OrDivider />
                <SocialButtons />

                <div className="mt-5 text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsSignup(true); setView("signup"); }}
                    className="text-primary font-medium hover:underline"
                    data-testid="button-go-to-signup"
                  >
                    Create an account
                  </button>
                </div>

                <TermsFooter />
              </>
            )}

            {/* ── PASSWORD ── */}
            {view === "password" && (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-foreground">Sign in to ANZ Global Education</h1>
                </div>

                <button
                  type="button"
                  onClick={() => setView("email-entry")}
                  className="flex items-center gap-2 w-full px-3 py-2 mb-4 rounded-md border border-border bg-muted/30 text-sm text-foreground hover:bg-muted/50 transition-colors"
                  data-testid="button-change-email"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-left truncate">{email}</span>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>

                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password-input" className="text-sm font-medium">Password</Label>
                      <button
                        type="button"
                        onClick={() => setView("forgot-password")}
                        className="text-xs text-primary hover:underline"
                        data-testid="link-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password-input"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="pr-10"
                        autoFocus
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isLoading} data-testid="button-sign-in">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
                  </Button>
                </form>

                <OrDivider />
                <SocialButtons />

                <div className="mt-5 text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsSignup(true); setView("signup"); }}
                    className="text-primary font-medium hover:underline"
                    data-testid="button-go-to-signup-from-password"
                  >
                    Create an account
                  </button>
                </div>

                <TermsFooter />
              </>
            )}

            {/* ── SIGNUP ── */}
            {view === "signup" && (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-foreground">Create your ANZ account</h1>
                  <p className="text-sm text-muted-foreground mt-1">Join ANZ Global Education — it's free</p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={isLoading}
                        data-testid="input-firstname"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={isLoading}
                        data-testid="input-lastname"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-sm font-medium">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      data-testid="input-signup-email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-sm font-medium">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min. 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="pr-10"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="referralCode" className="text-sm font-medium">
                      Referral Code{" "}
                      <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="referralCode"
                      type="text"
                      placeholder="Enter referral code if you have one"
                      value={referralCode}
                      onChange={(e) => {
                        const newCode = e.target.value.toUpperCase();
                        setReferralCode(newCode);
                        if (newCode) localStorage.setItem('referral_code', newCode);
                        else localStorage.removeItem('referral_code');
                      }}
                      disabled={isLoading}
                      data-testid="input-referral-code"
                    />
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isLoading} data-testid="button-create-account">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account...</> : "Create Account"}
                  </Button>
                </form>

                <OrDivider label="Or sign up with" />
                <SocialButtons />

                <div className="mt-5 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsSignup(false); setView("email-entry"); }}
                    className="text-primary font-medium hover:underline"
                    data-testid="button-go-to-signin"
                  >
                    Sign in
                  </button>
                </div>

                <TermsFooter />
              </>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {view === "forgot-password" && (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your email and we'll send you a reset link
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                      data-testid="input-reset-email"
                    />
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isLoading} data-testid="button-send-reset">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Reset Link"}
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setView("password")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                    data-testid="button-back-to-signin"
                  >
                    Back to sign in
                  </button>
                </div>
              </>
            )}

            {/* ── EMAIL EXISTS ── */}
            {view === "email-exists" && emailExistsError && (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-foreground">
                    {emailExistsError.verified ? "Email Already Registered" : "Email Not Verified"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {emailExistsError.verified
                      ? "This email is already associated with an account."
                      : "Your account exists but the email hasn't been verified yet."}
                  </p>
                </div>

                <Alert className="mb-5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-medium">{emailExistsError.email}</span> is already in our system.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {emailExistsError.verified ? (
                    <>
                      <Button
                        className="w-full h-11 gap-2"
                        onClick={() => { setIsSignup(false); setView("password"); }}
                        data-testid="button-go-to-signin"
                      >
                        <Mail className="h-4 w-4" />
                        Sign In Instead
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-11 gap-2"
                        onClick={() => setView("forgot-password")}
                        data-testid="button-go-to-reset"
                      >
                        <KeyRound className="h-4 w-4" />
                        Reset Password
                      </Button>
                      <p className="text-sm text-muted-foreground text-center mt-4">
                        Forgot your password? Use the reset option above to regain access.
                      </p>
                    </>
                  ) : (
                    <>
                      <Button
                        className="w-full h-11 gap-2"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        data-testid="button-resend-verification"
                      >
                        {isResending
                          ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                          : <><RefreshCw className="h-4 w-4" />Resend Verification Email</>}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-11 gap-2"
                        onClick={() => { setIsSignup(false); setView("password"); }}
                        data-testid="button-try-signin"
                      >
                        <Mail className="h-4 w-4" />
                        Try Signing In
                      </Button>
                      <div className="bg-muted/50 rounded-lg p-4 mt-2">
                        <p className="text-sm text-muted-foreground font-medium">Tips:</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                          <li>Check your spam or junk folder</li>
                          <li>Make sure you're checking the correct email inbox</li>
                          <li>The link expires after 24 hours</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => { setEmailExistsError(null); setIsSignup(true); setEmail(""); setView("signup"); }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                    data-testid="button-try-different-email"
                  >
                    Use a different email address
                  </button>
                </div>
              </>
            )}

          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            Copyright {new Date().getFullYear()} | ANZ Global Education
          </p>
        </div>
      </div>

      {/* Terms Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="dialog-terms">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Terms of Use</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">Last Updated: December 2024</p>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">1. Acceptance of Terms</h3>
                <p>By accessing and using ANZ Global Education's platform, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">2. Description of Service</h3>
                <p>ANZ Global Education provides an online platform connecting international students with educational institutions. Our services include course discovery, application assistance, and student support services.</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">3. User Accounts</h3>
                <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to provide accurate and complete information when creating an account.</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">4. User Conduct</h3>
                <p>You agree not to:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>Provide false or misleading information</li>
                  <li>Use the platform for any unlawful purpose</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with other users' use of the platform</li>
                </ul>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">5. Intellectual Property</h3>
                <p>All content on this platform, including text, graphics, logos, and software, is the property of ANZ Global Education or its licensors and is protected by copyright and intellectual property laws.</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">6. Limitation of Liability</h3>
                <p>ANZ Global Education is not liable for any indirect, incidental, or consequential damages arising from your use of our services. We do not guarantee admission to any educational institution.</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">7. Changes to Terms</h3>
                <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">8. Contact Us</h3>
                <p>If you have any questions about these Terms, please contact us at support@anzglobaleducation.com</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="dialog-privacy">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Privacy Policy</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">Last Updated: December 2024</p>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">1. Information We Collect</h3>
                <p>We collect information you provide directly, including:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>Name, email address, and contact information</li>
                  <li>Educational background and academic records</li>
                  <li>Passport and identification documents</li>
                  <li>Application materials and supporting documents</li>
                </ul>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">2. How We Use Your Information</h3>
                <p>We use your information to:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>Process your applications to educational institutions</li>
                  <li>Communicate with you about your applications</li>
                  <li>Provide personalized course recommendations</li>
                  <li>Improve our services and user experience</li>
                </ul>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">3. Information Sharing</h3>
                <p>We may share your information with:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>Educational institutions you apply to</li>
                  <li>Service providers who assist our operations</li>
                  <li>Government authorities when required by law</li>
                </ul>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">4. Data Security</h3>
                <p>We implement appropriate security measures to protect your personal information, including encryption, secure servers, and access controls.</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">5. Your Rights</h3>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>Access your personal information</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Withdraw consent for data processing</li>
                </ul>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">6. Cookies and Tracking</h3>
                <p>We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can control cookie preferences through your browser settings.</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">7. International Transfers</h3>
                <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-foreground">8. Contact Us</h3>
                <p>For privacy-related inquiries, please contact our Data Protection Officer at privacy@anzglobaleducation.com</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
