import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Lock, Building2, GraduationCap } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function InstitutionLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
      // Login returns a Response object, need to parse JSON
      const response = await apiRequest("POST", "/api/auth/login", data);
      const userData = await response.json();
      
      // Verify this is a university/institution user before proceeding
      if (userData.userType !== "university" && userData.userType !== "institution_admin") {
        // Log them out since they used wrong portal
        try {
          await apiRequest("POST", "/api/logout", {});
        } catch {
          // Ignore logout errors
        }
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        toast({
          title: "Access Denied",
          description: "This login portal is for institution partners only. Please use the appropriate login page for your account type.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Invalidate auth cache so useAuth hook refetches and knows user is authenticated
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Small delay to ensure session is properly written before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      toast({
        title: "Welcome to Institution Portal",
        description: `Welcome back, ${userData.firstName || userData.email}!`,
      });

      // Redirect to university dashboard
      setLocation("/university/dashboard");
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center" data-testid="link-logo">
            <img src={logoUrl} alt="ANZ Global Education" className="h-9 w-auto" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Institution Badge */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Institution Portal</h1>
            <p className="text-muted-foreground mt-1">Partner access for universities and education providers</p>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Sign In</CardTitle>
              <CardDescription>
                Enter your institution credentials to access the partner dashboard
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
                        <FormLabel>Institution Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="admin@university.edu.au"
                              className="pl-10"
                              data-testid="input-institution-email"
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
                              type="password"
                              placeholder="Enter your password"
                              className="pl-10"
                              data-testid="input-institution-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-institution-login"
                  >
                    {isLoading ? "Signing in..." : "Sign In to Institution Portal"}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6 pt-6 border-t">
                <div className="text-center text-sm text-muted-foreground">
                  <p className="mb-3">Not an institution partner yet?</p>
                  <Link href="/partner-with-us">
                    <Button variant="outline" className="w-full" data-testid="link-partner-with-us">
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Become a Partner Institution
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Need help? Contact our partner support team at</p>
            <a 
              href="mailto:partners@anzglobal.com.au" 
              className="text-primary hover:underline"
              data-testid="link-partner-support"
            >
              partners@anzglobal.com.au
            </a>
          </div>

          {/* Student Redirect */}
          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              Are you a student?{" "}
              <a 
                href="/auth" 
                className="text-primary hover:underline font-medium"
                data-testid="link-student-login"
              >
                Login here
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-4 bg-background">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Copyright {new Date().getFullYear()} | ANZ Global Education - Institution Portal</p>
        </div>
      </footer>
    </div>
  );
}
