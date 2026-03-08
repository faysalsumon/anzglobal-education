import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import DOMPurify from "dompurify";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  MessageSquare,
  Pencil,
  Trash2,
  MoreVertical,
  Send,
  Plus,
  X,
  Loader2,
  AtSign,
} from "lucide-react";
import { format } from "date-fns";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { Instance as TippyInstance } from "tippy.js";

export interface UnifiedNote {
  id: string;
  content: string;
  createdAt: Date | string | null;
  createdById?: string;
  author?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    profileImageUrl?: string | null;
  } | null;
  source?: "lead" | "application";
  isPinned?: boolean | null;
}

export interface ThreadTeamMember {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
}

interface NotesThreadProps {
  notes: UnifiedNote[];
  isLoading: boolean;
  currentUserId: string | null;
  onAddNote: (content: string, mentionedUserIds: string[]) => void;
  onEditNote?: (noteId: string, content: string) => void;
  onDeleteNote?: (noteId: string) => void;
  teamMembers?: ThreadTeamMember[];
  isSubmitting?: boolean;
  readOnly?: boolean;
  title?: string;
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: ThreadTeamMember[];
  command: (attrs: { id: string; label: string }) => void;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      const name =
        item.firstName && item.lastName
          ? `${item.firstName} ${item.lastName}`
          : item.email || "Unknown";
      props.command({ id: item.id, label: name });
    }
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="bg-popover border rounded-md shadow-lg p-2 text-sm text-muted-foreground">
        No team members found
      </div>
    );
  }

  return (
    <div className="bg-popover border rounded-md shadow-lg overflow-hidden max-h-48 overflow-y-auto">
      {props.items.map((item, index) => {
        const name =
          item.firstName && item.lastName
            ? `${item.firstName} ${item.lastName}`
            : item.email || "Unknown";
        const initials =
          item.firstName && item.lastName
            ? `${item.firstName[0]}${item.lastName[0]}`
            : (item.email?.slice(0, 2) || "??").toUpperCase();

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

function extractMentions(json: any): string[] {
  const mentions: string[] = [];
  function traverse(node: any) {
    if (!node) return;
    if (node.type === "mention" && node.attrs?.id) mentions.push(node.attrs.id);
    if (Array.isArray(node.content)) node.content.forEach(traverse);
  }
  if (json?.content) json.content.forEach(traverse);
  return [...new Set(mentions)];
}

function NoteComposer({
  teamMembers = [],
  onSubmit,
  onCancel,
  isSubmitting,
  initialContent = "",
  placeholder = "Add a note… Type @ to mention team members",
}: {
  teamMembers?: ThreadTeamMember[];
  onSubmit: (content: string, mentionedUserIds: string[]) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  initialContent?: string;
  placeholder?: string;
}) {
  const teamMembersRef = useRef<ThreadTeamMember[]>(teamMembers);
  const [mentionCount, setMentionCount] = useState(0);

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
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion: {
          items: ({ query }) =>
            teamMembersRef.current
              .filter((m) => {
                const q = query.toLowerCase();
                return (
                  m.firstName?.toLowerCase().includes(q) ||
                  m.lastName?.toLowerCase().includes(q) ||
                  m.email?.toLowerCase().includes(q) ||
                  `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
                );
              })
              .slice(0, 8),
          render: () => {
            let component: ReactRenderer<MentionListRef> | null = null;
            let popup: TippyInstance[] | null = null;
            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, { props, editor: props.editor });
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
                popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") { popup?.[0]?.hide(); return true; }
                return component?.ref?.onKeyDown(props) || false;
              },
              onExit: () => { popup?.[0]?.destroy(); component?.destroy(); },
            };
          },
        },
      }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60px] px-3 py-2",
      },
    },
    onUpdate: ({ editor }) => {
      setMentionCount(extractMentions(editor.getJSON()).length);
    },
  });

  const handleSubmit = () => {
    if (!editor || editor.isEmpty) return;
    onSubmit(editor.getHTML(), extractMentions(editor.getJSON()));
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
    <div className="border rounded-md bg-background" data-testid="note-composer">
      <div onKeyDown={handleKeyDown}>
        <EditorContent editor={editor} data-testid="textarea-new-note" />
      </div>
      {mentionCount > 0 && (
        <div className="px-3 pb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <AtSign className="h-3 w-3" />
          <span>Mentioning {mentionCount} team member{mentionCount > 1 ? "s" : ""}</span>
        </div>
      )}
      <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t">
        <p className="text-xs text-muted-foreground">Ctrl+Enter to send</p>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} data-testid="button-cancel-note">
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!editor || editor.isEmpty || isSubmitting}
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
    </div>
  );
}

function getAuthorName(author?: UnifiedNote["author"]): string {
  if (author?.firstName && author?.lastName) return `${author.firstName} ${author.lastName}`;
  return author?.email || "Unknown";
}

function getAuthorInitials(author?: UnifiedNote["author"]): string {
  if (author?.firstName && author?.lastName)
    return `${author.firstName[0]}${author.lastName[0]}`.toUpperCase();
  return (author?.email?.slice(0, 2) || "??").toUpperCase();
}

function formatNoteDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy h:mm a");
}

function NoteItem({
  note,
  currentUserId,
  onEdit,
  onDelete,
  teamMembers,
  isDeleting,
  editingNoteId,
  onSaveEdit,
  onCancelEdit,
  isEditSubmitting,
}: {
  note: UnifiedNote;
  currentUserId: string | null;
  onEdit: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  teamMembers?: ThreadTeamMember[];
  isDeleting?: boolean;
  editingNoteId: string | null;
  onSaveEdit: (noteId: string, content: string) => void;
  onCancelEdit: () => void;
  isEditSubmitting?: boolean;
}) {
  const isEditing = editingNoteId === note.id;
  const isReadOnly = note.source === "lead";
  const isOwn = currentUserId === note.createdById;
  const canEdit = !isReadOnly && isOwn;

  const authorName = getAuthorName(note.author);
  const authorInitials = getAuthorInitials(note.author);

  return (
    <div className="flex gap-3 py-3" data-testid={`note-item-${note.id}`}>
      <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5">
        <AvatarImage src={note.author?.profileImageUrl || undefined} />
        <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <NoteComposer
            teamMembers={teamMembers}
            initialContent={note.content}
            onSubmit={(content) => onSaveEdit(note.id, content)}
            onCancel={onCancelEdit}
            isSubmitting={isEditSubmitting}
            placeholder="Edit note…"
          />
        ) : (
          <div className="group">
            <div className="flex items-start justify-between gap-1">
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-snug"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content) }}
              />
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-note-menu-${note.id}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEdit(note.id)}
                      data-testid={`button-edit-note-${note.id}`}
                    >
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
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {formatNoteDate(note.createdAt)} by{" "}
                <span className="font-medium text-foreground">{authorName}</span>
              </span>
              {isReadOnly && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Lead
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotesThread({
  notes,
  isLoading,
  currentUserId,
  onAddNote,
  onEditNote,
  onDeleteNote,
  teamMembers = [],
  isSubmitting,
  readOnly = false,
  title = "Notes",
}: NotesThreadProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const handleAddNote = (content: string, mentionedUserIds: string[]) => {
    onAddNote(content, mentionedUserIds);
    setIsComposing(false);
  };

  const handleSaveEdit = async (noteId: string, content: string) => {
    if (!onEditNote) return;
    setIsEditSubmitting(true);
    try {
      await Promise.resolve(onEditNote(noteId, content));
    } finally {
      setIsEditSubmitting(false);
      setEditingNoteId(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteNoteId && onDeleteNote) {
      onDeleteNote(deleteNoteId);
    }
    setDeleteNoteId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-testid="notes-thread">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{title}</span>
          {notes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {notes.length}
            </Badge>
          )}
        </div>
        {!readOnly && !isComposing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setIsComposing(true); setEditingNoteId(null); }}
            data-testid="button-add-note"
            title="Add note"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isComposing && !readOnly && (
        <div className="mb-4">
          <NoteComposer
            teamMembers={teamMembers}
            onSubmit={handleAddNote}
            onCancel={() => setIsComposing(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {notes.length === 0 && !isComposing ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notes yet</p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setIsComposing(true)}
              data-testid="button-add-first-note"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add first note
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              currentUserId={currentUserId}
              onEdit={(id) => { setEditingNoteId(id); setIsComposing(false); }}
              onDelete={(id) => setDeleteNoteId(id)}
              teamMembers={teamMembers}
              editingNoteId={editingNoteId}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingNoteId(null)}
              isEditSubmitting={isEditSubmitting}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-note"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default NotesThread;
