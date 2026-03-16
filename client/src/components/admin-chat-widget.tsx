import { useState, useRef, useEffect, useMemo } from "react";
import { MessageCircle, X, Send, Minimize2, Users, CheckCircle2, Building2, GraduationCap, AlertTriangle } from "lucide-react";
import { ZanThinkingIndicator } from "@/components/zan-thinking-indicator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  action: "confirm" | "saved";
  data?: Record<string, any>;
  id?: string;
  name?: string;
  slug?: string;
}

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  data_entry_preview?: DataEntryPreview | null;
}

const INSTITUTION_REQUIRED = ["name", "providerType", "country"];
const COURSE_REQUIRED = ["title", "universityId", "subject", "level", "discipline"];

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  providerType: "Provider Type",
  country: "Country",
  website: "Website",
  logo: "Logo URL",
  description: "Description",
  smallDescription: "Short Description",
  fullDescription: "Full Description",
  contactEmail: "Contact Email",
  contactPhone: "Contact Phone",
  establishedYear: "Established Year",
  numberOfCampuses: "Number of Campuses",
  campusAddresses: "Campus Addresses",
  scholarshipPercentageMin: "Min Scholarship %",
  scholarshipPercentageMax: "Max Scholarship %",
  tuitionFeesMin: "Min Tuition Fee",
  tuitionFeesMax: "Max Tuition Fee",
  tuitionCurrency: "Tuition Currency",
  deliveryModes: "Delivery Modes",
  intakePeriods: "Intake Periods",
  topDisciplines: "Top Disciplines",
  accreditationStatus: "Accreditation",
  rankingBand: "Ranking Band",
  facilities: "Facilities",
  internationalStudentSupport: "Intl Student Support",
  tags: "Tags",
  rtoNumber: "RTO Number",
  cricosProviderCode: "CRICOS Code",
  institutionGallery: "Gallery Images",
  title: "Title",
  universityId: "Institution ID",
  subject: "Subject",
  level: "Level",
  discipline: "Discipline",
  duration: "Duration",
  durationMonths: "Duration (months)",
  fees: "Fees",
  currency: "Currency",
  location: "Location",
  startDate: "Start Date",
  applicationDeadline: "Application Deadline",
  deliveryMode: "Delivery Mode",
  prPathway: "PR Pathway",
  intakes: "Intakes",
  careerOutcomes: "Career Outcomes",
  prerequisites: "Prerequisites",
  eligibilityRequirements: "Eligibility",
  englishRequirements: "English Requirements",
  campusLocations: "Campus Locations",
  internshipAvailable: "Internship Available",
  sourceUrl: "Source URL",
  courseCode: "Course Code",
};

function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (typeof value[0] === "object") return `${value.length} item(s)`;
    return value.join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DataEntryConfirmCard({
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
  const requiredFields = isInstitution ? INSTITUTION_REQUIRED : COURSE_REQUIRED;
  const data = preview.data || {};
  const Icon = isInstitution ? Building2 : GraduationCap;

  const filledEntries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
  );

  const missingRequired = requiredFields.filter((f) => {
    const val = data[f];
    return val === null || val === undefined || val === "";
  });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden mt-2" data-testid="data-entry-confirm-card">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">
          {isInstitution ? "Institution" : "Course"} Draft Preview
        </span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 ml-auto no-default-active-elevate">
          Draft
        </Badge>
      </div>

      <div className="px-3 py-2 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {filledEntries.map(([key, value]) => {
            const label = FIELD_LABELS[key] || key;
            const formatted = formatFieldValue(value);
            if (!formatted) return null;
            const isRequired = requiredFields.includes(key);
            return (
              <div key={key} className="min-w-0">
                <div className={`text-[10px] truncate ${isRequired ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </div>
                <div className="text-xs text-foreground truncate" title={formatted}>
                  {formatted}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {missingRequired.length > 0 && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-t border-amber-500/20 flex items-start gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
          <span className="text-[10px] text-amber-700 dark:text-amber-400">
            Missing required: {missingRequired.map((f) => FIELD_LABELS[f] || f).join(", ")}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || missingRequired.length > 0}
          data-testid="button-save-draft"
        >
          {isSaving ? "Saving..." : "Save as Draft"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
          data-testid="button-cancel-draft"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function DataEntrySavedCard({ preview }: { preview: DataEntryPreview }) {
  const isInstitution = preview.type === "institution";
  const Icon = isInstitution ? Building2 : GraduationCap;
  const recordLink = isInstitution
    ? `/admin/institutions/${preview.slug || preview.id}`
    : `/admin/courses/${preview.id}`;

  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 mt-2 flex items-center gap-2" data-testid="data-entry-saved-card">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-green-700 dark:text-green-300">
          {isInstitution ? "Institution" : "Course"} saved as draft
        </div>
        <div className="text-[10px] text-green-600 dark:text-green-400 truncate">
          {preview.name}
        </div>
        <a
          href={recordLink}
          className="text-[10px] text-green-700 dark:text-green-300 underline hover:no-underline"
          data-testid="link-view-saved-record"
        >
          View record
        </a>
      </div>
      <Icon className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 ml-auto" />
    </div>
  );
}

function buildGreeting(ctx: AdminContext): string {
  const roleLabels: Record<string, string> = {
    branch_manager: "Branch Manager",
    support_staff: "Support Staff",
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

  lines.push("", "What would you like to work on first?");
  return lines.join("\n");
}

const ROLE_BADGE_LABELS: Record<string, string> = {
  branch_manager: "Branch Manager",
  support_staff: "Support",
  operations_staff: "Operations",
  super_admin: "Super Admin",
  platform_admin: "Platform Admin",
  admin: "Admin",
};

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
  const [dismissedPreviews, setDismissedPreviews] = useState<Set<string>>(new Set());

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
        data_entry_preview: data.data_entry_preview || null,
      };
      setMessages((prev) => [...prev, newMsg]);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async ({ type, data }: { type: string; data: any }) => {
      const res = await apiRequest("POST", "/api/admin-chat/save-draft", { type, data });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Save failed");
      }
      return result;
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        const successMsg: LocalMessage = {
          id: `saved-${Date.now()}`,
          role: "assistant",
          content: `${variables.type === "institution" ? "Institution" : "Course"} "${result.name || result.title}" has been saved as a draft.`,
          data_entry_preview: {
            type: variables.type as "institution" | "course",
            action: "saved",
            id: result.id,
            name: result.name || result.title,
            slug: result.slug,
          },
        };
        setMessages((prev) => [...prev, successMsg]);
        toast({ title: "Draft saved", description: `${result.name || result.title} saved successfully` });
      } else {
        toast({ title: "Save failed", description: result.message || "Unknown error", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
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

  const openWidget = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setBriefingReady(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const closeWidget = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleOpenEvent = () => openWidget();
    window.addEventListener("open-admin-chat-widget", handleOpenEvent);
    return () => window.removeEventListener("open-admin-chat-widget", handleOpenEvent);
  }, []);

  const handleSaveDraft = (msgId: string, preview: DataEntryPreview) => {
    if (!preview.data) return;
    saveDraftMutation.mutate(
      { type: preview.type, data: preview.data },
      { onSuccess: () => setDismissedPreviews((prev) => new Set(prev).add(msgId)) }
    );
  };

  const handleCancelDraft = (msgId: string) => {
    setDismissedPreviews((prev) => new Set(prev).add(msgId));
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
      className="fixed bottom-10 right-3 md:right-4 z-40 flex flex-col bg-card border border-border rounded-xl shadow-2xl w-80"
      style={{ height: isMinimized ? "56px" : "min(460px, calc(100vh - 6rem))" }}
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
                <ZanThinkingIndicator variant="admin" size="sm" />
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

                  {msg.data_entry_preview && !dismissedPreviews.has(msg.id) && (
                    <div className="ml-9">
                      {msg.data_entry_preview.action === "confirm" && (
                        <DataEntryConfirmCard
                          preview={msg.data_entry_preview}
                          onSave={() => handleSaveDraft(msg.id, msg.data_entry_preview!)}
                          onCancel={() => handleCancelDraft(msg.id)}
                          isSaving={saveDraftMutation.isPending}
                        />
                      )}
                      {msg.data_entry_preview.action === "saved" && (
                        <DataEntrySavedCard preview={msg.data_entry_preview} />
                      )}
                    </div>
                  )}
                </div>
              ))}
              {sendMutation.isPending && (
                <ZanThinkingIndicator variant="admin" size="sm" />
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
