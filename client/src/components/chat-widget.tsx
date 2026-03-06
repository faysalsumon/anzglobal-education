import { useState, useRef, useEffect, useMemo } from "react";
import { MessageCircle, X, Send, Minimize2, ExternalLink, Search, UserPlus, Building2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocation } from "wouter";
import chatAvatarImage from "@assets/generated_images/friendly_education_consultant_avatar.webp";

// CTA button icon mapping based on link path
const getCTAIcon = (href: string) => {
  if (href.includes('/courses')) return Search;
  if (href.includes('/register')) return UserPlus;
  if (href.includes('/institutions')) return Building2;
  if (href.includes('/contact')) return Mail;
  return ArrowRight;
};

type Message = {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  sources: Array<{ type: string; id: string; title: string }> | null;
  createdAt: string;
};

type Conversation = {
  id: number;
  userId: number | null;
  sessionId: string | null;
  createdAt: string;
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen((prev) => {
        if (!prev) {
          setIsMinimized(false);
          setUnreadCount(0);
        }
        return true;
      });
    };
    window.addEventListener("open-chat-widget", handleOpenChat);
    return () => window.removeEventListener("open-chat-widget", handleOpenChat);
  }, []);

  // Custom markdown components for CTA buttons
  const markdownComponents: Components = useMemo(() => ({
    a: ({ href, children }) => {
      if (!href) return <span>{children}</span>;
      
      const isInternalLink = href.startsWith('/');
      const Icon = getCTAIcon(href);
      
      if (isInternalLink) {
        return (
          <button
            onClick={() => {
              setLocation(href);
              setIsOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 my-1 text-xs font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            data-testid={`cta-link-${href.replace(/\//g, '-')}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {children}
          </button>
        );
      }
      
      // External link
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary underline hover:text-primary/80"
        >
          {children}
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    },
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="text-sm">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  }), [setLocation]);

  // Create or get conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/conversations", {});
      return response.json();
    },
    onSuccess: (data: Conversation) => {
      setConversationId(data.id);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create conversation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Get messages for conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/chat/conversations", conversationId, "messages"],
    enabled: !!conversationId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/chat/conversations/${conversationId}/messages`);
      return response.json();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error("No conversation ID");
      
      return apiRequest("POST", `/api/chat/conversations/${conversationId}/messages`, {
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat/conversations", conversationId, "messages"] 
      });
      setMessage("");
      scrollToBottom();
    },
    onError: (error: any) => {
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track unread messages when minimized
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        setUnreadCount((prev) => prev + 1);
      }
    } else {
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const toggleOpen = () => {
    const willBeOpen = !isOpen;
    setIsOpen(willBeOpen);
    setIsMinimized(false);
    
    if (willBeOpen) {
      setUnreadCount(0);
      // Create conversation if we don't have one
      if (!conversationId && !createConversationMutation.isPending) {
        createConversationMutation.mutate();
      }
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Floating chat button with human avatar - collapsible design
  if (!isOpen) {
    return (
      <div 
        className="fixed bottom-20 right-3 md:bottom-8 md:right-4 z-40 hidden md:block"
        data-testid="chat-widget-trigger"
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        {/* Combined avatar + button container */}
        <div 
          className={`
            flex items-center gap-2 bg-card border border-border rounded-full shadow-lg 
            transition-all duration-300 ease-in-out overflow-hidden
            ${isCollapsed ? 'p-1' : 'p-1 pr-4'}
          `}
          style={{
            animation: "float 3s ease-in-out infinite",
          }}
        >
          {/* Avatar button */}
          <button
            onClick={toggleOpen}
            className="relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full flex-shrink-0"
            data-testid="button-open-chat"
            aria-label="Open chat assistant"
          >
            <div className="relative transition-transform duration-300 group-hover:scale-105">
              <img
                src={chatAvatarImage}
                alt="Zan - Education Assistant"
                className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-primary/20"
              />
              
              {/* Online indicator */}
              <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
              
              {/* Unread badge */}
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                  data-testid="badge-unread-count"
                >
                  {unreadCount}
                </Badge>
              )}
            </div>
          </button>
          
          {/* Ask Zan text - only visible when expanded */}
          <button
            onClick={toggleOpen}
            className={`
              flex flex-col items-start transition-all duration-300 ease-in-out
              ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
            `}
            data-testid="button-ask-chat"
          >
            <span className="text-xs text-muted-foreground whitespace-nowrap">Need help?</span>
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">Ask Zan</span>
          </button>
        </div>
        
        {/* CSS for floating animation */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
        `}</style>
      </div>
    );
  }

  // Chat window
  return (
    <div className="fixed bottom-36 right-3 md:bottom-8 md:right-4 z-50 flex flex-col bg-card border border-border rounded-xl shadow-2xl w-[calc(100vw-1.5rem)] max-w-[340px] md:max-w-[380px]"
      style={{ 
        height: isMinimized ? "60px" : "min(500px, calc(100vh - 120px))",
      }}
      data-testid="chat-widget"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-xl">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-primary-foreground/20">
            <AvatarImage src={chatAvatarImage} alt="Zan" />
            <AvatarFallback className="bg-primary-foreground text-primary text-xs">Z</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm leading-tight">Zan</h3>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <p className="text-[11px] opacity-90 leading-tight">Your Education Assistant</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMinimize}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-minimize-chat"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleOpen}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-close-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-3">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Avatar className="h-16 w-16 mb-3 border-2 border-primary/20">
                  <AvatarImage src={chatAvatarImage} alt="Zan" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">Z</AvatarFallback>
                </Avatar>
                <h4 className="font-semibold text-sm mb-1">Hi, I'm Zan from ANZ Global Education!</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Ask me about courses, universities, admission requirements, or anything else about studying abroad.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200">
                  <strong>Please note:</strong> I'm continuously learning. We recommend verifying all information (fees, requirements, dates) with the institution or our support team before making decisions.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                    data-testid={`message-${msg.role}-${msg.id}`}
                  >
                    {msg.role === "assistant" && (
                      <Avatar className="h-8 w-8 flex-shrink-0 border border-border">
                        <AvatarImage src={chatAvatarImage} alt="Assistant" />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          AI
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <Avatar className="h-8 w-8 flex-shrink-0 border border-border">
                        {isAuthenticated && user?.profileImageUrl && (
                          <AvatarImage src={user.profileImageUrl} alt={user.firstName || "User"} />
                        )}
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                          {isAuthenticated && user?.firstName ? user.firstName.charAt(0).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex gap-3 justify-start" data-testid="typing-indicator">
                    <Avatar className="h-8 w-8 flex-shrink-0 border border-border">
                      <AvatarImage src={chatAvatarImage} alt="Assistant" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about courses, universities..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sendMessageMutation.isPending}
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!message.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
