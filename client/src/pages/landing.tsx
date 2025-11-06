import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Sparkles, TrendingUp, GraduationCap, Search, FileCheck } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="ANZ Global Education" className="h-10 w-auto" />
          </div>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-muted-foreground">AI-Powered Course Discovery</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Connect Universities and Students Worldwide
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Discover your perfect course with intelligent filtering, AI-assisted profiles, and direct applications.
              Empowering universities to showcase their programs and students to achieve their dreams.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" asChild className="gap-2" data-testid="button-student-login">
                <a href="/api/login?type=student">
                  <GraduationCap className="h-5 w-5" />
                  I'm a Student
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-university-login">
                <a href="/api/login?type=university">
                  <Building2 className="h-5 w-5 mr-2" />
                  I'm a University
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Create account or login to get started
            </p>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 md:py-24">
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
                  <span>Content generation tools</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Personalized suggestions</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">How It Works</h2>
            <p className="text-lg text-muted-foreground">Simple steps to get started</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  1
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Create Account</h3>
              <p className="text-muted-foreground">Sign up as a university or student in seconds</p>
            </div>
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-secondary-foreground">
                  2
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Build Profile</h3>
              <p className="text-muted-foreground">Use AI tools to create compelling content</p>
            </div>
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-foreground">
                  3
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Connect & Apply</h3>
              <p className="text-muted-foreground">Discover courses or receive applications</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Universities</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-secondary">10K+</div>
              <div className="text-sm text-muted-foreground">Courses Available</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-accent">50K+</div>
              <div className="text-sm text-muted-foreground">Students</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">95%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-secondary py-16 text-center md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Ready to Get Started?</h2>
          <p className="mb-8 text-lg text-white/90">Join thousands of universities and students connecting worldwide</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild data-testid="button-join-student">
              <a href="/api/login?type=student" className="gap-2">
                <GraduationCap className="h-5 w-5" />
                I'm a Student
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-join-university" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
              <a href="/api/login?type=university" className="gap-2">
                <Building2 className="h-5 w-5" />
                I'm a University
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ANZ Global Education. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
