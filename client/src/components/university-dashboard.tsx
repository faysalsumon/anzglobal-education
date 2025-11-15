import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Building2, BookOpen, Users, TrendingUp, Plus, Sparkles, ArrowRight, Clock, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import type { University, Course, Application } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

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

  // Calculate growth (mock data for now)
  const growth = {
    applications: "+12%",
    courses: "+3",
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-6 md:p-8 border border-primary/10">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent mb-2">
                Welcome back!
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Here's what's happening with your institution today
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm bg-primary/10 px-3 md:px-4 py-2 rounded-full shrink-0">
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
              <span className="font-medium">AI-Powered Platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-primary/20 hover-elevate active-elevate-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Courses</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold" data-testid="stat-total-courses">{stats.totalCourses}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">{stats.activeCourses} active</p>
              {stats.totalCourses > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {growth.courses} this month
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-green-200 dark:border-green-900/30 hover-elevate active-elevate-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold" data-testid="stat-total-applications">{stats.totalApplications}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">{stats.pendingApplications} pending</p>
              {stats.totalApplications > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  {growth.applications}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-blue-200 dark:border-blue-900/30 hover-elevate active-elevate-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profile Status</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">{university ? "Complete" : "Setup"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {university ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Profile active
                </span>
              ) : (
                "Create your profile"
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-purple-200 dark:border-purple-900/30 hover-elevate active-elevate-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Growth</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">+12%</div>
            <p className="text-xs text-muted-foreground mt-1">From last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-primary/10">
        <CardHeader className="border-b bg-gradient-to-r from-background to-primary/5">
          <div className="flex items-center gap-2 md:gap-2.5">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div>
              <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
              <CardDescription className="mt-1 text-sm md:text-base">Get started with common tasks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 md:pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {!university && (
              <Button asChild className="h-auto p-5 md:p-6 flex flex-col items-start gap-2.5 md:gap-3 hover-elevate min-h-[80px] md:min-h-[120px]" variant="outline" data-testid="button-setup-university">
                <Link href="/university/profile">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm md:text-base">Setup University Profile</div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">Complete your institution details</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
                </Link>
              </Button>
            )}
            <Button asChild className="h-auto p-5 md:p-6 flex flex-col items-start gap-2.5 md:gap-3 hover-elevate min-h-[80px] md:min-h-[120px]" variant="outline" data-testid="button-create-course">
              <Link href="/university/courses/new">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Plus className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-sm md:text-base">Create New Course</div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">Add courses to your catalog</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
              </Link>
            </Button>
            <Button asChild className="h-auto p-5 md:p-6 flex flex-col items-start gap-2.5 md:gap-3 hover-elevate min-h-[80px] md:min-h-[120px] relative" variant="outline" data-testid="button-view-applications">
              <Link href="/university/applications">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-sm md:text-base flex items-center gap-2">
                    View Applications
                    {stats.pendingApplications > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {stats.pendingApplications}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">Review student applications</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Applications */}
      <Card className="border-primary/10">
        <CardHeader className="border-b bg-gradient-to-r from-background to-primary/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-lg md:text-xl">Recent Applications</CardTitle>
              <CardDescription className="mt-1 text-sm md:text-base">Latest student applications to your courses</CardDescription>
            </div>
            {applications.length > 0 && (
              <Button variant="ghost" size="default" asChild className="w-full sm:w-auto min-h-[44px]">
                <Link href="/university/applications">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 md:pt-6">
          {applications.length === 0 ? (
            <div className="text-center py-10 md:py-12 px-4">
              <div className="p-3 md:p-4 bg-muted rounded-full w-fit mx-auto mb-3 md:mb-4">
                <Users className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-2">No applications yet</h3>
              <p className="text-xs md:text-sm text-muted-foreground max-w-sm mx-auto">
                Applications will appear here once students apply to your courses. Make sure your courses are published to start receiving applications.
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {applications.slice(0, 5).map((application) => (
                <div 
                  key={application.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 md:p-5 rounded-lg border hover-elevate active-elevate-2 transition-all"
                >
                  <div className="flex items-start gap-2.5 md:gap-3 flex-1 w-full sm:w-auto">
                    <div className="p-2 bg-primary/10 rounded-lg mt-0.5 shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base" data-testid={`application-${application.id}`}>
                        New Application
                      </p>
                      <div className="flex items-center gap-1.5 md:gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {new Date(application.createdAt!).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="default" asChild className="hover-elevate w-full sm:w-auto min-h-[44px]">
                    <Link href={`/university/applications/${application.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              ))}
              {applications.length > 5 && (
                <Button variant="ghost" className="w-full min-h-[44px]" asChild>
                  <Link href="/university/applications">
                    View all {applications.length} applications
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
