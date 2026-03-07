import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  UserCircle,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { TaskDialog } from "@/components/task-dialog";
import { useAuth } from "@/hooks/useAuth";
import type { Task, FollowUpReminder } from "@shared/schema";

interface TaskWithRelations extends Task {
  assignee?: {
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

export function MyTasksPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithRelations[]>({
    queryKey: ["/api/tasks/my-tasks"],
  });

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<FollowUpReminder[]>({
    queryKey: ["/api/reminders/upcoming"],
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("POST", `/api/tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-tasks"] });
      toast({
        title: "Task completed",
        description: "The task has been marked as complete",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete task",
        variant: "destructive",
      });
    },
  });

  const completeReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return apiRequest("POST", `/api/reminders/${reminderId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      toast({
        title: "Reminder completed",
        description: "The reminder has been marked as complete",
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

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === "active") {
      if (task.status === "completed" || task.status === "cancelled") return false;
    } else if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== "all" && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
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

  const getDueDateDisplay = (dueDate: Date | string) => {
    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    if (isPast(date)) {
      return { text: `Overdue by ${formatDistanceToNow(date)}`, className: "text-red-600 dark:text-red-400" };
    }
    if (isToday(date)) {
      return { text: "Due today", className: "text-orange-600 dark:text-orange-400" };
    }
    if (isTomorrow(date)) {
      return { text: "Due tomorrow", className: "text-yellow-600 dark:text-yellow-400" };
    }
    return { text: `Due ${format(date, "MMM d")}`, className: "text-muted-foreground" };
  };

  const TaskItem = ({ task, onEdit }: { task: TaskWithRelations; onEdit: (task: TaskWithRelations) => void }) => {
    const priority = priorityConfig[task.priority];
    const status = statusConfig[task.status];
    const PriorityIcon = priority.icon;
    const dueDisplay = task.dueDate ? getDueDateDisplay(task.dueDate) : null;

    const isCreator = currentUserId && task.createdById === currentUserId;
    const isAssignee = currentUserId && task.assignedToId === currentUserId;

    const assigneeName = task.assignee
      ? `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`.trim() || task.assignee.email
      : null;
    const creatorName = task.createdBy
      ? `${task.createdBy.firstName || ''} ${task.createdBy.lastName || ''}`.trim()
      : null;

    return (
      <div
        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate"
        data-testid={`task-item-${task.id}`}
      >
        <Checkbox
          checked={task.status === "completed"}
          onCheckedChange={() => completeTaskMutation.mutate(task.id)}
          disabled={completeTaskMutation.isPending || task.status === "completed"}
          data-testid={`checkbox-task-${task.id}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`font-medium text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </span>
            <Badge className={priority.color} variant="outline">
              <PriorityIcon className="h-3 w-3 mr-1" />
              {priority.label}
            </Badge>
            <Badge className={status.color} variant="outline">
              {status.label}
            </Badge>
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {dueDisplay && (
              <span className={`flex items-center gap-1 ${dueDisplay.className}`}>
                <Clock className="h-3 w-3" />
                {dueDisplay.text}
              </span>
            )}
            {/* Show who this task is assigned to if I'm the creator */}
            {isCreator && !isAssignee && assigneeName && (
              <span className="flex items-center gap-1 text-primary">
                <ArrowRight className="h-3 w-3" />
                {assigneeName}
              </span>
            )}
            {/* Show who created this if I'm the assignee and didn't create it */}
            {isAssignee && !isCreator && creatorName && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <UserCircle className="h-3 w-3" />
                from {creatorName}
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
              <Badge variant="secondary" className="text-xs">
                {task.category.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => onEdit(task)}
          data-testid={`button-edit-task-${task.id}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
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
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListTodo className="h-4 w-4" />
                My Tasks
              </CardTitle>
              <CardDescription className="text-xs">Tasks assigned to or created by you</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setTaskDialogOpen(true);
                }}
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
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs">No tasks match the current filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Overdue ({overdueTasks.length})
                  </h4>
                  {overdueTasks.map(task => (
                    <TaskItem key={task.id} task={task} onEdit={(t) => {
                      setEditingTask(t);
                      setTaskDialogOpen(true);
                    }} />
                  ))}
                </div>
              )}
              {todayTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-orange-600 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Due Today ({todayTasks.length})
                  </h4>
                  {todayTasks.map(task => (
                    <TaskItem key={task.id} task={task} onEdit={(t) => {
                      setEditingTask(t);
                      setTaskDialogOpen(true);
                    }} />
                  ))}
                </div>
              )}
              {upcomingTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Upcoming ({upcomingTasks.length})
                  </h4>
                  {upcomingTasks.map(task => (
                    <TaskItem key={task.id} task={task} onEdit={(t) => {
                      setEditingTask(t);
                      setTaskDialogOpen(true);
                    }} />
                  ))}
                </div>
              )}
              {sortedTasks.filter(t => !t.dueDate && t.status !== "completed").length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Circle className="h-4 w-4" />
                    No Due Date
                  </h4>
                  {sortedTasks.filter(t => !t.dueDate && t.status !== "completed").map(task => (
                    <TaskItem key={task.id} task={task} onEdit={(t) => {
                      setEditingTask(t);
                      setTaskDialogOpen(true);
                    }} />
                  ))}
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
