import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const userType = (user as any)?.platformUser?.userType || user?.userType || "student";
    
    switch (userType) {
      case "platform_admin":
      case "admin":
        setLocation("/admin/dashboard");
        break;
      case "institution_user":
        setLocation("/university/dashboard");
        break;
      case "student":
      default:
        setLocation("/student/dashboard");
        break;
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
