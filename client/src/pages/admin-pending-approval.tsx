import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail, LogOut } from "lucide-react";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { useQuery } from "@tanstack/react-query";

export default function AdminPendingApproval() {
  const [, setLocation] = useLocation();
  const { signOut } = useSupabaseAuth();

  const { data: user } = useQuery<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    approvalStatus: string | null;
  }>({
    queryKey: ["/api/supabase-auth/user"],
  });

  const handleSignOut = async () => {
    await signOut();
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Approval Pending</CardTitle>
          <CardDescription className="text-base">
            Your account is awaiting approval from an administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Thank you for registering as a platform administrator. Your account is currently under review.
            </p>
            <p className="text-sm text-muted-foreground">
              An existing administrator will review your request and assign you an appropriate role. You'll receive an email notification once your account is approved.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Registered Email</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email || "Loading..."}</p>
            </div>
          </div>

          {user?.approvalStatus === "rejected" && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">Your request was not approved</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please contact the administrator for more information.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={handleSignOut} className="w-full" data-testid="button-signout">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Need help? Contact support at{" "}
            <a href="mailto:support@anzglobal.com.au" className="text-primary hover:underline">
              support@anzglobal.com.au
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
