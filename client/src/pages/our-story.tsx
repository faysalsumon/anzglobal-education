import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { 
  GraduationCap, 
  Globe, 
  Cpu, 
  Target, 
  Users, 
  TrendingUp,
  Sparkles,
  Search,
  FileCheck,
  MessageSquare,
  BarChart3,
  Zap,
  Shield,
  CheckCircle2,
  Building2,
  BookOpen,
  Clock,
  ArrowRight
} from "lucide-react";

export default function OurStory() {
  const [, setLocation] = useLocation();

  return (
    <>
      <Helmet>
        <title>About Us - ANZ Global Education | AI-Powered Education Technology</title>
        <meta 
          name="description" 
          content="ANZ Global Education is an AI-powered edutech platform connecting international students with global universities. Smart course matching, streamlined applications, and intelligent tools for students and institutions." 
        />
        <meta property="og:title" content="About Us - ANZ Global Education" />
        <meta property="og:description" content="An AI-powered edutech platform transforming how students discover courses and how institutions connect with qualified candidates." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary/95 to-secondary py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm mb-6 border border-white/20">
                <Cpu className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6" data-testid="heading-about-us">
                About Us
              </h1>
              <p className="text-xl md:text-2xl text-white/90 font-medium mb-4" data-testid="text-tagline">
                AI-Powered Education Technology
              </p>
              <p className="text-lg text-white/80 max-w-3xl mx-auto" data-testid="text-hero-description">
                We're building the future of international education—where finding the right course 
                is instant, applications are effortless, and institutions connect with their ideal students.
              </p>
            </div>
          </div>
        </section>

        {/* What We Do */}
        <section className="py-16 md:py-24 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                <CardContent className="p-8 md:p-12">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4" data-testid="heading-what-we-do">
                        What We Do
                      </h2>
                      <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-what-we-do">
                        ANZ Global Education is an <strong className="text-foreground">AI-powered edutech platform</strong> that 
                        transforms how international students discover courses and how educational institutions 
                        connect with qualified candidates. Our technology eliminates the friction in international 
                        education—making the process faster, smarter, and more transparent for everyone.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* The Problem We Solve */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-problem-we-solve">
                The Problem We Solve
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-problem-description">
                International education has been broken—for students and institutions alike
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Student Problems */}
              <Card className="border-destructive/20" data-testid="card-problems-students">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-destructive" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground" data-testid="heading-problems-students">For Students</h3>
                  </div>
                  <ul className="space-y-4 text-muted-foreground" data-testid="list-problems-students">
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0"></div>
                      <span data-testid="text-problem-student-1">Overwhelming choices with no clear way to compare courses</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0"></div>
                      <span data-testid="text-problem-student-2">Confusing application processes with endless paperwork</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0"></div>
                      <span data-testid="text-problem-student-3">Lack of transparency on fees, requirements, and outcomes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0"></div>
                      <span data-testid="text-problem-student-4">Generic advice that doesn't match individual goals</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Institution Problems */}
              <Card className="border-destructive/20" data-testid="card-problems-institutions">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-destructive" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground" data-testid="heading-problems-institutions">For Institutions</h3>
                  </div>
                  <ul className="space-y-4 text-muted-foreground" data-testid="list-problems-institutions">
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0"></div>
                      <span data-testid="text-problem-institution-1">Difficulty reaching qualified international students</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0"></div>
                      <span data-testid="text-problem-institution-2">High volume of unqualified or mismatched applications</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0"></div>
                      <span data-testid="text-problem-institution-3">Inefficient manual processes for course management</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0"></div>
                      <span data-testid="text-problem-institution-4">Limited visibility into student intent and quality</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Technology */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-background to-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-our-technology">
                Our Technology
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-technology-description">
                Powered by artificial intelligence to deliver personalized, intelligent experiences
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="border-primary/20 hover-elevate" data-testid="card-tech-search">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="heading-tech-search">
                    AI-Powered Search
                  </h3>
                  <p className="text-muted-foreground text-sm" data-testid="text-tech-search-desc">
                    Natural language search that understands intent. Ask "affordable engineering in Melbourne" 
                    and get instant, relevant results.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 hover-elevate" data-testid="card-tech-matching">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="heading-tech-matching">
                    Smart Matching
                  </h3>
                  <p className="text-muted-foreground text-sm" data-testid="text-tech-matching-desc">
                    Our algorithms match students with courses based on qualifications, preferences, 
                    budget, and career goals—not just keywords.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 hover-elevate" data-testid="card-tech-chat">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="heading-tech-chat">
                    AI Chat Assistant
                  </h3>
                  <p className="text-muted-foreground text-sm" data-testid="text-tech-chat-desc">
                    24/7 intelligent assistant that answers questions, guides course selection, 
                    and helps with applications in real-time.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 hover-elevate" data-testid="card-tech-applications">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <FileCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="heading-tech-applications">
                    Automated Applications
                  </h3>
                  <p className="text-muted-foreground text-sm" data-testid="text-tech-applications-desc">
                    One profile, multiple applications. Fill once, apply anywhere. 
                    Track progress through our streamlined workflow system.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 hover-elevate" data-testid="card-tech-content">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="heading-tech-content">
                    AI Content Generation
                  </h3>
                  <p className="text-muted-foreground text-sm" data-testid="text-tech-content-desc">
                    Auto-generate course descriptions, thumbnails, and marketing content. 
                    AI-powered web scraping extracts course data automatically.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 hover-elevate" data-testid="card-tech-verification">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="heading-tech-verification">
                    Qualification Verification
                  </h3>
                  <p className="text-muted-foreground text-sm" data-testid="text-tech-verification-desc">
                    AI-powered academic qualification matching and cross-country equivalency 
                    to ensure students meet entry requirements.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Platform Benefits */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-platform-value">
                How Our Platform Delivers Value
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* For Students */}
              <div className="bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-2xl p-8 border border-primary/10" data-testid="card-benefits-students">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <GraduationCap className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground" data-testid="heading-benefits-students">For Students</h3>
                    <p className="text-muted-foreground" data-testid="text-benefits-students-subtitle">Find, compare, apply—simplified</p>
                  </div>
                </div>
                
                <ul className="space-y-4" data-testid="list-benefits-students">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-student-1-title">Instant Course Discovery</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-student-1-desc">Search thousands of courses with AI that understands what you're looking for</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-student-2-title">Personalized Recommendations</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-student-2-desc">Get matched with courses that fit your qualifications, budget, and goals</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-student-3-title">One-Click Applications</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-student-3-desc">Apply to multiple courses with a single profile—no repetitive forms</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-student-4-title">Real-Time Progress Tracking</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-student-4-desc">Track every application from submission to offer with complete visibility</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-student-5-title">24/7 AI Support</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-student-5-desc">Get instant answers to your questions anytime, anywhere</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* For Institutions */}
              <div className="bg-gradient-to-br from-secondary/5 via-transparent to-primary/5 rounded-2xl p-8 border border-secondary/10" data-testid="card-benefits-institutions">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
                    <Building2 className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground" data-testid="heading-benefits-institutions">For Institutions</h3>
                    <p className="text-muted-foreground" data-testid="text-benefits-institutions-subtitle">Reach the right students, faster</p>
                  </div>
                </div>
                
                <ul className="space-y-4" data-testid="list-benefits-institutions">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-institution-1-title">Qualified Lead Generation</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-institution-1-desc">Connect with pre-qualified students who match your entry requirements</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-institution-2-title">AI-Powered Course Management</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-institution-2-desc">Auto-generate descriptions, thumbnails, and keep course data up-to-date</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-institution-3-title">Streamlined Application Processing</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-institution-3-desc">Manage applications through a unified dashboard with automated workflows</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-institution-4-title">Global Visibility</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-institution-4-desc">Showcase your courses to international students actively searching</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground" data-testid="text-benefit-institution-5-title">Analytics & Insights</span>
                      <p className="text-sm text-muted-foreground" data-testid="text-benefit-institution-5-desc">Understand student interest, application trends, and conversion metrics</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Stats */}
        <section className="py-16 md:py-24 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card className="border-primary/20 text-center" data-testid="card-stat-institutions">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-foreground mb-1" data-testid="text-stat-institutions-count">22+</div>
                    <div className="text-sm text-muted-foreground" data-testid="text-stat-institutions-label">Partner Institutions</div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 text-center" data-testid="card-stat-courses">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-foreground mb-1" data-testid="text-stat-courses-count">1000+</div>
                    <div className="text-sm text-muted-foreground" data-testid="text-stat-courses-label">Courses Available</div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 text-center" data-testid="card-stat-countries">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-foreground mb-1" data-testid="text-stat-countries-count">50+</div>
                    <div className="text-sm text-muted-foreground" data-testid="text-stat-countries-label">Countries Served</div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 text-center" data-testid="card-stat-support">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-foreground mb-1" data-testid="text-stat-support-count">24/7</div>
                    <div className="text-sm text-muted-foreground" data-testid="text-stat-support-label">AI Support</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-why-choose-us">
                Why Choose Our Platform
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-why-description">
                Built for the future of international education
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="border-primary/20 hover-elevate" data-testid="card-why-technology">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Cpu className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3" data-testid="heading-why-technology">
                    Technology-First
                  </h3>
                  <p className="text-muted-foreground" data-testid="text-why-technology-desc">
                    We leverage AI, machine learning, and automation to solve problems 
                    that traditional agencies can't.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-secondary/20 hover-elevate" data-testid="card-why-data">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3" data-testid="heading-why-data">
                    Data-Driven
                  </h3>
                  <p className="text-muted-foreground" data-testid="text-why-data-desc">
                    Every recommendation, every match, every insight is powered by 
                    data and intelligent algorithms.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-accent/20 hover-elevate" data-testid="card-why-global">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Globe className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3" data-testid="heading-why-global">
                    Globally Scalable
                  </h3>
                  <p className="text-muted-foreground" data-testid="text-why-global-desc">
                    Built to serve students and institutions across borders, 
                    with multi-country support and localization.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary via-primary/95 to-secondary">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" data-testid="heading-cta">
                Ready to Experience the Future of Education?
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto" data-testid="text-cta-description">
                Whether you're a student looking for your dream course or an institution 
                seeking qualified candidates—our platform is built for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button 
                  size="lg"
                  onClick={() => setLocation('/courses')}
                  className="bg-white text-primary"
                  data-testid="button-explore-courses"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Explore Courses
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation('/contact')}
                  className="bg-white/10 border-white/30 text-white backdrop-blur-sm"
                  data-testid="button-contact-us"
                >
                  Partner With Us
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-white/70" data-testid="text-institution-inquiry">
                Institutions interested in listing courses?{" "}
                <Link 
                  href="/contact"
                  className="text-white underline font-medium"
                  data-testid="link-institution-inquiry"
                >
                  Get in touch
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
