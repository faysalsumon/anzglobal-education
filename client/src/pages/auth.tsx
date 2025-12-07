import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Mail, Building2, GraduationCap, X, ExternalLink } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import authImage from "@assets/stock_images/happy_diverse_intern_25e20ae6.jpg";

type AuthView = "main" | "more-options" | "email" | "user-type";
type UserType = "student" | "institution" | null;

export default function AuthPage() {
  const [view, setView] = useState<AuthView>("main");
  const [userType, setUserType] = useState<UserType>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleStudentLogin = () => {
    window.location.href = "/api/student/login";
  };

  const handleInstitutionLogin = () => {
    window.location.href = "/api/login?type=university";
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/student/login";
  };

  const handleFacebookClick = () => {
    toast({
      title: "Coming Soon",
      description: "Facebook login will be available soon. Please use Google or continue with another option.",
    });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Email Authentication Coming Soon",
      description: "Email/password login will be available in a future update. For now, please use Google or Replit authentication.",
    });
  };

  const handleUserTypeSelect = (type: "student" | "institution") => {
    setUserType(type);
    if (type === "student") {
      handleStudentLogin();
    } else {
      handleInstitutionLogin();
    }
  };

  const handleClose = () => {
    setLocation("/");
  };

  const handleBack = () => {
    if (view === "email") {
      setView("main");
    } else if (view === "more-options") {
      setView("main");
    } else if (view === "user-type") {
      setView("main");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <header className="border-b bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center" data-testid="link-logo">
            <img src={logoUrl} alt="ANZ Global Education" className="h-9 w-auto" />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-muted transition-colors"
            data-testid="button-close-auth"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="w-full md:w-1/2 p-8 md:p-10">
            {view !== "main" && (
              <button 
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                data-testid="button-back"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            {view === "main" && (
              <>
                <div className="space-y-2 mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Log in or sign up in seconds
                  </h1>
                  <p className="text-muted-foreground">
                    Use your Google account or another service to continue with ANZ Global Education (it's free)!
                  </p>
                </div>

                <div className="space-y-3">
                  <Button 
                    variant="outline"
                    className="w-full h-12 justify-start gap-3 text-base font-medium border-border/50 hover-elevate"
                    onClick={handleGoogleLogin}
                    data-testid="button-google-login"
                  >
                    <FaGoogle className="h-5 w-5 text-[#4285F4]" />
                    <span>Continue with Google</span>
                  </Button>

                  <Button 
                    variant="outline"
                    className="w-full h-12 justify-start gap-3 text-base font-medium border-border/50 opacity-60 cursor-not-allowed"
                    onClick={handleFacebookClick}
                    disabled
                    data-testid="button-facebook-login"
                  >
                    <FaFacebook className="h-5 w-5 text-[#1877F2]" />
                    <span>Continue with Facebook</span>
                    <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                  </Button>

                  <Button 
                    variant="outline"
                    className="w-full h-12 justify-start gap-3 text-base font-medium border-border/50 hover-elevate"
                    onClick={() => setView("email")}
                    data-testid="button-email-login"
                  >
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span>Continue with email</span>
                  </Button>

                  <button
                    onClick={() => setView("more-options")}
                    className="w-full py-3 text-center text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                    data-testid="button-more-options"
                  >
                    Continue another way
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center mb-4">
                    By continuing, you agree to ANZ Global Education's{" "}
                    <Link href="/terms" className="text-primary hover:underline">Terms of Use</Link>. Read our{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>

                  <button
                    onClick={() => setView("user-type")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                    data-testid="button-signup-institution"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Signing up as an institution?</span>
                  </button>
                </div>
              </>
            )}

            {view === "more-options" && (
              <>
                <div className="space-y-2 mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Continue to ANZ Global
                  </h1>
                  <p className="text-muted-foreground">
                    Choose your preferred sign-in method
                  </p>
                </div>

                <div className="space-y-3">
                  <Button 
                    variant="outline"
                    className="w-full h-12 justify-start gap-3 text-base font-medium border-border/50 hover-elevate"
                    onClick={handleGoogleLogin}
                    data-testid="button-google-login-alt"
                  >
                    <FaGoogle className="h-5 w-5 text-[#4285F4]" />
                    <span>Continue with Google</span>
                  </Button>

                  <Separator className="my-4" />

                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Our secure authentication is powered by Replit. You can sign in with your Google account through this option.
                    </p>
                    <Button 
                      className="w-full h-12 gap-3 text-base font-medium"
                      onClick={handleStudentLogin}
                      data-testid="button-replit-login"
                    >
                      <ExternalLink className="h-5 w-5" />
                      <span>Sign in with Replit</span>
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Replit authentication supports Google login and provides secure session management.
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    By continuing, you agree to ANZ Global Education's{" "}
                    <Link href="/terms" className="text-primary hover:underline">Terms of Use</Link>. Read our{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>
                </div>
              </>
            )}

            {view === "email" && (
              <>
                <div className="space-y-2 mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {isSignup ? "Create your account" : "Sign in with email"}
                  </h1>
                  <p className="text-muted-foreground">
                    {isSignup 
                      ? "Enter your details to create a new account" 
                      : "Enter your email and password to continue"}
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Email/password authentication is coming soon. For now, please use Google sign-in for the best experience.
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {isSignup && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName"
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          data-testid="input-firstname"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName"
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          data-testid="input-lastname"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password"
                      type="password"
                      placeholder={isSignup ? "Create a password" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="input-password"
                    />
                  </div>

                  {!isSignup && (
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        className="text-sm text-primary hover:underline"
                        data-testid="link-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12"
                    data-testid="button-submit-email"
                  >
                    {isSignup ? "Create Account" : "Sign In"}
                  </Button>
                </form>

                <div className="mt-4">
                  <Separator className="my-4" />
                  <Button 
                    variant="outline"
                    className="w-full h-12 gap-3"
                    onClick={handleGoogleLogin}
                    data-testid="button-google-alt"
                  >
                    <FaGoogle className="h-5 w-5 text-[#4285F4]" />
                    <span>Continue with Google instead</span>
                  </Button>
                </div>

                <div className="mt-6 text-center">
                  <button 
                    type="button"
                    onClick={() => setIsSignup(!isSignup)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-signup"
                  >
                    {isSignup 
                      ? "Already have an account? Sign in" 
                      : "Don't have an account? Sign up"}
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    By continuing, you agree to ANZ Global Education's{" "}
                    <Link href="/terms" className="text-primary hover:underline">Terms of Use</Link>. Read our{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>
                </div>
              </>
            )}

            {view === "user-type" && (
              <>
                <div className="space-y-2 mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    How would you like to join?
                  </h1>
                  <p className="text-muted-foreground">
                    Select your account type to get started
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => handleUserTypeSelect("student")}
                    className="w-full p-6 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    data-testid="button-select-student"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">I'm a Student</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Discover courses, apply to universities, and track your applications
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleUserTypeSelect("institution")}
                    className="w-full p-6 rounded-xl border border-border/50 hover:border-secondary hover:bg-secondary/5 transition-all text-left group"
                    data-testid="button-select-institution"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                        <Building2 className="h-6 w-6 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">I'm an Institution</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          List your courses, manage applications, and connect with students
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    By continuing, you agree to ANZ Global Education's{" "}
                    <Link href="/terms" className="text-primary hover:underline">Terms of Use</Link>. Read our{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="hidden md:block w-1/2 relative">
            <img 
              src={authImage} 
              alt="International students studying" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 right-8">
              <div className="bg-background/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <p className="text-sm font-medium text-foreground">
                  "ANZ Global helped me find the perfect course in Australia. The process was so smooth!"
                </p>
                <p className="text-xs text-muted-foreground mt-2">— Maria, Student from Brazil</p>
              </div>
            </div>
          </div>
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
