import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  MessageSquare, 
  Users, 
  Search,
  Plus,
  ArrowLeft,
  Circle,
  Hash
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
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
};

type ViewMode = "conversations" | "new-chat" | "chat";

export function AdminMessagesTab() {
  const { user } = useAuth();
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  const [viewMode, setViewMode] = useState<ViewMode>("conversations");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 10000,
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    enabled: !!selectedConversation,
  });

  // Fetch admin team members for starting new conversations
  const { data: teamMembers = [], isLoading: loadingTeamMembers } = useQuery<AdminTeamMember[]>({
    queryKey: ["/api/admin/messaging/team"],
    enabled: viewMode === "new-chat",
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (otherUserId: string) =>
      apiRequest("POST", "/api/conversations", { otherUserId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(data.id);
      setViewMode("chat");
    },
  });

  // Mark conversation as read
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) =>
      apiRequest("PATCH", `/api/conversations/${conversationId}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "new_message" || lastMessage.type === "message_sent") {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
        if (selectedConversation === lastMessage.conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", selectedConversation, "messages"],
          });
        }
      }
    }
  }, [lastMessage, selectedConversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      const conversation = conversations?.find((c) => c.id === selectedConversation);
      if (conversation && conversation.unreadCount > 0) {
        markAsReadMutation.mutate(selectedConversation);
      }
    }
  }, [selectedConversation]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const conversation = conversations?.find((c) => c.id === selectedConversation);
    if (!conversation) return;

    const otherParticipantId = conversation.otherParticipant?.id;
    if (!otherParticipantId) return;

    sendMessage({
      type: "send_message",
      conversationId: selectedConversation,
      content: messageInput.trim(),
      recipientId: otherParticipantId,
    });

    setMessageInput("");
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setViewMode("chat");
  };

  const handleStartNewChat = (memberId: string) => {
    // Check if conversation already exists
    const existingConversation = conversations?.find(
      (c) => c.otherParticipant?.id === memberId
    );
    if (existingConversation) {
      setSelectedConversation(existingConversation.id);
      setViewMode("chat");
    } else {
      createConversationMutation.mutate(memberId);
    }
  };

  const handleBackToList = () => {
    setViewMode("conversations");
    setSelectedConversation(null);
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "cto":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "ceo":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "branch_manager":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
      case "senior_consultant":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      case "junior_consultant":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const formatRole = (role?: string) => {
    if (!role) return "Team Member";
    return role.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const filteredTeamMembers = teamMembers.filter((member) => {
    const userData = user as any;
    const currentUserId = userData?.claims?.sub || userData?.id;
    if (member.id === currentUserId) return false;
    if (!member.isActive) return false;
    if (!searchQuery) return true;
    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           member.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedConversationData = conversations?.find((c) => c.id === selectedConversation);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-background rounded-lg border">
      {/* Left Panel - Conversations/Team Members List */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {viewMode === "new-chat" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("conversations")}
                  className="h-8 w-8"
                  data-testid="button-back-to-conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-lg font-semibold" data-testid="text-messages-title">
                {viewMode === "new-chat" ? "New Message" : "Team Messages"}
              </h2>
            </div>
            {viewMode !== "new-chat" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("new-chat")}
                className="gap-1"
                data-testid="button-new-message"
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            )}
          </div>
          
          {viewMode === "new-chat" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-members"
              />
            </div>
          )}
          
          {!isConnected && viewMode !== "new-chat" && (
            <div className="flex items-center gap-2 mt-2">
              <Circle className="h-2 w-2 fill-yellow-500 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Connecting...</span>
            </div>
          )}
          {isConnected && viewMode !== "new-chat" && (
            <div className="flex items-center gap-2 mt-2">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              <span className="text-xs text-muted-foreground">Connected</span>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {viewMode === "new-chat" ? (
            // Team Members List
            <div className="p-2">
              {loadingTeamMembers ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Loading team members...</p>
                </div>
              ) : filteredTeamMembers && filteredTeamMembers.length > 0 ? (
                <div className="space-y-1">
                  {filteredTeamMembers.map((member) => (
                    <Card
                      key={member.id}
                      className="p-3 cursor-pointer hover-elevate"
                      onClick={() => handleStartNewChat(member.id)}
                      data-testid={`member-${member.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {member.profileImageUrl && (
                            <AvatarImage src={member.profileImageUrl} alt={member.email} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(member.firstName || undefined, member.lastName || undefined, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {member.firstName || ''} {member.lastName || ''}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getRoleBadgeColor(member.role || undefined)}`}
                            >
                              {formatRole(member.role || undefined)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 p-4">
                  <Users className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {searchQuery ? "No team members found" : "No team members available"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Conversations List
            <div className="p-2">
              {loadingConversations ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Loading conversations...</p>
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <Card
                      key={conversation.id}
                      className={`p-3 cursor-pointer transition-colors hover-elevate ${
                        selectedConversation === conversation.id && viewMode === "chat"
                          ? "bg-accent border-primary/50"
                          : ""
                      }`}
                      onClick={() => handleSelectConversation(conversation.id)}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          {conversation.otherParticipant?.profileImageUrl && (
                            <AvatarImage 
                              src={conversation.otherParticipant.profileImageUrl} 
                              alt={conversation.otherParticipant.email} 
                            />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(
                              conversation.otherParticipant?.firstName,
                              conversation.otherParticipant?.lastName,
                              conversation.otherParticipant?.email
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`truncate ${conversation.unreadCount > 0 ? 'font-bold' : 'font-medium'}`}>
                              {conversation.otherParticipant?.firstName}{" "}
                              {conversation.otherParticipant?.lastName}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs shrink-0">
                                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs mt-1 ${getRoleBadgeColor(conversation.otherParticipant?.role)}`}
                          >
                            {formatRole(conversation.otherParticipant?.role)}
                          </Badge>
                          {conversation.lastMessage && (
                            <p className={`text-sm truncate mt-1.5 ${
                              conversation.unreadCount > 0 
                                ? 'font-semibold text-foreground' 
                                : 'text-muted-foreground'
                            }`}>
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 p-4">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center mb-3">
                    No conversations yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode("new-chat")}
                    className="gap-1"
                    data-testid="button-start-conversation"
                  >
                    <Plus className="h-4 w-4" />
                    Start a conversation
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Future: Channels section placeholder */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="h-4 w-4" />
            <span className="text-xs">Channels coming soon</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div className="flex-1 flex flex-col">
        {viewMode === "chat" && selectedConversationData ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="h-8 w-8 md:hidden"
                  data-testid="button-back-to-list-mobile"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar>
                  {selectedConversationData.otherParticipant?.profileImageUrl && (
                    <AvatarImage 
                      src={selectedConversationData.otherParticipant.profileImageUrl} 
                      alt={selectedConversationData.otherParticipant.email} 
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(
                      selectedConversationData.otherParticipant?.firstName,
                      selectedConversationData.otherParticipant?.lastName,
                      selectedConversationData.otherParticipant?.email
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold" data-testid="text-chat-participant-name">
                    {selectedConversationData.otherParticipant?.firstName}{" "}
                    {selectedConversationData.otherParticipant?.lastName}
                  </p>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getRoleBadgeColor(selectedConversationData.otherParticipant?.role)}`}
                  >
                    {formatRole(selectedConversationData.otherParticipant?.role)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Loading messages...</p>
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const userData = user as any;
                    const isMine = message.senderId === (userData?.claims?.sub || userData?.id);
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        data-testid={`message-${message.id}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isMine
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatDistanceToNow(new Date(message.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground" data-testid="text-no-messages">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  disabled={!isConnected}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !isConnected}
                  size="icon"
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {!isConnected && (
                <p className="text-xs text-muted-foreground mt-2">
                  Connecting to chat server...
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Team Messaging</h3>
              <p className="text-sm text-muted-foreground max-w-sm" data-testid="text-select-conversation">
                Select a conversation or start a new one to communicate with your team members
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("new-chat")}
                className="gap-1 mt-4"
                data-testid="button-new-conversation-cta"
              >
                <Plus className="h-4 w-4" />
                Start a conversation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
