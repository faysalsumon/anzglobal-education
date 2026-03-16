import { Shield, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface DetailPageFooterProps {
  updatedAt?: string | Date | null;
  entityType: "institution" | "course";
}

function formatLastUpdated(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} at ${timePart}`;
}

export function DetailPageFooter({ updatedAt, entityType }: DetailPageFooterProps) {
  const formattedDate = updatedAt ? formatLastUpdated(updatedAt) : null;

  return (
    <div className="container mx-auto px-4" data-testid="detail-page-footer">
      <div className="border-t pt-8 pb-6 md:pt-10 md:pb-8">
        {formattedDate && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6" data-testid="text-last-updated">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>
                {entityType === "institution" ? "Institution" : "Course"} information last updated on {formattedDate}
              </span>
            </div>
            <Separator className="mb-6" />
          </>
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-partner-disclaimer">
              Some institutions listed on this platform may be facilitated through our authorised partner network.
              ANZ Global Education does not directly represent all listed institutions.
              For institutions where we do not hold a direct contract, student enrolments may be processed
              through our trusted partner channels. All information is provided in good faith and is subject to change
              by the respective institution without notice.
            </p>
          </div>

          {entityType === "course" && (
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-course-accuracy-disclaimer">
                The course information published on this platform is sourced from the respective institution and maintained
                to the best of our knowledge. However, course details — including fees, entry requirements, intake dates,
                and programme structure — are subject to change by the institution at any time and without prior notification
                to ANZ Global Education. We strongly encourage all prospective students to independently verify current
                information directly with the institution or with our team before making any enrolment decision.
                ANZ Global Education accepts no liability for any inaccuracies, omissions, or changes to course information,
                nor for any decisions made in reliance upon the information presented on this platform.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
