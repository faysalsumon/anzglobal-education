import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";

export type SLAStatus = "on-track" | "at-risk" | "overdue";

export function getSLAStatus(
  createdAt: string,
  _updatedAt: string,
  isTerminal: boolean = false
): SLAStatus {
  if (isTerminal) {
    return "on-track";
  }

  const daysSinceCreation = differenceInDays(new Date(), new Date(createdAt));

  if (daysSinceCreation >= 14) return "overdue";
  if (daysSinceCreation >= 7) return "at-risk";
  return "on-track";
}

interface SLABadgeProps {
  status: SLAStatus;
  showOnTrack?: boolean;
}

export function SLABadge({ status, showOnTrack = false }: SLABadgeProps) {
  if (status === "on-track" && !showOnTrack) return null;

  if (status === "on-track") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-5 border-green-500 text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400"
      >
        <Clock className="h-3 w-3 mr-0.5" /> On Track
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 h-5 ${
        status === "overdue"
          ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400"
          : "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400"
      }`}
    >
      {status === "overdue" ? (
        <>
          <AlertTriangle className="h-3 w-3 mr-0.5" /> Overdue
        </>
      ) : (
        <>
          <Clock className="h-3 w-3 mr-0.5" /> At Risk
        </>
      )}
    </Badge>
  );
}
