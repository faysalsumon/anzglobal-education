import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { STAGE_COLORS, STAGE_CONFIG } from "@/lib/stage-config";
import type { ApplicationStage } from "@/lib/stage-config";

interface ApplicationNote {
  id: string;
  authorRole: string;
  isReadByStudent: boolean;
}

interface ApplicationCardProps {
  application: {
    id: string;
    studentId: string;
    courseId: string;
    applicationNumber: string | null;
    currentStage: ApplicationStage;
    status: string;
    personalStatement: string | null;
    additionalInfo: string | null;
    assignedConsultantId: string | null;
    assignedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  course: {
    id: string;
    title: string;
    universityId: string;
    level: string;
    duration: string;
    fees: string;
    country: string;
  } | null;
  university: {
    id: string;
    name: string;
    logo: string | null;
    country: string | null;
  } | null;
  consultant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profilePicture: string | null;
  } | null;
}

export function ApplicationCard({ application, course, university }: ApplicationCardProps) {
  const { data: notes = [] } = useQuery<ApplicationNote[]>({
    queryKey: [`/api/student/applications/${application.id}/notes`],
  });

  const unreadCount = notes.filter(n => !n.isReadByStudent && n.authorRole !== "student").length;

  return (
    <Link
      href={`/student/applications/${application.id}`}
      data-testid={`application-card-${application.id}`}
      className="flex items-center gap-3 p-4 rounded-lg border bg-card hover-elevate cursor-pointer block"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {application.applicationNumber && (
            <Badge variant="outline" className="font-mono text-xs no-default-active-elevate" data-testid={`badge-app-number-${application.id}`}>
              {application.applicationNumber}
            </Badge>
          )}
          <Badge
            className={`${STAGE_COLORS[application.currentStage]} text-xs no-default-active-elevate`}
            data-testid={`stage-badge-${application.id}`}
          >
            {STAGE_CONFIG[application.currentStage]?.displayName ?? application.currentStage}
          </Badge>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs no-default-active-elevate" data-testid={`badge-unread-${application.id}`}>
              <MessageSquare className="h-3 w-3 mr-1" />
              {unreadCount} new
            </Badge>
          )}
        </div>

        <p className="font-medium text-sm leading-snug truncate" data-testid={`text-course-${application.id}`}>
          {course?.title ?? "Course Application"}
        </p>

        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate" data-testid={`text-university-${application.id}`}>
          <Building2 className="h-3 w-3 shrink-0" />
          {university?.name ?? "University"}
        </p>
      </div>

      <div className="text-right text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-1 justify-end" data-testid={`text-date-${application.id}`}>
          <Calendar className="h-3 w-3" />
          {format(new Date(application.createdAt), "MMM d, yyyy")}
        </div>
      </div>
    </Link>
  );
}
