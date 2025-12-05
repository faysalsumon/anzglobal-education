import { useQuery } from "@tanstack/react-query";
import { WidgetCard } from "../widget-card";
import { CompactTable, PriorityBadge, StatusBadge } from "../compact-table";
import { Button } from "@/components/ui/button";
import { ListTodo, Plus, ExternalLink, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  assignee?: {
    id: string;
    name: string;
  };
  relatedTo?: {
    type: string;
    name: string;
    id: string;
  };
}

interface MyTasksWidgetProps {
  onViewAll?: () => void;
  onCreateTask?: () => void;
  className?: string;
}

export function MyTasksWidget({ onViewAll, onCreateTask, className }: MyTasksWidgetProps) {
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/my-tasks"],
  });

  const columns = [
    {
      key: "title",
      header: "Subject",
      render: (task: Task) => (
        <span className="font-medium text-primary hover:underline cursor-pointer">
          {task.title}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (task: Task) =>
        task.dueDate ? format(new Date(task.dueDate), "dd/MM/yyyy") : "-",
    },
    {
      key: "status",
      header: "Status",
      render: (task: Task) => <StatusBadge status={task.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      render: (task: Task) => <PriorityBadge priority={task.priority} />,
    },
  ];

  return (
    <WidgetCard
      title="My Open Tasks"
      icon={<ListTodo className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={tasks.length === 0}
      emptyIcon={<ListTodo className="h-10 w-10" />}
      emptyMessage="No tasks found"
      emptyAction={
        onCreateTask && (
          <Button size="sm" onClick={onCreateTask}>
            <Plus className="h-4 w-4 mr-1" />
            Create Task
          </Button>
        )
      }
      actions={
        onViewAll && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )
      }
      noPadding
      className={className}
      data-testid="my-tasks-widget"
    >
      <CompactTable
        columns={columns}
        data={tasks.slice(0, 5)}
        keyExtractor={(task) => task.id}
        density="compact"
      />
    </WidgetCard>
  );
}

interface TeamTasksWidgetProps {
  onViewAll?: () => void;
  className?: string;
}

export function TeamTasksWidget({ onViewAll, className }: TeamTasksWidgetProps) {
  const { data, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/team-tasks"],
  });

  const tasks = data || [];

  const columns = [
    {
      key: "title",
      header: "Subject",
      render: (task: Task) => (
        <span className="font-medium text-primary hover:underline cursor-pointer">
          {task.title}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (task: Task) =>
        task.dueDate ? format(new Date(task.dueDate), "dd/MM/yyyy") : "-",
    },
    {
      key: "status",
      header: "Status",
      render: (task: Task) => <StatusBadge status={task.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      render: (task: Task) => <PriorityBadge priority={task.priority} />,
    },
    {
      key: "assignee",
      header: "Assigned To",
      render: (task: Task) =>
        task.assignee ? (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-primary hover:underline cursor-pointer">
              {task.assignee.name}
            </span>
          </div>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <WidgetCard
      title="Everyone's Open Tasks"
      icon={<ListTodo className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={tasks.length === 0}
      emptyIcon={<ListTodo className="h-10 w-10" />}
      emptyMessage="No team tasks found"
      actions={
        onViewAll && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )
      }
      noPadding
      className={className}
      data-testid="team-tasks-widget"
    >
      <CompactTable
        columns={columns}
        data={tasks.slice(0, 6)}
        keyExtractor={(task) => task.id}
        density="compact"
        pagination={
          tasks.length > 6
            ? {
                page: 1,
                pageSize: 6,
                total: tasks.length,
                onPageChange: () => {},
              }
            : undefined
        }
      />
    </WidgetCard>
  );
}
