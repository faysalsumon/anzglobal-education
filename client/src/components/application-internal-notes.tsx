import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Pin,
  PinOff,
  Trash2,
  Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Author {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
}

interface InternalNote {
  id: string;
  applicationId: string;
  authorId: string;
  content: string;
  isPinned: boolean | null;
  createdAt: Date | string | null;
  author?: Author | null;
}

interface ApplicationInternalNotesProps {
  applicationId: string;
  currentUserId?: string;
  compact?: boolean;
}

export function ApplicationInternalNotes({ 
  applicationId, 
  currentUserId,
  compact = false 
}: ApplicationInternalNotesProps) {
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");

  const { data: notes = [], isLoading } = useQuery<InternalNote[]>({
    queryKey: ["/api/applications", applicationId, "notes"],
    enabled: !!applicationId,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/applications/${applicationId}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "notes"] });
      setNewNote("");
      toast({
        title: "Note added",
        description: "Your internal note has been added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("POST", `/api/notes/${noteId}/toggle-pin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "notes"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle pin",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "notes"] });
      toast({
        title: "Note deleted",
        description: "The note has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    createNoteMutation.mutate(newNote.trim());
  };

  const getAuthorInitials = (author?: Author | null) => {
    if (author?.firstName && author?.lastName) {
      return `${author.firstName[0]}${author.lastName[0]}`.toUpperCase();
    }
    if (author?.firstName) {
      return author.firstName.slice(0, 2).toUpperCase();
    }
    if (author?.email) {
      return author.email.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  const getAuthorName = (author?: Author | null) => {
    if (author?.firstName && author?.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }
    return author?.email || "Unknown";
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const pinnedNotes = sortedNotes.filter(n => n.isPinned);
  const regularNotes = sortedNotes.filter(n => !n.isPinned);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Internal Notes</h3>
          <Badge variant="secondary" className="text-xs">
            {notes.length}
          </Badge>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an internal note..."
          className={compact ? "min-h-[60px]" : "min-h-[80px]"}
          data-testid="textarea-new-note"
        />
        <Button 
          type="submit" 
          disabled={!newNote.trim() || createNoteMutation.isPending}
          size={compact ? "sm" : "default"}
          data-testid="button-add-note"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {sortedNotes.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No internal notes yet</p>
          <p className="text-xs">Add a note to communicate with your team</p>
        </div>
      ) : (
        <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
          <div className="space-y-3 pr-4">
            {pinnedNotes.length > 0 && (
              <div className="space-y-2">
                {pinnedNotes.map(note => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    currentUserId={currentUserId}
                    onTogglePin={() => togglePinMutation.mutate(note.id)}
                    onDelete={() => deleteNoteMutation.mutate(note.id)}
                    getAuthorInitials={getAuthorInitials}
                    getAuthorName={getAuthorName}
                    formatDate={formatDate}
                    isDeleting={deleteNoteMutation.isPending}
                  />
                ))}
              </div>
            )}
            {regularNotes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                currentUserId={currentUserId}
                onTogglePin={() => togglePinMutation.mutate(note.id)}
                onDelete={() => deleteNoteMutation.mutate(note.id)}
                getAuthorInitials={getAuthorInitials}
                getAuthorName={getAuthorName}
                formatDate={formatDate}
                isDeleting={deleteNoteMutation.isPending}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface NoteItemProps {
  note: InternalNote;
  currentUserId?: string;
  onTogglePin: () => void;
  onDelete: () => void;
  getAuthorInitials: (author?: Author | null) => string;
  getAuthorName: (author?: Author | null) => string;
  formatDate: (date: Date | string | null) => string;
  isDeleting: boolean;
}

function NoteItem({ 
  note, 
  currentUserId, 
  onTogglePin, 
  onDelete, 
  getAuthorInitials, 
  getAuthorName, 
  formatDate,
  isDeleting 
}: NoteItemProps) {
  const isAuthor = currentUserId === note.authorId;
  
  return (
    <div 
      className={`p-3 rounded-lg border bg-card ${note.isPinned ? "border-primary/50 bg-primary/5" : ""}`}
      data-testid={`note-item-${note.id}`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={note.author?.profileImageUrl || undefined} />
          <AvatarFallback className="text-xs">
            {getAuthorInitials(note.author)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{getAuthorName(note.author)}</span>
            {note.isPinned && (
              <Badge variant="outline" className="text-xs">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(note.createdAt)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onTogglePin}
            title={note.isPinned ? "Unpin note" : "Pin note"}
            data-testid={`button-toggle-pin-${note.id}`}
          >
            {note.isPinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </Button>
          {isAuthor && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={isDeleting}
              title="Delete note"
              data-testid={`button-delete-note-${note.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
