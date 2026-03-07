import { useState, useEffect, useRef, useCallback } from "react";
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
  CalendarIcon,
  ListTodo,
  Loader2,
  User,
  MessageSquare,
  Send,
  AtSign,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TaskNoteWithAuthor } from "@shared/schema";

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
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled", "on_hold"]),
  assignedToId: z.string().optional(),
  applicationId: z.string().optional(),
  dueDate: z.date().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  assignedToId: string | null;
  applicationId: string | null;
  dueDate: string | null;
  createdAt: string | null;
}

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
}

interface Application {
  application: {
    id: string;
    currentStage: string;
  };
  student: {
    firstName: string | null;
    lastName: string | null;
  };
  course: {
    title: string;
  };
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  applicationId?: string;
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

function renderNoteContent(content: string) {
  const parts = content.split(/(@\S+(?:\s+\S+)?)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="text-primary font-medium">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function NoteComposer({
  taskId,
  teamMembers,
  onNoteAdded,
}: {
  taskId: string;
  teamMembers: TeamMember[];
  onNoteAdded: () => void;
}) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMembers = mentionQuery !== null
    ? teamMembers.filter((m) => {
        const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase().trim();
        const email = m.email.toLowerCase();
        const q = mentionQuery.toLowerCase();
        return fullName.includes(q) || email.includes(q);
      }).slice(0, 6)
    : [];

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteText(val);

    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursor - atMatch[0].length);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  }, []);

  const insertMention = useCallback((member: TeamMember) => {
    const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email;
    const before = noteText.slice(0, mentionStart);
    const after = noteText.slice(textareaRef.current?.selectionStart ?? noteText.length);
    const inserted = `@${fullName} `;
    const newText = before + inserted + after;
    setNoteText(newText);
    setMentionQuery(null);
    setMentionStart(-1);
    setMentionedUserIds(prev => prev.includes(member.id) ? prev : [...prev, member.id]);
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + inserted.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [noteText, mentionStart]);

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tasks/${taskId}/notes`, {
        content: noteText.trim(),
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      });
    },
    onSuccess: () => {
      setNoteText("");
      setMentionedUserIds([]);
      setMentionQuery(null);
      onNoteAdded();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "Escape") {
        setMentionQuery(null);
        e.preventDefault();
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      if (noteText.trim()) addNoteMutation.mutate();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={noteText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a note or update… Type @ to mention a team member"
          className="min-h-[80px] pr-10 resize-none"
          data-testid="textarea-task-note"
        />
        <AtSign className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-64 bg-popover border rounded-md shadow-md py-1 bottom-full mb-1 left-0"
          data-testid="mention-dropdown"
        >
          {filteredMembers.map((member) => {
            const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email;
            const initials = `${member.firstName?.charAt(0) || ""}${member.lastName?.charAt(0) || ""}`.toUpperCase() || "U";
            return (
              <button
                key={member.id}
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover-elevate text-left"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertMention(member);
                }}
                data-testid={`mention-option-${member.id}`}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={member.profileImageUrl || undefined} alt={fullName} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-muted-foreground">
          Type <span className="font-mono bg-muted px-1 rounded">@</span> to tag someone &middot; <span className="font-mono bg-muted px-1 rounded">⌘↵</span> to submit
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => addNoteMutation.mutate()}
          disabled={!noteText.trim() || addNoteMutation.isPending}
          data-testid="button-add-note"
        >
          {addNoteMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          Add Note
        </Button>
      </div>
    </div>
  );
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  applicationId,
  onSuccess,
}: TaskDialogProps) {
  const { toast } = useToast();
  const isEditing = !!task;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      priority: "medium",
      status: "pending",
      assignedToId: undefined,
      applicationId: applicationId || undefined,
      dueDate: undefined,
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        category: task.category as TaskFormValues["category"],
        priority: task.priority as TaskFormValues["priority"],
        status: task.status as TaskFormValues["status"],
        assignedToId: task.assignedToId || undefined,
        applicationId: task.applicationId || undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        category: "general",
        priority: "medium",
        status: "pending",
        assignedToId: undefined,
        applicationId: applicationId || undefined,
        dueDate: undefined,
      });
    }
  }, [task, applicationId, form]);

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

  const { data: notes = [], isLoading: notesLoading, refetch: refetchNotes } = useQuery<TaskNoteWithAuthor[]>({
    queryKey: ["/api/tasks", task?.id, "notes"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${task!.id}/notes`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
    enabled: isEditing && open && !!task?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      return apiRequest("POST", "/api/tasks", {
        ...data,
        dueDate: data.dueDate?.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/workload-summary"] });
      toast({
        title: "Task created",
        description: "The task has been created successfully",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      return apiRequest("PATCH", `/api/tasks/${task!.id}`, {
        ...data,
        dueDate: data.dueDate?.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/workload-summary"] });
      toast({
        title: "Task updated",
        description: "The task has been updated successfully",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto" data-testid="dialog-task">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            {isEditing ? "Edit Task" : "Create Task"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the task details below"
              : "Create a new task and assign it to a team member"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter task title..."
                      {...field}
                      data-testid="input-task-title"
                    />
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
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
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
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
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
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
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
                              <AvatarFallback className="text-xs">
                                <User className="h-3 w-3" />
                              </AvatarFallback>
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
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-task-due-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!applicationId && (
              <FormField
                control={form.control}
                name="applicationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Application (Optional)</FormLabel>
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel-task"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-save-task"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Notes & Updates thread — only shown when editing */}
        {isEditing && (
          <>
            <Separator className="my-2" />
            <div className="space-y-3" data-testid="task-notes-section">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4" />
                Notes & Updates
                {notes.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({notes.length})
                  </span>
                )}
              </h3>

              {/* Notes list */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1" data-testid="notes-list">
                {notesLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <div key={i} className="flex gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-full bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No notes yet — add the first update below
                  </p>
                ) : (
                  notes.map((note) => {
                    const authorName = note.author
                      ? `${note.author.firstName || ""} ${note.author.lastName || ""}`.trim() || "Team Member"
                      : "Team Member";
                    const initials = note.author
                      ? `${note.author.firstName?.charAt(0) || ""}${note.author.lastName?.charAt(0) || ""}`.toUpperCase() || "TM"
                      : "TM";
                    return (
                      <div key={note.id} className="flex gap-2" data-testid={`note-item-${note.id}`}>
                        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                          <AvatarImage src={note.author?.profileImageUrl || undefined} alt={authorName} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xs font-semibold">{authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {note.createdAt
                                ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })
                                : ""}
                            </span>
                          </div>
                          <p className="text-sm mt-0.5 break-words leading-relaxed">
                            {renderNoteContent(note.content)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Compose new note */}
              <NoteComposer
                taskId={task!.id}
                teamMembers={teamMembers}
                onNoteAdded={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/tasks", task!.id, "notes"] });
                }}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
