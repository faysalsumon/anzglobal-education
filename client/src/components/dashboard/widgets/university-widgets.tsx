import { useQuery } from "@tanstack/react-query";
import { WidgetCard } from "../widget-card";
import { CompactTable, StageBadge, StatusBadge } from "../compact-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  GraduationCap,
  Users,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import type { Application, Course } from "@shared/schema";

interface UniversityApplicationsWidgetProps {
  onViewAll?: () => void;
  onRowClick?: (application: Application) => void;
  className?: string;
}

export function UniversityApplicationsWidget({
  onViewAll,
  onRowClick,
  className,
}: UniversityApplicationsWidgetProps) {
  const { data: applications = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/university/applications"],
  });

  const columns = [
    {
      key: "student",
      header: "Student",
      render: (app: any) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {app.student?.firstName?.[0] || "S"}
          </div>
          <span className="font-medium">
            {app.student?.firstName || "Student"} {app.student?.lastName || ""}
          </span>
        </div>
      ),
    },
    {
      key: "course",
      header: "Course",
      render: (app: any) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
          {app.course?.title || "Course"}
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      render: (app: any) => <StageBadge stage={app.status || app.stage || "pending"} />,
    },
    {
      key: "date",
      header: "Applied",
      render: (app: any) =>
        app.createdAt ? format(new Date(app.createdAt), "dd/MM/yyyy") : "-",
    },
  ];

  return (
    <WidgetCard
      title="Recent Applications"
      icon={<ClipboardList className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={applications.length === 0}
      emptyIcon={<ClipboardList className="h-10 w-10" />}
      emptyMessage="No applications yet"
      actions={
        onViewAll && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )
      }
      noPadding
      className={className}
      data-testid="university-applications-widget"
    >
      <CompactTable
        columns={columns}
        data={applications.slice(0, 5)}
        keyExtractor={(app) => app.id}
        onRowClick={onRowClick}
        density="compact"
      />
    </WidgetCard>
  );
}

interface UniversityCoursesWidgetProps {
  onViewAll?: () => void;
  onRowClick?: (course: any) => void;
  className?: string;
}

export function UniversityCoursesWidget({
  onViewAll,
  onRowClick,
  className,
}: UniversityCoursesWidgetProps) {
  const { data: courses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/university/courses"],
  });

  const columns = [
    {
      key: "title",
      header: "Course",
      render: (course: any) => (
        <span className="font-medium text-primary hover:underline cursor-pointer">
          {course.title}
        </span>
      ),
    },
    {
      key: "level",
      header: "Level",
      render: (course: any) => (
        <Badge variant="secondary" className="text-xs">
          {course.level || "Undergraduate"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (course: any) => (
        <StatusBadge status={course.isActive ? "active" : "inactive"} />
      ),
    },
  ];

  return (
    <WidgetCard
      title="Your Courses"
      icon={<GraduationCap className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={courses.length === 0}
      emptyIcon={<GraduationCap className="h-10 w-10" />}
      emptyMessage="No courses yet"
      emptyAction={
        <Button size="sm" asChild>
          <a href="/university/courses/new">Add Course</a>
        </Button>
      }
      actions={
        onViewAll && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )
      }
      noPadding
      className={className}
      data-testid="university-courses-widget"
    >
      <CompactTable
        columns={columns}
        data={courses.slice(0, 5)}
        keyExtractor={(course) => course.id}
        onRowClick={onRowClick}
        density="compact"
      />
    </WidgetCard>
  );
}

interface UniversityTeamWidgetProps {
  onViewAll?: () => void;
  className?: string;
}

export function UniversityTeamWidget({
  onViewAll,
  className,
}: UniversityTeamWidgetProps) {
  const { data: team = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/university/team"],
  });

  return (
    <WidgetCard
      title="Team Members"
      icon={<Users className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={team.length === 0}
      emptyIcon={<Users className="h-10 w-10" />}
      emptyMessage="No team members"
      emptyAction={
        <Button size="sm" asChild>
          <a href="/university/team">Manage Team</a>
        </Button>
      }
      actions={
        onViewAll && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            Manage
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )
      }
      className={className}
      data-testid="university-team-widget"
    >
      <div className="space-y-2">
        {team.slice(0, 5).map((member, index) => (
          <div
            key={member.id || index}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {member.firstName?.[0] || member.email?.[0] || "T"}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{member.role || "Staff"}</p>
              </div>
            </div>
            <StatusBadge status={member.isActive ? "active" : "inactive"} />
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

interface UniversityPendingActionsWidgetProps {
  className?: string;
}

export function UniversityPendingActionsWidget({
  className,
}: UniversityPendingActionsWidgetProps) {
  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["/api/university/applications"],
  });

  const pendingDocs = applications.filter(
    (app) => app.status === "pending" || app.stage === "Documents Verification"
  ).length;
  const pendingReview = applications.filter(
    (app) => app.stage === "Assessment" || app.stage === "GS-Clearance"
  ).length;

  const actions = [
    {
      id: "docs",
      label: "Documents to verify",
      count: pendingDocs,
      icon: <FileText className="h-4 w-4 text-yellow-600" />,
      color: "yellow",
    },
    {
      id: "review",
      label: "Applications to review",
      count: pendingReview,
      icon: <Eye className="h-4 w-4 text-blue-600" />,
      color: "blue",
    },
    {
      id: "offers",
      label: "Offers pending",
      count: applications.filter((app) => app.stage === "Offer-Letter").length,
      icon: <BookOpen className="h-4 w-4 text-green-600" />,
      color: "green",
    },
  ];

  return (
    <WidgetCard
      title="Pending Actions"
      icon={<AlertCircle className="h-4 w-4" />}
      className={className}
      data-testid="university-pending-actions-widget"
    >
      <div className="space-y-2">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/30`}>
                {action.icon}
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </div>
            <Badge variant="secondary" className="min-w-[32px] justify-center">
              {action.count}
            </Badge>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

interface UniversityStatsWidgetProps {
  className?: string;
}

export function UniversityQuickStatsWidget({
  className,
}: UniversityStatsWidgetProps) {
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["/api/university/courses"],
  });

  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["/api/university/applications"],
  });

  const stats = [
    {
      label: "Total Courses",
      value: courses.length,
      icon: <GraduationCap className="h-5 w-5 text-blue-600" />,
    },
    {
      label: "Active Courses",
      value: courses.filter((c) => c.isActive).length,
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    },
    {
      label: "Total Applications",
      value: applications.length,
      icon: <ClipboardList className="h-5 w-5 text-purple-600" />,
    },
    {
      label: "Pending Review",
      value: applications.filter((a) => a.status === "pending").length,
      icon: <Clock className="h-5 w-5 text-yellow-600" />,
    },
  ];

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 p-4 rounded-lg border bg-card"
        >
          <div className="p-2 rounded-lg bg-muted">{stat.icon}</div>
          <div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
