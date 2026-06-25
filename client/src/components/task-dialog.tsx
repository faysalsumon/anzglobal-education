/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Bell,
  CalendarIcon,
  ListTodo,
  Loader2,
  User,
  Bug,
  Sparkles,
  Wrench,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Tag,
  X,
  Link2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { TaskInlineNotes } from "@/components/task-inline-notes";
import { CreateReminderModal } from "@/components/create-reminder-modal";
import type { TaskProject } from "@shared/schema";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().optional(),
  category: z.enum([
    "follow_up",
    "document_collection",
    "application_review",
    "communication",
    "visa_processing",
    "general",
    "urgent_action",
    "bug_report",
    "feature_request",
    "development",
    "design",
    "hr",
    "finance",
    "marketing",
  ]),
  taskType: z.enum(["task", "bug", "feature", "improvement"]).default("task"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled", "on_hold"]),
  assignedToId: z.string().optional(),
  applicationId: z.string().optional(),
  projectId: z.string().optional(),
  linkedEntityType: z.string().optional(),
  linkedEntityId: z.string().optional(),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  taskType: string;
  priority: string;
  status: string;
  assignedToId: string | null;
  applicationId: string | null;
  projectId: string | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  tags: string[] | null;
  dueDate: string | null;
  createdAt: string | null;
  createdById?: string | null;
}

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
}

interface Application {
  application: { id: string; currentStage: string };
  student: { firstName: string | null; lastName: string | null };
  course: { title: string };
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  applicationId?: string;
  defaultProjectId?: string;
  defaultLinkedEntityType?: string;
  defaultLinkedEntityId?: string;
  onSuccess?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  follow_up: "Follow Up",
  document_collection: "Document Collection",
  application_review: "Application Review",
  communication: "Communication",
  visa_processing: "Visa Processing",
  general: "General",
  urgent_action: "Urgent Action",
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  development: "Development",
  design: "Design",
  hr: "HR",
  finance: "Finance",
  marketing: "Marketing",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

const TASK_TYPE_CONFIG = {
  task: { label: "Task", icon: CheckSquare },
  bug: { label: "Bug", icon: Bug },
  feature: { label: "Feature", icon: Sparkles },
  improvement: { label: "Improvement", icon: Wrench },
};

const LINKED_ENTITY_TYPES = [
  { value: "application", label: "Application" },
  { value: "institution", label: "Institution" },
  { value: "course", label: "Course" },
  { value: "crm_contact", label: "CRM Contact" },
  { value: "invoice", label: "Invoice" },
];

export function TaskDialog({
  open,
  onOpenChange,
  task,
  applicationId,
  defaultProjectId,
  defaultLinkedEntityType,
  defaultLinkedEntityId,
  onSuccess,
}: TaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!task;
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const isOwner = !isEditing || !task?.createdById || task.createdById === user?.id;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      taskType: "task",
      priority: "medium",
      status: "pending",
      assignedToId: undefined,
      applicationId: applicationId || undefined,
      projectId: defaultProjectId || undefined,
      linkedEntityType: defaultLinkedEntityType || undefined,
      linkedEntityId: defaultLinkedEntityId || undefined,
      dueDate: undefined,
      tags: [],
    },
  });

  const watchedTags = form.watch("tags") || [];

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        category: task.category as TaskFormValues["category"],
        taskType: (task.taskType || "task") as TaskFormValues["taskType"],
        priority: task.priority as TaskFormValues["priority"],
        status: task.status as TaskFormValues["status"],
        assignedToId: task.assignedToId || undefined,
        applicationId: task.applicationId || undefined,
        projectId: task.projectId || undefined,
        linkedEntityType: task.linkedEntityType || undefined,
        linkedEntityId: task.linkedEntityId || undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        tags: task.tags || [],
      });
      if (task.projectId || task.linkedEntityType || (task.tags && task.tags.length > 0)) {
        setShowAdvanced(true);
      }
    } else {
      form.reset({
        title: "",
        description: "",
        category: "general",
        taskType: "task",
        priority: "medium",
        status: "pending",
        assignedToId: undefined,
        applicationId: applicationId || undefined,
        projectId: defaultProjectId || undefined,
        linkedEntityType: defaultLinkedEntityType || undefined,
        linkedEntityId: defaultLinkedEntityId || undefined,
        dueDate: undefined,
        tags: [],
      });
      if (defaultProjectId || defaultLinkedEntityType) setShowAdvanced(true);
    }
  }, [task, applicationId, defaultProjectId, defaultLinkedEntityType, defaultLinkedEntityId, form]);

  const { data: assignableUsersData } = useQuery<{ users: TeamMember[] }>({
    queryKey: ["/api/admin/assignable-users"],
    enabled: open,
  });
  const teamMembers = assignableUsersData?.users || [];

  const { data: applicationsData } = useQuery<{ applications: Application[] }>({
    queryKey: ["/api/admin/applications"],
    enabled: open && !applicationId,
  });
  const applications = applicationsData?.applications || [];

  const { data: projects = [] } = useQuery<TaskProject[]>({
    queryKey: ["/api/task-projects"],
    enabled: open,
  });
  const activeProjects = projects.filter(p => p.status === "active");

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      return apiRequest("POST", "/api/tasks", {
        ...data,
        dueDate: data.dueDate?.toISOString(),
        tags: data.tags?.length ? data.tags : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/workload-summary"] });
      toast({ title: "Task created", description: "The task has been created successfully" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create task", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      return apiRequest("PATCH", `/api/tasks/${task!.id}`, {
        ...data,
        dueDate: data.dueDate?.toISOString(),
        tags: data.tags?.length ? data.tags : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/workload-summary"] });
      toast({ title: "Task updated", description: "The task has been updated successfully" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update task", variant: "destructive" });
    },
  });

  const onSubmit = (data: TaskFormValues) => {
    if (isEditing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag) return;
    const current = form.getValues("tags") || [];
    if (!current.includes(tag)) {
      form.setValue("tags", [...current, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    form.setValue("tags", (form.getValues("tags") || []).filter(t => t !== tag));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="dialog-task">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            {isEditing ? "Edit Task" : "Create Task"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the task details below" : "Create a new task and assign it to a team member"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Task type pills */}
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(TASK_TYPE_CONFIG).map(([value, conf]) => {
                      const Icon = conf.icon;
                      const isSelected = field.value === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.onChange(value)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                          data-testid={`button-task-type-${value}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {conf.label}
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title..." {...field} data-testid="input-task-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter task description..."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS)
                          .filter(([value]) => isOwner || value !== "completed")
                          .map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "__UNASSIGNED__" ? undefined : val)}
                      value={field.value || "__UNASSIGNED__"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-task-assignee">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__UNASSIGNED__">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs"><User className="h-3 w-3" /></AvatarFallback>
                            </Avatar>
                            <span>Unassigned</span>
                          </div>
                        </SelectItem>
                        {teamMembers.map((member) => {
                          const initials = `${member.firstName?.charAt(0) || ""}${member.lastName?.charAt(0) || ""}`.toUpperCase() || "U";
                          const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email;
                          return (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.profileImageUrl || undefined} alt={fullName} />
                                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                </Avatar>
                                <span>{fullName}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          data-testid="button-task-due-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced fields toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-advanced-fields"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAdvanced ? "Hide" : "Show"} advanced options
            </button>

            {showAdvanced && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                {/* Project */}
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project (optional)</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__NO_PROJECT__" ? undefined : val)}
                        value={field.value || "__NO_PROJECT__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-task-project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__NO_PROJECT__">No project</SelectItem>
                          {activeProjects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color || "#3465A5" }} />
                                {project.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Entity link */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="linkedEntityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5" />
                          Link To (optional)
                        </FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val === "__NONE__" ? undefined : val);
                            form.setValue("linkedEntityId", undefined);
                          }}
                          value={field.value || "__NONE__"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-linked-entity-type">
                              <SelectValue placeholder="Entity type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__NONE__">None</SelectItem>
                            {LINKED_ENTITY_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="linkedEntityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ID or reference..."
                            {...field}
                            value={field.value || ""}
                            disabled={!form.watch("linkedEntityType")}
                            data-testid="input-linked-entity-id"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tags */}
                <FormField
                  control={form.control}
                  name="tags"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        Tags (optional)
                      </FormLabel>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                          placeholder="Type and press Enter..."
                          data-testid="input-task-tag"
                        />
                        <Button type="button" variant="outline" onClick={addTag} disabled={!tagInput.trim()}>
                          Add
                        </Button>
                      </div>
                      {watchedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {watchedTags.map(tag => (
                            <Badge key={tag} variant="secondary" className="gap-1 no-default-active-elevate">
                              {tag}
                              <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Legacy application link */}
                {!applicationId && (
                  <FormField
                    control={form.control}
                    name="applicationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Application (optional)</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "__NO_APPLICATION__" ? undefined : val)}
                          value={field.value || "__NO_APPLICATION__"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-task-application">
                              <SelectValue placeholder="Select an application" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__NO_APPLICATION__">No application</SelectItem>
                            {applications.map((app) => (
                              <SelectItem key={app.application.id} value={app.application.id}>
                                {app.student.firstName} {app.student.lastName} - {app.course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {isEditing && task && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReminderModalOpen(true)}
                  className="mr-auto"
                  data-testid="button-set-task-reminder"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Set Reminder
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel-task"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-task">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {isEditing && task && (
          <>
            <Separator className="my-2" />
            <TaskInlineNotes taskId={task.id} currentUserId={user?.id ?? null} />
          </>
        )}
      </DialogContent>

      {isEditing && task && (
        <CreateReminderModal
          open={reminderModalOpen}
          onOpenChange={setReminderModalOpen}
          taskId={task.id}
        />
      )}
    </Dialog>
  );
}
