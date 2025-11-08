import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";

interface InstitutionAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstitutionAuthModal({ open, onOpenChange }: InstitutionAuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] gap-6" data-testid="dialog-institution-auth">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
            <Building2 className="h-6 w-6 text-secondary" />
          </div>
          <DialogTitle className="text-center text-xl">Institution Access</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Sign in or register to showcase your programs and manage applications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button 
            asChild
            className="w-full h-11 justify-between group"
            variant="default"
            data-testid="button-institution-auth"
          >
            <a href="/api/login?type=university" target="_top">
              <span>Continue with Replit</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>

          <div className="text-center">
            <a 
              href="https://replit.com/forgot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-forgot-password-institution"
            >
              Forgot password?
            </a>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-center text-muted-foreground">
            Secure authentication powered by Replit. Your institution profile will be created automatically on first sign-in.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
