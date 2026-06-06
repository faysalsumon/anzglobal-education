import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { NotesThread, type UnifiedNote, type ThreadTeamMember, type NoteVisibilityOpts } from "@/components/notes-thread";

interface LeadNote {
  id: string;
  leadId: string;
  title: string | null;
  content: string;
  mentions: string[] | null;
  visibility: "public" | "private" | "selected";
  visibleTo: string[] | null;
  createdById: string;
  createdAt: Date | string | null;
  author: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    profileImageUrl?: string | null;
  };
}

interface CrmTeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
}

interface LeadNotesProps {
  leadId: string;
  leadName: string;
  branchId?: string | null;
}

export function LeadNotes({ leadId, leadName: _leadName, branchId }: LeadNotesProps) {
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  const { data: rawNotes, isLoading: notesLoading } = useQuery<LeadNote[]>({
    queryKey: ["/api/crm/leads", leadId, "notes"],
    enabled: !!leadId,
  });

  const teamMembersQueryKey = branchId
    ? ["/api/crm/team-members", { branchId }]
    : ["/api/crm/team-members"];

  const { data: rawTeamMembers } = useQuery<CrmTeamMember[]>({
    queryKey: teamMembersQueryKey,
    enabled: !!leadId,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: { content: string; mentions: string[]; visibility?: string; visibleTo?: string[] }) => {
      return apiRequest("POST", `/api/crm/leads/${leadId}/notes`, {
        content: data.content,
        mentions: data.mentions,
        visibility: data.visibility ?? "public",
        visibleTo: data.visibleTo ?? [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", leadId, "notes"] });
      toast({ title: "Note added", description: "Your note has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (data: { noteId: string; content: string; visibility?: string; visibleTo?: string[] }) => {
      return apiRequest("PUT", `/api/crm/leads/${leadId}/notes/${data.noteId}`, {
        content: data.content,
        visibility: data.visibility,
        visibleTo: data.visibleTo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", leadId, "notes"] });
      toast({ title: "Note updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update note.", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/crm/leads/${leadId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", leadId, "notes"] });
      toast({ title: "Note deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete note.", variant: "destructive" });
    },
  });

  const notes: UnifiedNote[] = (rawNotes || []).map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.createdAt,
    createdById: n.createdById,
    author: n.author,
    source: "lead" as const,
    visibility: n.visibility,
    visibleTo: n.visibleTo ?? [],
  }));

  const teamMembers: ThreadTeamMember[] = (rawTeamMembers || []).map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    profileImageUrl: m.profileImageUrl,
  }));

  return (
    <NotesThread
      notes={notes}
      isLoading={notesLoading}
      currentUserId={currentUserId}
      teamMembers={teamMembers}
      isSubmitting={createNoteMutation.isPending}
      onAddNote={async (content, mentionedUserIds, opts?: NoteVisibilityOpts) => {
        await createNoteMutation.mutateAsync({
          content,
          mentions: mentionedUserIds,
          visibility: opts?.visibility,
          visibleTo: opts?.visibleTo,
        });
      }}
      onEditNote={(noteId, content, opts?: NoteVisibilityOpts) => {
        updateNoteMutation.mutate({
          noteId,
          content,
          visibility: opts?.visibility,
          visibleTo: opts?.visibleTo,
        });
      }}
      onDeleteNote={(noteId) => {
        deleteNoteMutation.mutate(noteId);
      }}
      readOnly={false}
    />
  );
}

export default LeadNotes;
