import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";
import { FaGoogle, FaFacebook, FaApple } from "react-icons/fa";

interface StudentAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentAuthModal({ open, onOpenChange }: StudentAuthModalProps) {
  const [activeTab, setActiveTab] = useState("login");

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email login");
  };

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email signup");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] gap-6" data-testid="dialog-student-auth">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Welcome Student</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Sign in to your account or create a new one to get started
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-6">
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full h-11 gap-3"
                onClick={() => handleSocialLogin('google')}
                data-testid="button-login-google"
              >
                <FaGoogle className="h-5 w-5 text-red-500" />
                <span>Continue with Google</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-11 gap-3"
                onClick={() => handleSocialLogin('facebook')}
                data-testid="button-login-facebook"
              >
                <FaFacebook className="h-5 w-5 text-blue-600" />
                <span>Continue with Facebook</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-11 gap-3"
                onClick={() => handleSocialLogin('apple')}
                data-testid="button-login-apple"
              >
                <FaApple className="h-5 w-5" />
                <span>Continue with Apple</span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input 
                  id="login-email" 
                  type="email" 
                  placeholder="you@example.com"
                  data-testid="input-login-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input 
                  id="login-password" 
                  type="password" 
                  placeholder="••••••••"
                  data-testid="input-login-password"
                />
              </div>
              <div className="flex items-center justify-between">
                <a 
                  href="#" 
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </a>
              </div>
              <Button type="submit" className="w-full" data-testid="button-login-submit">
                Log In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-6">
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full h-11 gap-3"
                onClick={() => handleSocialLogin('google')}
                data-testid="button-signup-google"
              >
                <FaGoogle className="h-5 w-5 text-red-500" />
                <span>Sign up with Google</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-11 gap-3"
                onClick={() => handleSocialLogin('facebook')}
                data-testid="button-signup-facebook"
              >
                <FaFacebook className="h-5 w-5 text-blue-600" />
                <span>Sign up with Facebook</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-11 gap-3"
                onClick={() => handleSocialLogin('apple')}
                data-testid="button-signup-apple"
              >
                <FaApple className="h-5 w-5" />
                <span>Sign up with Apple</span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or sign up with</span>
              </div>
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-firstname">First Name</Label>
                  <Input 
                    id="signup-firstname" 
                    type="text" 
                    placeholder="John"
                    data-testid="input-signup-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-lastname">Last Name</Label>
                  <Input 
                    id="signup-lastname" 
                    type="text" 
                    placeholder="Doe"
                    data-testid="input-signup-lastname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input 
                  id="signup-email" 
                  type="email" 
                  placeholder="you@example.com"
                  data-testid="input-signup-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input 
                  id="signup-password" 
                  type="password" 
                  placeholder="••••••••"
                  data-testid="input-signup-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                <Input 
                  id="signup-confirm-password" 
                  type="password" 
                  placeholder="••••••••"
                  data-testid="input-signup-confirm-password"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="button-signup-submit">
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
