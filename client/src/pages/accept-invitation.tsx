/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle, XCircle, Mail, Shield, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

const acceptFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AcceptFormData = z.infer<typeof acceptFormSchema>;

interface InvitationDetails {
  valid: boolean;
  invitation?: {
    id: string;
    email: string;
    userType: string;
    expiresAt: string;
    role?: {
      displayName: string;
    };
  };
  error?: string;
}

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    setToken(tokenParam);
  }, []);

  const form = useForm<AcceptFormData>({
    resolver: zodResolver(acceptFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { data: validationResult, isLoading: isValidating, error: validationError } = useQuery<InvitationDetails>({
    queryKey: ["/api/supabase-auth/invitation/validate", token],
    queryFn: async () => {
      const response = await fetch(`/api/supabase-auth/invitation/validate?token=${token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to validate invitation");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async (data: AcceptFormData) => {
      const response = await apiRequest("POST", "/api/supabase-auth/invitation/accept", {
        token,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to create account");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "Your account has been set up successfully. You can now sign in.",
      });
      setTimeout(() => {
        setLocation("/auth");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create account",
        description: error.message || "Please try again or contact support",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AcceptFormData) => {
    acceptMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src={logoUrl} alt="ANZ Global Education" className="h-12 mx-auto mb-4" />
            <CardTitle className="text-xl text-destructive">Invalid Link</CardTitle>
            <CardDescription>
              No invitation token was provided. Please use the link from your invitation email.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/auth")} data-testid="button-go-to-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Validating your invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationError || !validationResult?.valid) {
    const errorMessage = validationError instanceof Error 
      ? validationError.message 
      : validationResult?.error || "This invitation is no longer valid";
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src={logoUrl} alt="ANZ Global Education" className="h-12 mx-auto mb-4" />
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <CardTitle className="text-xl">Invitation Invalid</CardTitle>
            <CardDescription className="text-destructive">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the person who invited you to request a new invitation.
            </p>
            <Button onClick={() => setLocation("/auth")} data-testid="button-go-to-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invitation = validationResult.invitation;

  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src={logoUrl} alt="ANZ Global Education" className="h-12 mx-auto mb-4" />
            <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <CardTitle className="text-xl">Account Created!</CardTitle>
            <CardDescription>
              Your account has been set up successfully. Redirecting you to login...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logoUrl} alt="ANZ Global Education" className="h-12 mx-auto mb-4" />
          <CardTitle className="text-xl">Join ANZ Global Education</CardTitle>
          <CardDescription>
            Complete your account setup to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium" data-testid="text-invitation-email">{invitation?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium" data-testid="text-invitation-role">{invitation?.role?.displayName || "Team Member"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Account Type</p>
                <p className="font-medium capitalize" data-testid="text-invitation-type">
                  {invitation?.userType === "platform_admin" ? "Platform Admin" : "Admin"}
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John" 
                          data-testid="input-first-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Doe" 
                          data-testid="input-last-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Create a strong password"
                        data-testid="input-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm your password"
                        data-testid="input-confirm-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters with uppercase, lowercase, and numbers.
              </p>

              <Button 
                type="submit" 
                className="w-full"
                disabled={acceptMutation.isPending}
                data-testid="button-create-account"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button 
              variant="ghost" 
              className="p-0 h-auto text-primary underline-offset-4 hover:underline"
              onClick={() => setLocation("/auth")}
              data-testid="link-go-to-login"
            >
              Sign in
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
