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
import { FaGoogle, FaFacebook } from "react-icons/fa";

interface StudentAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentAuthModal({ open, onOpenChange }: StudentAuthModalProps) {
  const [activeTab, setActiveTab] = useState("login");

  const handleReplitLogin = () => {
    window.location.href = "/auth";
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`${provider} login - coming soon!`);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email login - coming soon!");
  };

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email signup - coming soon!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[420px] max-h-[85vh] overflow-y-auto p-4 sm:p-5 gap-2" data-testid="dialog-student-auth">
        <DialogHeader className="space-y-1.5">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg sm:text-xl">Welcome Student</DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm">
            Sign in or create a new account
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="tab-login" className="text-xs sm:text-sm">Login</TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-signup" className="text-xs sm:text-sm">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Button 
                className="w-full h-10 gap-2.5 text-sm font-medium text-white border-0"
                style={{ backgroundColor: '#DB4437' }}
                onClick={() => handleSocialLogin('google')}
                data-testid="button-login-google"
                disabled
              >
                <FaGoogle className="h-5 w-5" />
                <span>Continue with Google</span>
              </Button>
              <Button 
                className="w-full h-10 gap-2.5 text-sm font-medium text-white border-0"
                style={{ backgroundColor: '#1877F2' }}
                onClick={() => handleSocialLogin('facebook')}
                data-testid="button-login-facebook"
                disabled
              >
                <FaFacebook className="h-5 w-5" />
                <span>Continue with Facebook</span>
              </Button>
              <Button 
                variant="default"
                className="w-full h-10 gap-2.5 text-sm font-medium"
                onClick={handleReplitLogin}
                data-testid="button-login-replit"
              >
                <GraduationCap className="h-5 w-5" />
                <span>Continue with Replit</span>
              </Button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-gray-500 font-medium">OR</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-medium text-gray-700">Email Address</Label>
                <Input 
                  id="login-email" 
                  type="email" 
                  placeholder="Enter your email"
                  data-testid="input-login-email"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs font-medium text-gray-700">Password</Label>
                <Input 
                  id="login-password" 
                  type="password" 
                  placeholder="Enter your password"
                  data-testid="input-login-password"
                  className="h-10 text-sm"
                />
              </div>
              <div className="flex items-center justify-end">
                <a 
                  href="#" 
                  className="text-xs text-primary hover:underline font-medium"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </a>
              </div>
              <Button type="submit" className="w-full h-10 text-sm font-medium" data-testid="button-login-submit">
                Log In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Button 
                className="w-full h-10 gap-2.5 text-sm font-medium text-white border-0"
                style={{ backgroundColor: '#DB4437' }}
                onClick={() => handleSocialLogin('google')}
                data-testid="button-signup-google"
                disabled
              >
                <FaGoogle className="h-5 w-5" />
                <span>Sign up with Google</span>
              </Button>
              <Button 
                className="w-full h-10 gap-2.5 text-sm font-medium text-white border-0"
                style={{ backgroundColor: '#1877F2' }}
                onClick={() => handleSocialLogin('facebook')}
                data-testid="button-signup-facebook"
                disabled
              >
                <FaFacebook className="h-5 w-5" />
                <span>Sign up with Facebook</span>
              </Button>
              <Button 
                variant="default"
                className="w-full h-10 gap-2.5 text-sm font-medium"
                onClick={handleReplitLogin}
                data-testid="button-signup-replit"
              >
                <GraduationCap className="h-5 w-5" />
                <span>Sign up with Replit</span>
              </Button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-gray-500 font-medium">OR</span>
              </div>
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-firstname" className="text-xs font-medium text-gray-700">First Name</Label>
                  <Input 
                    id="signup-firstname" 
                    type="text" 
                    placeholder="John"
                    data-testid="input-signup-firstname"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-lastname" className="text-xs font-medium text-gray-700">Last Name</Label>
                  <Input 
                    id="signup-lastname" 
                    type="text" 
                    placeholder="Doe"
                    data-testid="input-signup-lastname"
                    className="h-10 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-xs font-medium text-gray-700">Email Address</Label>
                <Input 
                  id="signup-email" 
                  type="email" 
                  placeholder="Enter your email"
                  data-testid="input-signup-email"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-xs font-medium text-gray-700">Password</Label>
                <Input 
                  id="signup-password" 
                  type="password" 
                  placeholder="Create a password"
                  data-testid="input-signup-password"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-confirm-password" className="text-xs font-medium text-gray-700">Confirm Password</Label>
                <Input 
                  id="signup-confirm-password" 
                  type="password" 
                  placeholder="Confirm your password"
                  data-testid="input-signup-confirm-password"
                  className="h-10 text-sm"
                />
              </div>
              <Button type="submit" className="w-full h-10 text-sm font-medium" data-testid="button-signup-submit">
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="pt-2 border-t mt-2">
          <p className="text-[10px] sm:text-xs text-center text-gray-500">
            By continuing, you agree to our{" "}
            <a href="#" className="text-primary hover:underline font-medium">Terms</a>
            {" "}and{" "}
            <a href="#" className="text-primary hover:underline font-medium">Privacy Policy</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
