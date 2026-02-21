import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef, useMemo } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  AtSign,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { Instance as TippyInstance } from "tippy.js";

interface Author {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
}

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
  };
}

interface MentionedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface InternalNote {
  id: string;
  applicationId: string;
  authorId: string;
  content: string;
  mentionedUserIds?: string[] | null;
  mentionedUsers?: MentionedUser[];
  isPinned: boolean | null;
  createdAt: Date | string | null;
  author?: Author | null;
}

interface ApplicationInternalNotesProps {
  applicationId: string;
  currentUserId?: string;
  compact?: boolean;
}

interface MentionListProps {
  items: TeamMember[];
  command: (attrs: { id: string; label: string }) => void;
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      const name = item.user.firstName && item.user.lastName
        ? `${item.user.firstName} ${item.user.lastName}`
        : item.user.email || 'Unknown';
      props.command({ id: item.userId, label: name });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-2 text-sm text-muted-foreground">
        No team members found
      </div>
    );
  }

  return (
    <div 
      className="bg-popover border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto"
      data-testid="mention-suggestions-dropdown"
    >
      {props.items.map((item, index) => {
        const name = item.user.firstName && item.user.lastName
          ? `${item.user.firstName} ${item.user.lastName}`
          : item.user.email || 'Unknown';
        const initials = item.user.firstName && item.user.lastName
          ? `${item.user.firstName[0]}${item.user.lastName[0]}`
          : (item.user.email?.slice(0, 2) || '??').toUpperCase();
          
        return (
          <button
            key={item.userId}
            className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover-elevate ${
              index === selectedIndex ? "bg-accent text-accent-foreground" : ""
            }`}
            onClick={() => selectItem(index)}
            data-testid={`mention-option-${item.userId}`}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{name}</div>
              <div className="text-xs text-muted-foreground truncate">{item.role}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
});

MentionList.displayName = "MentionList";

function extractMentionsFromJSON(json: any): string[] {
  const mentions: string[] = [];
  
  function traverse(node: any) {
    if (!node) return;
    if (node.type === "mention" && node.attrs?.id) {
      mentions.push(node.attrs.id);
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }
  
  if (json?.content) {
    json.content.forEach(traverse);
  }
  
  return [...new Set(mentions)];
}

function MentionEditor({
  onSubmit,
  isSubmitting,
  compact,
  teamMembers,
}: {
  onSubmit: (content: string, mentionedUserIds: string[]) => void;
  isSubmitting: boolean;
  compact?: boolean;
  teamMembers: TeamMember[];
}) {
  const [mentionCount, setMentionCount] = useState(0);
  const teamMembersRef = useRef<TeamMember[]>(teamMembers);
  
  useEffect(() => {
    teamMembersRef.current = teamMembers;
  }, [teamMembers]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: "Add a note... Type @ to mention team members",
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: {
          items: ({ query }) => {
            return teamMembersRef.current.filter((member) => {
              const searchQuery = query.toLowerCase();
              const firstName = member.user.firstName?.toLowerCase() || "";
              const lastName = member.user.lastName?.toLowerCase() || "";
              const email = member.user.email?.toLowerCase() || "";
              const fullName = `${firstName} ${lastName}`;
              return (
                firstName.includes(searchQuery) ||
                lastName.includes(searchQuery) ||
                email.includes(searchQuery) ||
                fullName.includes(searchQuery)
              );
            }).slice(0, 8);
          },
          render: () => {
            let component: ReactRenderer<MentionListRef> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate: (props) => {
                component?.updateProps(props);

                if (!props.clientRect) return;

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown(props) || false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none ${
          compact ? "min-h-[60px]" : "min-h-[80px]"
        } px-3 py-2`,
      },
    },
    onUpdate: ({ editor }) => {
      const mentions = extractMentionsFromJSON(editor.getJSON());
      setMentionCount(mentions.length);
    },
  });

  const handleSubmit = () => {
    if (!editor || editor.isEmpty) return;
    
    const content = editor.getHTML();
    const mentionedUserIds = extractMentionsFromJSON(editor.getJSON());
    
    onSubmit(content, mentionedUserIds);
    editor.commands.clearContent();
    setMentionCount(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <div 
        className="flex-1 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onKeyDown={handleKeyDown}
      >
        <EditorContent 
          editor={editor} 
          data-testid="textarea-new-note"
        />
        {mentionCount > 0 && (
          <div className="px-3 pb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <AtSign className="h-3 w-3" />
            <span>Mentioning {mentionCount} team member{mentionCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!editor || editor.isEmpty || isSubmitting}
        size={compact ? "sm" : "default"}
        data-testid="button-add-note"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ApplicationInternalNotes({ 
  applicationId, 
  currentUserId,
  compact = false 
}: ApplicationInternalNotesProps) {
  const { toast } = useToast();

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/admin/team-members"],
  });

  const { data: notes = [], isLoading } = useQuery<InternalNote[]>({
    queryKey: ["/api/applications", applicationId, "notes"],
    enabled: !!applicationId,
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({ content, mentionedUserIds }: { content: string; mentionedUserIds: string[] }) => {
      return apiRequest("POST", `/api/applications/${applicationId}/notes`, { 
        content,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "notes"] });
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

  const handleSubmit = (content: string, mentionedUserIds: string[]) => {
    createNoteMutation.mutate({ content, mentionedUserIds });
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

      <MentionEditor
        onSubmit={handleSubmit}
        isSubmitting={createNoteMutation.isPending}
        compact={compact}
        teamMembers={teamMembers}
      />

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

      <style>{`
        .mention {
          background-color: hsl(var(--primary) / 0.15);
          color: hsl(var(--primary));
          border-radius: 0.25rem;
          padding: 0.125rem 0.375rem;
          font-weight: 500;
          display: inline;
          box-decoration-break: clone;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .ProseMirror {
          outline: none;
        }
        
        .ProseMirror p {
          margin: 0;
        }
      `}</style>
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
  const hasMentions = note.mentionedUserIds && note.mentionedUserIds.length > 0;
  
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium">{getAuthorName(note.author)}</span>
            {note.isPinned && (
              <Badge variant="outline" className="text-xs">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
            {hasMentions && (
              <Badge variant="secondary" className="text-xs">
                <AtSign className="h-3 w-3 mr-1" />
                {note.mentionedUserIds!.length}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(note.createdAt)}
            </span>
          </div>
          <div 
            className="text-sm prose prose-sm dark:prose-invert max-w-none [&_.mention]:bg-primary/15 [&_.mention]:text-primary [&_.mention]:rounded [&_.mention]:px-1.5 [&_.mention]:py-0.5 [&_.mention]:font-medium"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content) }}
          />
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
