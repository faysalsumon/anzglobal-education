import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { FileText, User, Search, TrendingUp, Users, Copy, Check, Gift } from "lucide-react";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Your journey to the perfect course starts here.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-applications">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">Total submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-applications">{stats.pendingApplications}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary" data-testid="stat-accepted-applications">{stats.acceptedApplications}</div>
            <p className="text-xs text-muted-foreground">Congratulations!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile ? "Complete" : "Setup"}</div>
            <p className="text-xs text-muted-foreground">{profile ? "Profile active" : "Create your profile"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Program */}
      {profile && referralData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-accent" />
              Refer Friends & Earn Rewards
            </CardTitle>
            <CardDescription>
              Share your referral code with friends and earn bonuses when they join!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Referral Code and Link */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Your Referral Code</label>
                <div className="flex gap-2">
                  <Input 
                    value={referralData.referralCode || ''} 
                    readOnly 
                    className="font-mono text-lg"
                    data-testid="input-referral-code"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyCode}
                    data-testid="button-copy-code"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Referral Link</label>
                <div className="flex gap-2">
                  <Input 
                    value={referralData.referralLink || ''} 
                    readOnly 
                    className="text-sm"
                    data-testid="input-referral-link"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyLink}
                    data-testid="button-copy-link"
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Referral Stats */}
            {referralStats && (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-total-referrals">
                    {referralStats.totalReferrals}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-pending-referrals">
                    {referralStats.pendingReferrals}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-secondary" />
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  </div>
                  <p className="text-2xl font-bold text-secondary" data-testid="stat-completed-referrals">
                    {referralStats.completedReferrals}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-4 w-4 text-accent" />
                    <p className="text-sm font-medium text-muted-foreground">Total Bonus</p>
                  </div>
                  <p className="text-2xl font-bold text-accent" data-testid="stat-total-bonus">
                    ${referralStats.totalBonus.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* View All Referrals Button */}
            <div className="flex justify-end">
              <Button variant="outline" asChild data-testid="button-view-referrals">
                <Link href="/student/referrals">
                  <Users className="mr-2 h-4 w-4" />
                  View All Referrals
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {!profile && (
            <Button asChild data-testid="button-create-profile">
              <Link href="/student/profile">
                <User className="mr-2 h-4 w-4" />
                Create Profile
              </Link>
            </Button>
          )}
          <Button asChild data-testid="button-browse-courses">
            <Link href="/student/courses">
              <Search className="mr-2 h-4 w-4" />
              Browse Courses
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-view-applications">
            <Link href="/student/applications">
              <FileText className="mr-2 h-4 w-4" />
              My Applications
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Application Status */}
      <Card>
        <CardHeader>
          <CardTitle>My Applications</CardTitle>
          <CardDescription>Track your course applications</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No applications yet</p>
              <p className="text-sm mt-2">Start browsing courses and submit your first application</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium" data-testid={`application-${application.id}`}>Application</p>
                    <p className="text-sm text-muted-foreground">
                      Submitted {new Date(application.createdAt!).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={
                        application.status === "accepted" ? "default" :
                        application.status === "rejected" ? "destructive" :
                        "secondary"
                      }
                      data-testid={`status-${application.id}`}
                    >
                      {application.status}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/student/applications/${application.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
