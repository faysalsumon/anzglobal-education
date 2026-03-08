import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NotesThread, type UnifiedNote, type ThreadTeamMember, type NoteVisibilityOpts } from "@/components/notes-thread";

interface TeamMember {
  id: number;
  userId: string;
  role: string;
  isActive: boolean;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl?: string | null;
  };
}

interface UnifiedNoteRaw {
  id: string;
  content: string;
  createdAt: Date | string | null;
  createdById: string;
  isPinned?: boolean | null;
  source: "lead" | "application";
  visibility?: "public" | "private" | "selected";
  visibleTo?: string[] | null;
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
}

export function ApplicationInternalNotes({
  applicationId,
  currentUserId,
  compact = false,
}: ApplicationInternalNotesProps) {
  const { toast } = useToast();

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/admin/team-members"],
  });

  const { data: rawNotes = [], isLoading } = useQuery<UnifiedNoteRaw[]>({
    queryKey: ["/api/applications", applicationId, "unified-notes"],
    queryFn: async () => {
      const res = await fetch(`/api/applications/${applicationId}/unified-notes`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
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
    author: n.author,
  }));

  const threadTeamMembers: ThreadTeamMember[] = teamMembers.map((m) => ({
    id: m.userId,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    email: m.user.email,
    profileImageUrl: m.user.profileImageUrl || null,
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
