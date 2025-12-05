import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bell,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  ListTodo,
  AlertCircle,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Reminder {
  id: string;
  taskId: string | null;
  applicationId: string | null;
  userId: string;
  reminderAt: Date | string;
  message: string | null;
  isCompleted: boolean | null;
  completedAt: Date | string | null;
  notificationSent: boolean | null;
  createdAt: Date | string | null;
}

interface UpcomingRemindersPanelProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export function UpcomingRemindersPanel({
  limit = 10,
  showHeader = true,
  compact = false,
}: UpcomingRemindersPanelProps) {
  const { toast } = useToast();

  const { data: reminders = [], isLoading, isError, error } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders/upcoming"],
    retry: false,
  });

  const completeMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return apiRequest("POST", `/api/reminders/${reminderId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Reminder completed",
        description: "The reminder has been marked as done",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete reminder",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return apiRequest("DELETE", `/api/reminders/${reminderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Reminder deleted",
        description: "The reminder has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      });
    },
  });

  const getTimeLabel = (reminderAt: Date | string) => {
    const date = typeof reminderAt === "string" ? new Date(reminderAt) : reminderAt;
    
    if (isPast(date)) {
      return { label: "Overdue", variant: "destructive" as const };
    }
    if (isToday(date)) {
      return { label: "Today", variant: "default" as const };
    }
    if (isTomorrow(date)) {
      return { label: "Tomorrow", variant: "secondary" as const };
    }
    return { label: format(date, "MMM d"), variant: "outline" as const };
  };

  const formatTime = (reminderAt: Date | string) => {
    const date = typeof reminderAt === "string" ? new Date(reminderAt) : reminderAt;
    return format(date, "p");
  };

  const displayedReminders = reminders.slice(0, limit);

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
        )}
        <CardContent className={compact ? "p-3" : "p-4"}>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Upcoming Reminders</CardTitle>
            </div>
          </CardHeader>
        )}
        <CardContent className={compact ? "p-3" : "p-4"}>
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Reminders not available</p>
            <p className="text-xs mt-1">
              Unable to load reminders at this time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Upcoming Reminders</CardTitle>
            {displayedReminders.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {displayedReminders.length}
              </Badge>
            )}
          </div>
          <CardDescription>
            Your scheduled follow-up reminders
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-3" : "p-4"}>
        {displayedReminders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No upcoming reminders</p>
            <p className="text-xs mt-1">
              Set reminders from application or task details
            </p>
          </div>
        ) : (
          <ScrollArea className={compact ? "h-[250px]" : "h-[350px]"}>
            <div className="space-y-2 pr-4">
              {displayedReminders.map((reminder) => {
                const timeInfo = getTimeLabel(reminder.reminderAt);
                return (
                  <div
                    key={reminder.id}
                    className={`p-3 rounded-lg border bg-card hover-elevate ${
                      isPast(new Date(reminder.reminderAt)) ? "border-destructive/50" : ""
                    }`}
                    data-testid={`reminder-item-${reminder.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {reminder.applicationId ? (
                          <FileText className="h-4 w-4 text-primary" />
                        ) : reminder.taskId ? (
                          <ListTodo className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Bell className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={timeInfo.variant} className="text-xs">
                            {timeInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(reminder.reminderAt)}
                          </span>
                        </div>
                        {reminder.message ? (
                          <p className="text-sm line-clamp-2">{reminder.message}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            {reminder.applicationId
                              ? "Application follow-up"
                              : reminder.taskId
                              ? "Task reminder"
                              : "Reminder"}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => completeMutation.mutate(reminder.id)}
                          disabled={completeMutation.isPending}
                          title="Mark as complete"
                          data-testid={`button-complete-reminder-${reminder.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(reminder.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete reminder"
                          data-testid={`button-delete-reminder-${reminder.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
