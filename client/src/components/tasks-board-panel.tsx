/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ListTodo,
  LayoutGrid,
  List,
  Plus,
  Bug,
  Sparkles,
  Wrench,
  CheckSquare,
  AlertTriangle,
  Circle,
  Play,
  FolderOpen,
  Folder,
  MoreHorizontal,
  Archive,
  Trash2,
  Edit,
  Filter,
  X,
  Clock,
  Crown,
  ArrowRight,
  User,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { TaskDialog } from "@/components/task-dialog";
import type { TaskProject } from "@shared/schema";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  taskType: string;
  priority: string;
  status: string;
  projectId: string | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  tags: string[] | null;
  assignedToId: string | null;
  applicationId: string | null;
  createdById: string;
  dueDate: string | null;
  createdAt: string | null;
  assignedTo?: { id: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; email?: string | null } | null;
  createdBy?: { id: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null } | null;
  application?: { id: string; applicationNumber?: string | null } | null;
}

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
}

const TASK_TYPE_CONFIG = {
  task: { label: "Task", icon: CheckSquare, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  bug: { label: "Bug", icon: Bug, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  feature: { label: "Feature", icon: Sparkles, color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  improvement: { label: "Improvement", icon: Wrench, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: Circle },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: Play },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", icon: AlertTriangle },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: AlertTriangle },
};

const STATUS_COLUMNS = [
  { id: "pending", label: "Pending", color: "border-t-slate-400" },
  { id: "in_progress", label: "In Progress", color: "border-t-blue-500" },
  { id: "on_hold", label: "On Hold", color: "border-t-yellow-500" },
  { id: "completed", label: "Completed", color: "border-t-green-500" },
  { id: "cancelled", label: "Cancelled", color: "border-t-gray-400" },
];

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const f = firstName?.charAt(0) || "";
  const l = lastName?.charAt(0) || "";
  if (f || l) return `${f}${l}`.toUpperCase();
  return email?.charAt(0)?.toUpperCase() || "?";
}

function getDisplayName(firstName?: string | null, lastName?: string | null, email?: string | null) {
  return `${firstName || ""} ${lastName || ""}`.trim() || email || "Unknown";
}

interface ProjectDialogState {
  open: boolean;
  mode: "create" | "edit";
  project?: TaskProject;
}

export function TasksBoardPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isCTO = (user as any)?.role === 'cto' || (user as any)?.userType === 'cto';

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [bugTrackerMode, setBugTrackerMode] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projectDialog, setProjectDialog] = useState<ProjectDialogState>({ open: false, mode: "create" });
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectColor, setProjectColor] = useState("#3465A5");

  const { data: projects = [], isLoading: projectsLoading } = useQuery<TaskProject[]>({
    queryKey: ["/api/task-projects"],
  });

  const buildTasksQuery = () => {
    const params = new URLSearchParams({ withRelations: "true" });
    if (bugTrackerMode) {
      params.set("taskType", "bug");
    } else if (selectedType !== "all") {
      params.set("taskType", selectedType);
    }
    if (selectedProject !== "all") params.set("projectId", selectedProject);
    if (selectedPriority !== "all") params.set("priority", selectedPriority);
    if (selectedAssignee !== "all") params.set("assignedToId", selectedAssignee);
    return `/api/tasks?${params}`;
  };

  const tasksQueryKey = ["/api/tasks", { withRelations: true, project: selectedProject, type: selectedType, priority: selectedPriority, assignee: selectedAssignee, bugTracker: bugTrackerMode }];

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: tasksQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ withRelations: "true" });
      if (bugTrackerMode) {
        params.set("taskType", "bug");
      } else if (selectedType !== "all") {
        params.set("taskType", selectedType);
      }
      if (selectedProject !== "all") params.set("projectId", selectedProject);
      if (selectedPriority !== "all") params.set("priority", selectedPriority);
      if (selectedAssignee !== "all") params.set("assignedToId", selectedAssignee);
      const res = await fetch(`/api/tasks?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const { data: assignableData } = useQuery<{ users: TeamMember[] }>({
    queryKey: ["/api/admin/assignable-users"],
  });
  const teamMembers = assignableData?.users || [];

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string }) => {
      return apiRequest("POST", "/api/task-projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-projects"] });
      toast({ title: "Project created" });
      setProjectDialog({ open: false, mode: "create" });
      setProjectName("");
      setProjectDescription("");
      setProjectColor("#3465A5");
    },
    onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/task-projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-projects"] });
      toast({ title: "Project updated" });
      setProjectDialog({ open: false, mode: "create" });
    },
    onError: () => toast({ title: "Failed to update project", variant: "destructive" }),
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/task-projects/${id}`, { archive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-projects"] });
      if (selectedProject !== "all") setSelectedProject("all");
      toast({ title: "Project archived" });
    },
    onError: () => toast({ title: "Failed to archive project", variant: "destructive" }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/task-projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-projects"] });
      if (selectedProject !== "all") setSelectedProject("all");
      toast({ title: "Project deleted" });
    },
    onError: () => toast({ title: "Failed to delete project", variant: "destructive" }),
  });

  const activeProjects = projects.filter(p => p.status === "active");
  const archivedProjects = projects.filter(p => p.status === "archived");

  const hasActiveFilters = selectedProject !== "all" || selectedType !== "all" || selectedPriority !== "all" || selectedAssignee !== "all" || bugTrackerMode;

  const clearFilters = () => {
    setSelectedProject("all");
    setSelectedType("all");
    setSelectedPriority("all");
    setSelectedAssignee("all");
    setBugTrackerMode(false);
  };

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const openProjectCreate = () => {
    setProjectName("");
    setProjectDescription("");
    setProjectColor("#3465A5");
    setProjectDialog({ open: true, mode: "create" });
  };

  const openProjectEdit = (project: TaskProject) => {
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setProjectColor(project.color || "#3465A5");
    setProjectDialog({ open: true, mode: "edit", project });
  };

  const handleProjectSave = () => {
    if (!projectName.trim()) return;
    if (projectDialog.mode === "create") {
      createProjectMutation.mutate({ name: projectName.trim(), description: projectDescription.trim() || undefined, color: projectColor });
    } else if (projectDialog.project) {
      updateProjectMutation.mutate({ id: projectDialog.project.id, data: { name: projectName.trim(), description: projectDescription.trim() || undefined, color: projectColor } });
    }
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const typeConf = TASK_TYPE_CONFIG[task.taskType as keyof typeof TASK_TYPE_CONFIG] || TASK_TYPE_CONFIG.task;
    const TypeIcon = typeConf.icon;
    const priorityConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
    const PriorityIcon = priorityConf.icon;
    const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "completed";
    const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

    return (
      <div
        className="bg-card border rounded-md p-3 space-y-2 cursor-pointer hover-elevate"
        onClick={() => openEditTask(task)}
        data-testid={`task-card-${task.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium line-clamp-2 flex-1">{task.title}</span>
          <Badge variant="outline" className={`${typeConf.color} shrink-0 text-xs no-default-active-elevate`}>
            <TypeIcon className="h-3 w-3 mr-1" />
            {typeConf.label}
          </Badge>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`${priorityConf.color} text-xs no-default-active-elevate`}>
            <PriorityIcon className="h-2.5 w-2.5 mr-1" />
            {priorityConf.label}
          </Badge>
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600" : isDueToday ? "text-orange-600" : "text-muted-foreground"}`}>
              <Clock className="h-3 w-3" />
              {format(new Date(task.dueDate), "MMM d")}
            </span>
          )}
          {task.tags?.slice(0, 2).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs no-default-active-elevate">{tag}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          {task.assignedTo ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={task.assignedTo.profileImageUrl || undefined} />
                  <AvatarFallback className="text-[9px]">
                    {getInitials(task.assignedTo.firstName, task.assignedTo.lastName, task.assignedTo.email)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {getDisplayName(task.assignedTo.firstName, task.assignedTo.lastName, task.assignedTo.email)}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
              <User className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
          )}
          {task.linkedEntityType && (
            <span className="text-xs text-muted-foreground capitalize">
              {task.linkedEntityType.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>
    );
  };

  const KanbanView = () => (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {STATUS_COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        return (
          <div key={col.id} className={`flex-shrink-0 w-72 flex flex-col border-t-2 ${col.color} rounded-t-sm`}>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-t-sm">
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge variant="secondary" className="text-xs no-default-active-elevate">{colTasks.length}</Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {colTasks.map(task => <TaskCard key={task.id} task={task} />)}
                {colTasks.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-8">No tasks</div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );

  const ListView = () => {
    const sortedTasks = bugTrackerMode
      ? [...tasks].sort((a, b) => {
          const order = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2);
        })
      : tasks;

    return (
      <div className="space-y-2">
        {sortedTasks.map(task => {
          const typeConf = TASK_TYPE_CONFIG[task.taskType as keyof typeof TASK_TYPE_CONFIG] || TASK_TYPE_CONFIG.task;
          const TypeIcon = typeConf.icon;
          const priorityConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
          const PriorityIcon = priorityConf.icon;
          const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "completed";

          return (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 bg-card border rounded-md cursor-pointer hover-elevate"
              onClick={() => openEditTask(task)}
              data-testid={`task-row-${task.id}`}
            >
              <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`${priorityConf.color} text-xs no-default-active-elevate`}>
                  <PriorityIcon className="h-2.5 w-2.5 mr-1" />
                  {priorityConf.label}
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize no-default-active-elevate">
                  {task.status.replace(/_/g, " ")}
                </Badge>
                {task.dueDate && (
                  <span className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                    {format(new Date(task.dueDate), "MMM d")}
                  </span>
                )}
                {task.assignedTo ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignedTo.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(task.assignedTo.firstName, task.assignedTo.lastName, task.assignedTo.email)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            No tasks match your current filters
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left rail: Projects */}
      <div className="w-56 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Projects</span>
          <Button size="icon" variant="ghost" onClick={openProjectCreate} data-testid="button-create-project">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => { setSelectedProject("all"); setBugTrackerMode(false); }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedProject === "all" && !bugTrackerMode ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            data-testid="filter-project-all"
          >
            <ListTodo className="h-4 w-4" />
            All Tasks
          </button>
          <button
            onClick={() => { setBugTrackerMode(true); setSelectedType("all"); setSelectedProject("all"); }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${bugTrackerMode ? "bg-red-500/10 text-red-700 dark:text-red-400 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            data-testid="filter-bug-tracker"
          >
            <Bug className="h-4 w-4" />
            Bug Tracker
          </button>
        </div>

        {projectsLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-7 w-full" />)}
          </div>
        ) : (
          <>
            {activeProjects.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground px-2 font-medium">Active</p>
                {activeProjects.map(project => (
                  <div
                    key={project.id}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm ${selectedProject === project.id && !bugTrackerMode ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  >
                    <button
                      className="flex items-center gap-2 flex-1 min-w-0"
                      onClick={() => { setSelectedProject(project.id); setBugTrackerMode(false); }}
                      data-testid={`filter-project-${project.id}`}
                    >
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color || "#3465A5" }} />
                      <span className="truncate">{project.name}</span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openProjectEdit(project)}>
                          <Edit className="h-3 w-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archiveProjectMutation.mutate(project.id)}>
                          <Archive className="h-3 w-3 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        {isCTO && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteProjectMutation.mutate(project.id)}>
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}

            {archivedProjects.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground px-2 font-medium">Archived</p>
                {archivedProjects.map(project => (
                  <div key={project.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground/60">
                    <Folder className="h-4 w-4" />
                    <span className="truncate">{project.name}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Main board */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            {bugTrackerMode ? (
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bug className="h-5 w-5 text-red-600" />
                Bug Tracker
              </h2>
            ) : selectedProject !== "all" ? (
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                {activeProjects.find(p => p.id === selectedProject)?.name || "Project"}
              </h2>
            ) : (
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                All Tasks
              </h2>
            )}
            <Badge variant="secondary" className="no-default-active-elevate">{tasks.length}</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filters */}
            {!bugTrackerMode && (
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32" data-testid="filter-task-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TASK_TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-32" data-testid="filter-task-priority">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-36" data-testid="filter-task-assignee">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {teamMembers.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {getDisplayName(m.firstName, m.lastName, m.email)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4" />
              </Button>
            )}
            {/* View toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={view === "kanban" ? "default" : "ghost"}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setView("kanban")}
                data-testid="button-view-kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setView("list")}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={openCreateTask} data-testid="button-create-task">
              <Plus className="h-4 w-4 mr-1.5" />
              New Task
            </Button>
          </div>
        </div>

        {/* Bug tracker note */}
        {bugTrackerMode && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md text-sm text-red-700 dark:text-red-400">
            <Bug className="h-4 w-4 shrink-0" />
            <span>Showing all <strong>Bug</strong> tasks — sorted by priority in List view.</span>
          </div>
        )}

        {/* Content */}
        {tasksLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : view === "kanban" ? <KanbanView /> : <ListView />}
      </div>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        defaultProjectId={selectedProject !== "all" ? selectedProject : undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }}
      />

      {/* Project Create/Edit Dialog */}
      <Dialog open={projectDialog.open} onOpenChange={(o) => setProjectDialog(s => ({ ...s, open: o }))}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-project">
          <DialogHeader>
            <DialogTitle>{projectDialog.mode === "create" ? "Create Project" : "Edit Project"}</DialogTitle>
            <DialogDescription>
              {projectDialog.mode === "create" ? "Group related tasks under a project." : "Update project details."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. Website Redesign"
                data-testid="input-project-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={projectDescription}
                onChange={e => setProjectDescription(e.target.value)}
                placeholder="What is this project about?"
                data-testid="input-project-description"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={projectColor}
                  onChange={e => setProjectColor(e.target.value)}
                  className="h-9 w-14 rounded border cursor-pointer"
                  data-testid="input-project-color"
                />
                <span className="text-sm text-muted-foreground">{projectColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialog(s => ({ ...s, open: false }))}>Cancel</Button>
            <Button
              onClick={handleProjectSave}
              disabled={!projectName.trim() || createProjectMutation.isPending || updateProjectMutation.isPending}
              data-testid="button-save-project"
            >
              {projectDialog.mode === "create" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
