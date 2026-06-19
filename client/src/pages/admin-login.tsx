/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Helmet } from "react-helmet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { clearCsrfToken } from "@/hooks/useCsrf";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, isAuthenticated, isAuthResolved } = useAuth();

  useEffect(() => {
    if (isAuthResolved && isAuthenticated && user) {
      if (user.userType === "platform_admin" || user.userType === "admin") {
        setLocation("/admin/dashboard");
      } else if (user.userType === "student") {
        setLocation("/student/dashboard");
      } else if (user.userType === "institution_admin" || user.userType === "university") {
        setLocation("/auth");
      }
    }
  }, [isAuthResolved, isAuthenticated, user, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      if (!supabase) {
        throw new Error("Authentication service not available");
      }

      const { data: _authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Clear CSRF token cache so a fresh token is fetched with the new session identifier
      clearCsrfToken();

      // Invalidate auth cache and refetch to get updated user data
      await queryClient.invalidateQueries({ queryKey: ["/api/supabase-auth/user"] });
      
      // Fetch the platform user data
      const user = await queryClient.fetchQuery({
        queryKey: ["/api/supabase-auth/user"],
      }) as any;
      
      // Verify user is platform_admin or admin
      if (user.userType !== "platform_admin" && user.userType !== "admin") {
        await supabase.auth.signOut();
        throw new Error("Access denied. This portal is for platform administrators only. Students and institutions should use the main Sign In page at /auth");
      }
      
      // Check if user needs to reset their password (first login with temp password)
      if (user.requiresPasswordReset) {
        toast({
          title: "Password Change Required",
          description: "Please set a new password to continue.",
        });
        setLocation("/force-password-reset");
        return;
      }
      
      toast({
        title: "Login successful",
        description: `Welcome to Admin Portal, ${user.firstName || user.email}!`,
      });

      setLocation("/admin/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xl font-bold">ANZ Global Education</div>
              <div className="text-xs text-muted-foreground">Central Login Portal</div>
            </div>
          </div>
          <CardTitle className="text-2xl">Platform Admin Access</CardTitle>
          <CardDescription>
            Authorized personnel only. Enter your admin credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="your.email@example.com"
                          className="pl-10"
                          data-testid="input-email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          data-testid="input-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                          data-testid="button-toggle-password"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Link
                  href="/admin/forgot-password"
                  className="text-sm text-primary hover:underline"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Platform administration access only</p>
            <p className="mt-2 text-xs">Contact your system administrator for access.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
