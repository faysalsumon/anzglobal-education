import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Users, Sparkles, TrendingUp, GraduationCap, Search, FileCheck, Filter, UserPlus } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

interface PlatformStats {
  institutionCount: number;
  courseCount: number;
}

export default function Landing() {
  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ["/api/platform/stats"],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="ANZ Global Education" className="h-10 w-auto" />
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Find Institutes
            </a>
            <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Find Courses
            </a>
            <Button variant="outline" asChild size="sm" data-testid="button-student-registration">
              <a href="/api/login?type=student">
                <UserPlus className="h-4 w-4 mr-2" />
                Student Registration
              </a>
            </Button>
            <Button asChild size="sm" data-testid="button-student-login-header">
              <a href="/api/login?type=student">Student Login</a>
            </Button>
          </nav>
          <Button className="md:hidden" asChild size="sm">
            <a href="/api/login">Login</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-20 md:py-32 text-white">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Australia's Leading Course Platform for International Students
            </h1>
            <p className="mb-8 text-lg opacity-90 sm:text-xl">
              Explore Australia's most comprehensive range of courses tailored for international students. 
              Our advanced AI-driven platform helps you find your perfect match and apply directly, saving you time and money.
            </p>
            <div className="mx-auto max-w-2xl bg-white rounded-lg p-2 shadow-lg flex gap-2">
              <Input 
                placeholder="Search courses..." 
                className="flex-1 border-0 focus-visible:ring-0"
                data-testid="input-course-search"
              />
              <Button variant="default" size="default" data-testid="button-search-courses">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps to University */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">
            3 STEPS TO UNIVERSITY
          </h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="mb-4 mx-auto w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
                <Filter className="h-16 w-16 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Filter</h3>
              <p className="text-muted-foreground">
                Filter universities based on your requirements.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 mx-auto w-32 h-32 bg-secondary/10 rounded-full flex items-center justify-center">
                <GraduationCap className="h-16 w-16 text-secondary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Choose</h3>
              <p className="text-muted-foreground">
                Choose your course & the desired university.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 mx-auto w-32 h-32 bg-accent/10 rounded-full flex items-center justify-center">
                <FileCheck className="h-16 w-16 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Apply</h3>
              <p className="text-muted-foreground">
                Apply online through us hassle free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Statistics */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
            <Card className="text-center border-primary/20 hover-elevate">
              <CardHeader className="pb-4">
                <div className="mb-4 mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-5xl font-bold text-primary" data-testid="text-institution-count">
                  {stats?.institutionCount || 0}+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-foreground">Number of Institutions</p>
              </CardContent>
            </Card>

            <Card className="text-center border-secondary/20 hover-elevate">
              <CardHeader className="pb-4">
                <div className="mb-4 mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                  <GraduationCap className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-5xl font-bold text-secondary" data-testid="text-course-count">
                  {stats?.courseCount || 0}+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-foreground">Number of Courses</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Why Choose ANZ Global Education?</h2>
            <p className="text-lg text-muted-foreground">Transforming how universities and students connect</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>For Universities</CardTitle>
                <CardDescription>Showcase your institution and attract global talent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>AI-powered course descriptions</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Manage applications effortlessly</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Reach international students</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>For Students</CardTitle>
                <CardDescription>Find and apply to your dream courses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Smart course recommendations</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>AI profile builder assistance</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Track application status</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>AI-Powered</CardTitle>
                <CardDescription>Intelligent tools for better decisions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Advanced course filtering</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Automated profile generation</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Personalized recommendations</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-primary to-secondary p-8 text-center text-white md:p-12">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Get Started?</h2>
            <p className="mb-8 text-lg opacity-90">
              Join thousands of students finding their perfect course or universities showcasing their programs
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" variant="secondary" asChild data-testid="button-student-cta">
                <a href="/api/login?type=student">
                  <GraduationCap className="h-5 w-5 mr-2" />
                  I'm a Student
                </a>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 border-white text-white" asChild data-testid="button-university-cta">
                <a href="/api/login?type=university">
                  <Building2 className="h-5 w-5 mr-2" />
                  I'm a University
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <img src={logoUrl} alt="ANZ Global Education" className="h-10 w-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Australia's leading platform connecting universities and international students.
              </p>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-foreground">For Students</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/api/login?type=student" className="text-muted-foreground hover:text-foreground transition-colors">
                    Student Login
                  </a>
                </li>
                <li>
                  <a href="/api/login?type=student" className="text-muted-foreground hover:text-foreground transition-colors">
                    Student Registration
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Browse Courses
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-foreground">For Institutions</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/api/login?type=university" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-institution-login">
                    Institution Login
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    List Your Institution
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-foreground">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Knowledge Base
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ANZ Global Education. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
