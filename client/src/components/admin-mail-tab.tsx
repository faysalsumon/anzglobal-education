import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Send,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  Reply,
  Forward,
  Trash2,
  Paperclip,
  Inbox,
  AlertCircle,
  Loader2,
  Pencil,
  Eye,
  EyeOff,
  Settings,
  Building,
  Globe,
} from "lucide-react";
import { AdminMailAccountsPanel } from "@/components/admin-mail-accounts-panel";

// ─── Types ─────────────────────────────────────────────────────────────────

interface UserMailAccount {
  id: string;
  email: string;
  label: string;
  displayName: string | null;
  accountType: string;
  regionCode: string | null;
  canSend: boolean;
}

interface MailFolder {
  name: string;
  path: string;
  specialUse?: string;
  unreadCount: number;
  totalCount: number;
}

interface MailMessage {
  id: string;
  uid: string;
  account: string;
  folder: string;
  fromAddress: string | null;
  fromName: string | null;
  toAddresses: string | null;
  subject: string | null;
  snippet: string | null;
  sentAt: string | null;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  threadId: string | null;
}

interface FullEmail {
  uid: string;
  subject: string;
  fromAddress: string;
  fromName: string;
  toAddresses: string;
  ccAddresses: string;
  sentAt: string | null;
  htmlBody: string;
  textBody: string;
  isRead: boolean;
  attachments: { partId: string; filename: string; mimeType: string; size: number }[];
}

interface ComposeData {
  mode: "compose" | "reply" | "forward";
  to: string;
  cc: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string | null): string {
  const text = name || email || "?";
  const parts = text.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return text.substring(0, 2).toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return format(d, "h:mm a");
  if (diffDays < 7) return format(d, "EEE");
  if (d.getFullYear() === now.getFullYear()) return format(d, "MMM d");
  return format(d, "MM/dd/yy");
}

function folderDisplayName(folder: MailFolder): string {
  if (folder.specialUse === "\\Sent") return "Sent";
  if (folder.specialUse === "\\Drafts") return "Drafts";
  if (folder.specialUse === "\\Junk") return "Spam";
  if (folder.specialUse === "\\Trash") return "Trash";
  if (folder.path.toUpperCase() === "INBOX") return "Inbox";
  return folder.name;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Not Configured State ─────────────────────────────────────────────────

function NotConfigured({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="p-4 rounded-full bg-muted">
        <Mail className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">No Mail Access</h3>
        {isSuperAdmin ? (
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No mail accounts are configured yet. Use the account manager to add Zoho mail accounts and assign access to team members.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            You haven't been assigned to any mail accounts yet. Ask a platform admin to grant you access.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Account Switcher ──────────────────────────────────────────────────────

function AccountSwitcher({
  accounts,
  selectedId,
  onChange,
}: {
  accounts: UserMailAccount[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  if (accounts.length <= 1) return null;

  return (
    <Select value={selectedId} onValueChange={onChange}>
      <SelectTrigger
        className="h-8 text-xs w-full"
        data-testid="select-mail-account"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((acc) => (
          <SelectItem key={acc.id} value={acc.id}>
            <div className="flex items-center gap-2">
              {acc.accountType === "group" ? (
                <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <span>{acc.displayName || acc.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Compose Dialog ────────────────────────────────────────────────────────

function ComposeDialog({
  open,
  onClose,
  initialData,
  accountEmail,
  accountId,
  canSend,
}: {
  open: boolean;
  onClose: () => void;
  initialData: ComposeData;
  accountEmail: string;
  accountId: string;
  canSend: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [data, setData] = useState<ComposeData>(initialData);

  const endpoint =
    initialData.mode === "reply"
      ? "/api/mail/reply"
      : initialData.mode === "forward"
      ? "/api/mail/forward"
      : "/api/mail/send";

  const sendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `${endpoint}?accountId=${accountId}`, {
        to: data.to,
        cc: data.cc || undefined,
        subject: data.subject,
        html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${data.body.replace(/\n/g, "<br>")}</div>`,
        inReplyTo: data.inReplyTo,
        references: data.references,
      });
    },
    onSuccess: () => {
      toast({ title: "Email sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/mail/messages"] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    },
  });

  const title =
    initialData.mode === "reply" ? "Reply" : initialData.mode === "forward" ? "Forward" : "New Email";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl w-full" data-testid="dialog-compose">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            From: <span className="font-medium">{accountEmail}</span>
          </div>
          {!canSend && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              You have read-only access to this inbox. Contact a platform admin to enable sending.
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="compose-to" className="text-xs">To</Label>
            <Input
              id="compose-to"
              data-testid="input-compose-to"
              value={data.to}
              onChange={(e) => setData((d) => ({ ...d, to: e.target.value }))}
              placeholder="recipient@example.com"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="compose-cc" className="text-xs">CC (optional)</Label>
            <Input
              id="compose-cc"
              data-testid="input-compose-cc"
              value={data.cc}
              onChange={(e) => setData((d) => ({ ...d, cc: e.target.value }))}
              placeholder="cc@example.com"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="compose-subject" className="text-xs">Subject</Label>
            <Input
              id="compose-subject"
              data-testid="input-compose-subject"
              value={data.subject}
              onChange={(e) => setData((d) => ({ ...d, subject: e.target.value }))}
              placeholder="Subject"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="compose-body" className="text-xs">Message</Label>
            <Textarea
              id="compose-body"
              data-testid="textarea-compose-body"
              value={data.body}
              onChange={(e) => setData((d) => ({ ...d, body: e.target.value }))}
              placeholder="Write your message..."
              className="min-h-48 text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-compose-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !data.to || !data.subject || !canSend}
              data-testid="button-compose-send"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Folder Panel ──────────────────────────────────────────────────────────

function FolderPanel({
  folders,
  isLoading,
  selectedFolder,
  onSelectFolder,
  accounts,
  selectedAccountId,
  onSelectAccount,
  accountLabel,
  accountEmail,
  onCompose,
  onSync,
  isSyncing,
  isSuperAdmin,
  onManageAccounts,
}: {
  folders: MailFolder[];
  isLoading: boolean;
  selectedFolder: string;
  onSelectFolder: (path: string) => void;
  accounts: UserMailAccount[];
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  accountLabel: string;
  accountEmail: string;
  onCompose: () => void;
  onSync: () => void;
  isSyncing: boolean;
  isSuperAdmin: boolean;
  onManageAccounts: () => void;
}) {
  return (
    <div className="flex flex-col h-full border-r bg-muted/20">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex-1 min-w-0">
            {accounts.length > 1 ? (
              <AccountSwitcher
                accounts={accounts}
                selectedId={selectedAccountId}
                onChange={onSelectAccount}
              />
            ) : (
              <>
                <p className="text-xs font-semibold truncate">{accountLabel}</p>
                <p className="text-[11px] text-muted-foreground truncate">{accountEmail}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onSync}
              disabled={isSyncing}
              data-testid="button-mail-sync"
              title="Sync inbox"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
            </Button>
            {isSuperAdmin && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onManageAccounts}
                data-testid="button-manage-mail-accounts"
                title="Manage mail accounts"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <Button
          type="button"
          className="w-full h-8 text-sm"
          onClick={onCompose}
          data-testid="button-mail-compose"
        >
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Compose
        </Button>
      </div>

      {/* Folder list */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5" data-testid="folder-list">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))
            : folders.map((folder) => {
                const isActive = selectedFolder === folder.path;
                const displayName = folderDisplayName(folder);
                return (
                  <button
                    key={folder.path}
                    type="button"
                    data-testid={`folder-item-${folder.path}`}
                    onClick={() => onSelectFolder(folder.path)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors text-left",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover-elevate"
                    )}
                  >
                    <span className="truncate">{displayName}</span>
                    {folder.unreadCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-4 min-w-[1.25rem] px-1 text-[10px] no-default-active-elevate"
                      >
                        {folder.unreadCount > 99 ? "99+" : folder.unreadCount}
                      </Badge>
                    )}
                  </button>
                );
              })}
        </nav>
      </ScrollArea>
    </div>
  );
}

// ─── Message List Panel ────────────────────────────────────────────────────

function MessageListPanel({
  messages,
  isLoading,
  selectedUid,
  onSelectMessage,
  searchQuery,
  onSearchChange,
}: {
  messages: MailMessage[];
  isLoading: boolean;
  selectedUid: string | null;
  onSelectMessage: (uid: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  return (
    <div className="flex flex-col h-full border-r">
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            data-testid="input-mail-search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails..."
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              data-testid="button-clear-search"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="divide-y" data-testid="message-list">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No messages
            </div>
          ) : (
            messages.map((msg) => {
              const isSelected = msg.uid === selectedUid;
              return (
                <button
                  key={msg.uid}
                  type="button"
                  data-testid={`message-row-${msg.uid}`}
                  onClick={() => onSelectMessage(msg.uid)}
                  className={cn(
                    "w-full p-3 text-left transition-colors hover-elevate",
                    isSelected && "bg-primary/8 toggle-elevate toggle-elevated",
                    !msg.isRead && !isSelected && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(msg.fromName, msg.fromAddress)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "text-sm truncate flex-1",
                            !msg.isRead ? "font-semibold" : "font-normal"
                          )}
                          data-testid={`message-from-${msg.uid}`}
                        >
                          {msg.fromName || msg.fromAddress || "Unknown"}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">
                          {formatDate(msg.sentAt)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-[13px] truncate",
                          !msg.isRead ? "font-medium text-foreground" : "text-foreground/80"
                        )}
                        data-testid={`message-subject-${msg.uid}`}
                      >
                        {msg.subject || "(no subject)"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {msg.snippet || ""}
                      </p>
                      {(msg.hasAttachments || !msg.isRead) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {!msg.isRead && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          {msg.hasAttachments && (
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Email Reader Panel ────────────────────────────────────────────────────

function EmailReaderPanel({
  uid,
  folder,
  accountId,
  canSend,
  onBack,
  onReply,
  onForward,
  onDelete,
}: {
  uid: string;
  folder: string;
  accountId: string;
  canSend: boolean;
  onBack: () => void;
  onReply: (email: FullEmail) => void;
  onForward: (email: FullEmail) => void;
  onDelete: (uid: string) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showRaw, setShowRaw] = useState(false);

  const { data: email, isLoading, error } = useQuery<FullEmail>({
    queryKey: ["/api/mail/messages", accountId, uid, folder],
    queryFn: async () => {
      const res = await fetch(
        `/api/mail/messages/${uid}?folder=${encodeURIComponent(folder)}&accountId=${accountId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load email");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/mail/messages/${uid}?folder=${encodeURIComponent(folder)}&accountId=${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail/messages"] });
      onDelete(uid);
      toast({ title: "Email deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete email", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Separator />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">Failed to load email</p>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  const iframeSrc = email.htmlBody
    ? `data:text/html;charset=utf-8,${encodeURIComponent(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;padding:0;margin:0;word-wrap:break-word;overflow-wrap:break-word}a{color:#2563eb}img{max-width:100%;height:auto}</style></head><body>${email.htmlBody}</body></html>`
      )}`
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b flex-shrink-0">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onBack}
          className="lg:hidden"
          data-testid="button-email-back"
          title="Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        {canSend && (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => email && onReply(email)}
              data-testid="button-email-reply"
              title="Reply"
            >
              <Reply className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => email && onForward(email)}
              data-testid="button-email-forward"
              title="Forward"
            >
              <Forward className="h-4 w-4" />
            </Button>
          </>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setShowRaw(!showRaw)}
          data-testid="button-email-toggle-raw"
          title={showRaw ? "Show HTML" : "Show plain text"}
        >
          {showRaw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          data-testid="button-email-delete"
          title="Delete"
        >
          {deleteMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Email header */}
      <div className="px-5 py-4 border-b flex-shrink-0 space-y-1">
        <h2 className="font-semibold text-base leading-snug" data-testid="email-subject">
          {email.subject || "(no subject)"}
        </h2>
        <div className="flex items-start gap-2.5 mt-2">
          <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5">
            <AvatarFallback className="text-xs">
              {getInitials(email.fromName, email.fromAddress)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-sm" data-testid="email-from-name">
                {email.fromName || email.fromAddress}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0" data-testid="email-date">
                {email.sentAt
                  ? format(new Date(email.sentAt), "EEE, MMM d, yyyy 'at' h:mm a")
                  : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground" data-testid="email-from-address">
              {email.fromAddress}
            </p>
            {email.toAddresses && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">To:</span> {email.toAddresses}
              </p>
            )}
            {email.ccAddresses && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">CC:</span> {email.ccAddresses}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Email body */}
      <div className="flex-1 overflow-hidden">
        {showRaw || !iframeSrc ? (
          <ScrollArea className="h-full">
            <pre
              className="p-5 text-sm font-mono text-foreground/80 whitespace-pre-wrap break-words"
              data-testid="email-body-text"
            >
              {email.textBody || "(no content)"}
            </pre>
          </ScrollArea>
        ) : (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            sandbox="allow-same-origin"
            className="w-full h-full border-none"
            data-testid="email-body-iframe"
            title="Email content"
          />
        )}
      </div>

      {/* Attachments */}
      {email.attachments.length > 0 && (
        <div className="px-5 py-3 border-t flex-shrink-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {email.attachments.length} Attachment{email.attachments.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((att) => (
              <div
                key={att.partId}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-muted/40 text-xs"
                data-testid={`attachment-${att.partId}`}
              >
                <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate max-w-[150px]">{att.filename}</span>
                <span className="text-muted-foreground">{formatFileSize(att.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

type MobileView = "folders" | "list" | "reader";

export function AdminMailTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Admin role check (from session) — we check by fetching config
  const { data: configData } = useQuery<{
    configured: boolean;
    accountCount: number;
    email: string | null;
    label: string | null;
  }>({ queryKey: ["/api/mail/config"], staleTime: 60000 });

  // Fetch user's accessible accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery<{
    accounts: UserMailAccount[];
  }>({ queryKey: ["/api/mail/my-accounts"], staleTime: 60000 });

  // Fetch admin check for management panel
  const { data: adminAccountsData } = useQuery<{ accounts: any[] }>({
    queryKey: ["/api/mail/accounts"],
    staleTime: 60000,
    retry: false,
  });
  const isSuperAdmin = adminAccountsData !== undefined; // 403 = not admin, data = is admin

  const userAccounts = accountsData?.accounts || [];

  // Selected account
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const currentAccountId = selectedAccountId || userAccounts[0]?.id || "";
  const currentAccount = userAccounts.find((a) => a.id === currentAccountId) || userAccounts[0];

  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<ComposeData>({
    mode: "compose",
    to: "",
    cc: "",
    subject: "",
    body: "",
  });
  const [showAccountManager, setShowAccountManager] = useState(false);

  // Fetch folders for selected account
  const { data: foldersData, isLoading: foldersLoading } = useQuery<{
    folders: MailFolder[];
    account: string;
    accountId: string;
    label: string;
    canSend: boolean;
  }>({
    queryKey: ["/api/mail/folders", currentAccountId],
    queryFn: async () => {
      const url = currentAccountId
        ? `/api/mail/folders?accountId=${currentAccountId}`
        : "/api/mail/folders";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load folders");
      return res.json();
    },
    staleTime: 30000,
    enabled: userAccounts.length > 0,
  });

  // Fetch message list
  const { data: messagesData, isLoading: messagesLoading } = useQuery<{
    messages: MailMessage[];
    total: number;
    page: number;
    limit: number;
    folder: string;
  }>({
    queryKey: ["/api/mail/messages", currentAccountId, selectedFolder],
    queryFn: async () => {
      const params = new URLSearchParams({
        folder: selectedFolder,
        limit: "50",
        ...(currentAccountId ? { accountId: currentAccountId } : {}),
      });
      const res = await fetch(`/api/mail/messages?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    staleTime: 60000,
    enabled: userAccounts.length > 0,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const params = currentAccountId ? `?accountId=${currentAccountId}` : "";
      return apiRequest("POST", `/api/mail/sync${params}`, { folder: selectedFolder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail/messages", currentAccountId] });
      queryClient.invalidateQueries({ queryKey: ["/api/mail/folders", currentAccountId] });
      toast({ title: "Inbox synced" });
    },
    onError: (err: any) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSelectAccount = useCallback((id: string) => {
    setSelectedAccountId(id);
    setSelectedFolder("INBOX");
    setSelectedUid(null);
    setMobileView("list");
    queryClient.invalidateQueries({ queryKey: ["/api/mail/folders", id] });
    queryClient.invalidateQueries({ queryKey: ["/api/mail/messages", id] });
  }, [queryClient]);

  const handleSelectMessage = useCallback((uid: string) => {
    setSelectedUid(uid);
    setMobileView("reader");
    queryClient.setQueryData(
      ["/api/mail/messages", currentAccountId, selectedFolder],
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m: MailMessage) =>
            m.uid === uid ? { ...m, isRead: true } : m
          ),
        };
      }
    );
  }, [currentAccountId, selectedFolder, queryClient]);

  const handleSelectFolder = useCallback((path: string) => {
    setSelectedFolder(path);
    setSelectedUid(null);
    setMobileView("list");
  }, []);

  const handleCompose = useCallback(() => {
    setComposeData({ mode: "compose", to: "", cc: "", subject: "", body: "" });
    setComposeOpen(true);
  }, []);

  const handleReply = useCallback((email: FullEmail) => {
    setComposeData({
      mode: "reply",
      to: email.fromAddress,
      cc: "",
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body: `\n\n--- Original Message ---\nFrom: ${email.fromName || email.fromAddress}\nDate: ${email.sentAt ? format(new Date(email.sentAt), "PPP") : ""}\n\n${email.textBody}`,
      inReplyTo: email.uid,
      references: email.uid,
    });
    setComposeOpen(true);
  }, []);

  const handleForward = useCallback((email: FullEmail) => {
    setComposeData({
      mode: "forward",
      to: "",
      cc: "",
      subject: email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`,
      body: `\n\n--- Forwarded Message ---\nFrom: ${email.fromName || email.fromAddress}\nDate: ${email.sentAt ? format(new Date(email.sentAt), "PPP") : ""}\nTo: ${email.toAddresses}\nSubject: ${email.subject}\n\n${email.textBody}`,
    });
    setComposeOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    setSelectedUid(null);
    setMobileView("list");
  }, []);

  // Loading state
  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No accounts: show admin manager or "no access" state
  if (userAccounts.length === 0 && !accountsLoading) {
    if (showAccountManager && isSuperAdmin) {
      return <AdminMailAccountsPanel onClose={() => setShowAccountManager(false)} />;
    }
    return (
      <div className="flex flex-col h-full">
        {isSuperAdmin && (
          <div className="flex justify-end p-3 border-b">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAccountManager(true)}
              data-testid="button-open-account-manager"
            >
              <Settings className="h-3.5 w-3.5 mr-2" />
              Manage Mail Accounts
            </Button>
          </div>
        )}
        <NotConfigured isSuperAdmin={isSuperAdmin} />
      </div>
    );
  }

  // Show account manager
  if (showAccountManager) {
    return <AdminMailAccountsPanel onClose={() => setShowAccountManager(false)} />;
  }

  const folders = foldersData?.folders || [];
  const messages = messagesData?.messages || [];
  const accountEmail = foldersData?.account || currentAccount?.email || "";
  const accountLabel = foldersData?.label || currentAccount?.displayName || currentAccount?.label || "Mail";
  const canSend = foldersData?.canSend ?? currentAccount?.canSend ?? true;

  const folderPanelProps = {
    folders,
    isLoading: foldersLoading,
    selectedFolder,
    onSelectFolder: handleSelectFolder,
    accounts: userAccounts,
    selectedAccountId: currentAccountId,
    onSelectAccount: handleSelectAccount,
    accountLabel,
    accountEmail,
    onCompose: handleCompose,
    onSync: () => syncMutation.mutate(),
    isSyncing: syncMutation.isPending,
    isSuperAdmin,
    onManageAccounts: () => setShowAccountManager(true),
  };

  return (
    <div className="flex h-full overflow-hidden" data-testid="admin-mail-tab">
      {/* ── Desktop: 3-column layout ── */}
      <div className="hidden lg:flex h-full w-full overflow-hidden">
        <div className="w-56 flex-shrink-0 overflow-hidden">
          <FolderPanel {...folderPanelProps} />
        </div>
        <div className="w-[360px] flex-shrink-0 overflow-hidden">
          <MessageListPanel
            messages={messages}
            isLoading={messagesLoading}
            selectedUid={selectedUid}
            onSelectMessage={handleSelectMessage}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          {selectedUid ? (
            <EmailReaderPanel
              uid={selectedUid}
              folder={selectedFolder}
              accountId={currentAccountId}
              canSend={canSend}
              onBack={() => setSelectedUid(null)}
              onReply={handleReply}
              onForward={handleForward}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Mail className="h-10 w-10 opacity-30" />
              <p className="text-sm">Select an email to read</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: single panel at a time ── */}
      <div className="flex lg:hidden h-full w-full overflow-hidden">
        {mobileView === "folders" && (
          <div className="w-full overflow-hidden">
            <FolderPanel {...folderPanelProps} />
          </div>
        )}

        {mobileView === "list" && (
          <div className="w-full flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setMobileView("folders")}
                data-testid="button-mobile-show-folders"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm flex-1">
                {folders.find((f) => f.path === selectedFolder)
                  ? folderDisplayName(folders.find((f) => f.path === selectedFolder)!)
                  : selectedFolder}
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleCompose}
                data-testid="button-mobile-compose"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <MessageListPanel
              messages={messages}
              isLoading={messagesLoading}
              selectedUid={selectedUid}
              onSelectMessage={handleSelectMessage}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}

        {mobileView === "reader" && selectedUid && (
          <div className="w-full overflow-hidden">
            <EmailReaderPanel
              uid={selectedUid}
              folder={selectedFolder}
              accountId={currentAccountId}
              canSend={canSend}
              onBack={() => {
                setSelectedUid(null);
                setMobileView("list");
              }}
              onReply={handleReply}
              onForward={handleForward}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* Compose dialog */}
      {composeOpen && (
        <ComposeDialog
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          initialData={composeData}
          accountEmail={accountEmail}
          accountId={currentAccountId}
          canSend={canSend}
        />
      )}
    </div>
  );
}
