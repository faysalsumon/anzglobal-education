import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { FileText, User, Search, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { StudentProfile, Application } from "@shared/schema";

export function StudentDashboard() {
  const { data: profile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/student/applications"],
  });

  const stats = {
    totalApplications: applications.length,
    pendingApplications: applications.filter(a => a.status === "pending").length,
    acceptedApplications: applications.filter(a => a.status === "accepted").length,
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
