import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Send, MessageSquare } from "lucide-react";
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
  } | null;
  unreadCount: number;
  lastMessage: Message | null;
};

export default function ChatPage() {
  const { user } = useAuth();
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    enabled: !!selectedConversation,
  });

  // Mark conversation as read
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) =>
      apiRequest("PATCH", `/api/conversations/${conversationId}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "new_message" || lastMessage.type === "message_sent") {
        // Invalidate queries to refetch latest data
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
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

    // Send via WebSocket
    sendMessage({
      type: "send_message",
      conversationId: selectedConversation,
      content: messageInput.trim(),
      recipientId: otherParticipantId,
    });

    setMessageInput("");
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Please log in to use chat.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold" data-testid="text-chat-title">Messages</h2>
          {!isConnected && (
            <p className="text-xs text-muted-foreground mt-1">Connecting...</p>
          )}
        </div>

        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Loading conversations...</p>
            </div>
          ) : conversations && conversations.length > 0 ? (
            <div className="p-2 space-y-1">
              {conversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  className={`p-3 cursor-pointer transition-colors hover-elevate ${
                    selectedConversation === conversation.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedConversation(conversation.id)}
                  data-testid={`conversation-${conversation.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(
                          conversation.otherParticipant?.firstName,
                          conversation.otherParticipant?.lastName,
                          conversation.otherParticipant?.email
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate" data-testid={`conversation-name-${conversation.id}`}>
                          {conversation.otherParticipant?.firstName}{" "}
                          {conversation.otherParticipant?.lastName}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.otherParticipant?.userType}
                      </p>
                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center" data-testid="text-no-conversations">
                No conversations yet
              </p>
              {user.userType === 'student' && (
                <p className="text-xs text-muted-foreground text-center mt-2 max-w-xs">
                  Universities and administrators will contact you here after you submit applications.
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(
                      conversations?.find((c) => c.id === selectedConversation)
                        ?.otherParticipant?.firstName,
                      conversations?.find((c) => c.id === selectedConversation)
                        ?.otherParticipant?.lastName,
                      conversations?.find((c) => c.id === selectedConversation)
                        ?.otherParticipant?.email
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold" data-testid="text-chat-participant-name">
                    {conversations?.find((c) => c.id === selectedConversation)
                      ?.otherParticipant?.firstName}{" "}
                    {conversations?.find((c) => c.id === selectedConversation)
                      ?.otherParticipant?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conversations?.find((c) => c.id === selectedConversation)
                      ?.otherParticipant?.userType}
                  </p>
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
                    const isMine = message.senderId === (userData.claims?.sub || userData.id);
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
                          <p className="text-sm whitespace-pre-wrap" data-testid={`message-content-${message.id}`}>
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
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Select a conversation</p>
              <p className="text-sm text-muted-foreground" data-testid="text-select-conversation">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
