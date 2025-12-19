import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

export default function UserTypeSelection() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const setUserTypeMutation = useMutation({
    mutationFn: async (userType: "institution_admin" | "student") => {
      return await apiRequest("POST", "/api/auth/set-user-type", { userType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <img src={logoUrl} alt="ANZ Global Education" className="h-12 w-auto mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-foreground">Welcome to ANZ Global Education</h1>
          <p className="text-lg text-muted-foreground">Please select how you'd like to use the platform</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover-elevate cursor-pointer transition-all" onClick={() => !setUserTypeMutation.isPending && setUserTypeMutation.mutate("institution_admin")}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">I'm an Institution</CardTitle>
              <CardDescription>Register your institution and manage courses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-secondary">✓</span>
                <span>Create and manage your university profile</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-secondary">✓</span>
                <span>List courses with AI-assisted descriptions</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-secondary">✓</span>
                <span>Review and manage student applications</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-secondary">✓</span>
                <span>Access analytics and insights</span>
              </div>
              <Button 
                className="w-full mt-4" 
                size="lg"
                disabled={setUserTypeMutation.isPending}
                data-testid="button-select-university"
              >
                {setUserTypeMutation.isPending ? "Setting up..." : "Continue as Institution"}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer transition-all" onClick={() => !setUserTypeMutation.isPending && setUserTypeMutation.mutate("student")}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                <GraduationCap className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl">I'm a Student</CardTitle>
              <CardDescription>Find and apply to your dream courses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-secondary">✓</span>
                <span>Browse thousands of courses worldwide</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-secondary">✓</span>
                <span>Build your profile with AI assistance</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-secondary">✓</span>
                <span>Apply directly to universities</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-secondary">✓</span>
                <span>Track your application status</span>
              </div>
              <Button 
                className="w-full mt-4" 
                size="lg"
                disabled={setUserTypeMutation.isPending}
                data-testid="button-select-student"
              >
                {setUserTypeMutation.isPending ? "Setting up..." : "Continue as Student"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
