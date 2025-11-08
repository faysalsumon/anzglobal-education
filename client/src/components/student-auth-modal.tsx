import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight } from "lucide-react";

interface StudentAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentAuthModal({ open, onOpenChange }: StudentAuthModalProps) {
  const handleLogin = () => {
    const loginUrl = `${window.location.origin}/api/login?type=student`;
    window.open(loginUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] gap-6" data-testid="dialog-student-auth">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Student Access</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Sign in or create your account to start exploring courses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button 
            onClick={handleLogin}
            className="w-full h-11 justify-between group"
            variant="default"
            data-testid="button-student-auth"
          >
            <span>Continue with Replit</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>

          <div className="text-center">
            <a 
              href="https://replit.com/forgot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-forgot-password"
            >
              Forgot password?
            </a>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-center text-muted-foreground">
            Secure authentication powered by Replit. Your account will be created automatically on first sign-in.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
