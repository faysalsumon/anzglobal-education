import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { FileText, User, Search, TrendingUp, Users, Copy, Check, Gift, Heart, GitCompareArrows, Sparkles, GraduationCap, BookOpen, Target, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { StudentProfile, Application } from "@shared/schema";

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

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/student/applications"],
  });

  const { data: referralStats } = useQuery<ReferralStats>({
    queryKey: ["/api/student/referral/stats"],
    enabled: !!profile,
  });

  const { data: referralData } = useQuery<ReferralCodeData>({
    queryKey: ["/api/student/referral/code"],
    enabled: !!profile,
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
    <div className="space-y-6 md:space-y-8">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-8 md:p-10 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="h-6 w-6" />
            <p className="text-primary-foreground/90 font-medium" data-testid="text-greeting">{getGreeting()}</p>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3" data-testid="text-welcome-heading">
            {profile?.firstName ? `Welcome back, ${profile.firstName}!` : "Welcome to Your Dashboard"}
          </h1>
          <p className="text-primary-foreground/90 text-base md:text-lg max-w-2xl" data-testid="text-welcome-message">
            Your journey to the perfect course starts here. Explore courses, track applications, and achieve your academic goals.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-24 -mb-24" />
      </div>

      {/* Stats Cards with Modern Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="overflow-hidden relative bg-gradient-to-br from-primary/5 to-transparent">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Applications</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-1" data-testid="stat-total-applications">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Total submitted
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative bg-gradient-to-br from-accent/5 to-transparent">
          <div className="absolute top-0 right-0 w-20 h-20 bg-accent/10 rounded-full -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Pending Review</CardTitle>
            <div className="p-2 bg-accent/10 rounded-lg">
              <FileText className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-1" data-testid="stat-pending-applications">{stats.pendingApplications}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Awaiting decision
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative bg-gradient-to-br from-secondary/5 to-transparent">
          <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/10 rounded-full -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Accepted</CardTitle>
            <div className="p-2 bg-secondary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary mb-1" data-testid="stat-accepted-applications">{stats.acceptedApplications}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Congratulations!
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative bg-gradient-to-br from-primary/5 to-transparent">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Profile Status</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-1" data-testid="text-profile-status">{profile ? "Active" : "Setup"}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3" />
              <span data-testid="text-profile-status-description">{profile ? "Profile complete" : "Create profile"}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions with Modern Card Design */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
              <CardDescription>Everything you need, one click away</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!profile && (
            <Card className="overflow-visible border-2">
              <Link href="/student/profile" data-testid="link-create-profile">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">Create Profile</CardTitle>
                      <CardDescription className="text-xs">Set up your student profile</CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>
              </Link>
            </Card>
          )}
          
          <Card className="overflow-visible border-2">
            <Link href="/student/courses" data-testid="link-browse-courses">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">Browse Courses</CardTitle>
                    <CardDescription className="text-xs">Find your perfect course</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="overflow-visible border-2">
            <Link href="/student/applications" data-testid="link-view-applications">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg flex-shrink-0">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">My Applications</CardTitle>
                    <CardDescription className="text-xs">Track application status</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="overflow-visible border-2">
            <Link href="/student/profile?tab=favorites" data-testid="link-view-favorites">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
                    <Heart className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">My Favorites</CardTitle>
                    <CardDescription className="text-xs">View saved courses</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="overflow-visible border-2">
            <Link href="/student/courses" data-testid="link-compare-courses">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg flex-shrink-0">
                    <GitCompareArrows className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">Compare Courses</CardTitle>
                    <CardDescription className="text-xs">Side-by-side comparison</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="overflow-visible border-2">
            <Link href="/student/profile" data-testid="link-view-profile">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">My Profile</CardTitle>
                    <CardDescription className="text-xs">Manage your details</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
            </Link>
          </Card>
        </CardContent>
      </Card>

      {/* Referral Program with Modern Design */}
      {profile && referralData && (
        <Card className="border-2 bg-gradient-to-br from-accent/5 via-accent/5 to-transparent">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-2 bg-accent rounded-lg">
                <Gift className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">Refer Friends & Earn Rewards</CardTitle>
                <CardDescription>
                  Share your unique code and earn bonuses when friends join!
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Referral Code and Link */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Your Referral Code</label>
                <div className="flex gap-2">
                  <Input 
                    value={referralData.referralCode || ''} 
                    readOnly 
                    className="font-mono text-base sm:text-lg bg-background border-2"
                    data-testid="input-referral-code"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyCode}
                    data-testid="button-copy-code"
                    className="flex-shrink-0 border-2"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Referral Link</label>
                <div className="flex gap-2">
                  <Input 
                    value={referralData.referralLink || ''} 
                    readOnly 
                    className="text-xs sm:text-sm bg-background border-2"
                    data-testid="input-referral-link"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyLink}
                    data-testid="button-copy-link"
                    className="flex-shrink-0 border-2"
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Referral Stats */}
            {referralStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">Total</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-total-referrals">
                      {referralStats.totalReferrals}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Friends referred</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-accent/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="p-2 bg-accent/10 rounded-lg">
                        <FileText className="h-4 w-4 text-accent" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">Pending</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-pending-referrals">
                      {referralStats.pendingReferrals}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">In progress</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-secondary/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <Check className="h-4 w-4 text-secondary" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">Completed</p>
                    </div>
                    <p className="text-2xl font-bold text-secondary" data-testid="stat-completed-referrals">
                      {referralStats.completedReferrals}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Successful</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="p-2 bg-accent rounded-lg">
                        <Gift className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">Earned</p>
                    </div>
                    <p className="text-2xl font-bold text-accent" data-testid="stat-total-bonus">
                      ${referralStats.totalBonus.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total bonus</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" asChild data-testid="button-view-referrals">
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

      {/* Application Status */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">My Applications</CardTitle>
                <CardDescription>Track your course applications and their status</CardDescription>
              </div>
            </div>
            {applications.length > 0 && (
              <Button variant="outline" size="sm" asChild data-testid="button-view-all-applications">
                <Link href="/student/applications">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <div className="p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No applications yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Start browsing courses and submit your first application to begin your journey
              </p>
              <Button asChild size="lg" data-testid="button-browse-courses-empty">
                <Link href="/student/courses">
                  <Search className="mr-2 h-4 w-4" />
                  Browse Courses
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 5).map((application) => (
                <Card key={application.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate mb-1" data-testid={`application-${application.id}`}>
                        Application #{application.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                        <FileText className="h-3 w-3" />
                        Submitted {new Date(application.createdAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        application.status === "accepted" ? "default" :
                        application.status === "rejected" ? "destructive" :
                        "secondary"
                      }
                      data-testid={`status-${application.id}`}
                      className="capitalize px-3 py-1 text-xs font-semibold"
                    >
                      {application.status}
                    </Badge>
                  </div>
                </Card>
              ))}
              {applications.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" asChild data-testid="button-view-more-applications">
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
    </div>
  );
}
