import { useState, useEffect, useRef, useMemo } from "react";
import zanAvatarImage from "@assets/generated_images/friendly_education_consultant_avatar.webp";
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
  Hash,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Smile,
  Paperclip,
  Image as ImageIcon,
  FileText,
  File,
  MapPin,
  User as UserIcon,
  Download,
  Check,
  CheckCheck,
  Mic,
  Laptop,
  X,
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface AdminMessagesTabProps {
  inSheet?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  do_not_disturb: 'bg-red-600',
  invisible: 'bg-gray-400',
};

const COMMON_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
  "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣"
];

const insertChannelSchema = z.object({
  name: z.string().min(1, "Channel name is required").max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
});

type Message = {
  id: string;
  conversationId?: string;
  channelId?: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  sender?: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    availabilityStatus?: string;
  };
};

type Conversation = {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: string;
  otherParticipant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    role?: string;
    profileImageUrl?: string;
    availabilityStatus?: string;
    customStatusText?: string;
  } | null;
  unreadCount: number;
  lastMessage: Message | null;
};

type Channel = {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  memberCount: number;
  lastMessage?: Message | null;
  unreadCount: number;
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
  availabilityStatus: string;
  customStatusText: string | null;
};

type ChatView = {
  type: "dm" | "channel" | "zan";
  id: string;
};

export function AdminMessagesTab({ inSheet = false }: AdminMessagesTabProps = {}) {
  const { user } = useAuth();
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<ChatView | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewChannelDialogOpen, setIsNewChannelDialogOpen] = useState(false);
  const [isChannelsExpanded, setIsChannelsExpanded] = useState(true);
  const [isDMsExpanded, setIsDMsExpanded] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const currentUser = user as any;
  const currentUserId = currentUser?.id || currentUser?.claims?.sub;

  // Queries
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 15000,
  });

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    refetchInterval: 15000,
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: activeView?.type === "dm" 
      ? ["/api/conversations", activeView.id, "messages"]
      : activeView?.type === "channel"
      ? ["/api/channels", activeView.id, "messages"]
      : ["/api/chat/conversations", activeView?.id, "messages"],
    enabled: !!activeView,
  });

  // Mutations
  const createChannelMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertChannelSchema>) =>
      apiRequest("POST", "/api/channels", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      setIsNewChannelDialogOpen(false);
      toast({ title: "Success", description: "Channel created successfully" });
    },
  });

  const createZanSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat/conversations", { 
        sessionId: `admin-zan-${currentUserId}` 
      });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveView({ type: "zan", id: data.id });
    }
  });

  const sendZanMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string, content: string }) => {
      setIsTyping(true);
      return apiRequest("POST", `/api/chat/conversations/${id}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations", activeView?.id, "messages"] });
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("PATCH", `/api/conversations/${id}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
    },
  });

  // Form for new channel
  const form = useForm<z.infer<typeof insertChannelSchema>>({
    resolver: zodResolver(insertChannelSchema),
    defaultValues: {
      name: "",
      description: "",
      isPrivate: false,
    },
  });

  // WebSocket handling
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "new_message" || lastMessage.type === "message_sent") {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        if (activeView?.type === "dm" && lastMessage.conversationId === activeView.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeView.id, "messages"] });
        }
      } else if (lastMessage.type === "channel_message") {
        queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
        if (activeView?.type === "channel" && lastMessage.channelId === activeView.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/channels", activeView.id, "messages"] });
        }
      }
    }
  }, [lastMessage, activeView]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Mark read
  useEffect(() => {
    if (activeView?.type === "dm") {
      const conv = conversations.find(c => c.id === activeView.id);
      if (conv && conv.unreadCount > 0) {
        markAsReadMutation.mutate(activeView.id);
      }
    }
  }, [activeView, conversations]);

  const clearPendingFile = () => {
    if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview);
    setPendingFile(null);
    setPendingFilePreview(null);
  };

  const handleFileSelect = (file: File) => {
    clearPendingFile();
    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      setPendingFilePreview(URL.createObjectURL(file));
    }
  };

  const handleSendMessage = async () => {
    if (!activeView) return;
    if (!messageInput.trim() && !pendingFile) return;

    // If there's a file to upload
    if (pendingFile) {
      if (activeView.type === "zan") {
        toast({ title: "Not supported", description: "File sharing is not available with Zan." });
        return;
      }
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        if (messageInput.trim()) formData.append("content", messageInput.trim());

        const uploadUrl = activeView.type === "dm"
          ? `/api/conversations/${activeView.id}/upload`
          : `/api/channels/${activeView.id}/upload`;

        const resp = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.message || "Upload failed");
        }

        clearPendingFile();
        setMessageInput("");
        if (activeView.type === "dm") {
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${activeView.id}/messages`] });
        } else {
          queryClient.invalidateQueries({ queryKey: [`/api/channels/${activeView.id}/messages`] });
        }
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Text-only send
    if (activeView.type === "dm") {
      const conv = conversations.find(c => c.id === activeView.id);
      if (!conv?.otherParticipant?.id) return;
      sendMessage({
        type: "send_message",
        conversationId: activeView.id,
        content: messageInput.trim(),
        recipientId: conv.otherParticipant.id,
      });
    } else if (activeView.type === "channel") {
      sendMessage({
        type: "send_channel_message",
        channelId: activeView.id,
        content: messageInput.trim(),
      });
    } else if (activeView.type === "zan") {
      sendZanMessageMutation.mutate({ id: activeView.id, content: messageInput.trim() });
    }

    setMessageInput("");
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    if (isThisWeek(date)) return format(date, "EEE");
    return format(date, "d MMM");
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${(firstName || "?")[0]}${(lastName || "?")[0]}`.toUpperCase();
  };

  const renderMessageList = () => {
    if (isLoadingMessages) return <div className="flex-1 flex items-center justify-center">Loading...</div>;
    
    const groupedMessages: { [key: string]: Message[] } = {};
    messages.forEach(msg => {
      const dateKey = format(parseISO(msg.createdAt), "yyyy-MM-dd");
      if (!groupedMessages[dateKey]) groupedMessages[dateKey] = [];
      groupedMessages[dateKey].push(msg);
    });

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
          <div key={dateKey} className="space-y-4">
            <div className="flex justify-center">
              <span className="text-xs font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded">
                {isToday(parseISO(dateKey)) ? "Today" : format(parseISO(dateKey), "EEE, d MMM").toUpperCase()}
              </span>
            </div>
            {msgs.map((msg, idx) => {
              const isMine = msg.senderId === currentUserId;
              const prevMsg = msgs[idx - 1];
              const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId;
              
              return (
                <div key={msg.id} className={`flex gap-3 ${isMine ? "flex-row-reverse" : "flex-row"} ${isSameSenderAsPrev ? "mt-[-12px]" : ""}`}>
                  {!isMine && !isSameSenderAsPrev && (
                    <Avatar className="h-8 w-8">
                      {msg.sender?.profileImageUrl ? (
                        <AvatarImage src={msg.sender.profileImageUrl} />
                      ) : (
                        <AvatarFallback>{getInitials(msg.sender?.firstName, msg.sender?.lastName)}</AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  {!isMine && isSameSenderAsPrev && <div className="w-8" />}
                  
                  <div className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                    {!isSameSenderAsPrev && !isMine && (
                      <span className="text-xs font-bold mb-1 ml-1">{msg.sender?.firstName} {msg.sender?.lastName}</span>
                    )}
                    <div className={`group relative p-3 rounded-2xl text-sm ${
                      isMine ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"
                    }`}>
                      {msg.content}
                      {msg.fileUrl && (
                        <div className="mt-2 p-2 rounded bg-background/10 border border-white/20 flex items-center gap-2">
                          <File className="h-4 w-4" />
                          <span className="truncate flex-1">{msg.fileName}</span>
                          <a href={msg.fileUrl} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a>
                        </div>
                      )}
                      <div className={`text-[10px] mt-1 opacity-70 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        {format(parseISO(msg.createdAt), "h:mm a")}
                        {isMine && activeView?.type === "dm" && (
                          msg.isRead ? <CheckCheck className="h-3 w-3 text-white" /> : <CheckCheck className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
             <Avatar className="h-8 w-8 border-2 border-purple-200">
               <AvatarImage src={zanAvatarImage} />
               <AvatarFallback className="bg-purple-600 text-white">Z</AvatarFallback>
             </Avatar>
             <div className="bg-muted p-3 rounded-2xl rounded-tl-none text-sm italic">Zan is typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  return (
    <div className={inSheet ? "flex h-full bg-background overflow-hidden" : "flex h-[calc(100dvh-200px)] md:h-[calc(100vh-140px)] bg-background border rounded-xl overflow-hidden shadow-sm"}>
      {/* Sidebar — full width on mobile when no active chat; hidden on mobile when chat is open */}
      <div className={`${activeView ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r flex-col bg-muted/30`}>
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="text-xl font-bold">Chats</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(!isSearchOpen)}>
            <Search className="h-5 w-5" />
          </Button>
        </div>
        
        {isSearchOpen && (
          <div className="px-4 py-2 border-b">
            <Input 
              placeholder="Search..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {/* Channels */}
            <div>
              <button 
                className="w-full flex items-center justify-between px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                onClick={() => setIsChannelsExpanded(!isChannelsExpanded)}
              >
                <div className="flex items-center gap-1">
                  {isChannelsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Channels
                </div>
                <Plus className="h-3 w-3" onClick={(e) => { e.stopPropagation(); setIsNewChannelDialogOpen(true); }} />
              </button>
              {isChannelsExpanded && (
                <div className="mt-1 space-y-1">
                  {channels.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setActiveView({ type: "channel", id: ch.id })}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted ${
                        activeView?.type === "channel" && activeView.id === ch.id ? "bg-muted text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <Hash className="h-4 w-4" />
                      <span className="truncate flex-1 text-left">{ch.name}</span>
                      {ch.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-4 min-w-4 px-1">{ch.unreadCount}</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Messages */}
            <div>
              <button 
                className="w-full flex items-center justify-between px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                onClick={() => setIsDMsExpanded(!isDMsExpanded)}
              >
                <div className="flex items-center gap-1">
                  {isDMsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Direct Messages
                </div>
              </button>
              {isDMsExpanded && (
                <div className="mt-1 space-y-1">
                  {/* Zan Bot */}
                  <button
                    onClick={() => createZanSessionMutation.mutate()}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all hover:bg-muted group ${
                      activeView?.type === "zan" ? "bg-muted shadow-sm" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-purple-200">
                        <AvatarImage src={zanAvatarImage} />
                        <AvatarFallback className="bg-purple-600 text-white">Z</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold truncate">Zan · ANZ AI</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-medium text-purple-600/80">AI Education Consultant</p>
                    </div>
                  </button>

                  {conversations.map(conv => {
                    const other = conv.otherParticipant;
                    const isActive = activeView?.type === "dm" && activeView.id === conv.id;
                    const isUnread = conv.unreadCount > 0;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveView({ type: "dm", id: conv.id })}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all hover:bg-muted group ${
                          isActive ? "bg-muted shadow-sm" : ""
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            {other?.profileImageUrl ? (
                              <AvatarImage src={other.profileImageUrl} />
                            ) : (
                              <AvatarFallback>{getInitials(other?.firstName, other?.lastName)}</AvatarFallback>
                            )}
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                            STATUS_COLORS[other?.availabilityStatus || 'available']
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex justify-between items-baseline">
                            <span className={`truncate ${isUnread ? "font-bold text-foreground" : "font-medium"}`}>
                              {other?.firstName} {other?.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                              {conv.lastMessageAt ? formatDate(conv.lastMessageAt) : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {conv.lastMessage && conv.lastMessage.senderId === currentUserId && (
                              <span className="text-xs text-muted-foreground font-medium">You:</span>
                            )}
                            <p className={`text-xs truncate ${isUnread ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                              {conv.lastMessage?.content || "No messages yet"}
                            </p>
                          </div>
                        </div>
                        {isUnread && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area — full width on mobile when chat is open; hidden on mobile when showing sidebar */}
      <div className={`${activeView ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-background`}>
        {activeView ? (
          <>
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-3 md:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-2 md:gap-3">
                <Button variant="ghost" size="icon" className="md:hidden -ml-1 shrink-0" onClick={() => setActiveView(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {activeView.type === "dm" ? (
                  <>
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={conversations.find(c => c.id === activeView.id)?.otherParticipant?.profileImageUrl} />
                        <AvatarFallback>{getInitials(conversations.find(c => c.id === activeView.id)?.otherParticipant?.firstName, conversations.find(c => c.id === activeView.id)?.otherParticipant?.lastName)}</AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
                        STATUS_COLORS[conversations.find(c => c.id === activeView.id)?.otherParticipant?.availabilityStatus || 'available']
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">
                        {conversations.find(c => c.id === activeView.id)?.otherParticipant?.firstName} {conversations.find(c => c.id === activeView.id)?.otherParticipant?.lastName}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {conversations.find(c => c.id === activeView.id)?.otherParticipant?.customStatusText || 
                         (conversations.find(c => c.id === activeView.id)?.otherParticipant?.availabilityStatus || "Available").replace(/_/g, " ")}
                      </p>
                    </div>
                  </>
                ) : activeView.type === "channel" ? (
                  <>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Hash className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">#{channels.find(ch => ch.id === activeView.id)?.name}</h3>
                      <p className="text-[11px] text-muted-foreground font-medium">{channels.find(ch => ch.id === activeView.id)?.memberCount} members</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar className="h-9 w-9 border-2 border-purple-200">
                      <AvatarImage src={zanAvatarImage} />
                      <AvatarFallback className="bg-purple-600 text-white">Z</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-sm leading-tight text-purple-600">Zan · ANZ AI</h3>
                      <p className="text-[11px] text-muted-foreground font-medium">AI Education Consultant</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground"><Search className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-5 w-5" /></Button>
              </div>
            </div>

            {/* Messages */}
            {renderMessageList()}

            {/* Composer */}
            <div className="p-4 border-t bg-card/30 backdrop-blur-sm">
              <div className="flex items-end gap-2 bg-background border rounded-xl p-1 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted no-default-hover-elevate">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="grid gap-1">
                      <button className="flex items-center gap-3 w-full p-2 text-sm rounded-md hover:bg-muted transition-colors" onClick={() => imageInputRef.current?.click()}>
                        <ImageIcon className="h-4 w-4 text-blue-500" />
                        <span>Photos</span>
                      </button>
                      <button className="flex items-center gap-3 w-full p-2 text-sm rounded-md hover:bg-muted transition-colors" onClick={() => fileInputRef.current?.click()}>
                        <FileText className="h-4 w-4 text-orange-500" />
                        <span>File</span>
                      </button>
                      <button className="flex items-center gap-3 w-full p-2 text-sm rounded-md hover:bg-muted transition-colors" onClick={() => toast({ title: "Coming soon", description: "Document scanner is in development" })}>
                        <Laptop className="h-4 w-4 text-emerald-500" />
                        <span>Document Scanner</span>
                      </button>
                      <button className="flex items-center gap-3 w-full p-2 text-sm rounded-md hover:bg-muted transition-colors" onClick={() => toast({ title: "Coming soon", description: "Location sharing is in development" })}>
                        <MapPin className="h-4 w-4 text-red-500" />
                        <span>Location</span>
                      </button>
                      <button className="flex items-center gap-3 w-full p-2 text-sm rounded-md hover:bg-muted transition-colors" onClick={() => toast({ title: "Coming soon", description: "Contact sharing is in development" })}>
                        <UserIcon className="h-4 w-4 text-purple-500" />
                        <span>Contact</span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <div className="flex-1 flex flex-col min-w-0">
                  {pendingFile && (
                    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                      {pendingFilePreview ? (
                        <img src={pendingFilePreview} alt="preview" className="h-10 w-10 rounded object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center">
                          <File className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-xs text-foreground truncate max-w-[160px]">{pendingFile.name}</span>
                      <button onClick={clearPendingFile} className="ml-auto text-muted-foreground hover:text-foreground shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <Textarea
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[44px] max-h-32 resize-none border-0 focus-visible:ring-0 px-3 py-3 text-sm bg-transparent"
                  />
                </div>

                <div className="flex items-center gap-1 pr-1 pb-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted no-default-hover-elevate">
                        <Smile className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="end">
                      <div className="grid grid-cols-8 gap-1">
                        {COMMON_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            className="h-7 w-7 flex items-center justify-center hover:bg-muted rounded text-lg"
                            onClick={() => setMessageInput(prev => prev + emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {(messageInput.trim() || pendingFile) ? (
                    <Button 
                      size="icon" 
                      className="h-8 w-8 rounded-lg bg-primary shadow-sm hover:opacity-90 transition-opacity"
                      onClick={handleSendMessage}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground opacity-50 cursor-not-allowed no-default-hover-elevate">
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="hidden md:block text-[10px] text-muted-foreground mt-2 text-center font-medium opacity-60">
                Press Enter to send, Shift + Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
            <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
              <MessageSquare className="h-10 w-10 text-primary/40" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your Team Workspace</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              Select a conversation or channel from the sidebar to start collaborating with your team or talk to Zan, your AI consultant.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
               <Button onClick={() => createZanSessionMutation.mutate()} className="gap-2 bg-purple-600 hover:bg-purple-700">
                 <Avatar className="h-5 w-5 border border-white/20">
                   <AvatarImage src={zanAvatarImage} />
                   <AvatarFallback className="text-[10px]">Z</AvatarFallback>
                 </Avatar>
                 Chat with Zan
               </Button>
               <Button variant="outline" onClick={() => setIsNewChannelDialogOpen(true)} className="gap-2">
                 <Hash className="h-4 w-4" />
                 Browse Channels
               </Button>
            </div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
      />

      {/* New Channel Dialog */}
      <Dialog open={isNewChannelDialogOpen} onOpenChange={setIsNewChannelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create a Channel</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createChannelMutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g. general" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What's this channel about?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Private Channel</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Only invited members can see this channel.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
