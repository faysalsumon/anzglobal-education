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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  MessageCircle,
  Hash,
  Search,
  Circle,
  X,
  Plus,
  Sparkles,
} from "lucide-react";
import chatAvatarImage from "@assets/generated_images/friendly_education_consultant_avatar.webp";

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
  lastMessage: { id: string; content: string; createdAt: Date } | null;
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

type Channel = {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdBy: string;
  unreadCount?: number;
  memberCount?: number;
  lastMessageAt?: string | null;
};


const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  do_not_disturb: "bg-red-600",
  invisible: "bg-gray-400",
};

type ActivePanel = "chats" | "channels" | null;

export function AdminBottomBar() {
  const { user, isCTO, isBranchManager, adminRole } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const { toast } = useToast();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChannelDialogOpen, setIsNewChannelDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const userData = user as any;
  const currentUserId = userData?.claims?.sub || userData?.id;
  const canCreateChannel = isCTO || isBranchManager || adminRole === "ceo";

  const createChannelMutation = useMutation({
    mutationFn: async (values: { name: string; description: string; isPrivate: boolean }) =>
      apiRequest("POST", "/api/channels", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      setIsNewChannelDialogOpen(false);
      setNewChannelName("");
      setNewChannelDescription("");
      setNewChannelIsPrivate(false);
      toast({ title: "Success", description: "Channel created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create channel", variant: "destructive" });
    },
  });

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
    enabled: activePanel === "chats",
  });

  const { data: channelsData = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    enabled: activePanel === "channels",
  });

  const totalUnread = unreadData?.count || 0;

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "new_message" || lastMessage.type === "message_sent") {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
      }
      if (lastMessage.type === "status_update" || lastMessage.type === "status_change") {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/messaging/team"] });
      }
      if (lastMessage.type === "channel_message") {
        queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        barRef.current &&
        !barRef.current.contains(e.target as Node)
      ) {
        setActivePanel(null);
      }
    }
    if (activePanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activePanel]);

  useEffect(() => {
    setSearchQuery("");
  }, [activePanel]);

  const togglePanel = useCallback((panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

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

  const openChatWithConversation = useCallback((conversation: Conversation) => {
    window.dispatchEvent(
      new CustomEvent("open-mini-chat", {
        detail: {
          conversationId: conversation.id,
          recipientId: conversation.otherParticipant?.id || "",
          recipientName: conversation.otherParticipant
            ? `${conversation.otherParticipant.firstName || ""} ${conversation.otherParticipant.lastName || ""}`.trim() ||
              conversation.otherParticipant.email
            : "Unknown",
          recipientRole: conversation.otherParticipant?.role,
          recipientImage: conversation.otherParticipant?.profileImageUrl,
        },
      })
    );
    setActivePanel(null);
  }, []);

  const openChatWithMember = useCallback((member: AdminTeamMember) => {
    const existing = conversations?.find((c) => c.otherParticipant?.id === member.id);
    if (existing) {
      openChatWithConversation(existing);
      return;
    }
    window.dispatchEvent(
      new CustomEvent("open-mini-chat-new", {
        detail: {
          memberId: member.id,
          memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email,
          memberRole: member.role,
          memberImage: member.profileImageUrl,
        },
      })
    );
    setActivePanel(null);
  }, [conversations, openChatWithConversation]);

  const openChannelMini = useCallback((channel: Channel) => {
    window.dispatchEvent(
      new CustomEvent("open-mini-channel", {
        detail: { channelId: channel.id, channelName: channel.name },
      })
    );
    setActivePanel(null);
  }, []);

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

  const filteredChannels = channelsData.filter((ch) => {
    if (!searchQuery) return true;
    return ch.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const tabs: { id: ActivePanel; icon: typeof MessageCircle; label: string; badge?: number }[] = [
    { id: "chats", icon: MessageCircle, label: "Chats", badge: totalUnread },
    { id: "channels", icon: Hash, label: "Channels" },
  ];

  return (
    <>
      {activePanel && (
        <div
          ref={panelRef}
          className="fixed bottom-10 left-0 lg:left-[240px] z-[60] w-full lg:w-80 bg-card border border-border shadow-lg rounded-t-lg overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
          data-testid={`bottom-bar-panel-${activePanel}`}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
            <span className="text-sm font-semibold capitalize" data-testid="text-panel-heading">
              {activePanel}
            </span>
            <div className="flex items-center gap-0.5">
              {activePanel === "channels" && canCreateChannel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNewChannelDialogOpen(true)}
                  data-testid="button-new-channel"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setActivePanel(null)}
                data-testid="button-close-bottom-panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  activePanel === "chats"
                    ? "Search conversations..."
                    : "Search channels..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-bottom-bar-search"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[360px]">
            <div className="p-2 space-y-1">
              {activePanel === "chats" && (
                <>
                  <div
                    className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("open-admin-chat-widget"));
                      setActivePanel(null);
                    }}
                    data-testid="bottom-bar-zan-ai"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={chatAvatarImage} alt="Zan" />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          <Sparkles className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">
                        Zan
                      </span>
                      <p className="text-xs text-muted-foreground truncate">
                        AI Assistant
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">AI</Badge>
                  </div>

                  {filteredConversations && filteredConversations.length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
                        Conversations
                      </p>
                      {filteredConversations.map((conv) => (
                        <div
                          key={conv.id}
                          className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                          onClick={() => openChatWithConversation(conv)}
                          data-testid={`bottom-bar-conversation-${conv.id}`}
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
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${STATUS_COLORS[conv.otherParticipant?.availabilityStatus || "available"] || STATUS_COLORS.available}`}
                            />
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
                                  data-testid={`badge-unread-conv-${conv.id}`}
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
                          onClick={() => openChatWithMember(member)}
                          data-testid={`bottom-bar-member-${member.id}`}
                        >
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              {member.profileImageUrl && (
                                <AvatarImage src={member.profileImageUrl} />
                              )}
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(member.firstName, member.lastName, member.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${STATUS_COLORS[member.availabilityStatus || "available"] || STATUS_COLORS.available}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">
                              {member.firstName} {member.lastName}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {formatRole(member.role)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {(!filteredConversations || filteredConversations.length === 0) &&
                    newTeamMembers.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {searchQuery ? "No results found" : "No conversations yet"}
                        </p>
                      </div>
                    )}
                </>
              )}

              {activePanel === "channels" && (
                <>
                  {filteredChannels.length > 0 ? (
                    filteredChannels.map((channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                        onClick={() => openChannelMini(channel)}
                        data-testid={`bottom-bar-channel-${channel.id}`}
                      >
                        <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted shrink-0">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">
                            {channel.name}
                          </span>
                          {channel.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {channel.description}
                            </p>
                          )}
                        </div>
                        {channel.isPrivate && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Private
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Hash className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "No channels found" : "No channels available"}
                      </p>
                    </div>
                  )}
                </>
              )}

            </div>
          </ScrollArea>
        </div>
      )}

      <div
        ref={barRef}
        className="fixed bottom-0 left-0 right-0 z-50 h-10 bg-card border-t border-border hidden md:flex items-center px-2 lg:pl-[240px]"
        data-testid="admin-bottom-bar"
      >
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePanel === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => togglePanel(tab.id)}
                data-testid={`button-bottom-tab-${tab.id}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <Badge
                    variant="destructive"
                    className="text-xs ml-0.5 px-1.5 py-0"
                    data-testid={`badge-bottom-${tab.id}`}
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </Badge>
                ) : null}
                {tab.id === "chats" && (
                  <Circle
                    className={`h-2 w-2 ml-0.5 ${isConnected ? "fill-green-500 text-green-500" : "fill-yellow-500 text-yellow-500"}`}
                    data-testid="status-ws-indicator"
                  />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <Dialog open={isNewChannelDialogOpen} onOpenChange={setIsNewChannelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create a Channel</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newChannelName.trim()) return;
              createChannelMutation.mutate({
                name: newChannelName.trim(),
                description: newChannelDescription.trim(),
                isPrivate: newChannelIsPrivate,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="channel-name"
                  placeholder="e.g. general"
                  className="pl-9"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  data-testid="input-new-channel-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-desc">Description (Optional)</Label>
              <Input
                id="channel-desc"
                placeholder="What's this channel about?"
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
                data-testid="input-new-channel-description"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="channel-private">Private Channel</Label>
                <p className="text-xs text-muted-foreground">
                  Only invited members can see this channel.
                </p>
              </div>
              <Switch
                id="channel-private"
                checked={newChannelIsPrivate}
                onCheckedChange={setNewChannelIsPrivate}
                data-testid="switch-channel-private"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createChannelMutation.isPending || !newChannelName.trim()} data-testid="button-create-channel-submit">
                {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
