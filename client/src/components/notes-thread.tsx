/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { getCsrfToken } from "@/hooks/useCsrf";
import { supabase } from "@/lib/supabase";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Pencil,
  Trash2,
  MoreVertical,
  Send,
  X,
  Loader2,
  AtSign,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Globe2,
  Lock,
  Users,
  ChevronDown,
  Check,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { Instance as TippyInstance } from "tippy.js";

export type NoteVisibility = "public" | "private" | "selected";

export interface NoteVisibilityOpts {
  visibility?: NoteVisibility;
  visibleTo?: string[];
}

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
  source?: "lead" | "crm" | "application";
  isPinned?: boolean | null;
  visibility?: NoteVisibility;
  visibleTo?: string[];
  crmStage?: string | null;
}

export interface ThreadTeamMember {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
}

interface AttachedFile {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface NotesThreadProps {
  notes: UnifiedNote[];
  isLoading: boolean;
  currentUserId: string | null;
  onAddNote: (content: string, mentionedUserIds: string[], opts?: NoteVisibilityOpts) => Promise<void> | void;
  onEditNote?: (noteId: string, content: string, opts?: NoteVisibilityOpts) => void;
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
            type="button"
            key={item.id}
            className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover-elevate ${
              index === selectedIndex ? "bg-accent text-accent-foreground" : ""
            }`}
            onMouseDown={(e) => e.preventDefault()}
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
  return Array.from(new Set(mentions));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const VISIBILITY_OPTIONS: { value: NoteVisibility; label: string; icon: typeof Globe2; description: string }[] = [
  { value: "public", label: "Public", icon: Globe2, description: "Visible to all team members" },
  { value: "private", label: "Private", icon: Lock, description: "Only you and @mentioned members" },
  { value: "selected", label: "Specific people", icon: Users, description: "Choose who can see this" },
];

function VisibilityPicker({
  value,
  onChange,
  visibleTo,
  onVisibleToChange,
  teamMembers,
}: {
  value: NoteVisibility;
  onChange: (v: NoteVisibility) => void;
  visibleTo: string[];
  onVisibleToChange: (ids: string[]) => void;
  teamMembers: ThreadTeamMember[];
}) {
  const [open, setOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const current = VISIBILITY_OPTIONS.find((o) => o.value === value)!;
  const Icon = current.icon;

  const togglePerson = (id: string) => {
    onVisibleToChange(
      visibleTo.includes(id) ? visibleTo.filter((x) => x !== id) : [...visibleTo, id]
    );
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2 gap-1 text-xs text-muted-foreground"
            data-testid="button-visibility-picker"
          >
            <Icon className="h-3.5 w-3.5" />
            {current.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          {VISIBILITY_OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                className="flex items-start gap-2 w-full px-2 py-1.5 rounded-sm text-left hover-elevate"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                data-testid={`visibility-option-${opt.value}`}
              >
                <OptIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {value === "selected" && (
        <Popover open={peopleOpen} onOpenChange={setPeopleOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2 gap-1 text-xs text-muted-foreground"
              data-testid="button-select-people"
            >
              {visibleTo.length > 0 ? `${visibleTo.length} selected` : "Select people"}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1 max-h-48 overflow-y-auto" align="start">
            {teamMembers.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">No team members available</p>
            )}
            {teamMembers.map((m) => {
              const name = m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.email || "Unknown";
              const initials = m.firstName && m.lastName ? `${m.firstName[0]}${m.lastName[0]}` : "??";
              const checked = visibleTo.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-left hover-elevate"
                  onClick={() => togglePerson(m.id)}
                  data-testid={`select-person-${m.id}`}
                >
                  <div className="h-4 w-4 flex-shrink-0 border rounded flex items-center justify-center">
                    {checked && <Check className="h-3 w-3" />}
                  </div>
                  <Avatar className="h-5 w-5 flex-shrink-0">
                    <AvatarImage src={m.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{name}</span>
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function NoteComposer({
  teamMembers = [],
  onSubmit,
  onCancel,
  isSubmitting,
  initialContent = "",
  initialVisibility = "public",
  initialVisibleTo = [],
  placeholder = "Add a note… Type @ to mention team members",
}: {
  teamMembers?: ThreadTeamMember[];
  onSubmit: (content: string, mentionedUserIds: string[], opts: NoteVisibilityOpts) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  initialContent?: string;
  initialVisibility?: NoteVisibility;
  initialVisibleTo?: string[];
  placeholder?: string;
}) {
  const teamMembersRef = useRef<ThreadTeamMember[]>(teamMembers);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mentionCount, setMentionCount] = useState(0);
  const [hasContent, setHasContent] = useState(!!initialContent);
  const [pendingAttachments, setPendingAttachments] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [visibility, setVisibility] = useState<NoteVisibility>(initialVisibility);
  const [visibleTo, setVisibleTo] = useState<string[]>(initialVisibleTo);

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
          command: ({ editor, range, props }) => {
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                { type: "mention", attrs: { id: props.id, label: props.label } },
                { type: "text", text: " " },
              ])
              .run();
          },
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
      setHasContent(!editor.isEmpty);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      alert("Only images (JPEG, PNG, GIF, WebP) and PDFs are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10 MB.");
      return;
    }

    setIsUploading(true);
    try {
      const csrfToken = await getCsrfToken();
      const { data: { session } } = await (supabase?.auth.getSession() ?? Promise.resolve({ data: { session: null } }));
      const uploadHeaders: Record<string, string> = { "X-CSRF-Token": csrfToken };
      if (session?.access_token) uploadHeaders["Authorization"] = `Bearer ${session.access_token}`;

      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/crm/notes/upload-attachment", {
        method: "POST",
        credentials: "include",
        headers: uploadHeaders,
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data: AttachedFile = await res.json();
      setPendingAttachments((prev) => [...prev, data]);
      setHasContent(true);
    } catch {
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (url: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  const handleSubmit = () => {
    if (!editor || (!hasContent && pendingAttachments.length === 0)) return;

    let html = editor.getHTML();

    if (pendingAttachments.length > 0) {
      const attachmentsHtml = pendingAttachments
        .map((a) => {
          if (a.mimeType.startsWith("image/")) {
            return `<img src="${a.url}" alt="${a.filename}" class="note-attachment-image" />`;
          }
          return `<a href="${a.url}" class="note-attachment-pdf" target="_blank" rel="noopener noreferrer">${a.filename}</a>`;
        })
        .join("");
      html += `<div class="note-attachments">${attachmentsHtml}</div>`;
    }

    const opts: NoteVisibilityOpts = { visibility, visibleTo: visibility === "selected" ? visibleTo : [] };
    onSubmit(html, extractMentions(editor.getJSON()), opts);
    editor.commands.clearContent();
    setMentionCount(0);
    setHasContent(false);
    setPendingAttachments([]);
    setVisibility("public");
    setVisibleTo([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = (hasContent || pendingAttachments.length > 0) && !isSubmitting && !isUploading;

  return (
    <div className="border rounded-md bg-background" data-testid="note-composer">
      <div onKeyDown={handleKeyDown}>
        <EditorContent editor={editor} data-testid="textarea-new-note" />
      </div>

      {pendingAttachments.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-2">
          {pendingAttachments.map((a) => (
            <div
              key={a.url}
              className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 text-xs"
              data-testid={`attachment-preview-${a.filename}`}
            >
              {a.mimeType.startsWith("image/") ? (
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate max-w-[120px]">{a.filename}</span>
              <span className="text-muted-foreground">({formatFileSize(a.size)})</span>
              <button
                type="button"
                onClick={() => removeAttachment(a.url)}
                className="ml-0.5 text-muted-foreground hover:text-foreground"
                data-testid={`button-remove-attachment-${a.filename}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {mentionCount > 0 && (
        <div className="px-3 pb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <AtSign className="h-3 w-3" />
          <span>Mentioning {mentionCount} team member{mentionCount > 1 ? "s" : ""}</span>
        </div>
      )}

      <div className="flex items-center px-3 pb-2 pt-1 border-t gap-2">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-file-attachment"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach file (image or PDF)"
            data-testid="button-attach-file"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="h-3.5 w-3.5" />
            )}
          </Button>
          <VisibilityPicker
            value={visibility}
            onChange={setVisibility}
            visibleTo={visibleTo}
            onVisibleToChange={setVisibleTo}
            teamMembers={teamMembers}
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              data-testid="button-cancel-note"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="button-save-note"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatCrmStage(stage: string): string {
  const labels: Record<string, string> = {
    lead: "Lead",
    applicant: "Applicant",
    enrolled: "Enrolled",
    completed: "Completed",
    inactive: "Inactive",
  };
  return labels[stage] ?? stage;
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

const DOMPURIFY_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "span", "div", "a",
    "ul", "ol", "li", "code", "pre",
    // img removed: prevents tracking-pixel injection via external src URLs
    // svg/math removed: can be used as XSS vectors in some browser contexts
  ],
  // svg and math are allowed by DOMPurify by default — explicitly forbid them
  FORBID_TAGS: ["svg", "math", "script", "style"],
  ALLOWED_ATTR: ["class", "href", "target", "rel"],
  // Forbid data-* attributes to prevent data exfiltration via custom attributes
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false,
};

// Enforce safe link behaviour: every <a> gets target="_blank" rel="noopener noreferrer"
// so user-supplied href values can never navigate the parent frame or leak the referrer.
// Guard prevents duplicate hook registration under HMR hot-reloads.
if (!(DOMPurify as any)._anzLinkHookRegistered) {
  (DOMPurify as any)._anzLinkHookRegistered = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

function VisibilityBadge({ visibility, visibleTo }: { visibility?: NoteVisibility; visibleTo?: string[] }) {
  if (!visibility || visibility === "public") return null;
  if (visibility === "private") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" /> Private
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Users className="h-3 w-3" /> Shared with {visibleTo?.length ?? 0} {(visibleTo?.length ?? 0) === 1 ? "person" : "people"}
    </span>
  );
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return format(d, "MMM d, yyyy");
  }
}

function NoteItem({
  note,
  currentUserId,
  onEdit,
  onDelete,
  teamMembers,
  editingNoteId,
  onSaveEdit,
  onCancelEdit,
  isEditSubmitting,
  canEditLead,
  isLast,
}: {
  note: UnifiedNote;
  currentUserId: string | null;
  onEdit: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  teamMembers?: ThreadTeamMember[];
  editingNoteId: string | null;
  onSaveEdit: (noteId: string, content: string, opts: NoteVisibilityOpts) => void;
  onCancelEdit: () => void;
  isEditSubmitting?: boolean;
  canEditLead: boolean;
  isLast?: boolean;
}) {
  const isEditing = editingNoteId === note.id;
  const isReadOnly = (note.source === "lead" || note.source === "crm") && !canEditLead;
  const isOwn = currentUserId === note.createdById;
  const canEdit = !isReadOnly && isOwn;

  const authorName = getAuthorName(note.author);
  const authorInitials = getAuthorInitials(note.author);

  return (
    <div className="relative flex gap-3" data-testid={`note-item-${note.id}`}>
      {/* Timeline column */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <Avatar className="h-7 w-7 z-10 ring-2 ring-background">
          <AvatarImage src={note.author?.profileImageUrl || undefined} />
          <AvatarFallback className="text-[10px] font-medium">{authorInitials}</AvatarFallback>
        </Avatar>
        {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-0 min-h-[16px]" />}
      </div>

      {/* Content column */}
      <div className={`flex-1 min-w-0 ${isLast ? "pb-2" : "pb-5"}`}>
        {isEditing ? (
          <NoteComposer
            teamMembers={teamMembers}
            initialContent={note.content}
            initialVisibility={note.visibility ?? "public"}
            initialVisibleTo={note.visibleTo ?? []}
            onSubmit={(content, _mentions, opts) => onSaveEdit(note.id, content, opts)}
            onCancel={onCancelEdit}
            isSubmitting={isEditSubmitting}
            placeholder="Edit note…"
          />
        ) : (
          <div className="group">
            {/* Header row: author · time · menu */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-sm font-semibold leading-none">{authorName}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span
                  className="text-xs text-muted-foreground leading-none"
                  title={formatNoteDate(note.createdAt)}
                >
                  {formatRelativeTime(note.createdAt)}
                </span>
                {(note.source === "lead" || note.source === "crm") && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 leading-tight no-default-active-elevate cursor-default">
                        CRM{note.crmStage ? ` · ${formatCrmStage(note.crmStage)}` : ""}
                      </Badge>
                    </TooltipTrigger>
                    {note.crmStage && (
                      <TooltipContent side="top" className="text-xs">
                        Written when contact status was: <span className="font-medium">{formatCrmStage(note.crmStage)}</span>
                      </TooltipContent>
                    )}
                  </Tooltip>
                )}
                <VisibilityBadge visibility={note.visibility} visibleTo={note.visibleTo} />
              </div>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-note-menu-${note.id}`}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(note.id)} data-testid={`button-edit-note-${note.id}`}>
                      <Pencil className="h-4 w-4 mr-2" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(note.id)}
                      className="text-destructive focus:text-destructive"
                      data-testid={`button-delete-note-${note.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {/* Note content */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed [&_.note-attachment-image]:max-w-full [&_.note-attachment-image]:rounded-md [&_.note-attachment-image]:mt-2 [&_.note-attachment-image]:block [&_.note-attachment-pdf]:flex [&_.note-attachment-pdf]:items-center [&_.note-attachment-pdf]:gap-1.5 [&_.note-attachment-pdf]:mt-2 [&_.note-attachment-pdf]:text-sm [&_.note-attachment-pdf]:underline"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content, DOMPURIFY_CONFIG) }}
            />
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
  title = "Notes & Activity",
}: NotesThreadProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const canEditLead = !!onEditNote;

  const sortedNotes = [...notes].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  const handleAddNote = async (content: string, mentionedUserIds: string[], opts?: NoteVisibilityOpts) => {
    await Promise.resolve(onAddNote(content, mentionedUserIds, opts));
  };

  const handleSaveEdit = async (noteId: string, content: string, opts: NoteVisibilityOpts) => {
    if (!onEditNote) return;
    setIsEditSubmitting(true);
    try {
      await Promise.resolve(onEditNote(noteId, content, opts));
    } finally {
      setIsEditSubmitting(false);
      setEditingNoteId(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteNoteId && onDeleteNote) onDeleteNote(deleteNoteId);
    setDeleteNoteId(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="notes-thread">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {notes.length > 0 && (
          <Badge variant="secondary" className="text-xs no-default-active-elevate">{notes.length}</Badge>
        )}
      </div>

      {/* Timeline feed — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {isLoading ? (
          <div className="space-y-5 pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-25" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-0.5">Add the first note below</p>
          </div>
        ) : (
          <div className="pt-1">
            {sortedNotes.map((note, i) => (
              <NoteItem
                key={note.id}
                note={note}
                currentUserId={currentUserId}
                onEdit={(id) => setEditingNoteId(id)}
                onDelete={(id) => setDeleteNoteId(id)}
                teamMembers={teamMembers}
                editingNoteId={editingNoteId}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingNoteId(null)}
                isEditSubmitting={isEditSubmitting}
                canEditLead={canEditLead}
                isLast={i === sortedNotes.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Compose — always visible at bottom */}
      {!readOnly && (
        <div className="shrink-0 pt-3 border-t mt-2">
          <NoteComposer
            teamMembers={teamMembers}
            onSubmit={handleAddNote}
            isSubmitting={isSubmitting}
            placeholder="Add a note… Type @ to mention someone"
          />
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
