import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { FileText, User, Search, TrendingUp, Users, Copy, Check, Gift, Heart, GitCompare, Sparkles, GraduationCap, BookOpen, Target, ArrowRight, Brain, Zap, Award, Boxes, Shield, CheckCircle2, Lock } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { StudentProfile, Application, Course, University } from "@shared/schema";

interface EnrichedApplication {
  application: Application;
  course: Course | null;
  university: University | null;
}

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalBonus: number;
}

interface ReferralCodeData {
  referralCode: string;
  referralLink: string;
}

export function StudentDashboard() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: profile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
  });

  const { data: applicationsData } = useQuery<{ applications: EnrichedApplication[] }>({
    queryKey: ["/api/student/applications"],
  });
  
  const enrichedApplications = applicationsData?.applications || [];
  const applications = enrichedApplications.map(a => a.application);

  const { data: referralStats } = useQuery<ReferralStats>({
    queryKey: ["/api/student/referral/stats"],
    enabled: !!profile,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  const { data: referralData } = useQuery<ReferralCodeData>({
    queryKey: ["/api/student/referral/code"],
    enabled: !!profile,
    staleTime: 1000 * 60 * 5, // Referral code rarely changes, cache for 5 minutes
  });

  const stats = {
    totalApplications: applications.length,
    pendingApplications: applications.filter(a => a.status === "pending").length,
    acceptedApplications: applications.filter(a => a.status === "accepted").length,
  };

  const handleCopyCode = async () => {
    if (referralData?.referralCode) {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopiedCode(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    if (referralData?.referralLink) {
      await navigator.clipboard.writeText(referralData.referralLink);
      setCopiedLink(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Hero Welcome Section with Advanced Gradient */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-secondary/80 p-6 md:p-10 lg:p-12 text-white shadow-2xl animate-gradient">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-white/10 rounded-full blur-3xl -mr-32 md:-mr-48 -mt-32 md:-mt-48 animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-56 md:w-80 h-56 md:h-80 bg-white/10 rounded-full blur-3xl -ml-28 md:-ml-40 -mb-28 md:-mb-40 animate-float" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 md:w-64 h-48 md:h-64 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        
        {/* Content */}
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-2.5 md:gap-3 mb-3 md:mb-4 animate-slide-in-up">
            <div className="p-2 md:p-2.5 bg-white/20 rounded-lg md:rounded-xl backdrop-blur-sm">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <p className="text-white/90 font-semibold text-base md:text-lg" data-testid="text-greeting">{getGreeting()}</p>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 md:mb-4 leading-tight animate-slide-in-up" style={{ animationDelay: '0.1s' }} data-testid="text-welcome-heading">
            {profile?.firstName ? `Welcome back, ${profile.firstName}!` : "Welcome to Your Dashboard"}
          </h1>
          <p className="text-white/90 text-base md:text-lg lg:text-xl max-w-3xl mb-6 md:mb-8 leading-relaxed animate-slide-in-up" style={{ animationDelay: '0.2s' }} data-testid="text-welcome-message">
            Your AI-powered journey to the perfect course starts here. Explore opportunities, track applications, and achieve your academic goals with intelligent recommendations.
          </p>
          
          {/* Quick CTA Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
            <Button asChild size="lg" variant="secondary" className="shadow-lg min-h-12" data-testid="button-browse-courses-hero">
              <Link href="/student/courses">
                <Search className="mr-2 h-5 w-5" />
                Browse Courses
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-white/30 text-white shadow-lg backdrop-blur-sm hover:bg-white/10 min-h-12" data-testid="button-ai-assistant-hero">
              <Link href="/student/ai-assistant">
                <Brain className="mr-2 h-5 w-5" />
                AI Assistant
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards with Modern Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="overflow-hidden relative bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-2 group transition-transform duration-300 hover:-translate-y-1" data-testid="card-stat-applications">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Applications</CardTitle>
            <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <FileText className="h-5 w-5 text-primary group-hover:text-white transition-colors duration-300" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-bold text-foreground mb-2 group-hover:scale-105 transition-transform duration-300" data-testid="stat-total-applications">
              {stats.totalApplications}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Total submitted
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative bg-gradient-to-br from-accent/5 via-accent/10 to-transparent border-2 group transition-transform duration-300 hover:-translate-y-1" data-testid="card-stat-pending">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Pending Review</CardTitle>
            <div className="p-3 bg-accent/10 rounded-xl group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
              <Zap className="h-5 w-5 text-accent group-hover:text-accent-foreground transition-colors duration-300" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-bold text-foreground mb-2 group-hover:scale-105 transition-transform duration-300" data-testid="stat-pending-applications">
              {stats.pendingApplications}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              Awaiting decision
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative bg-gradient-to-br from-secondary/5 via-secondary/10 to-transparent border-2 group transition-transform duration-300 hover:-translate-y-1" data-testid="card-stat-accepted">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Accepted</CardTitle>
            <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
              <Award className="h-5 w-5 text-secondary group-hover:text-white transition-colors duration-300" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-bold text-secondary mb-2 group-hover:scale-105 transition-transform duration-300" data-testid="stat-accepted-applications">
              {stats.acceptedApplications}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Congratulations!
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-2 group transition-transform duration-300 hover:-translate-y-1" data-testid="card-stat-profile">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Profile Status</CardTitle>
            <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <User className="h-5 w-5 text-primary group-hover:text-white transition-colors duration-300" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-bold text-foreground mb-2 group-hover:scale-105 transition-transform duration-300" data-testid="text-profile-status">
              {profile ? "Active" : "Setup"}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              <span data-testid="text-profile-status-description">{profile ? "Profile complete" : "Create profile"}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions with Enhanced Design */}
      <Card className="border-2 shadow-lg overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
        <CardHeader className="bg-gradient-to-br from-muted/30 to-transparent pb-4 md:pb-6">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl">Quick Actions</CardTitle>
              <CardDescription className="text-sm md:text-base">Everything you need, one click away</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pt-4 md:pt-6">
          {/* Smart Form - prominent access card */}
          <Card className="border-2 cursor-pointer group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <Link href="/student/profile" data-testid="link-smart-form">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="py-4 md:py-5 relative min-h-[60px] md:min-h-[72px]">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                    <User className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg group-hover:text-primary transition-colors duration-300">
                      {profile ? "Smart Form" : "Create Profile"}
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {profile ? "View & edit your profile" : "Set up your student profile"}
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>
          
          <Card className="border-2 cursor-pointer group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <Link href="/student/courses" data-testid="link-browse-courses">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="py-4 md:py-5 relative min-h-[60px] md:min-h-[72px]">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                    <Search className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg group-hover:text-primary transition-colors duration-300">Browse Courses</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Find your perfect course</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="border-2 cursor-pointer group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <Link href="/student/applications" data-testid="link-view-applications">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="py-4 md:py-5 relative min-h-[60px] md:min-h-[72px]">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="p-2.5 md:p-3 bg-accent/10 rounded-xl group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300 shrink-0">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-accent group-hover:text-accent-foreground transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg group-hover:text-accent transition-colors duration-300">My Applications</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Track application status</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="border-2 cursor-pointer group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <Link href="/student/profile?tab=favorites" data-testid="link-view-favorites">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="py-4 md:py-5 relative min-h-[60px] md:min-h-[72px]">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="p-2.5 md:p-3 bg-destructive/10 rounded-xl group-hover:bg-destructive group-hover:text-white transition-all duration-300 shrink-0">
                    <Heart className="h-5 w-5 md:h-6 md:w-6 text-destructive group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg group-hover:text-destructive transition-colors duration-300">My Favorites</CardTitle>
                    <CardDescription className="text-xs md:text-sm">View saved courses</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-destructive group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="border-2 cursor-pointer group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <Link href="/compare-courses" data-testid="link-compare-courses">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="py-4 md:py-5 relative min-h-[60px] md:min-h-[72px]">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="p-2.5 md:p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary group-hover:text-white transition-all duration-300 shrink-0">
                    <GitCompare className="h-5 w-5 md:h-6 md:w-6 text-secondary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg group-hover:text-secondary transition-colors duration-300">Compare Courses</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Side-by-side comparison</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="border-2 cursor-pointer group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <Link href="/student/ai-assistant" data-testid="link-ai-assistant">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="py-4 md:py-5 relative min-h-[60px] md:min-h-[72px]">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                    <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg group-hover:text-primary transition-colors duration-300 flex items-center gap-2">
                      AI Assistant
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">NEW</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Get personalized help</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>
        </CardContent>
      </Card>

      {/* My Applications Section - Moved to top after Quick Actions */}
      <Card className="border-2 shadow-lg overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
        <CardHeader className="bg-gradient-to-br from-muted/30 to-transparent pb-4 md:pb-6">
          <div className="flex items-start sm:items-center justify-between gap-3 md:gap-4 flex-col sm:flex-row">
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl shrink-0">
                <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xl md:text-2xl">My Applications</CardTitle>
                <CardDescription className="text-sm md:text-base">Track your course applications and their status</CardDescription>
              </div>
            </div>
            {applications.length > 0 && (
              <Button variant="outline" size="default" asChild data-testid="button-view-all-applications" className="border-2 min-h-[44px] w-full sm:w-auto">
                <Link href="/student/applications">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 md:pt-6">
          {applications.length === 0 ? (
            <div className="text-center py-12 md:py-16 bg-gradient-to-br from-muted/20 to-transparent rounded-xl md:rounded-2xl border-2 border-dashed px-4">
              <div className="p-4 md:p-5 bg-primary/10 rounded-xl md:rounded-2xl w-20 h-20 md:w-24 md:h-24 mx-auto mb-5 md:mb-6 flex items-center justify-center">
                <FileText className="h-10 w-10 md:h-12 md:w-12 text-primary" />
              </div>
              <h3 className="font-bold text-lg md:text-xl mb-2 md:mb-3">No applications yet</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-md mx-auto">
                Start browsing courses and submit your first application to begin your academic journey
              </p>
              <Button asChild size="lg" data-testid="button-browse-courses-empty" className="shadow-lg min-h-12">
                <Link href="/student/courses">
                  <Search className="mr-2 h-5 w-5" />
                  Browse Courses
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {enrichedApplications.slice(0, 5).map(({ application, course, university }, index) => (
                <Card key={application.id} className="p-4 md:p-5 border-2 transition-transform duration-300 hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between gap-3 md:gap-4 flex-col sm:flex-row">
                    <div className="flex-1 w-full sm:w-auto">
                      <p className="font-bold text-base md:text-lg mb-1" data-testid={`application-${application.id}`}>
                        {course?.title || `Application #${application.id.slice(0, 8)}`}
                      </p>
                      <p className="text-sm text-muted-foreground mb-1.5 md:mb-2 flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                        {university?.name || "Unknown Institution"}
                      </p>
                      <p className="text-xs text-muted-foreground/70 flex items-center gap-2">
                        <FileText className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                        ID: {application.id.slice(0, 8).toUpperCase()} • Submitted {new Date(application.createdAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        application.status === "accepted" ? "default" :
                        application.status === "rejected" ? "destructive" :
                        "secondary"
                      }
                      data-testid={`status-${application.id}`}
                      className="capitalize px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold w-full sm:w-auto text-center"
                    >
                      {application.status}
                    </Badge>
                  </div>
                </Card>
              ))}
              {applications.length > 5 && (
                <div className="text-center pt-3 md:pt-4">
                  <Button variant="outline" asChild data-testid="button-view-more-applications" className="border-2 min-h-[44px]">
                    <Link href="/student/applications">
                      View {applications.length - 5} More Applications
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blockchain Document Verification - Coming Soon */}
      <Card className="border-2 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent shadow-xl overflow-hidden relative" data-testid="card-blockchain-coming-soon">
        <div className="absolute top-0 left-0 w-full h-1 md:h-1.5 bg-gradient-to-r from-purple-600 via-purple-400 to-purple-600 animate-gradient" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <CardHeader className="pb-4 md:pb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="p-2.5 md:p-3 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl shadow-lg shrink-0">
                <Boxes className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg md:text-xl lg:text-2xl flex items-center gap-2 flex-wrap" data-testid="text-blockchain-title">
                  Blockchain Document Verification
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Tamper-proof, instant verification for your academic credentials
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-xs font-bold uppercase tracking-wider" data-testid="badge-coming-soon">
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Feature Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-background/60 border border-purple-200/50 dark:border-purple-800/50">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" data-testid="text-feature-tamper-proof">Tamper-Proof</h4>
                <p className="text-xs text-muted-foreground">Documents secured with immutable blockchain technology</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-background/60 border border-purple-200/50 dark:border-purple-800/50">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
                <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" data-testid="text-feature-instant">Instant Verification</h4>
                <p className="text-xs text-muted-foreground">Universities verify your documents in seconds, not weeks</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-background/60 border border-purple-200/50 dark:border-purple-800/50">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
                <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" data-testid="text-feature-fraud">Fraud Prevention</h4>
                <p className="text-xs text-muted-foreground">Eliminate fake credentials with cryptographic proof</p>
              </div>
            </div>
          </div>

          {/* Preview of Verified Documents */}
          <div className="p-4 md:p-5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2" data-testid="text-preview-heading">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Your Documents Will Look Like This
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {["Academic Transcript", "Degree Certificate", "English Test Score"].map((doc, index) => (
                <div 
                  key={doc}
                  className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-background/80 border border-purple-200/50 dark:border-purple-800/50 shadow-sm"
                  data-testid={`preview-doc-${index}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium" data-testid={`text-doc-name-${index}`}>{doc}</span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-4">
            <p className="text-sm text-muted-foreground flex items-center gap-2" data-testid="text-blockchain-powered">
              <Boxes className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Powered by enterprise blockchain technology
            </p>
            <Button variant="outline" className="border-2 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300" disabled data-testid="button-notify-me">
              <Sparkles className="mr-2 h-4 w-4" />
              Get Notified When Available
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Program with Enhanced Design */}
      {profile && referralData && (
        <Card className="border-2 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 md:h-1.5 bg-gradient-to-r from-accent via-yellow-400 to-accent animate-gradient" />
          <CardHeader className="pb-4 md:pb-6">
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="p-2.5 md:p-3 bg-accent rounded-xl shadow-lg shrink-0">
                <Gift className="h-5 w-5 md:h-6 md:w-6 text-accent-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg md:text-xl lg:text-2xl flex items-center gap-2 flex-wrap">
                  Refer Friends & Earn Rewards
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Share your unique code and earn bonuses when friends join!
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {/* Referral Code and Link */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-2">
                  <Copy className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Your Referral Code
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={referralData.referralCode || ''} 
                    readOnly 
                    className="font-mono text-base md:text-lg font-bold bg-background border-2 shadow-sm min-h-[44px]"
                    data-testid="input-referral-code"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyCode}
                    data-testid="button-copy-code"
                    className="border-2 shadow-sm hover-elevate active-elevate-2 shrink-0"
                  >
                    {copiedCode ? <Check className="h-4 w-4 md:h-5 md:w-5 text-secondary" /> : <Copy className="h-4 w-4 md:h-5 md:w-5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-2">
                  <Copy className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Referral Link
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={referralData.referralLink || ''} 
                    readOnly 
                    className="text-xs md:text-sm bg-background border-2 shadow-sm min-h-[44px]"
                    data-testid="input-referral-link"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyLink}
                    data-testid="button-copy-link"
                    className="border-2 shadow-sm hover-elevate active-elevate-2 shrink-0"
                  >
                    {copiedLink ? <Check className="h-4 w-4 md:h-5 md:w-5 text-secondary" /> : <Copy className="h-4 w-4 md:h-5 md:w-5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Referral Stats */}
            {referralStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-transparent border-2 transition-transform duration-300 hover:-translate-y-1" data-testid="card-referral-total">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">Total</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground mb-1" data-testid="stat-total-referrals">
                      {referralStats.totalReferrals}
                    </p>
                    <p className="text-xs text-muted-foreground">Friends referred</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-accent/10 to-transparent border-2 transition-transform duration-300 hover:-translate-y-1" data-testid="card-referral-pending">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-accent/10 rounded-lg">
                        <Zap className="h-5 w-5 text-accent" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">Pending</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground mb-1" data-testid="stat-pending-referrals">
                      {referralStats.pendingReferrals}
                    </p>
                    <p className="text-xs text-muted-foreground">In progress</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-secondary/10 to-transparent border-2 transition-transform duration-300 hover:-translate-y-1" data-testid="card-referral-completed">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-secondary/10 rounded-lg">
                        <Check className="h-5 w-5 text-secondary" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">Completed</p>
                    </div>
                    <p className="text-3xl font-bold text-secondary mb-1" data-testid="stat-completed-referrals">
                      {referralStats.completedReferrals}
                    </p>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-accent/15 to-accent/5 border-2 transition-transform duration-300 hover:-translate-y-1" data-testid="card-referral-earned">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-accent rounded-lg">
                        <Gift className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">Earned</p>
                    </div>
                    <p className="text-3xl font-bold text-accent mb-1" data-testid="stat-total-bonus">
                      ${referralStats.totalBonus.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total bonus</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" asChild data-testid="button-view-referrals" className="border-2 shadow-sm">
                <Link href="/student/referrals">
                  <Users className="mr-2 h-4 w-4" />
                  View All Referrals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
