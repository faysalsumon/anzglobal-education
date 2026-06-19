import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { GraduationCap, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

export default function UserTypeSelection() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const setUserTypeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/set-user-type", { userType: "student" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supabase-auth/user"] });
      navigate("/student/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    setUserTypeMutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex flex-col items-center gap-6 text-center">
        <img src={logoUrl} alt="ANZ Global Education" className="h-12 w-auto" />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Setting up your account...</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground mt-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">ANZ Global Education — Student Portal</span>
        </div>
      </div>
    </div>
  );
}
