import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  NotesThread,
  type UnifiedNote,
  type ThreadTeamMember,
  type NoteVisibilityOpts,
} from "@/components/notes-thread";
import type { TaskNoteWithAuthor } from "@shared/schema";

interface CrmTeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
}

interface TaskInlineNotesProps {
  taskId: string;
  currentUserId: string | null;
}

export function TaskInlineNotes({ taskId, currentUserId }: TaskInlineNotesProps) {
  const { toast } = useToast();

  const { data: rawNotes = [], isLoading: notesLoading } = useQuery<TaskNoteWithAuthor[]>({
    queryKey: ["/api/tasks", taskId, "notes"],
    enabled: !!taskId,
  });

  const { data: rawTeamMembers = [] } = useQuery<CrmTeamMember[]>({
    queryKey: ["/api/crm/team-members"],
    enabled: !!taskId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ content, mentionedUserIds }: { content: string; mentionedUserIds: string[] }) => {
      return apiRequest("POST", `/api/tasks/${taskId}/notes`, { content, mentionedUserIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "notes"] });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const editNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}/notes/${noteId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "notes"] });
    },
    onError: () => {
      toast({ title: "Failed to update comment", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "notes"] });
    },
    onError: () => {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    },
  });

  const notes: UnifiedNote[] = rawNotes.map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt,
    createdById: note.authorId ?? undefined,
    author: note.author
      ? {
          id: note.author.id,
          firstName: note.author.firstName,
          lastName: note.author.lastName,
          profileImageUrl: note.author.profileImageUrl,
        }
      : null,
    visibility: "public" as const,
  }));

  const teamMembers: ThreadTeamMember[] = rawTeamMembers.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    profileImageUrl: m.profileImageUrl,
  }));

  const handleAddNote = async (content: string, mentionedUserIds: string[], _opts?: NoteVisibilityOpts) => {
    await addNoteMutation.mutateAsync({ content, mentionedUserIds });
  };

  const handleEditNote = (noteId: string, content: string) => {
    editNoteMutation.mutate({ noteId, content });
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNoteMutation.mutate(noteId);
  };

  return (
    <NotesThread
      notes={notes}
      isLoading={notesLoading}
      currentUserId={currentUserId}
      onAddNote={handleAddNote}
      onEditNote={handleEditNote}
      onDeleteNote={handleDeleteNote}
      teamMembers={teamMembers}
      isSubmitting={addNoteMutation.isPending}
    />
  );
}
