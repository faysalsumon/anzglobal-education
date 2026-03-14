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
  Hash,
  Send,
  X,
  Minus,
  Paperclip,
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Image as ImageIcon,
  Loader2,
  Users,
  ArrowLeft,
  UserPlus,
  UserMinus,
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

type ChannelMessage = {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  createdAt: Date;
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    availabilityStatus: string | null;
  } | null;
};

type ChannelMember = {
  id: number;
  userId: string;
  role: string;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
  availabilityStatus: string | null;
};

type ChannelWindow = {
  channelId: string;
  channelName: string;
  isMinimized: boolean;
};

function MiniChannelWindow({
  channelId,
  channelName,
  isMinimized,
  currentUserId,
  messageInput,
  onMessageInputChange,
  onClose,
  onToggleMinimize,
}: {
  channelId: string;
  channelName: string;
  isMinimized: boolean;
  currentUserId: string;
  messageInput: string;
  onMessageInputChange: (val: string) => void;
  onClose: () => void;
  onToggleMinimize: () => void;
}) {
  const { isCTO, isBranchManager, adminRole } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMembers, setShowMembers] = useState(false);

  const { data: messages = [], isLoading } = useQuery<ChannelMessage[]>({
    queryKey: ["/api/channels", channelId, "messages"],
    refetchInterval: 5000,
  });

  const { data: members = [], isLoading: isLoadingMembers } = useQuery<ChannelMember[]>({
    queryKey: ["/api/channels", channelId, "members"],
  });

  const isSystemManager = isCTO || isBranchManager || adminRole === "ceo";
  const myMembership = members.find((m) => m.userId === currentUserId);
  const canManageMembers = isSystemManager || myMembership?.role === "admin";

  const { data: teamMembers = [] } = useQuery<AdminTeamMember[]>({
    queryKey: ["/api/admin/messaging/team"],
    enabled: showMembers && canManageMembers,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/channels/${channelId}/messages`, { content });
    },
    onSuccess: () => {
      onMessageInputChange("");
      queryClient.invalidateQueries({ queryKey: ["/api/channels", channelId, "messages"] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) =>
      apiRequest("POST", `/api/channels/${channelId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", channelId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({ title: "Member added" });
    },
    onError: () => toast({ title: "Failed to add member", variant: "destructive" }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) =>
      apiRequest("DELETE", `/api/channels/${channelId}/members/${userId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", channelId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({ title: "Member removed" });
    },
    onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
  });

  useEffect(() => {
    if (!isMinimized && !showMembers) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized, showMembers]);

  const handleSend = () => {
    const content = messageInput.trim();
    if (!content) return;
    sendMutation.mutate(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return "??";
  };

  const memberUserIds = new Set(members.map((m) => m.userId));
  const nonMembers = teamMembers.filter(
    (tm) => tm.isActive && tm.id !== currentUserId && !memberUserIds.has(tm.id)
  );

  if (isMinimized) {
    return (
      <div
        className="flex items-center gap-2 bg-card border rounded-t-md px-3 py-2 cursor-pointer shadow-md"
        style={{ width: 280 }}
        onClick={onToggleMinimize}
        data-testid={`mini-channel-minimized-${channelId}`}
      >
        <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate flex-1">{channelName}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="no-default-hover-elevate"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          data-testid={`button-close-channel-${channelId}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-card border rounded-t-md shadow-lg overflow-hidden"
      style={{ width: 320, height: 400 }}
      data-testid={`mini-channel-window-${channelId}`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        {showMembers ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="no-default-hover-elevate"
            onClick={() => setShowMembers(false)}
            data-testid={`button-back-messages-${channelId}`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-medium truncate flex-1">
          {showMembers ? "Members" : channelName}
        </span>
        {!showMembers && canManageMembers && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="no-default-hover-elevate"
            onClick={() => setShowMembers(true)}
            data-testid={`button-channel-members-${channelId}`}
          >
            <Users className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="no-default-hover-elevate"
          onClick={onToggleMinimize}
          data-testid={`button-minimize-channel-${channelId}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="no-default-hover-elevate"
          onClick={onClose}
          data-testid={`button-close-channel-${channelId}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showMembers ? (
        <ScrollArea className="flex-1 p-2">
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
                Current Members ({members.length})
              </p>
              {members.map((member) => {
                const cantRemove = member.userId === currentUserId || member.role === "admin";
                return (
                  <div
                    key={member.userId}
                    className="flex items-center gap-2 p-1.5 rounded-md"
                    data-testid={`channel-member-${member.userId}`}
                  >
                    <Avatar className="h-7 w-7">
                      {member.profileImageUrl && <AvatarImage src={member.profileImageUrl} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(member.firstName, member.lastName, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium truncate block">
                        {member.firstName} {member.lastName}
                      </span>
                    </div>
                    {member.role === "admin" && (
                      <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                    )}
                    {canManageMembers && !cantRemove && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="no-default-hover-elevate"
                        onClick={() => removeMemberMutation.mutate(member.userId)}
                        disabled={removeMemberMutation.isPending}
                        data-testid={`button-remove-member-${member.userId}`}
                      >
                        <UserMinus className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {canManageMembers && nonMembers.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground px-2 py-1 font-medium mt-3">
                    Add Members
                  </p>
                  {nonMembers.map((tm) => (
                    <div
                      key={tm.id}
                      className="flex items-center gap-2 p-1.5 rounded-md"
                      data-testid={`channel-add-member-${tm.id}`}
                    >
                      <Avatar className="h-7 w-7">
                        {tm.profileImageUrl && <AvatarImage src={tm.profileImageUrl} />}
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(tm.firstName, tm.lastName, tm.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate block">
                          {tm.firstName} {tm.lastName}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="no-default-hover-elevate"
                        onClick={() => addMemberMutation.mutate(tm.id)}
                        disabled={addMemberMutation.isPending}
                        data-testid={`button-add-member-${tm.id}`}
                      >
                        <UserPlus className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      ) : (
        <>
          <ScrollArea className="flex-1 p-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <Hash className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.senderId === currentUserId;
                  const senderName = msg.sender
                    ? `${msg.sender.firstName || ""} ${msg.sender.lastName || ""}`.trim()
                    : "Unknown";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}
                      data-testid={`channel-msg-${msg.id}`}
                    >
                      {!isOwn && (
                        <span className="text-xs text-muted-foreground ml-1">{senderName}</span>
                      )}
                      <div
                        className={`px-3 py-1.5 rounded-md text-sm max-w-[85%] ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mx-1">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center gap-1 p-2 border-t">
            <Input
              className="flex-1 text-sm"
              placeholder={`Message #${channelName}`}
              value={messageInput}
              onChange={(e) => onMessageInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              data-testid={`input-channel-message-${channelId}`}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleSend}
              disabled={!messageInput.trim() || sendMutation.isPending}
              data-testid={`button-send-channel-${channelId}`}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

const MAX_VISIBLE_WINDOWS = 3;

export function FloatingChatBar() {
  const { user } = useAuth();
  const { lastMessage, sendMessage } = useWebSocket();
  const [chatWindows, setChatWindows] = useState<ChatWindow[]>([]);
  const [channelWindows, setChannelWindows] = useState<ChannelWindow[]>([]);
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});

  const userData = user as any;
  const currentUserId = userData?.claims?.sub || userData?.id;

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 15000,
  });

  const { data: teamMembers = [] } = useQuery<AdminTeamMember[]>({
    queryKey: ["/api/admin/messaging/team"],
  });

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
      if (lastMessage.type === "channel_message") {
        const chId = lastMessage.channelId;
        if (chId) {
          queryClient.invalidateQueries({
            queryKey: ["/api/channels", chId, "messages"],
          });
        } else {
          queryClient.invalidateQueries({
            queryKey: ["/api/channels"],
            predicate: (query) =>
              Array.isArray(query.queryKey) && query.queryKey[2] === "messages",
          });
        }
      }
    }
  }, [lastMessage]);

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

  const closeChannelWindow = useCallback((channelId: string) => {
    setChannelWindows((prev) => prev.filter((w) => w.channelId !== channelId));
    setMessageInputs((prev) => {
      const next = { ...prev };
      delete next[`ch-${channelId}`];
      return next;
    });
  }, []);

  const toggleChannelMinimize = useCallback((channelId: string) => {
    setChannelWindows((prev) =>
      prev.map((w) =>
        w.channelId === channelId ? { ...w, isMinimized: !w.isMinimized } : w
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

  const visibleWindows = chatWindows.slice(-MAX_VISIBLE_WINDOWS);

  useEffect(() => {
    const handleOpenMiniChat = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const win: ChatWindow = {
        conversationId: detail.conversationId,
        recipientId: detail.recipientId,
        recipientName: detail.recipientName,
        recipientRole: detail.recipientRole,
        recipientImage: detail.recipientImage,
        isMinimized: false,
      };
      setChatWindows((prev) => {
        const exists = prev.find((w) => w.conversationId === detail.conversationId);
        if (exists) {
          return prev.map((w) =>
            w.conversationId === detail.conversationId ? { ...w, isMinimized: false } : w
          );
        }
        return [...prev, win];
      });
      markAsReadMutation.mutate(detail.conversationId);
    };

    const handleOpenMiniChatNew = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      try {
        const data = await createConversationMutation.mutateAsync(detail.memberId);
        const win: ChatWindow = {
          conversationId: data.id,
          recipientId: detail.memberId,
          recipientName: detail.memberName,
          recipientRole: detail.memberRole,
          recipientImage: detail.memberImage,
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
        // handled by react-query
      }
    };

    const handleOpenMiniChannel = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.channelId) return;
      const win: ChannelWindow = {
        channelId: detail.channelId,
        channelName: detail.channelName,
        isMinimized: false,
      };
      setChannelWindows((prev) => {
        const exists = prev.find((w) => w.channelId === detail.channelId);
        if (exists) {
          return prev.map((w) =>
            w.channelId === detail.channelId ? { ...w, isMinimized: false } : w
          );
        }
        return [...prev, win];
      });
    };

    window.addEventListener("open-mini-chat", handleOpenMiniChat);
    window.addEventListener("open-mini-chat-new", handleOpenMiniChatNew);
    window.addEventListener("open-mini-channel", handleOpenMiniChannel);
    return () => {
      window.removeEventListener("open-mini-chat", handleOpenMiniChat);
      window.removeEventListener("open-mini-chat-new", handleOpenMiniChatNew);
      window.removeEventListener("open-mini-channel", handleOpenMiniChannel);
    };
  }, [createConversationMutation, markAsReadMutation]);

  return (
    <div className="fixed bottom-10 right-4 z-50 flex items-end gap-2" data-testid="floating-chat-bar">
      {channelWindows.slice(-MAX_VISIBLE_WINDOWS).map((win) => (
        <MiniChannelWindow
          key={`ch-${win.channelId}`}
          channelId={win.channelId}
          channelName={win.channelName}
          isMinimized={win.isMinimized}
          currentUserId={currentUserId}
          messageInput={messageInputs[`ch-${win.channelId}`] || ""}
          onMessageInputChange={(val) =>
            setMessageInputs((prev) => ({ ...prev, [`ch-${win.channelId}`]: val }))
          }
          onClose={() => closeChannelWindow(win.channelId)}
          onToggleMinimize={() => toggleChannelMinimize(win.channelId)}
        />
      ))}
      {visibleWindows.map((win) => (
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
