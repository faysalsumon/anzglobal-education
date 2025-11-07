import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, UserPlus, LogIn, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StudentAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentAuthModal({ open, onOpenChange }: StudentAuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-student-auth">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Welcome, Student!</DialogTitle>
          <DialogDescription className="text-center">
            Choose an option below to get started with your educational journey
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Card className="border-2 border-transparent hover:border-primary/50 transition-all hover-elevate active-elevate-2 cursor-pointer" data-testid="card-student-login">
            <a href="/api/login?type=student" className="block">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <LogIn className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Login</CardTitle>
                    <CardDescription>Already have an account?</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Access your dashboard, track applications, and manage your profile
                </p>
              </CardContent>
            </a>
          </Card>

          <Card className="border-2 border-transparent hover:border-secondary/50 transition-all hover-elevate active-elevate-2 cursor-pointer" data-testid="card-student-register">
            <a href="/api/login?type=student" className="block">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                    <UserPlus className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Create Account</CardTitle>
                    <CardDescription>New to the platform?</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create your profile, discover courses, and apply to universities
                </p>
              </CardContent>
            </a>
          </Card>
        </div>

        <div className="rounded-lg bg-accent/10 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">AI-Powered Platform</p>
              <p className="text-muted-foreground">
                Get personalized course recommendations and AI-assisted profile building
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
