import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Building2,
  TrendingUp,
  Users,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface BranchStats {
  branch: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    address: string | null;
  } | null;
  stats: {
    leadCount: number;
    applicationCounts: {
      total: number;
      pending: number;
      reviewing: number;
      accepted: number;
      rejected: number;
      withdrawn: number;
      other: number;
    };
    teamSize: number;
    todayAttendance: { present: number; totalMinutes: number };
  };
  recentApplications: {
    id: string;
    status: string;
    createdAt: string;
    studentFirstName: string | null;
    studentLastName: string | null;
    courseName: string | null;
    institutionName: string | null;
  }[];
  todayAttendees: {
    userId: string;
    clockInAt: string;
    clockOutAt: string | null;
    totalMinutes: number | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  }[];
  teamMembers: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
    roleName: string | null;
    isPresent: boolean;
  }[];
}

interface BranchManagerDashboardProps {
  branchId: string;
  userName: string;
  onNavigate: (tab: string) => void;
}

function getInitials(first: string | null, last: string | null, email: string) {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function statusBadge(status: string) {
  switch (status) {
    case "accepted":
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 no-default-active-elevate" data-testid={`badge-status-${status}`}>Accepted</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 no-default-active-elevate" data-testid={`badge-status-${status}`}>Rejected</Badge>;
    case "reviewing":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 no-default-active-elevate" data-testid={`badge-status-${status}`}>Reviewing</Badge>;
    case "withdrawn":
      return <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 no-default-active-elevate" data-testid={`badge-status-${status}`}>Withdrawn</Badge>;
    default:
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 no-default-active-elevate" data-testid={`badge-status-${status}`}>Pending</Badge>;
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="branch-dashboard-loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
      <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
    </div>
  );
}

export function BranchManagerDashboard({ branchId, userName, onNavigate }: BranchManagerDashboardProps) {
  const { data, isLoading, isError } = useQuery<BranchStats>({
    queryKey: ["/api/admin/branch/stats", { branchId }],
  });

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !data?.branch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="branch-dashboard-error">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Unable to load branch data. Please refresh and try again.</p>
      </div>
    );
  }

  const { branch, stats, recentApplications, todayAttendees, teamMembers } = data;
  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");
  const totalHours = formatMinutes(stats.todayAttendance.totalMinutes);
  const approvedCount = stats.applicationCounts.accepted;
  const pendingCount = stats.applicationCounts.pending + stats.applicationCounts.reviewing;

  return (
    <div className="space-y-6" data-testid="branch-manager-dashboard">

      {/* Section 1 — Branch Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-branch-name">
            {branch.name}
          </h1>
          {(branch.city || branch.country) && (
            <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-branch-location">
              {[branch.city, branch.country].filter(Boolean).join(", ")}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>Managed by <span className="font-medium text-foreground">{userName}</span></span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground pt-1">{todayFormatted}</p>
      </div>

      {/* Section 2 — KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Leads */}
        <Card data-testid="card-kpi-leads">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-lead-count">{stats.leadCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In the pipeline</p>
          </CardContent>
        </Card>

        {/* Applications */}
        <Card data-testid="card-kpi-applications">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-application-total">{stats.applicationCounts.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-amber-600 dark:text-amber-400">{pendingCount} pending</span>
              {" · "}
              <span className="text-emerald-600 dark:text-emerald-400">{approvedCount} accepted</span>
            </p>
          </CardContent>
        </Card>

        {/* Team */}
        <Card data-testid="card-kpi-team">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team</CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-team-size">{stats.teamSize}</div>
            <p className="text-xs text-muted-foreground mt-1">Members in branch</p>
          </CardContent>
        </Card>

        {/* Present Today */}
        <Card data-testid="card-kpi-attendance">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present Today</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-present-count">
              {stats.todayAttendance.present}
              <span className="text-lg font-normal text-muted-foreground">/{stats.teamSize}</span>
            </div>
            {stats.todayAttendance.totalMinutes > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{totalHours} total logged</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 3 — Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Attendance */}
        <Card data-testid="card-today-attendance">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold">Today's Attendance</CardTitle>
              <span className="text-xs text-muted-foreground">{format(new Date(), "d MMM yyyy")}</span>
            </div>
          </CardHeader>
          <CardContent>
            {todayAttendees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="attendance-empty">
                <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No one has clocked in today</p>
              </div>
            ) : (
              <ul className="space-y-3" data-testid="list-attendees">
                {todayAttendees.map((a) => (
                  <li key={a.userId} className="flex items-center gap-3" data-testid={`row-attendee-${a.userId}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={a.profileImageUrl ?? undefined} />
                      <AvatarFallback className="text-xs">{getInitials(a.firstName, a.lastName, a.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {[a.firstName, a.lastName].filter(Boolean).join(" ") || a.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        In: {format(new Date(a.clockInAt), "h:mm a")}
                        {a.clockOutAt && ` · Out: ${format(new Date(a.clockOutAt), "h:mm a")}`}
                        {a.totalMinutes != null && a.totalMinutes > 0 && ` · ${formatMinutes(a.totalMinutes)}`}
                      </p>
                    </div>
                    {a.clockOutAt ? (
                      <Badge className="text-xs no-default-active-elevate bg-muted text-muted-foreground shrink-0">Done</Badge>
                    ) : (
                      <Badge className="text-xs no-default-active-elevate bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">Active</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card data-testid="card-recent-applications">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("applications")}
                data-testid="button-view-all-applications"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="applications-empty">
                <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No applications yet</p>
              </div>
            ) : (
              <div className="space-y-2" data-testid="list-recent-applications">
                {recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                    data-testid={`row-application-${app.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {[app.studentFirstName, app.studentLastName].filter(Boolean).join(" ") || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {app.courseName ?? "—"}
                        {app.institutionName && <span className="text-muted-foreground/70"> · {app.institutionName}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {statusBadge(app.status)}
                      <span className="text-xs text-muted-foreground">
                        {app.createdAt ? formatDistanceToNow(new Date(app.createdAt), { addSuffix: true }) : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4 — Team Members */}
      <Card data-testid="card-team-members">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Our Team</CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="team-empty">
              <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No team members assigned to this branch yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="grid-team-members">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center gap-2 p-3 rounded-md text-center"
                  data-testid={`card-member-${member.id}`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.profileImageUrl ?? undefined} />
                      <AvatarFallback>{getInitials(member.firstName, member.lastName, member.email)}</AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                        member.isPresent ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                      }`}
                      title={member.isPresent ? "Present today" : "Not clocked in"}
                      data-testid={`dot-presence-${member.id}`}
                    />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-sm font-medium truncate">
                      {[member.firstName, member.lastName].filter(Boolean).join(" ") || member.email}
                    </p>
                    {member.roleName && (
                      <p className="text-xs text-muted-foreground truncate">{member.roleName}</p>
                    )}
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
