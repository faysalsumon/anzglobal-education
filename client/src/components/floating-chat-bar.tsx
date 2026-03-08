import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  MessageCircle,
  Send,
  X,
  Minus,
  Search,
  Users,
  Circle,
  Plus,
  ChevronUp,
  ChevronDown,
  Paperclip,
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  createdAt: Date;
};

type Conversation = {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: Date;
  otherParticipant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    role?: string;
    profileImageUrl?: string;
    availabilityStatus?: string | null;
    customStatusText?: string | null;
  } | null;
  unreadCount: number;
  lastMessage: Message | null;
};

type AdminTeamMember = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  userType: string;
  role: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  availabilityStatus: string | null;
  customStatusText: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  do_not_disturb: 'bg-red-600',
  invisible: 'bg-gray-400',
};

function ChatStatusDot({ status, className = '' }: { status: string | null; className?: string }) {
  const color = STATUS_COLORS[status || 'available'] || STATUS_COLORS.available;
  return <span className={`h-2.5 w-2.5 rounded-full inline-block flex-shrink-0 ${color} ${className}`} />;
}

type ChatWindow = {
  conversationId: string;
  recipientId: string;
  recipientName: string;
  recipientRole?: string;
  recipientImage?: string | null;
  isMinimized: boolean;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  }
  return headers;
}

const MAX_VISIBLE_WINDOWS = 3;

export function FloatingChatBar() {
  const { user } = useAuth();
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatWindows, setChatWindows] = useState<ChatWindow[]>([]);
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});

  const userData = user as any;
  const currentUserId = userData?.claims?.sub || userData?.id;

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 15000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/conversations/unread-count"],
    refetchInterval: 15000,
  });

  const { data: teamMembers = [] } = useQuery<AdminTeamMember[]>({
    queryKey: ["/api/admin/messaging/team"],
    enabled: isPanelOpen,
  });

  const totalUnread = unreadData?.count || 0;

  const createConversationMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      const res = await apiRequest("POST", "/api/conversations", { otherUserId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) =>
      apiRequest("PATCH", `/api/conversations/${conversationId}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
    },
  });

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "new_message" || lastMessage.type === "message_sent") {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
        const convId = lastMessage.conversationId;
        if (convId) {
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", convId, "messages"],
          });
        }
      }
      if (lastMessage.type === "status_update" || lastMessage.type === "status_change") {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/messaging/team"] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
    }
  }, [lastMessage]);

  const openChatWindow = useCallback(
    async (conversation?: Conversation, member?: AdminTeamMember) => {
      if (conversation) {
        const p = conversation.otherParticipant;
        const win: ChatWindow = {
          conversationId: conversation.id,
          recipientId: p?.id || "",
          recipientName: p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.email : "Unknown",
          recipientRole: p?.role,
          recipientImage: p?.profileImageUrl,
          isMinimized: false,
        };
        setChatWindows((prev) => {
          const exists = prev.find((w) => w.conversationId === conversation.id);
          if (exists) {
            return prev.map((w) =>
              w.conversationId === conversation.id ? { ...w, isMinimized: false } : w
            );
          }
          return [...prev, win];
        });
        if (conversation.unreadCount > 0) {
          markAsReadMutation.mutate(conversation.id);
        }
      } else if (member) {
        const existing = conversations?.find((c) => c.otherParticipant?.id === member.id);
        if (existing) {
          openChatWindow(existing);
          return;
        }
        try {
          const data = await createConversationMutation.mutateAsync(member.id);
          const win: ChatWindow = {
            conversationId: data.id,
            recipientId: member.id,
            recipientName: `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email,
            recipientRole: member.role || undefined,
            recipientImage: member.profileImageUrl,
            isMinimized: false,
          };
          setChatWindows((prev) => {
            const exists = prev.find((w) => w.conversationId === data.id);
            if (exists) {
              return prev.map((w) =>
                w.conversationId === data.id ? { ...w, isMinimized: false } : w
              );
            }
            return [...prev, win];
          });
        } catch {
          // mutation error handled by react-query
        }
      }
      setIsPanelOpen(false);
    },
    [conversations, createConversationMutation, markAsReadMutation]
  );

  const closeChatWindow = useCallback((conversationId: string) => {
    setChatWindows((prev) => prev.filter((w) => w.conversationId !== conversationId));
    setMessageInputs((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const toggleMinimize = useCallback((conversationId: string) => {
    setChatWindows((prev) =>
      prev.map((w) =>
        w.conversationId === conversationId ? { ...w, isMinimized: !w.isMinimized } : w
      )
    );
  }, []);

  const handleSendMessage = useCallback(
    (conversationId: string, recipientId: string) => {
      const content = messageInputs[conversationId]?.trim();
      if (!content) return;
      sendMessage({
        type: "send_message",
        conversationId,
        content,
        recipientId,
      });
      setMessageInputs((prev) => ({ ...prev, [conversationId]: "" }));
    },
    [messageInputs, sendMessage]
  );

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return "??";
  };

  const formatRole = (role?: string | null) => {
    if (!role) return "Team Member";
    return role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const filteredConversations = conversations
    ?.filter((c) => {
      if (!searchQuery) return true;
      const name = `${c.otherParticipant?.firstName || ""} ${c.otherParticipant?.lastName || ""}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    })
    ?.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  const filteredTeamMembers = teamMembers.filter((m) => {
    if (m.id === currentUserId) return false;
    if (!m.isActive) return false;
    if (!searchQuery) return true;
    const name = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const existingConversationMemberIds = new Set(conversations?.map((c) => c.otherParticipant?.id) || []);
  const newTeamMembers = filteredTeamMembers.filter((m) => !existingConversationMemberIds.has(m.id));

  const visibleWindows = chatWindows.slice(-MAX_VISIBLE_WINDOWS);
  const hiddenWindows = chatWindows.slice(0, Math.max(0, chatWindows.length - MAX_VISIBLE_WINDOWS));

  return (
    <div className="fixed bottom-0 right-0 z-50 flex items-end gap-2" data-testid="floating-chat-bar">
      {visibleWindows.map((win, idx) => (
        <MiniChatWindow
          key={win.conversationId}
          chatWindow={win}
          currentUserId={currentUserId}
          user={userData}
          messageInput={messageInputs[win.conversationId] || ""}
          onMessageInputChange={(val) =>
            setMessageInputs((prev) => ({ ...prev, [win.conversationId]: val }))
          }
          onSend={() => handleSendMessage(win.conversationId, win.recipientId)}
          onClose={() => closeChatWindow(win.conversationId)}
          onToggleMinimize={() => toggleMinimize(win.conversationId)}
          getInitials={getInitials}
          formatRole={formatRole}
          lastMessage={lastMessage}
        />
      ))}

      <div className="flex flex-col items-end" data-testid="chat-bar-container">
        {isPanelOpen && (
          <div
            className="w-80 bg-card border border-border shadow-lg rounded-t-lg mb-0 overflow-hidden"
            data-testid="team-panel"
          >
            <div className="p-3 border-b flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm" data-testid="text-panel-title">
                  Team Members
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPanelOpen(false)}
                data-testid="button-close-panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-team"
                />
              </div>
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="p-2 space-y-1">
                {filteredConversations && filteredConversations.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
                      Conversations
                    </p>
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                        onClick={() => openChatWindow(conv)}
                        data-testid={`panel-conversation-${conv.id}`}
                      >
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            {conv.otherParticipant?.profileImageUrl && (
                              <AvatarImage src={conv.otherParticipant.profileImageUrl} />
                            )}
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(
                                conv.otherParticipant?.firstName,
                                conv.otherParticipant?.lastName,
                                conv.otherParticipant?.email
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${STATUS_COLORS[conv.otherParticipant?.availabilityStatus || 'available'] || STATUS_COLORS.available}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold" : "font-medium"}`}
                            >
                              {conv.otherParticipant?.firstName} {conv.otherParticipant?.lastName}
                            </span>
                            {conv.unreadCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-xs shrink-0"
                                data-testid={`badge-unread-${conv.id}`}
                              >
                                {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {newTeamMembers.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground px-2 py-1 font-medium mt-2">
                      Start New Chat
                    </p>
                    {newTeamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                        onClick={() => openChatWindow(undefined, member)}
                        data-testid={`panel-member-${member.id}`}
                      >
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            {member.profileImageUrl && <AvatarImage src={member.profileImageUrl} />}
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(member.firstName, member.lastName, member.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${STATUS_COLORS[member.availabilityStatus || 'available'] || STATUS_COLORS.available}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">
                            {member.firstName} {member.lastName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-xs">
                              {formatRole(member.role)}
                            </Badge>
                            {member.customStatusText && (
                              <span className="text-xs text-muted-foreground truncate">{member.customStatusText}</span>
                            )}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </>
                )}

                {(!filteredConversations || filteredConversations.length === 0) &&
                  newTeamMembers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "No results found" : "No team members available"}
                      </p>
                    </div>
                  )}
              </div>
            </ScrollArea>
          </div>
        )}

        <div
          className="bg-card border-t border-l border-border rounded-tl-lg flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
          onClick={() => setIsPanelOpen((v) => !v)}
          data-testid="chat-bar-toggle"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold" data-testid="text-team-chat-label">
              Chat
            </span>
            <Circle
              className={`h-2 w-2 ${isConnected ? "fill-green-500 text-green-500" : "fill-yellow-500 text-yellow-500"}`}
              data-testid="status-indicator"
            />
          </div>

          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs" data-testid="badge-total-unread">
              {totalUnread > 99 ? "99+" : totalUnread}
            </Badge>
          )}

          {hiddenWindows.map((win) => (
            <Avatar
              key={win.conversationId}
              className="h-6 w-6 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setChatWindows((prev) => {
                  const without = prev.filter((w) => w.conversationId !== win.conversationId);
                  return [...without, { ...win, isMinimized: false }];
                });
              }}
              data-testid={`bubble-avatar-${win.conversationId}`}
            >
              {win.recipientImage && <AvatarImage src={win.recipientImage} />}
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(win.recipientName.split(" ")[0], win.recipientName.split(" ")[1])}
              </AvatarFallback>
            </Avatar>
          ))}

          {isPanelOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return ImageIcon;
  if (fileType === 'application/pdf') return FileText;
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet;
  if (fileType.includes('word') || fileType.includes('document')) return FileText;
  return File;
}

function isImageType(fileType: string | null): boolean {
  return !!fileType && fileType.startsWith('image/');
}

function FileMessageContent({ msg, isMine }: { msg: Message; isMine: boolean }) {
  if (!msg.fileUrl) return null;

  if (isImageType(msg.fileType)) {
    return (
      <div className="mt-1">
        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-file-${msg.id}`}>
          <img
            src={msg.fileUrl}
            alt={msg.fileName || 'Image'}
            className="max-w-full max-h-48 rounded-md object-cover cursor-pointer"
            loading="lazy"
            data-testid={`img-file-${msg.id}`}
          />
        </a>
        {msg.fileName && (
          <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {msg.fileName} {msg.fileSize ? `(${formatFileSize(msg.fileSize)})` : ''}
          </p>
        )}
      </div>
    );
  }

  const IconComponent = getFileIcon(msg.fileType);
  return (
    <a
      href={msg.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mt-1 p-2 rounded-md border ${
        isMine ? 'border-primary-foreground/20 hover:bg-primary-foreground/10' : 'border-border hover:bg-muted/80'
      } transition-colors`}
      data-testid={`link-file-${msg.id}`}
    >
      <IconComponent className={`h-8 w-8 shrink-0 ${isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isMine ? 'text-primary-foreground' : ''}`}>
          {msg.fileName || 'File'}
        </p>
        <p className={`text-xs ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {msg.fileSize ? formatFileSize(msg.fileSize) : ''}
        </p>
      </div>
      <Download className={`h-4 w-4 shrink-0 ${isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`} />
    </a>
  );
}

function MiniChatWindow({
  chatWindow,
  currentUserId,
  user,
  messageInput,
  onMessageInputChange,
  onSend,
  onClose,
  onToggleMinimize,
  getInitials,
  formatRole,
  lastMessage: wsLastMessage,
}: {
  chatWindow: ChatWindow;
  currentUserId: string;
  user: any;
  messageInput: string;
  onMessageInputChange: (val: string) => void;
  onSend: () => void;
  onClose: () => void;
  onToggleMinimize: () => void;
  getInitials: (f?: string | null, l?: string | null, e?: string) => string;
  formatRole: (r?: string | null) => string;
  lastMessage: any;
}) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/conversations", chatWindow.conversationId, "messages"],
    enabled: !chatWindow.isMinimized,
    refetchInterval: 10000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) =>
      apiRequest("PATCH", `/api/conversations/${conversationId}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
    },
  });

  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
  ];

  const handleFileUpload = useCallback(async (file: globalThis.File) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Maximum file size is 10 MB.", variant: "destructive" });
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Supported: images, PDF, DOC, XLS, TXT, CSV.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiRequest("POST", `/api/conversations/${chatWindow.conversationId}/upload`, formData);
      const newMsg = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", chatWindow.conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "File sent", description: file.name });
    } catch (err: any) {
      console.error("File upload failed:", err);
      toast({ title: "Upload failed", description: err?.message || "Could not send the file. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [chatWindow.conversationId, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  useEffect(() => {
    if (!chatWindow.isMinimized) {
      markAsReadMutation.mutate(chatWindow.conversationId);
    }
  }, [chatWindow.isMinimized, chatWindow.conversationId]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (
      wsLastMessage &&
      (wsLastMessage.type === "new_message" || wsLastMessage.type === "message_sent") &&
      wsLastMessage.conversationId === chatWindow.conversationId
    ) {
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", chatWindow.conversationId, "messages"],
      });
      if (!chatWindow.isMinimized) {
        markAsReadMutation.mutate(chatWindow.conversationId);
      }
    }
  }, [wsLastMessage, chatWindow.conversationId, chatWindow.isMinimized]);

  useEffect(() => {
    if (!chatWindow.isMinimized) {
      inputRef.current?.focus();
    }
  }, [chatWindow.isMinimized]);

  return (
    <div
      className={`w-80 bg-card border border-border shadow-lg rounded-t-lg overflow-hidden flex flex-col ${
        chatWindow.isMinimized ? "" : "h-[400px]"
      }`}
      data-testid={`chat-window-${chatWindow.conversationId}`}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer select-none"
        onClick={onToggleMinimize}
        data-testid={`chat-window-header-${chatWindow.conversationId}`}
      >
        <Avatar className="h-7 w-7 shrink-0">
          {chatWindow.recipientImage && <AvatarImage src={chatWindow.recipientImage} />}
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(
              chatWindow.recipientName.split(" ")[0],
              chatWindow.recipientName.split(" ")[1]
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" data-testid={`text-chat-name-${chatWindow.conversationId}`}>
            {chatWindow.recipientName}
          </p>
          <Badge variant="secondary" className="text-xs">
            {formatRole(chatWindow.recipientRole)}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMinimize();
          }}
          data-testid={`button-minimize-${chatWindow.conversationId}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          data-testid={`button-close-${chatWindow.conversationId}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!chatWindow.isMinimized && (
        <>
          <div
            ref={dropZoneRef}
            className={`flex-1 relative ${isDragging ? '' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-md m-1" data-testid="drop-zone-overlay">
                <div className="flex flex-col items-center gap-1">
                  <Paperclip className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium text-primary">Drop file here</p>
                </div>
              </div>
            )}
            <ScrollArea className="h-full p-3">
              <div className="space-y-3">
                {messages && messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMine = msg.senderId === currentUserId;
                    const senderName = isMine
                      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "You"
                      : chatWindow.recipientName;
                    const senderInitials = isMine
                      ? getInitials(user?.firstName, user?.lastName, user?.email)
                      : getInitials(
                          chatWindow.recipientName.split(" ")[0],
                          chatWindow.recipientName.split(" ")[1]
                        );
                    const senderImage = isMine ? user?.profileImageUrl : chatWindow.recipientImage;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <Avatar className="h-6 w-6 shrink-0">
                          {senderImage && <AvatarImage src={senderImage} />}
                          <AvatarFallback
                            className={`text-xs ${isMine ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}
                          >
                            {senderInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`flex flex-col max-w-[75%] ${isMine ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`flex items-center gap-1 mb-0.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                          >
                            <span className="text-xs font-medium">{senderName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg px-3 py-1.5 ${
                              isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            {!msg.fileUrl && (
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            )}
                            {msg.fileUrl && (
                              <FileMessageContent msg={msg} isMine={isMine} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">No messages yet. Say hello!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          <div className="p-2 border-t flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              data-testid={`input-file-${chatWindow.conversationId}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid={`button-attach-${chatWindow.conversationId}`}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => onMessageInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Type a message..."
              className="flex-1"
              disabled={isUploading}
              data-testid={`input-message-${chatWindow.conversationId}`}
            />
            <Button
              size="icon"
              onClick={onSend}
              disabled={!messageInput.trim() || isUploading}
              data-testid={`button-send-${chatWindow.conversationId}`}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
