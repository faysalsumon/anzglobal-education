/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckSquare,
  Plus,
  Bug,
  Sparkles,
  Wrench,
  AlertTriangle,
  Circle,
  Play,
  Clock,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { TaskDialog } from "@/components/task-dialog";

interface Task {
  id: string;
  title: string;
  taskType: string;
  priority: string;
  status: string;
  dueDate: string | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
}

interface EntityTasksWidgetProps {
  entityType: "application" | "institution" | "course" | "crm_contact" | "invoice";
  entityId: string;
  entityLabel?: string;
}

const TASK_TYPE_ICON: Record<string, any> = {
  task: CheckSquare,
  bug: Bug,
  feature: Sparkles,
  improvement: Wrench,
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const PRIORITY_ICON: Record<string, any> = {
  low: Circle,
  medium: Play,
  high: AlertTriangle,
  urgent: AlertTriangle,
};

export function EntityTasksWidget({ entityType, entityId, entityLabel }: EntityTasksWidgetProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/by-entity", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/by-entity?type=${entityType}&id=${encodeURIComponent(entityId)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch entity tasks");
      return res.json();
    },
    enabled: !!entityId,
  });

  const openTasks = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled");

  const handleAddTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-3" data-testid={`entity-tasks-widget-${entityType}-${entityId}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Tasks</span>
          {openTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs no-default-active-elevate">{openTasks.length} open</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddTask}
          data-testid={`button-add-entity-task-${entityType}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : openTasks.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">No open tasks</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 text-xs"
            onClick={handleAddTask}
            data-testid={`button-add-first-entity-task-${entityType}`}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add task
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {openTasks.map(task => {
            const TypeIcon = TASK_TYPE_ICON[task.taskType] || CheckSquare;
            const PriorityIcon = PRIORITY_ICON[task.priority] || Circle;
            const isOverdue = task.dueDate && isPast(new Date(task.dueDate));
            const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

            return (
              <div
                key={task.id}
                className="flex items-center gap-2 p-2 rounded-md border bg-card cursor-pointer hover-elevate"
                onClick={() => handleEditTask(task)}
                data-testid={`entity-task-item-${task.id}`}
              >
                <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-xs truncate">{task.title}</span>
                <Badge variant="outline" className={`${PRIORITY_COLOR[task.priority] || ""} text-xs no-default-active-elevate`}>
                  <PriorityIcon className="h-2.5 w-2.5 mr-1" />
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <span className={`text-xs shrink-0 flex items-center gap-0.5 ${isOverdue ? "text-red-600" : isDueToday ? "text-orange-600" : "text-muted-foreground"}`}>
                    <Clock className="h-2.5 w-2.5" />
                    {format(new Date(task.dueDate), "MMM d")}
                  </span>
                )}
              </div>
            );
          })}
          {tasks.length > openTasks.length && (
            <p className="text-xs text-muted-foreground text-center">
              +{tasks.length - openTasks.length} completed
            </p>
          )}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        defaultLinkedEntityType={entityType}
        defaultLinkedEntityId={entityId}
        onSuccess={() => {
          // queries will invalidate automatically
        }}
      />
    </div>
  );
}
