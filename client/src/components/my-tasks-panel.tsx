import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListTodo,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  Calendar,
  ArrowUpRight,
  Filter,
  Plus,
  Bell,
  Edit,
  ArrowRight,
  MessageSquare,
  Crown,
  User,
} from "lucide-react";
import { TaskInlineNotes } from "@/components/task-inline-notes";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { TaskDialog } from "@/components/task-dialog";
import { useAuth } from "@/hooks/useAuth";
import type { Task, FollowUpReminder } from "@shared/schema";

interface TaskWithRelations extends Task {
  assignedTo?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    profileImageUrl?: string | null;
  } | null;
  createdBy?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  } | null;
  application?: {
    id: string;
    applicationNumber?: string | null;
    stage?: string | null;
    course?: {
      title?: string | null;
    } | null;
    student?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
}

const priorityConfig = {
  low: { label: "Low", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: Circle },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: Play },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", icon: AlertTriangle },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: AlertTriangle },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  on_hold: { label: "On Hold", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const f = firstName?.charAt(0) || "";
  const l = lastName?.charAt(0) || "";
  if (f || l) return `${f}${l}`.toUpperCase();
  return email?.charAt(0)?.toUpperCase() || "?";
}

function getDisplayName(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const full = `${firstName || ""} ${lastName || ""}`.trim();
  return full || email || "Unknown";
}

export function MyTasksPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const searchString = useSearch();
  const [, navigate] = useLocation();

  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [expandedNoteTaskId, setExpandedNoteTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithRelations[]>({
    queryKey: ["/api/tasks/my-tasks"],
  });

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<FollowUpReminder[]>({
    queryKey: ["/api/reminders/upcoming"],
  });

  // Deep-link: handle ?taskId=xxx&showComments=true from notification clicks
  useEffect(() => {
    if (tasksLoading || !tasks.length) return;
    const params = new URLSearchParams(searchString);
    const taskId = params.get("taskId");
    const showComments = params.get("showComments");
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (showComments === "true") {
      setExpandedNoteTaskId(taskId);
    } else {
      setEditingTask(task);
      setTaskDialogOpen(true);
    }
    // Clean up the URL so back-navigation works cleanly
    navigate("/admin?tab=my-tasks", { replace: true });
  }, [searchString, tasks, tasksLoading]);

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("POST", `/api/tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-tasks"] });
      toast({ title: "Task completed", description: "The task has been marked as complete" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete task", variant: "destructive" });
    },
  });

  const completeReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return apiRequest("POST", `/api/reminders/${reminderId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      toast({ title: "Reminder completed", description: "The reminder has been marked as complete" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete reminder", variant: "destructive" });
    },
  });

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === "active") {
      if (task.status === "completed" || task.status === "cancelled") return false;
    } else if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const overdueTasks = sortedTasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== "completed");
  const todayTasks = sortedTasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== "completed");
  const upcomingTasks = sortedTasks.filter(t => {
    if (!t.dueDate || t.status === "completed") return false;
    const due = new Date(t.dueDate);
    return !isPast(due) && !isToday(due);
  });
  const noDueTasks = sortedTasks.filter(t => !t.dueDate && t.status !== "completed");

  const getDueDateDisplay = (dueDate: Date | string) => {
    const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
    if (isPast(date)) return { text: `Overdue by ${formatDistanceToNow(date)}`, className: "text-red-600 dark:text-red-400" };
    if (isToday(date)) return { text: "Due today", className: "text-orange-600 dark:text-orange-400" };
    if (isTomorrow(date)) return { text: "Due tomorrow", className: "text-yellow-600 dark:text-yellow-400" };
    return { text: `Due ${format(date, "MMM d")}`, className: "text-muted-foreground" };
  };

  const TaskItem = ({
    task,
    onEdit,
    isExpanded,
    onToggleExpand,
  }: {
    task: TaskWithRelations;
    onEdit: (task: TaskWithRelations) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
  }) => {
    const priority = priorityConfig[task.priority];
    const status = statusConfig[task.status];
    const PriorityIcon = priority.icon;
    const dueDisplay = task.dueDate ? getDueDateDisplay(task.dueDate) : null;

    const isOwner = currentUserId && task.createdById === currentUserId;
    const isSelfAssigned = task.createdById === task.assignedToId;

    const owner = task.createdBy;
    const assignee = task.assignedTo;

    const ownerName = owner
      ? getDisplayName(owner.firstName, owner.lastName)
      : "Unknown";
    const assigneeName = assignee
      ? getDisplayName(assignee.firstName, assignee.lastName, assignee.email)
      : task.assignedToId ? "Assigned" : null;

    const canComplete = !!isOwner && task.status !== "completed";

    return (
      <div
        className="rounded-lg border bg-card"
        data-testid={`task-item-${task.id}`}
      >
        <div className="flex items-start gap-3 p-3">
          {/* Completion checkbox — owner only */}
          <div className="pt-0.5 shrink-0">
            {canComplete || task.status === "completed" ? (
              <Checkbox
                checked={task.status === "completed"}
                onCheckedChange={() => canComplete && completeTaskMutation.mutate(task.id)}
                disabled={completeTaskMutation.isPending || task.status === "completed"}
                data-testid={`checkbox-task-${task.id}`}
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Checkbox
                      checked={task.status === "completed"}
                      disabled
                      data-testid={`checkbox-task-${task.id}`}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Only the task owner can mark this complete
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Title + badges */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`font-medium text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </span>
              <Badge className={`${priority.color} no-default-active-elevate`} variant="outline">
                <PriorityIcon className="h-3 w-3 mr-1" />
                {priority.label}
              </Badge>
              <Badge className={`${status.color} no-default-active-elevate`} variant="outline">
                {status.label}
              </Badge>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mb-1.5">{task.description}</p>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
              {dueDisplay && (
                <span className={`flex items-center gap-1 ${dueDisplay.className}`}>
                  <Clock className="h-3 w-3" />
                  {dueDisplay.text}
                </span>
              )}
              {task.application && (
                <Link href={`/admin/applications/${task.application.id}`}>
                  <span className="flex items-center gap-1 text-primary cursor-pointer hover:underline">
                    <ArrowUpRight className="h-3 w-3" />
                    {task.application.applicationNumber || "View Application"}
                  </span>
                </Link>
              )}
              {task.category && (
                <Badge variant="secondary" className="text-xs no-default-active-elevate">
                  {task.category.replace(/_/g, " ")}
                </Badge>
              )}
            </div>

            {/* Owner / Assignee avatars */}
            <div className="flex items-center gap-3 mb-2">
              {/* Owner */}
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className="h-6 w-6 ring-2 ring-background">
                        <AvatarImage src={owner?.profileImageUrl ?? undefined} alt={ownerName} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {owner ? getInitials(owner.firstName, owner.lastName) : <Crown className="h-3 w-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background flex items-center justify-center">
                        <Crown className="h-2 w-2 text-amber-500" />
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Owner: {ownerName}
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground truncate max-w-[90px]">{ownerName}</span>
              </div>

              {/* Arrow + Assignee (only if assigned and not self-assigned) */}
              {!isSelfAssigned && assigneeName && (
                <>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 ring-2 ring-background">
                          <AvatarImage src={assignee?.profileImageUrl ?? undefined} alt={assigneeName} />
                          <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                            {assignee ? getInitials(assignee.firstName, assignee.lastName, assignee.email) : <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Assigned to: {assigneeName}
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-xs text-muted-foreground truncate max-w-[90px]">{assigneeName}</span>
                  </div>
                </>
              )}

              {/* Self-assigned badge */}
              {isSelfAssigned && (
                <span className="text-xs text-muted-foreground italic">Self-assigned</span>
              )}
            </div>

            {/* Comments toggle */}
            <div className="flex items-center pt-1.5 border-t border-border/40">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`button-toggle-comments-${task.id}`}
              >
                <MessageSquare className="h-3 w-3" />
                {isExpanded ? "Hide comments" : "Comments"}
              </button>
            </div>
          </div>

          {/* Edit button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => onEdit(task)}
            data-testid={`button-edit-task-${task.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {/* Inline comments thread */}
        {isExpanded && (
          <div className="border-t border-border/40 px-4 py-3">
            <TaskInlineNotes taskId={task.id} currentUserId={user?.id ?? null} />
          </div>
        )}
      </div>
    );
  };

  if (tasksLoading || remindersLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderTaskGroup = (taskList: TaskWithRelations[]) =>
    taskList.map(task => (
      <TaskItem
        key={task.id}
        task={task}
        onEdit={(t) => { setEditingTask(t); setTaskDialogOpen(true); }}
        isExpanded={expandedNoteTaskId === task.id}
        onToggleExpand={() => setExpandedNoteTaskId(prev => prev === task.id ? null : task.id)}
      />
    ));

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Tasks</p>
              <p className="text-xl font-bold">{tasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length}</p>
            </div>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Overdue</p>
              <p className="text-xl font-bold text-red-600">{overdueTasks.length}</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Due Today</p>
              <p className="text-xl font-bold text-orange-600">{todayTasks.length}</p>
            </div>
            <Calendar className="h-4 w-4 text-orange-500" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Reminders</p>
              <p className="text-xl font-bold">{reminders.length}</p>
            </div>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" />
              Upcoming Reminders
            </CardTitle>
            <CardDescription className="text-xs">Your scheduled follow-ups</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2">
              {reminders.slice(0, 5).map(reminder => (
                <div
                  key={reminder.id}
                  className="flex items-center gap-2 p-2 rounded-md border bg-card"
                  data-testid={`reminder-item-${reminder.id}`}
                >
                  <Checkbox
                    checked={reminder.isCompleted || false}
                    onCheckedChange={() => completeReminderMutation.mutate(reminder.id)}
                    disabled={completeReminderMutation.isPending}
                    data-testid={`checkbox-reminder-${reminder.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{reminder.message}</p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {reminder.reminderAt
                        ? format(new Date(reminder.reminderAt), "MMM d 'at' h:mm a")
                        : "No date set"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks list */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListTodo className="h-4 w-4" />
                My Tasks
              </CardTitle>
              <CardDescription className="text-xs">Tasks assigned to or created by you</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}
                size="sm"
                data-testid="button-create-task"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Task
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[110px] h-8 text-xs" data-testid="select-status-filter">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[110px] h-8 text-xs" data-testid="select-priority-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs">No tasks match the current filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {overdueTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-600 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Overdue ({overdueTasks.length})
                  </h4>
                  {renderTaskGroup(overdueTasks)}
                </div>
              )}
              {todayTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-orange-600 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Due Today ({todayTasks.length})
                  </h4>
                  {renderTaskGroup(todayTasks)}
                </div>
              )}
              {upcomingTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Upcoming ({upcomingTasks.length})
                  </h4>
                  {renderTaskGroup(upcomingTasks)}
                </div>
              )}
              {noDueTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Circle className="h-3.5 w-3.5" />
                    No Due Date
                  </h4>
                  {renderTaskGroup(noDueTasks)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
      />
    </div>
  );
}
