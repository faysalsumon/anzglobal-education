import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NotesThread, type UnifiedNote, type ThreadTeamMember, type NoteVisibilityOpts } from "@/components/notes-thread";

interface MentionableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  branchId: string | null;
}

interface UnifiedNoteRaw {
  id: string;
  content: string;
  createdAt: Date | string | null;
  createdById: string;
  isPinned?: boolean | null;
  source: "lead" | "crm" | "application";
  visibility?: "public" | "private" | "selected";
  visibleTo?: string[] | null;
  crmStage?: string | null;
  author?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    profileImageUrl?: string | null;
  } | null;
}

interface ApplicationInternalNotesProps {
  applicationId: string;
  currentUserId?: string;
  compact?: boolean;
  branchId?: string | null;
}

export function ApplicationInternalNotes({
  applicationId,
  currentUserId,
  compact: _compact = false,
  branchId: _branchId,
}: ApplicationInternalNotesProps) {
  const { toast } = useToast();

  const { data: mentionableUsers = [] } = useQuery<MentionableUser[]>({
    queryKey: ["/api/applications", applicationId, "mentionable-users"],
    enabled: !!applicationId,
  });

  const { data: rawNotes = [], isLoading } = useQuery<UnifiedNoteRaw[]>({
    queryKey: ["/api/applications", applicationId, "unified-notes"],
    enabled: !!applicationId,
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({
      content,
      mentionedUserIds,
      visibility,
      visibleTo,
    }: {
      content: string;
      mentionedUserIds: string[];
      visibility?: string;
      visibleTo?: string[];
    }) => {
      return apiRequest("POST", `/api/applications/${applicationId}/notes`, {
        content,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
        visibility: visibility ?? "public",
        visibleTo: visibleTo ?? [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/applications", applicationId, "unified-notes"],
      });
      toast({ title: "Note added", description: "Your note has been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add note.", variant: "destructive" });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({
      noteId,
      content,
      visibility,
      visibleTo,
    }: {
      noteId: string;
      content: string;
      visibility?: string;
      visibleTo?: string[];
    }) => {
      return apiRequest("PUT", `/api/notes/${noteId}`, { content, visibility, visibleTo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/applications", applicationId, "unified-notes"],
      });
      toast({ title: "Note updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update note.", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/applications", applicationId, "unified-notes"],
      });
      toast({ title: "Note deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete note.", variant: "destructive" });
    },
  });

  const notes: UnifiedNote[] = rawNotes.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.createdAt,
    createdById: n.createdById,
    isPinned: n.isPinned,
    source: n.source,
    visibility: n.visibility,
    visibleTo: n.visibleTo ?? [],
    crmStage: n.crmStage,
    author: n.author,
  }));

  const threadTeamMembers: ThreadTeamMember[] = mentionableUsers.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    profileImageUrl: m.profileImageUrl || null,
  }));

  return (
    <NotesThread
      notes={notes}
      isLoading={isLoading}
      currentUserId={currentUserId || null}
      teamMembers={threadTeamMembers}
      isSubmitting={createNoteMutation.isPending}
      onAddNote={async (content, mentionedUserIds, opts?: NoteVisibilityOpts) => {
        await createNoteMutation.mutateAsync({
          content,
          mentionedUserIds,
          visibility: opts?.visibility,
          visibleTo: opts?.visibleTo,
        });
      }}
      onEditNote={(noteId, content, opts?: NoteVisibilityOpts) => {
        const note = rawNotes.find((n) => n.id === noteId);
        if (note?.source === "lead") return;
        updateNoteMutation.mutate({
          noteId,
          content,
          visibility: opts?.visibility,
          visibleTo: opts?.visibleTo,
        });
      }}
      onDeleteNote={(noteId) => {
        const note = rawNotes.find((n) => n.id === noteId);
        if (note?.source === "lead") return;
        deleteNoteMutation.mutate(noteId);
      }}
      title="Notes"
    />
  );
}

export default ApplicationInternalNotes;
