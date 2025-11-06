import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Building2, BookOpen, Users, TrendingUp, Plus } from "lucide-react";
import { Link } from "wouter";
import type { University, Course, Application } from "@shared/schema";

export function UniversityDashboard() {
  const { data: university } = useQuery<University>({
    queryKey: ["/api/university/profile"],
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/university/courses"],
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/university/applications"],
  });

  const stats = {
    totalCourses: courses.length,
    activeCourses: courses.filter(c => c.isActive).length,
    totalApplications: applications.length,
    pendingApplications: applications.filter(a => a.status === "pending").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your university.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-courses">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">{stats.activeCourses} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-applications">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingApplications} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{university ? "Complete" : "Setup"}</div>
            <p className="text-xs text-muted-foreground">{university ? "Profile active" : "Create your profile"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12%</div>
            <p className="text-xs text-muted-foreground">From last month</p>
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
          {!university && (
            <Button asChild data-testid="button-setup-university">
              <Link href="/university/profile">
                <Building2 className="mr-2 h-4 w-4" />
                Setup University Profile
              </Link>
            </Button>
          )}
          <Button asChild data-testid="button-create-course">
            <Link href="/university/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Course
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-view-applications">
            <Link href="/university/applications">
              <Users className="mr-2 h-4 w-4" />
              View Applications
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>Latest student applications to your courses</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No applications yet</p>
              <p className="text-sm mt-2">Applications will appear here once students apply to your courses</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.slice(0, 5).map((application) => (
                <div key={application.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium" data-testid={`application-${application.id}`}>New Application</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(application.createdAt!).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/university/applications/${application.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
