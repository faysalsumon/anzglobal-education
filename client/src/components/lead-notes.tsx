import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { NotesThread, type UnifiedNote, type ThreadTeamMember } from "@/components/notes-thread";

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabase) return { "Content-Type": "application/json" };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }
  return { "Content-Type": "application/json" };
}

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
}

export function LeadNotes({ leadId, leadName }: LeadNotesProps) {
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
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/leads/${leadId}/notes`, {
        credentials: "include",
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch notes");
      return response.json();
    },
    enabled: !!leadId,
  });

  const { data: rawTeamMembers } = useQuery<CrmTeamMember[]>({
    queryKey: ["/api/crm/team-members"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/crm/team-members", {
        credentials: "include",
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch team members");
      return response.json();
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: { content: string; mentions: string[] }) => {
      return apiRequest("POST", `/api/crm/leads/${leadId}/notes`, {
        content: data.content,
        mentions: data.mentions,
        visibility: "public",
        visibleTo: [],
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
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      return apiRequest("PUT", `/api/crm/leads/${leadId}/notes/${noteId}`, { content });
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
  }));

  const teamMembers: ThreadTeamMember[] = (rawTeamMembers || []).map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    profileImageUrl: m.profileImageUrl,
  }));

  return (
    <Card data-testid="lead-notes-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <NotesThread
          notes={notes}
          isLoading={notesLoading}
          currentUserId={currentUserId}
          teamMembers={teamMembers}
          isSubmitting={createNoteMutation.isPending}
          onAddNote={(content, mentionedUserIds) => {
            createNoteMutation.mutate({ content, mentions: mentionedUserIds });
          }}
          onEditNote={(noteId, content) => {
            updateNoteMutation.mutate({ noteId, content });
          }}
          onDeleteNote={(noteId) => {
            deleteNoteMutation.mutate(noteId);
          }}
          readOnly={false}
        />
      </CardContent>
    </Card>
  );
}

export default LeadNotes;
