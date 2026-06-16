import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  }
  return headers;
}

interface ActivityLogEntry {
  id: string;
  leadId: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  } | null;
}

interface LeadActivityLogProps {
  leadId: string;
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "outline" {
  switch (action) {
    case "created":
      return "default";
    case "updated":
      return "secondary";
    default:
      return "outline";
  }
}

function formatFieldLabel(fieldName: string): string {
  const labelMap: Record<string, string> = {
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    mobile: "Mobile",
    city: "City",
    country: "Country",
    nationality: "Nationality",
    leadStatus: "Status",
    leadRating: "Rating",
    branch: "Branch",
    assignedTo: "Assigned To",
    courseName: "Course Name",
    courseId: "Course",
    interestedIn: "Interested In",
    intakeMonth: "Intake Month",
    intakeYear: "Intake Year",
    notes: "Notes",
  };
  return labelMap[fieldName] || fieldName;
}

export function LeadActivityLog({ leadId }: LeadActivityLogProps) {
  const { data, isLoading, error } = useQuery<{ activityLog: ActivityLogEntry[] }>({
    queryKey: ["/api/crm/leads", leadId, "activity-log"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/leads/${leadId}/activity-log`, {
        credentials: "include",
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch activity log");
      return response.json();
    },
    enabled: !!leadId,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load activity log</p>
        </CardContent>
      </Card>
    );
  }

  const activityLog = data?.activityLog || [];

  return (
    <Card data-testid="card-activity-log">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Activity Log
          {activityLog.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activityLog.length} {activityLog.length === 1 ? "entry" : "entries"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activityLog.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No activity recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activityLog.map((entry) => {
                const userName = entry.changedBy
                  ? `${entry.changedBy.firstName || ""} ${entry.changedBy.lastName || ""}`.trim() || entry.changedBy.email
                  : "Unknown";
                const userInitials = entry.changedBy
                  ? `${entry.changedBy.firstName?.[0] || ""}${entry.changedBy.lastName?.[0] || ""}`.toUpperCase() || "?"
                  : "?";

                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 pb-4 border-b last:border-0"
                    data-testid={`activity-entry-${entry.id}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={entry.changedBy?.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" data-testid="text-user-name">
                          {userName}
                        </span>
                        <Badge variant={getActionBadgeVariant(entry.action)} className="text-xs">
                          {entry.action}
                        </Badge>
                        {entry.fieldName && (
                          <span className="text-xs text-muted-foreground">
                            {formatFieldLabel(entry.fieldName)}
                          </span>
                        )}
                      </div>
                      
                      {entry.fieldName && entry.action === "updated" && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          {entry.oldValue && (
                            <span className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded text-xs line-through">
                              {entry.oldValue.length > 50 ? `${entry.oldValue.substring(0, 50)}...` : entry.oldValue}
                            </span>
                          )}
                          <ArrowRight className="h-3 w-3" />
                          {entry.newValue && (
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">
                              {entry.newValue.length > 50 ? `${entry.newValue.substring(0, 50)}...` : entry.newValue}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {entry.description && entry.action === "created" && (
                        <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                      )}
                      
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span data-testid="text-activity-time">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
