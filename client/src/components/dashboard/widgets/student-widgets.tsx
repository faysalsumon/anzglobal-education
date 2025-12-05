import { useQuery } from "@tanstack/react-query";
import { WidgetCard } from "../widget-card";
import { CompactTable, StageBadge } from "../compact-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList,
  FileText,
  ExternalLink,
  GraduationCap,
  Heart,
  Bell,
  Calendar,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import type { Application } from "@shared/schema";

interface StudentApplicationsWidgetProps {
  onViewAll?: () => void;
  onRowClick?: (application: Application) => void;
  className?: string;
}

export function StudentApplicationsWidget({
  onViewAll,
  onRowClick,
  className,
}: StudentApplicationsWidgetProps) {
  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/student/applications"],
  });

  const columns = [
    {
      key: "course",
      header: "Course",
      render: (app: Application) => (
        <span className="font-medium text-primary hover:underline cursor-pointer">
          {(app as any).course?.title || "Course"}
        </span>
      ),
    },
    {
      key: "institution",
      header: "Institution",
      render: (app: Application) => (app as any).course?.university?.name || "-",
    },
    {
      key: "stage",
      header: "Stage",
      render: (app: Application) => <StageBadge stage={app.status || "pending"} />,
    },
    {
      key: "date",
      header: "Applied",
      render: (app: Application) =>
        app.createdAt ? format(new Date(app.createdAt), "dd/MM/yyyy") : "-",
    },
  ];

  return (
    <WidgetCard
      title="My Applications"
      icon={<ClipboardList className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={applications.length === 0}
      emptyIcon={<ClipboardList className="h-10 w-10" />}
      emptyMessage="No applications yet"
      emptyAction={
        <Button size="sm" asChild>
          <a href="/student/courses">Browse Courses</a>
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
      data-testid="student-applications-widget"
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

interface StudentDocumentsWidgetProps {
  onViewAll?: () => void;
  className?: string;
}

export function StudentDocumentsWidget({
  onViewAll,
  className,
}: StudentDocumentsWidgetProps) {
  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["/api/student/documents"],
  });

  const documents = data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <WidgetCard
      title="My Documents"
      icon={<FileText className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={documents.length === 0}
      emptyIcon={<FileText className="h-10 w-10" />}
      emptyMessage="No documents uploaded"
      emptyAction={
        <Button size="sm" asChild>
          <a href="/student/documents">
            <Upload className="h-4 w-4 mr-1" />
            Upload Documents
          </a>
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
      className={className}
      data-testid="student-documents-widget"
    >
      <div className="space-y-2">
        {documents.slice(0, 5).map((doc, index) => (
          <div
            key={doc.id || index}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(doc.status)}
              <span className="text-sm font-medium">{doc.name || doc.type}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {doc.status || "pending"}
            </Badge>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

interface StudentSavedCoursesWidgetProps {
  onViewAll?: () => void;
  className?: string;
}

export function StudentSavedCoursesWidget({
  onViewAll,
  className,
}: StudentSavedCoursesWidgetProps) {
  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["/api/student/saved-courses"],
  });

  const savedCourses = data || [];

  return (
    <WidgetCard
      title="Saved Courses"
      icon={<Heart className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={savedCourses.length === 0}
      emptyIcon={<Heart className="h-10 w-10" />}
      emptyMessage="No saved courses yet"
      emptyAction={
        <Button size="sm" asChild>
          <a href="/student/courses">Explore Courses</a>
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
      className={className}
      data-testid="student-saved-courses-widget"
    >
      <div className="space-y-2">
        {savedCourses.slice(0, 4).map((course, index) => (
          <div
            key={course.id || index}
            className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
          >
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{course.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {course.institutionName || course.university?.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

interface StudentProgressWidgetProps {
  className?: string;
}

export function StudentProgressWidget({ className }: StudentProgressWidgetProps) {
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/student/profile"],
  });

  const steps = [
    { key: "profile", label: "Complete Profile", completed: !!profile?.firstName },
    { key: "documents", label: "Upload Documents", completed: !!profile?.documentsUploaded },
    { key: "apply", label: "Submit Application", completed: !!profile?.hasApplications },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <WidgetCard
      title="Your Progress"
      icon={<GraduationCap className="h-4 w-4" />}
      isLoading={isLoading}
      className={className}
      data-testid="student-progress-widget"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Profile Completion</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          {steps.map((step) => (
            <div
              key={step.key}
              className={`flex items-center gap-2 text-sm ${
                step.completed ? "text-green-600" : "text-muted-foreground"
              }`}
            >
              <CheckCircle2
                className={`h-4 w-4 ${
                  step.completed ? "text-green-500" : "text-muted-foreground/30"
                }`}
              />
              <span className={step.completed ? "line-through" : ""}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

interface StudentUpcomingWidgetProps {
  className?: string;
}

export function StudentUpcomingWidget({ className }: StudentUpcomingWidgetProps) {
  const upcomingEvents = [
    {
      id: "1",
      title: "Document submission deadline",
      date: "Tomorrow",
      type: "deadline",
    },
    {
      id: "2",
      title: "Interview with University of Melbourne",
      date: "In 3 days",
      type: "interview",
    },
  ];

  return (
    <WidgetCard
      title="Upcoming"
      icon={<Calendar className="h-4 w-4" />}
      isEmpty={upcomingEvents.length === 0}
      emptyIcon={<Calendar className="h-10 w-10" />}
      emptyMessage="No upcoming events"
      className={className}
      data-testid="student-upcoming-widget"
    >
      <div className="space-y-2">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50"
          >
            <div
              className={`flex-shrink-0 p-2 rounded-lg ${
                event.type === "deadline"
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-blue-100 dark:bg-blue-900/30"
              }`}
            >
              {event.type === "deadline" ? (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : (
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.date}</p>
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
