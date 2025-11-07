import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, UserPlus, LogIn, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InstitutionAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstitutionAuthModal({ open, onOpenChange }: InstitutionAuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-institution-auth">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
            <Building2 className="h-8 w-8 text-secondary" />
          </div>
          <DialogTitle className="text-center text-2xl">Welcome, Institution!</DialogTitle>
          <DialogDescription className="text-center">
            Choose an option below to showcase your programs and connect with students
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Card className="border-2 border-transparent hover:border-primary/50 transition-all hover-elevate active-elevate-2 cursor-pointer" data-testid="card-institution-login">
            <a href="/api/login?type=university" className="block">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <LogIn className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Login</CardTitle>
                    <CardDescription>Already registered?</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Access your dashboard, manage courses, and review applications
                </p>
                <a 
                  href="https://replit.com/forgot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="link-forgot-password-institution"
                >
                  Forgot your password?
                </a>
              </CardContent>
            </a>
          </Card>

          <Card className="border-2 border-transparent hover:border-secondary/50 transition-all hover-elevate active-elevate-2 cursor-pointer" data-testid="card-institution-register">
            <a href="/api/login?type=university" className="block">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                    <UserPlus className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Register Institution</CardTitle>
                    <CardDescription>New to the platform?</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create your institution profile and start attracting international students
                </p>
              </CardContent>
            </a>
          </Card>
        </div>

        <div className="rounded-lg bg-accent/10 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">AI-Powered Tools</p>
              <p className="text-muted-foreground">
                Generate compelling course descriptions and manage applications effortlessly
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
