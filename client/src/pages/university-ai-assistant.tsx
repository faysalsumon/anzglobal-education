import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Building2, GraduationCap } from "lucide-react";
import { Link } from "wouter";
import { UniversityLayout } from "@/components/university-layout";

function UniversityAIAssistantContent() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-accent" />
          AI Assistant
        </h1>
        <p className="text-muted-foreground">
          Leverage AI to create compelling university and course descriptions
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI-Powered Content Generation
          </CardTitle>
          <CardDescription>
            Using advanced language models to help you attract the best students worldwide
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The AI assistant is integrated into your profile and course editors. It helps you:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-secondary">•</span>
              <span>Create professional university descriptions that highlight your institution's strengths</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary">•</span>
              <span>Generate detailed course descriptions with learning objectives and outcomes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary">•</span>
              <span>Ensure consistency and professional tone across all your content</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-elevate">
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>University Profile</CardTitle>
            <CardDescription>Showcase your institution effectively</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a compelling university description that highlights academic excellence, campus facilities, and global opportunities.
            </p>
            <Button asChild className="w-full" data-testid="button-edit-university">
              <Link href="/university/profile">
                <Sparkles className="mr-2 h-4 w-4" />
                Edit University Profile
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
              <GraduationCap className="h-6 w-6 text-secondary" />
            </div>
            <CardTitle>Course Descriptions</CardTitle>
            <CardDescription>Create engaging course content</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Let AI help you write detailed course descriptions that include learning objectives, curriculum highlights, and career opportunities.
            </p>
            <Button asChild className="w-full" data-testid="button-create-course">
              <Link href="/university/courses/new">
                <Sparkles className="mr-2 h-4 w-4" />
                Create New Course
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="text-accent font-semibold">1.</span>
            <p>Start with basics: Enter your university name and location before generating descriptions</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-semibold">2.</span>
            <p>Review and customize: AI provides a strong foundation - add your unique details</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-semibold">3.</span>
            <p>Be specific: For courses, include title, subject, and level for best results</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-semibold">4.</span>
            <p>Stay authentic: Use AI to enhance your message, not replace your institution's voice</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UniversityAIAssistant() {
  return (
    <UniversityLayout breadcrumbTitle="AI Assistant">
      <UniversityAIAssistantContent />
    </UniversityLayout>
  );
}
