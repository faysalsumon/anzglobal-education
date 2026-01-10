import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Users,
  ListTodo,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
} from "lucide-react";

interface TeamMemberWorkload {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
  role?: string | null;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalApplications: number;
  activeApplications: number;
}

export function TeamWorkloadPanel() {
  const { data: workloadData = [], isLoading } = useQuery<TeamMemberWorkload[]>({
    queryKey: ["/api/tasks/workload-summary"],
  });

  const totalTasks = workloadData.reduce((sum, m) => sum + m.totalTasks, 0);
  const totalPending = workloadData.reduce((sum, m) => sum + m.pendingTasks, 0);
  const totalOverdue = workloadData.reduce((sum, m) => sum + m.overdueTasks, 0);
  const totalCompleted = workloadData.reduce((sum, m) => sum + m.completedTasks, 0);
  const totalApplications = workloadData.reduce((sum, m) => sum + m.totalApplications, 0);

  const getCompletionRate = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  const getRoleLabel = (role?: string | null) => {
    const roleLabels: Record<string, string> = {
      cto: "CTO",
      support_manager: "Support Manager",
      consultant: "Consultant",
    };
    return roleLabels[role || ""] || role || "Unknown";
  };

  const getRoleBadgeVariant = (role?: string | null): "default" | "secondary" | "outline" => {
    if (role === "cto") return "default";
    if (role === "support_manager") return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workloadData.length}</div>
            <p className="text-xs text-muted-foreground">Active admins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">{totalPending} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {getCompletionRate(totalCompleted, totalTasks)}% completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">Assigned total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Team Workload Distribution
          </CardTitle>
          <CardDescription>Task and application assignments per team member</CardDescription>
        </CardHeader>
        <CardContent>
          {workloadData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3" />
              <p className="font-medium">No team members found</p>
              <p className="text-sm">Add admin team members to see workload distribution</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Tasks</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">In Progress</TableHead>
                    <TableHead className="text-center">Overdue</TableHead>
                    <TableHead className="text-center">Applications</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workloadData.map((member) => {
                    const completionRate = getCompletionRate(member.completedTasks, member.totalTasks);
                    return (
                      <TableRow key={member.userId} data-testid={`workload-row-${member.userId}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.profileImageUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.firstName, member.lastName, member.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {member.firstName && member.lastName
                                  ? `${member.firstName} ${member.lastName}`
                                  : member.email || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {member.totalTasks}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">
                            {member.pendingTasks}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            {member.inProgressTasks}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {member.overdueTasks > 0 ? (
                            <Badge variant="destructive">
                              {member.overdueTasks}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {member.totalApplications}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={completionRate} 
                              className="h-2 w-20"
                            />
                            <span className="text-xs text-muted-foreground w-10">
                              {completionRate}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {workloadData.some(m => m.overdueTasks > 0) && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
            <CardDescription>Team members with overdue tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workloadData
                .filter(m => m.overdueTasks > 0)
                .sort((a, b) => b.overdueTasks - a.overdueTasks)
                .map(member => (
                  <div 
                    key={member.userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30"
                    data-testid={`overdue-alert-${member.userId}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.firstName, member.lastName, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.overdueTasks} overdue task{member.overdueTasks > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      <Clock className="h-3 w-3 mr-1" />
                      Overdue
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
