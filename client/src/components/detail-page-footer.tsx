import { Link } from "wouter";
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
      <div className="border-t bg-muted/30 rounded-b-xl px-6 py-8 md:py-10">
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

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              data-testid="link-privacy-policy"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              data-testid="link-terms"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
