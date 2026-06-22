import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCircle2, Plus, Clock, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreateReminderModal, type ReminderEntityType } from "@/components/create-reminder-modal";

interface EntityReminder {
  id: string;
  reminderAt: Date | string;
  message: string | null;
  isCompleted: boolean | null;
  completedAt: Date | string | null;
}

interface EntityFollowUpPanelProps {
  entityType: ReminderEntityType;
  entityId: string;
}

export function EntityFollowUpPanel({ entityType, entityId }: EntityFollowUpPanelProps) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: async (reminderId: string) =>
      apiRequest("DELETE", `/api/reminders/${reminderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/by-entity", { entityType, entityId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      toast({ title: "Follow-up removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not delete reminder", variant: "destructive" });
    },
  });

  const activeReminders = (reminders || []).filter((r) => !r.isCompleted);
  const completedReminders = (reminders || []).filter((r) => r.isCompleted);

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
                    disabled={completeMutation.isPending || deleteMutation.isPending}
                    title="Mark as done"
                    data-testid={`button-complete-followup-${reminder.id}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 mt-0.5"
                    onClick={() => deleteMutation.mutate(reminder.id)}
                    disabled={deleteMutation.isPending || completeMutation.isPending}
                    title="Delete follow-up"
                    data-testid={`button-delete-followup-${reminder.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {!isLoading && completedReminders.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover-elevate px-1 py-0.5 rounded"
            data-testid="button-toggle-completed-followups"
          >
            {showCompleted ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Show completed ({completedReminders.length})
          </button>

          {showCompleted && (
            <div className="mt-1.5 space-y-1.5">
              {completedReminders.map((reminder) => {
                const completedDate = reminder.completedAt
                  ? typeof reminder.completedAt === "string"
                    ? new Date(reminder.completedAt)
                    : reminder.completedAt
                  : null;
                return (
                  <div
                    key={reminder.id}
                    className="flex items-start gap-2 px-2.5 py-2 rounded-md border border-border/40 bg-muted/30 opacity-60"
                    data-testid={`followup-completed-item-${reminder.id}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {reminder.message ? (
                        <p className="text-xs line-through text-muted-foreground line-clamp-2">
                          {reminder.message}
                        </p>
                      ) : (
                        <p className="text-xs italic line-through text-muted-foreground">
                          No message
                        </p>
                      )}
                      {completedDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Completed {format(completedDate, "d MMM yyyy 'at' p")}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 mt-0.5"
                      onClick={() => deleteMutation.mutate(reminder.id)}
                      disabled={deleteMutation.isPending}
                      title="Delete follow-up"
                      data-testid={`button-delete-completed-followup-${reminder.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
