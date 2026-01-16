import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare,
  Send,
  Clock,
  Globe,
  Lock,
  Users,
  Loader2,
  Plus,
  X,
  ChevronDown,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { Instance as TippyInstance } from "tippy.js";

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabase) {
    return { 'Content-Type': 'application/json' };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }
  return { 'Content-Type': 'application/json' };
}

interface Author {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
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
  author: Author;
}

interface TeamMember {
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
      const name = item.firstName && item.lastName
        ? `${item.firstName} ${item.lastName}`
        : item.email || 'Unknown';
      props.command({ id: item.id, label: name });
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
        const name = item.firstName && item.lastName
          ? `${item.firstName} ${item.lastName}`
          : item.email || 'Unknown';
        const initials = item.firstName && item.lastName
          ? `${item.firstName[0]}${item.lastName[0]}`
          : (item.email?.slice(0, 2) || '??').toUpperCase();
          
        return (
          <button
            key={item.id}
            className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover-elevate ${
              index === selectedIndex ? "bg-accent text-accent-foreground" : ""
            }`}
            onClick={() => selectItem(index)}
            data-testid={`mention-option-${item.id}`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={item.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{name}</div>
              <div className="text-xs text-muted-foreground truncate">{item.email}</div>
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
  
  return Array.from(new Set(mentions));
}

function NoteEditor({
  onSubmit,
  isSubmitting,
  teamMembers,
  onCancel,
  initialTitle = "",
  initialContent = "",
  initialVisibility = "public",
  initialVisibleTo = [],
}: {
  onSubmit: (title: string, content: string, mentionedUserIds: string[], visibility: string, visibleTo: string[]) => void;
  isSubmitting: boolean;
  teamMembers: TeamMember[];
  onCancel?: () => void;
  initialTitle?: string;
  initialContent?: string;
  initialVisibility?: "public" | "private" | "selected";
  initialVisibleTo?: string[];
}) {
  const [title, setTitle] = useState(initialTitle);
  const [visibility, setVisibility] = useState<"public" | "private" | "selected">(initialVisibility);
  const [visibleTo, setVisibleTo] = useState<string[]>(initialVisibleTo);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const isEditing = !!initialContent;
  
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
              const firstName = member.firstName?.toLowerCase() || "";
              const lastName = member.lastName?.toLowerCase() || "";
              const email = member.email?.toLowerCase() || "";
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
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[80px] p-3",
      },
    },
  });

  const handleSubmit = useCallback(() => {
    if (!editor) return;
    
    const json = editor.getJSON();
    const content = editor.getHTML();
    const mentions = extractMentionsFromJSON(json);
    
    if (!content || content === "<p></p>") return;
    
    onSubmit(title, content, mentions, visibility, visibleTo);
    if (!isEditing) {
      editor.commands.clearContent();
      setTitle("");
      setVisibility("public");
      setVisibleTo([]);
    }
  }, [editor, onSubmit, title, visibility, visibleTo, isEditing]);

  const toggleUserVisibility = (userId: string) => {
    setVisibleTo(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getVisibilityIcon = () => {
    switch (visibility) {
      case "public": return <Globe className="h-4 w-4" />;
      case "private": return <Lock className="h-4 w-4" />;
      case "selected": return <Users className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="input-note-title"
          />
        </div>
        
        <div className="border rounded-lg bg-background">
          <EditorContent 
            editor={editor} 
            data-testid="editor-note-content"
          />
        </div>
        
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Select
              value={visibility}
              onValueChange={(value: "public" | "private" | "selected") => {
                setVisibility(value);
                if (value !== "selected") {
                  setVisibleTo([]);
                }
              }}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-visibility">
                <div className="flex items-center gap-2">
                  {getVisibilityIcon()}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private
                  </div>
                </SelectItem>
                <SelectItem value="selected">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Selected Users
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {visibility === "selected" && (
              <Popover open={showUserPicker} onOpenChange={setShowUserPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-select-users">
                    <Users className="h-4 w-4 mr-1" />
                    {visibleTo.length > 0 ? `${visibleTo.length} selected` : "Select users"}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <ScrollArea className="max-h-60">
                    <div className="space-y-1">
                      {teamMembers.map((member) => {
                        const name = member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.email || 'Unknown';
                        const initials = member.firstName && member.lastName
                          ? `${member.firstName[0]}${member.lastName[0]}`
                          : (member.email?.slice(0, 2) || '??').toUpperCase();
                        
                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 p-2 rounded hover-elevate cursor-pointer"
                            onClick={() => toggleUserVisibility(member.id)}
                            data-testid={`checkbox-user-${member.id}`}
                          >
                            <Checkbox
                              checked={visibleTo.includes(member.id)}
                              onCheckedChange={() => toggleUserVisibility(member.id)}
                            />
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.profileImageUrl || undefined} />
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel} data-testid="button-cancel-note">
                Cancel
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={isSubmitting}
              data-testid="button-save-note"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface NoteItemProps {
  note: LeadNote;
  currentUserId: string | null;
  onEdit: (note: LeadNote) => void;
  onDelete: (noteId: string) => void;
}

function NoteItem({ note, currentUserId, onEdit, onDelete }: NoteItemProps) {
  const authorName = note.author?.firstName && note.author?.lastName
    ? `${note.author.firstName} ${note.author.lastName}`
    : note.author?.email || 'Unknown';
  const authorInitials = note.author?.firstName && note.author?.lastName
    ? `${note.author.firstName[0]}${note.author.lastName[0]}`
    : (note.author?.email?.slice(0, 2) || '??').toUpperCase();
  
  const createdDate = note.createdAt 
    ? new Date(note.createdAt)
    : new Date();
  
  const isAuthor = currentUserId === note.createdById;
  
  const getVisibilityBadge = () => {
    switch (note.visibility) {
      case "private":
        return <Badge variant="secondary" className="text-xs"><Lock className="h-3 w-3 mr-1" />Private</Badge>;
      case "selected":
        return <Badge variant="secondary" className="text-xs"><Users className="h-3 w-3 mr-1" />Selected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0" data-testid={`note-item-${note.id}`}>
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={note.author?.profileImageUrl || undefined} />
        <AvatarFallback>{authorInitials}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {note.title && (
              <h4 className="font-medium text-sm mb-1">{note.title}</h4>
            )}
            
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: note.content }}
            />
          </div>
          
          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" data-testid={`button-note-menu-${note.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(note)} data-testid={`button-edit-note-${note.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(note.id)} 
                  className="text-destructive focus:text-destructive"
                  data-testid={`button-delete-note-${note.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-primary">{authorName}</span>
          <span>|</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(createdDate, "MMM d, yyyy")}
          </span>
          <span>by {authorName}</span>
          {getVisibilityBadge()}
        </div>
      </div>
    </div>
  );
}

export function LeadNotes({ leadId, leadName }: LeadNotesProps) {
  const { toast } = useToast();
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");
  const [editingNote, setEditingNote] = useState<LeadNote | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      }
    };
    getCurrentUser();
  }, []);

  const { data: notes, isLoading: notesLoading } = useQuery<LeadNote[]>({
    queryKey: ["/api/crm/leads", leadId, "notes"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/leads/${leadId}/notes`, {
        credentials: 'include',
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch notes");
      return response.json();
    },
    enabled: !!leadId,
  });

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/crm/team-members"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/crm/team-members", {
        credentials: 'include',
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch team members");
      return response.json();
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      mentions: string[];
      visibility: string;
      visibleTo: string[];
    }) => {
      return apiRequest("POST", `/api/crm/leads/${leadId}/notes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", leadId, "notes"] });
      setIsAddingNote(false);
      toast({
        title: "Note added",
        description: "Your note has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (data: {
      noteId: string;
      title: string;
      content: string;
      mentions: string[];
      visibility: string;
      visibleTo: string[];
    }) => {
      return apiRequest("PUT", `/api/crm/leads/${leadId}/notes/${data.noteId}`, {
        title: data.title,
        content: data.content,
        mentions: data.mentions,
        visibility: data.visibility,
        visibleTo: data.visibleTo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", leadId, "notes"] });
      setEditingNote(null);
      toast({
        title: "Note updated",
        description: "Your note has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/crm/leads/${leadId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", leadId, "notes"] });
      setDeleteNoteId(null);
      toast({
        title: "Note deleted",
        description: "The note has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitNote = (
    title: string,
    content: string,
    mentions: string[],
    visibility: string,
    visibleTo: string[]
  ) => {
    createNoteMutation.mutate({ title, content, mentions, visibility, visibleTo });
  };

  const handleUpdateNote = (
    title: string,
    content: string,
    mentions: string[],
    visibility: string,
    visibleTo: string[]
  ) => {
    if (editingNote) {
      updateNoteMutation.mutate({
        noteId: editingNote.id,
        title,
        content,
        mentions,
        visibility,
        visibleTo,
      });
    }
  };

  const handleDeleteNote = () => {
    if (deleteNoteId) {
      deleteNoteMutation.mutate(deleteNoteId);
    }
  };

  const sortedNotes = notes?.slice().sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return sortOrder === "recent" ? dateB - dateA : dateA - dateB;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notes
            {notes && notes.length > 0 && (
              <Badge variant="secondary" className="ml-1">{notes.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={sortOrder} onValueChange={(v: "recent" | "oldest") => setSortOrder(v)}>
              <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="select-sort-order">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent Last</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
            {!isAddingNote && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddingNote(true)}
                data-testid="button-add-note"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isAddingNote && teamMembers && (
          <NoteEditor
            onSubmit={handleSubmitNote}
            isSubmitting={createNoteMutation.isPending}
            teamMembers={teamMembers}
            onCancel={() => setIsAddingNote(false)}
          />
        )}

        {editingNote && teamMembers && (
          <NoteEditor
            onSubmit={handleUpdateNote}
            isSubmitting={updateNoteMutation.isPending}
            teamMembers={teamMembers}
            onCancel={() => setEditingNote(null)}
            initialTitle={editingNote.title || ""}
            initialContent={editingNote.content}
            initialVisibility={editingNote.visibility}
            initialVisibleTo={editingNote.visibleTo || []}
          />
        )}
        
        {notesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedNotes && sortedNotes.length > 0 ? (
          <div className="divide-y">
            {sortedNotes.map((note) => (
              <NoteItem 
                key={note.id} 
                note={note} 
                currentUserId={currentUserId}
                onEdit={(n) => setEditingNote(n)}
                onDelete={(id) => setDeleteNoteId(id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notes yet</p>
            <p className="text-sm">Click "Add Note" to add the first note for this lead.</p>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-note">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-note"
            >
              {deleteNoteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default LeadNotes;
