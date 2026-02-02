import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Users, Gift, Calendar, User } from "lucide-react";
import { Link } from "wouter";
import type { Referral, StudentProfile } from "@shared/schema";
import { StudentLayout } from "@/components/student-layout";

interface ReferralWithStudent extends Referral {
  referredStudent: StudentProfile;
}

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalBonus: number;
}

function StudentReferralsContent() {
  const { data: referrals = [], isLoading } = useQuery<ReferralWithStudent[]>({
    queryKey: ["/api/student/referral/list"],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["/api/student/referral/stats"],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Referrals</h1>
        <p className="text-muted-foreground">Track all your referred friends and rewards</p>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-referrals">{stats.totalReferrals}</div>
              <p className="text-xs text-muted-foreground">Friends referred</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Users className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-pending-referrals">{stats.pendingReferrals}</div>
              <p className="text-xs text-muted-foreground">Awaiting completion</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Users className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary" data-testid="stat-completed-referrals">{stats.completedReferrals}</div>
              <p className="text-xs text-muted-foreground">Successfully joined</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bonus</CardTitle>
              <Gift className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent" data-testid="stat-total-bonus">${stats.totalBonus.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Rewards earned</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referral List */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>All friends you've referred to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Loading referrals...</p>
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No referrals yet</p>
              <p className="text-sm">Share your referral code with friends to get started!</p>
              <Button variant="outline" asChild className="mt-4" data-testid="button-back-to-dashboard">
                <Link href="/">Back to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div 
                  key={referral.id} 
                  className="flex items-center justify-between border rounded-lg p-4 hover-elevate"
                  data-testid={`referral-${referral.id}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground" data-testid={`referral-name-${referral.id}`}>
                        {referral.referredStudent.firstName && referral.referredStudent.lastName 
                          ? `${referral.referredStudent.firstName} ${referral.referredStudent.lastName}`
                          : 'Student Profile'}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(referral.createdAt!).toLocaleDateString()}
                        </span>
                        {referral.bonusAmount && (
                          <span className="flex items-center gap-1 text-accent">
                            <Gift className="h-3 w-3" />
                            ${parseFloat(referral.bonusAmount).toFixed(2)} bonus
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={
                        referral.status === "completed" ? "default" :
                        referral.status === "cancelled" ? "destructive" :
                        "secondary"
                      }
                      data-testid={`status-${referral.id}`}
                    >
                      {referral.status}
                    </Badge>
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

export default function StudentReferrals() {
  return (
    <StudentLayout breadcrumbTitle="My Referrals">
      <StudentReferralsContent />
    </StudentLayout>
  );
}
