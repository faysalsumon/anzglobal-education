import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, User, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { StudentLayout } from "@/components/student-layout";

function StudentAIAssistantContent() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-accent" />
          AI Assistant
        </h1>
        <p className="text-muted-foreground">
          Get AI-powered help to create compelling profile content
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            How AI Can Help You
          </CardTitle>
          <CardDescription>
            Our AI assistant uses advanced language models to help you create professional, compelling content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The AI assistant is integrated directly into your profile editor. It can help you:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-secondary">•</span>
              <span>Generate a compelling personal bio that highlights your strengths</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary">•</span>
              <span>Articulate your career goals clearly and professionally</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary">•</span>
              <span>Ensure your content is well-structured and engaging</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-elevate">
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Personal Bio</CardTitle>
            <CardDescription>Create an engaging introduction about yourself</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use AI to write a professional bio that showcases your academic interests, passions, and what drives your educational journey.
            </p>
            <Button asChild className="w-full" data-testid="button-edit-bio">
              <Link href="/student/profile">
                <Sparkles className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
              <Briefcase className="h-6 w-6 text-secondary" />
            </div>
            <CardTitle>Career Goals</CardTitle>
            <CardDescription>Define your professional aspirations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Let AI help you articulate your short-term and long-term career goals in a way that resonates with universities.
            </p>
            <Button asChild className="w-full" data-testid="button-edit-goals">
              <Link href="/student/profile">
                <Sparkles className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tips for Using AI Assistance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="text-accent font-semibold">1.</span>
            <p>Provide context: Fill in your education level and field of study before generating content</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-semibold">2.</span>
            <p>Review and personalize: AI generates a great starting point, but add your unique voice</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-semibold">3.</span>
            <p>Iterate: Generate multiple times if needed to find the right tone</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-semibold">4.</span>
            <p>Be authentic: Use AI as a tool to express yourself better, not to replace your story</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentAIAssistant() {
  return (
    <StudentLayout breadcrumbTitle="AI Assistant">
      <StudentAIAssistantContent />
    </StudentLayout>
  );
}
