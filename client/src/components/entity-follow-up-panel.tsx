import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCircle2, Plus, Clock } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreateReminderModal, type ReminderEntityType } from "@/components/create-reminder-modal";

interface EntityReminder {
  id: string;
  reminderAt: Date | string;
  message: string | null;
  isCompleted: boolean | null;
}

interface EntityFollowUpPanelProps {
  entityType: ReminderEntityType;
  entityId: string;
}

export function EntityFollowUpPanel({ entityType, entityId }: EntityFollowUpPanelProps) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const { data: reminders = [], isLoading } = useQuery<EntityReminder[]>({
    queryKey: ["/api/reminders/by-entity", { entityType, entityId }],
    enabled: !!entityId,
    retry: false,
  });

  const completeMutation = useMutation({
    mutationFn: async (reminderId: string) =>
      apiRequest("POST", `/api/reminders/${reminderId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/by-entity", { entityType, entityId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      toast({ title: "Marked as done" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not mark reminder as done", variant: "destructive" });
    },
  });

  const activeReminders = (reminders || []).filter((r) => !r.isCompleted);

  const getTimeBadge = (reminderAt: Date | string) => {
    const date = typeof reminderAt === "string" ? new Date(reminderAt) : reminderAt;
    if (isPast(date) && !isToday(date))
      return { label: "Overdue", variant: "destructive" as const, className: undefined };
    if (isToday(date))
      return {
        label: "Today",
        variant: "outline" as const,
        className:
          "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
      };
    if (isTomorrow(date))
      return { label: "Tomorrow", variant: "default" as const, className: undefined };
    return { label: format(date, "d MMM"), variant: "default" as const, className: undefined };
  };

  return (
    <div className="mb-4 pb-4 border-b border-border/60">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Follow Ups
          </p>
          {activeReminders.length > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {activeReminders.length}
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setAddOpen(true)}
          data-testid="button-add-followup"
          title="Add follow-up reminder"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : activeReminders.length === 0 ? (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full text-left px-3 py-2.5 rounded-md border border-dashed border-muted-foreground/30 text-xs text-muted-foreground hover-elevate"
          data-testid="button-empty-followup"
        >
          <Bell className="h-3.5 w-3.5 inline mr-1.5 opacity-50" />
          No follow-ups scheduled — click to add one
        </button>
      ) : (
        <ScrollArea className="max-h-[220px]">
          <div className="space-y-1.5 pr-3">
            {activeReminders.map((reminder) => {
              const badge = getTimeBadge(reminder.reminderAt);
              const dateObj =
                typeof reminder.reminderAt === "string"
                  ? new Date(reminder.reminderAt)
                  : reminder.reminderAt;
              return (
                <div
                  key={reminder.id}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-md border bg-card"
                  data-testid={`followup-item-${reminder.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={badge.variant}
                        className={`text-xs px-1.5 py-0${badge.className ? ` ${badge.className}` : ""}`}
                      >
                        {badge.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {format(dateObj, "p")}
                      </span>
                    </div>
                    {reminder.message ? (
                      <p className="text-xs mt-0.5 line-clamp-2 text-foreground">
                        {reminder.message}
                      </p>
                    ) : (
                      <p className="text-xs mt-0.5 italic text-muted-foreground">
                        No message
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 mt-0.5"
                    onClick={() => completeMutation.mutate(reminder.id)}
                    disabled={completeMutation.isPending}
                    title="Mark as done"
                    data-testid={`button-complete-followup-${reminder.id}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <CreateReminderModal
        open={addOpen}
        onOpenChange={setAddOpen}
        entityType={entityType}
        entityId={entityId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/reminders/by-entity", { entityType, entityId }] });
        }}
      />
    </div>
  );
}
