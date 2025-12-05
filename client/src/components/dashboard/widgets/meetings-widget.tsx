import { WidgetCard } from "../widget-card";
import { Calendar, ExternalLink, Clock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  type?: "video" | "phone" | "in-person";
  attendees?: string[];
}

interface MeetingsWidgetProps {
  meetings?: Meeting[];
  onViewAll?: () => void;
  onMeetingClick?: (meeting: Meeting) => void;
  className?: string;
}

export function MeetingsWidget({
  meetings = [],
  onViewAll,
  onMeetingClick,
  className,
}: MeetingsWidgetProps) {
  const [filter, setFilter] = useState("upcoming");

  const filterOptions = [
    { value: "upcoming", label: "Upcoming Meetings" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
  ];

  return (
    <WidgetCard
      title="My Meetings (CRM)"
      icon={<Calendar className="h-4 w-4" />}
      isEmpty={meetings.length === 0}
      emptyIcon={<Calendar className="h-10 w-10" />}
      emptyMessage="You have no meetings scheduled"
      headerDropdown={{
        label: "Filter",
        options: filterOptions,
        value: filter,
        onChange: setFilter,
      }}
      actions={
        onViewAll && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )
      }
      className={className}
      data-testid="meetings-widget"
    >
      <div className="space-y-2">
        {meetings.map((meeting) => (
          <MeetingItem
            key={meeting.id}
            meeting={meeting}
            onClick={() => onMeetingClick?.(meeting)}
          />
        ))}
      </div>
    </WidgetCard>
  );
}

function MeetingItem({
  meeting,
  onClick,
}: {
  meeting: Meeting;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex-shrink-0 mt-0.5">
        {meeting.type === "video" ? (
          <Video className="h-4 w-4 text-blue-500" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{meeting.title}</p>
        <p className="text-xs text-muted-foreground">
          {meeting.startTime}
          {meeting.endTime && ` - ${meeting.endTime}`}
        </p>
        {meeting.attendees && meeting.attendees.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {meeting.attendees.slice(0, 2).join(", ")}
            {meeting.attendees.length > 2 &&
              ` +${meeting.attendees.length - 2} more`}
          </p>
        )}
      </div>
    </button>
  );
}
