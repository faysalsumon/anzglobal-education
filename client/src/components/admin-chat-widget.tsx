import { useState, useRef, useEffect, useMemo } from "react";
import { MessageCircle, X, Send, Minimize2, Users, Building2, GraduationCap, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import chatAvatarImage from "@assets/generated_images/friendly_education_consultant_avatar.webp";

interface AdminContext {
  firstName: string;
  lastName: string;
  role: string;
  branchName: string | null;
  contacts: { total: number; byStage: Record<string, number> };
  tasks: {
    overdue: number;
    overdueItems: string[];
    dueToday: number;
    dueTodayItems: string[];
    upcomingWeek: number;
  };
  teammates: Array<{ name: string; role: string; contactCount: number }>;
  pendingApplications: number;
}

interface DataEntryPreview {
  type: "institution" | "course";
  fields: Record<string, any>;
  missingRequired: string[];
  institutionId?: string;
  institutionName?: string;
}

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  dataEntryPreview?: DataEntryPreview | null;
  dataEntrySaved?: { type: string; name: string; id: string } | null;
  dataEntryCancelled?: boolean;
}

function buildGreeting(ctx: AdminContext): string {
  const roleLabels: Record<string, string> = {
    branch_manager: "Branch Manager",
    marketing_executive: "Marketing Executive",
    education_consultant: "Education Consultant",
    operations_staff: "Operations Staff",
    super_admin: "Super Admin",
    platform_admin: "Platform Admin",
    admin: "Admin",
  };
  const roleLabel = roleLabels[ctx.role] ?? ctx.role;

  const lines: string[] = [
    `Hi **${ctx.firstName}**! Here's your priority briefing as ${roleLabel}${ctx.branchName ? ` (${ctx.branchName})` : ""}:`,
    "",
  ];

  if (ctx.tasks.overdue > 0) {
    lines.push(
      `**${ctx.tasks.overdue} overdue task${ctx.tasks.overdue !== 1 ? "s" : ""}** — ${ctx.tasks.overdueItems.slice(0, 3).map((t) => `"${t}"`).join(", ")}${ctx.tasks.overdue > 3 ? "..." : ""}`
    );
  }
  if (ctx.tasks.dueToday > 0) {
    lines.push(
      `**${ctx.tasks.dueToday} due today** — ${ctx.tasks.dueTodayItems.slice(0, 3).map((t) => `"${t}"`).join(", ")}${ctx.tasks.dueToday > 3 ? "..." : ""}`
    );
  }
  if (ctx.tasks.upcomingWeek > 0) {
    lines.push(`**${ctx.tasks.upcomingWeek} task${ctx.tasks.upcomingWeek !== 1 ? "s" : ""}** coming up this week`);
  }
  if (ctx.tasks.overdue === 0 && ctx.tasks.dueToday === 0 && ctx.tasks.upcomingWeek === 0) {
    lines.push("**No tasks due** — your queue is clear");
  }

  lines.push(`**${ctx.contacts.total} contact${ctx.contacts.total !== 1 ? "s" : ""}** assigned to you`);

  if (ctx.pendingApplications > 0) {
    lines.push(`**${ctx.pendingApplications} application${ctx.pendingApplications !== 1 ? "s" : ""}** awaiting review platform-wide`);
  }

  if (ctx.teammates.length > 0) {
    const teamLine = ctx.teammates.map((t) => `${t.name} (${t.contactCount} contacts)`).join(", ");
    lines.push(`**Branch team:** ${teamLine}`);
  }

  const canDoDataEntry = ['cto', 'marketing_executive'].includes(ctx.role);
  if (canDoDataEntry) {
    lines.push("", 'You can also add institutions or courses by telling me about them — just say something like "Add RMIT University" or "Add Bachelor of Business to RMIT".');
  }

  lines.push("", "What would you like to work on first?");
  return lines.join("\n");
}

const ROLE_BADGE_LABELS: Record<string, string> = {
  branch_manager: "Branch Manager",
  marketing_executive: "Marketing Executive",
  education_consultant: "Education Consultant",
  operations_staff: "Operations",
  super_admin: "Super Admin",
  platform_admin: "Platform Admin",
  admin: "Admin",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  country: "Country",
  description: "Description",
  website: "Website",
  contactEmail: "Email",
  contactPhone: "Phone",
  providerType: "Type",
  establishedYear: "Established",
  numberOfCampuses: "Campuses",
  title: "Title",
  subject: "Subject",
  level: "Level",
  discipline: "Discipline",
  duration: "Duration",
  fees: "Fees",
  currency: "Currency",
  location: "Location",
  startDate: "Start Date",
  deliveryMode: "Delivery",
};

function DataEntryCard({
  preview,
  onSave,
  onCancel,
  isSaving,
}: {
  preview: DataEntryPreview;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const isInstitution = preview.type === "institution";
  const IconComponent = isInstitution ? Building2 : GraduationCap;
  const typeLabel = isInstitution ? "Institution" : "Course";

  const filledFields = Object.entries(preview.fields).filter(([, v]) => v != null && v !== "");
  const emptyFields = Object.entries(preview.fields).filter(([, v]) => v == null || v === "");

  return (
    <Card className="mt-2 overflow-visible">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <IconComponent className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            New {typeLabel} — Draft Preview
          </span>
        </div>

        {preview.institutionName && (
          <div className="text-xs text-muted-foreground">
            Institution: <span className="font-medium text-foreground">{preview.institutionName}</span>
          </div>
        )}

        <div className="space-y-1">
          {filledFields.map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 text-xs">
              <span className="text-muted-foreground min-w-[70px] shrink-0">{FIELD_LABELS[key] || key}:</span>
              <span className="text-foreground font-medium break-words">
                {key === "fees" ? `${preview.fields.currency || "AUD"} ${Number(value).toLocaleString()}` : String(value)}
              </span>
            </div>
          ))}
          {emptyFields.length > 0 && (
            <div className="text-xs text-muted-foreground/60 italic mt-1">
              Optional: {emptyFields.map(([k]) => FIELD_LABELS[k] || k).join(", ")}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            data-testid="button-save-draft-data-entry"
          >
            {isSaving ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            data-testid="button-cancel-data-entry"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DataEntrySavedCard({ saved }: { saved: { type: string; name: string; id: string } }) {
  return (
    <Card className="mt-2 overflow-visible">
      <div className="p-3 flex items-center gap-2">
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-xs text-foreground">
          <span className="font-semibold">{saved.name}</span> saved as draft {saved.type}.
        </span>
      </div>
    </Card>
  );
}

export function AdminChatWidget() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [hasGreeting, setHasGreeting] = useState(false);
  const [adminCtx, setAdminCtx] = useState<AdminContext | null>(null);
  const [briefingReady, setBriefingReady] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const markdownComponents: Components = useMemo(
    () => ({
      p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
      ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>,
      li: ({ children }) => <li className="text-sm">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    }),
    []
  );

  const initMutation = useMutation({
    mutationFn: async () => {
      const convRes = await apiRequest("POST", "/api/admin-chat/conversations", {});
      const conv = await convRes.json();
      const ctxRes = await apiRequest("POST", "/api/admin-chat/context", {});
      const ctx: AdminContext = await ctxRes.json();
      return { convId: conv.id as string, ctx };
    },
    onSuccess: ({ convId, ctx }) => {
      setConversationId(convId);
      setAdminCtx(ctx);
      if (!hasGreeting) {
        const greeting = buildGreeting(ctx);
        setMessages([{ id: "greeting", role: "assistant", content: greeting }]);
        setHasGreeting(true);
        setBriefingReady(true);
      }
    },
    onError: () => {
      setMessages([
        {
          id: "greeting-error",
          role: "assistant",
          content: "Hi! I'm Zan, your admin assistant. I had trouble loading your briefing, but I'm ready to help — ask me anything.",
        },
      ]);
      setHasGreeting(true);
    },
  });

  useEffect(() => {
    if (!hasGreeting && !initMutation.isPending) {
      initMutation.mutate();
    }
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error("No conversation");
      const res = await apiRequest("POST", `/api/admin-chat/conversations/${conversationId}/messages`, { content });
      return res.json();
    },
    onSuccess: (data) => {
      const newMsg: LocalMessage = {
        id: data.id,
        role: "assistant",
        content: data.content,
      };
      if (data.dataEntrySaved) {
        newMsg.dataEntrySaved = data.dataEntrySaved;
      } else if (data.dataEntryPreview) {
        newMsg.dataEntryPreview = data.dataEntryPreview;
      } else if (data.sources) {
        try {
          const parsed = JSON.parse(data.sources);
          if (parsed.dataEntrySaved) {
            newMsg.dataEntrySaved = parsed.dataEntrySaved;
          } else if (parsed.dataEntryPreview) {
            newMsg.dataEntryPreview = parsed.dataEntryPreview;
          }
        } catch {}
      }
      setMessages((prev) => [...prev, newMsg]);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async ({ msgId, preview }: { msgId: string; preview: DataEntryPreview }) => {
      const endpoint = preview.type === "institution"
        ? "/api/admin-chat/data-entry/institutions"
        : "/api/admin-chat/data-entry/courses";

      const body = preview.type === "course"
        ? { ...preview.fields, institutionId: preview.institutionId }
        : preview.fields;

      const res = await apiRequest("POST", endpoint, body);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      return { msgId, result: await res.json(), preview };
    },
    onSuccess: ({ msgId, result, preview }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                dataEntryPreview: null,
                dataEntrySaved: {
                  type: preview.type,
                  name: result.name || result.title,
                  id: result.id,
                },
              }
            : m
        )
      );
      toast({
        title: `${preview.type === "institution" ? "Institution" : "Course"} saved`,
        description: `"${result.name || result.title}" created as draft.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    const tempId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: trimmed }]);
    setInput("");
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCancelDataEntry = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, dataEntryPreview: null, dataEntryCancelled: true }
          : m
      )
    );
  };

  const openWidget = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setBriefingReady(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const closeWidget = () => {
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div
        className="fixed bottom-36 right-3 md:bottom-32 md:right-4 z-40"
        data-testid="admin-chat-widget-trigger"
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        <div
          className={`
            flex items-center gap-2 bg-card border border-border rounded-full shadow-lg
            transition-all duration-300 ease-in-out overflow-hidden
            ${isCollapsed ? "p-1" : "p-1 pr-4"}
          `}
        >
          <button
            type="button"
            onClick={openWidget}
            className="relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full flex-shrink-0"
            aria-label="Open admin assistant"
          >
            <div className="relative transition-transform duration-300 group-hover:scale-105">
              <img
                src={chatAvatarImage}
                alt="Zan - Admin Assistant"
                className="w-11 h-11 rounded-full object-cover border-2 border-border"
              />
              <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />
              {briefingReady && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={openWidget}
            className={`flex flex-col items-start transition-all duration-300 ease-in-out ${
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
            data-testid="button-ask-admin-chat"
          >
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Admin assistant</span>
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">Zan</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-36 right-3 md:bottom-32 md:right-4 z-40 flex flex-col bg-card border border-border rounded-xl shadow-2xl w-80"
      style={{ height: isMinimized ? "56px" : "460px" }}
      data-testid="admin-chat-widget"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/50 rounded-t-xl shrink-0">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={chatAvatarImage} alt="Zan" />
            <AvatarFallback className="text-xs">Z</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold leading-tight">Zan</span>
              {adminCtx && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 no-default-active-elevate">
                  {ROLE_BADGE_LABELS[adminCtx.role] ?? adminCtx.role}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-[10px] text-muted-foreground leading-tight">Admin assistant</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized((v) => !v)}
            className="h-7 w-7"
            data-testid="button-minimize-admin-chat"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={closeWidget}
            className="h-7 w-7"
            data-testid="button-close-admin-chat"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 px-3 py-2">
            <div className="space-y-3">
              {initMutation.isPending && messages.length === 0 && (
                <div className="flex items-start gap-2">
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarImage src={chatAvatarImage} alt="Zan" />
                    <AvatarFallback className="text-[10px]">Z</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2">
                    <div className="flex gap-1 items-center h-5">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div
                    className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarImage src={chatAvatarImage} alt="Zan" />
                        <AvatarFallback className="text-[10px]">Z</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                  {msg.dataEntryPreview && (
                    <div className="ml-9">
                      <DataEntryCard
                        preview={msg.dataEntryPreview}
                        onSave={() => saveDraftMutation.mutate({ msgId: msg.id, preview: msg.dataEntryPreview! })}
                        onCancel={() => handleCancelDataEntry(msg.id)}
                        isSaving={saveDraftMutation.isPending}
                      />
                    </div>
                  )}
                  {msg.dataEntrySaved && (
                    <div className="ml-9">
                      <DataEntrySavedCard saved={msg.dataEntrySaved} />
                    </div>
                  )}
                  {msg.dataEntryCancelled && (
                    <div className="ml-9 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        <span>Data entry cancelled</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {sendMutation.isPending && (
                <div className="flex items-start gap-2">
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarImage src={chatAvatarImage} alt="Zan" />
                    <AvatarFallback className="text-[10px]">Z</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2">
                    <div className="flex gap-1 items-center h-5">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="shrink-0 px-3 pb-3 pt-2 border-t">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Zan anything..."
                className="resize-none text-sm min-h-[38px] max-h-[100px]"
                rows={1}
                data-testid="input-admin-chat-message"
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending || !conversationId}
                data-testid="button-send-admin-chat"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
