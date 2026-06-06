import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  ListTodo, 
  UserPlus, 
  ClipboardList, 
  BookOpen, 
  Building2,
  Sparkles,
  Clock, 
  Target
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AdminDashboardOverviewProps {
  onNavigate: (tab: string) => void;
  hasFullAdminAccess?: boolean;
}

interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
}

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  converted: number;
}

export function AdminDashboardOverview({ onNavigate, hasFullAdminAccess: _hasFullAdminAccess = false }: AdminDashboardOverviewProps) {
  const { user: _user } = useAuth();

  const { data: taskStats } = useQuery<TaskStats>({
    queryKey: ["/api/crm/tasks/stats"],
  });

  const { data: leadStats } = useQuery<LeadStats>({
    queryKey: ["/api/crm/leads/stats"],
  });

  const { data: applicationCount } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/applications/count"],
  });

  const { data: courseCount } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/courses/count"],
  });

  const { data: institutionCount } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/institutions/count"],
  });

  const stats = {
    tasks: taskStats?.total || 0,
    pendingTasks: taskStats?.pending || 0,
    overdueTasks: taskStats?.overdue || 0,
    leads: leadStats?.total || 0,
    newLeads: leadStats?.new || 0,
    applications: applicationCount?.count || 0,
    courses: courseCount?.count || 0,
    institutions: institutionCount?.count || 0,
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* My Tasks */}
        <Card 
          className="relative overflow-hidden border-blue-200 dark:border-blue-900/30 hover-elevate active-elevate-2 transition-all duration-300 cursor-pointer"
          onClick={() => onNavigate("my-tasks")}
          data-testid="card-stat-tasks"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Tasks</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ListTodo className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold" data-testid="stat-total-tasks">{stats.tasks}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-muted-foreground">{stats.pendingTasks} pending</p>
              {stats.overdueTasks > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  {stats.overdueTasks} overdue
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card 
          className="relative overflow-hidden border-green-200 dark:border-green-900/30 hover-elevate active-elevate-2 transition-all duration-300 cursor-pointer"
          onClick={() => onNavigate("crm-contacts")}
          data-testid="card-stat-leads"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold" data-testid="stat-total-leads">{stats.leads}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">{stats.newLeads} new this week</p>
            </div>
          </CardContent>
        </Card>

        {/* Applications */}
        <Card 
          className="relative overflow-hidden border-purple-200 dark:border-purple-900/30 hover-elevate active-elevate-2 transition-all duration-300 cursor-pointer"
          onClick={() => onNavigate("applications")}
          data-testid="card-stat-applications"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ClipboardList className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold" data-testid="stat-total-applications">{stats.applications}</div>
            <p className="text-xs text-muted-foreground mt-1">Total in system</p>
          </CardContent>
        </Card>

        {/* Courses */}
        <Card 
          className="relative overflow-hidden border-orange-200 dark:border-orange-900/30 hover-elevate active-elevate-2 transition-all duration-300 cursor-pointer"
          onClick={() => onNavigate("courses")}
          data-testid="card-stat-courses"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Courses</CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <BookOpen className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold" data-testid="stat-total-courses">{stats.courses}</div>
            <p className="text-xs text-muted-foreground mt-1">Available courses</p>
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
              <CardDescription className="mt-1 text-sm md:text-base">Jump to common tasks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 md:pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Button 
              className="h-auto p-4 md:p-5 flex flex-col items-start gap-2.5 hover-elevate min-h-[90px]" 
              variant="outline"
              onClick={() => onNavigate("my-tasks")}
              data-testid="button-quick-tasks"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <ListTodo className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm md:text-base">View My Tasks</p>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your assigned tasks</p>
              </div>
            </Button>

            <Button 
              className="h-auto p-4 md:p-5 flex flex-col items-start gap-2.5 hover-elevate min-h-[90px]" 
              variant="outline"
              onClick={() => onNavigate("crm-contacts")}
              data-testid="button-quick-leads"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
                <UserPlus className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm md:text-base">Manage Leads</p>
                <p className="text-xs text-muted-foreground mt-0.5">Follow up on prospects</p>
              </div>
            </Button>

            <Button 
              className="h-auto p-4 md:p-5 flex flex-col items-start gap-2.5 hover-elevate min-h-[90px]" 
              variant="outline"
              onClick={() => onNavigate("applications")}
              data-testid="button-quick-applications"
            >
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
                <ClipboardList className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm md:text-base">Applications</p>
                <p className="text-xs text-muted-foreground mt-0.5">Track student progress</p>
              </div>
            </Button>

            <Button 
              className="h-auto p-4 md:p-5 flex flex-col items-start gap-2.5 hover-elevate min-h-[90px]" 
              variant="outline"
              onClick={() => onNavigate("courses")}
              data-testid="button-quick-courses"
            >
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg shrink-0">
                <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm md:text-base">Browse Courses</p>
                <p className="text-xs text-muted-foreground mt-0.5">Search available programs</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Performance Summary */}
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Platform Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Institutions</span>
                </div>
                <span className="font-semibold" data-testid="stat-institutions">{stats.institutions}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Courses</span>
                </div>
                <span className="font-semibold">{stats.courses}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Applications</span>
                </div>
                <span className="font-semibold">{stats.applications}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Status */}
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Task Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <span className="font-semibold">{stats.pendingTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <span className="font-semibold">{taskStats?.completed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">Overdue</span>
                </div>
                <span className="font-semibold text-red-600">{stats.overdueTasks}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
