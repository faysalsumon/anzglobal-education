/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import zanAvatarImage from "@assets/generated_images/friendly_education_consultant_avatar.webp";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  MessageSquare,
  Search,
  Plus,
  ArrowLeft,
  Hash,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Smile,
  Image as ImageIcon,
  FileText,
  File,
  User as UserIcon,
  Download,
  CheckCheck,
  Mic,
  MicOff,
  Laptop,
  X,
  UserPlus,
  UserMinus,
  Settings2,
  MapPin,
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
import { getCsrfToken } from "@/hooks/useCsrf";
import { FileImage, FileSpreadsheet } from "lucide-react";

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

const OFFLINE_COLOR = 'bg-gray-300 dark:bg-gray-600';

function getPresenceColor(userId: string | undefined, onlineUserIds: Set<string>, availabilityStatus?: string | null): string {
  if (!userId || !onlineUserIds.has(userId)) return OFFLINE_COLOR;
  return STATUS_COLORS[availabilityStatus || 'available'] ?? STATUS_COLORS.available;
}

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
  role?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  sources?: string | null;
  sender?: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    availabilityStatus?: string;
  };
};

function ChatFileMessage({ fileUrl, fileName, isMine }: { fileUrl: string; fileName: string | null; isMine: boolean }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const ext = (fileName || "").split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);

  useEffect(() => {
    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);
    setBlobUrl(null);

    apiRequest("GET", fileUrl)
      .then(res => res.blob())
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl]);

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName || "file";
      a.click();
    }
  };

  const overlayClass = isMine ? "bg-white/10 border-white/20" : "bg-muted border-border";

  if (loading) {
    return (
      <div className={`mt-2 p-2 rounded border flex items-center gap-2 ${overlayClass}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
        <span className="text-xs opacity-70 truncate">{fileName || "Loading..."}</span>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={`mt-2 p-2 rounded border flex items-center gap-2 ${overlayClass}`}>
        <File className="h-4 w-4 shrink-0 opacity-50" />
        <span className="text-xs opacity-50 truncate">{fileName || "File unavailable"}</span>
      </div>
    );
  }

  if (isImage) {
    return (
      <button onClick={handleDownload} className="block mt-2 rounded-lg overflow-hidden">
        <img src={blobUrl} alt={fileName || "image"} className="max-w-[200px] max-h-48 rounded-lg object-cover" />
      </button>
    );
  }

  return (
    <div className={`mt-2 p-2 rounded border flex items-center gap-2 ${overlayClass}`}>
      <File className="h-4 w-4 shrink-0" />
      <span className="truncate flex-1 text-xs">{fileName}</span>
      <button onClick={handleDownload} className="shrink-0 opacity-70 hover:opacity-100">
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}

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
  memberRole?: string;
  createdById?: string | null;
};

type ChannelMember = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  availabilityStatus: string;
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

export function AdminMessagesTab({ inSheet: _inSheet = false }: AdminMessagesTabProps = {}) {
  const { user, adminRole, isCTO, isBranchManager } = useAuth();
  const { isConnected: _isConnected, lastMessage, sendMessage } = useWebSocket();
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
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMemberPanelOpen, setIsMemberPanelOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const zanImagePreviewsRef = useRef<Map<string, string>>(new Map());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  const { data: allTeamMembers = [] } = useQuery<Pick<AdminTeamMember, 'id' | 'firstName' | 'lastName' | 'email' | 'profileImageUrl' | 'availabilityStatus' | 'customStatusText'>[]>({
    queryKey: ["/api/admin/team-status"],
    refetchInterval: 30000,
  });

  // Seed online set from server on mount; WS events keep it live thereafter
  const { data: onlineUsersData } = useQuery<string[]>({
    queryKey: ["/api/admin/online-users"],
    staleTime: 0,
  });
  useEffect(() => {
    if (onlineUsersData) {
      setOnlineUserIds(new Set(onlineUsersData));
    }
  }, [onlineUsersData]);

  const canCreateChannel = isCTO || isBranchManager || adminRole === 'ceo';

  const teamStatusMap = useMemo(() => {
    const m = new Map<string, { availabilityStatus: string; customStatusText?: string | null }>();
    for (const tm of allTeamMembers) {
      m.set(tm.id, { availabilityStatus: tm.availabilityStatus, customStatusText: tm.customStatusText });
    }
    return m;
  }, [allTeamMembers]);

  const activeChannelId = activeView?.type === 'channel' ? activeView.id : null;
  const activeChannel = channels.find(c => c.id === activeChannelId);
  const activeChannelMemberRole = activeChannel?.memberRole;
  const canManageMembers = canCreateChannel || activeChannelMemberRole === 'admin';

  const { data: channelMembersData = [] } = useQuery<ChannelMember[]>({
    queryKey: ['/api/channels', activeChannelId, 'members'],
    enabled: !!activeChannelId && isMemberPanelOpen,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (targetUserId: string) =>
      apiRequest('POST', `/api/channels/${activeChannelId}/members`, { userId: targetUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels', activeChannelId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
    },
    onError: () => toast({ title: 'Failed to add member', variant: 'destructive' }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (targetUserId: string) =>
      apiRequest('DELETE', `/api/channels/${activeChannelId}/members/${targetUserId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels', activeChannelId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
    },
    onError: () => toast({ title: 'Failed to remove member', variant: 'destructive' }),
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: activeView?.type === "dm" 
      ? ["/api/conversations", activeView.id, "messages"]
      : activeView?.type === "channel"
      ? ["/api/channels", activeView.id, "messages"]
      : ["/api/admin-chat/conversations", activeView?.id, "messages"],
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
      const res = await apiRequest("GET", "/api/admin-chat/conversations/current");
      return res.json();
    },
    onSuccess: (data) => {
      setActiveView({ type: "zan", id: data.id });
    }
  });

  const sendZanMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string, content: string }) => {
      setIsTyping(true);
      return apiRequest("POST", `/api/admin-chat/conversations/${id}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-chat/conversations", activeView?.id, "messages"] });
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    }
  });

  const uploadZanDocumentMutation = useMutation({
    mutationFn: async ({ file, conversationId }: { file: File; conversationId: string }) => {
      setIsUploading(true);
      const csrfToken = await getCsrfToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);
      const res = await fetch("/api/admin-chat/upload-document", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (_data, { conversationId }) => {
      // Save image blob URL before revoking — keyed by server-assigned message ID
      const msgId = _data?.userMessage?.id;
      if (msgId && pendingFilePreview && pendingFile?.type.startsWith("image/")) {
        zanImagePreviewsRef.current.set(String(msgId), pendingFilePreview);
        // Don't revoke the URL yet — we're using it as the inline preview
        setPendingFile(null);
        setPendingFilePreview(null);
      } else {
        clearPendingFile();
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin-chat/conversations", conversationId, "messages"] });
      setMessageInput("");
      setIsUploading(false);
    },
    onError: (err: any) => {
      toast({ title: "Document upload failed", description: err.message, variant: "destructive" });
      setIsUploading(false);
    },
  });

  const handleVoiceInput = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-AU";
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript ?? "";
        setMessageInput((prev) => (prev ? prev + " " : "") + transcript);
        setIsRecording(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      return;
    }

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      toast({ title: "Voice input not supported", description: "Your browser does not support audio recording. Please use Chrome, Safari 14.1+, or Edge.", variant: "destructive" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const candidateTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"];
      const mimeType = candidateTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
      const ext = mimeType?.includes("mp4") || mimeType?.includes("mpeg") ? "mp4" : mimeType?.includes("ogg") ? "ogg" : "webm";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: mimeType ?? "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, `recording.${ext}`);
        try {
          const res = await fetch("/api/admin-chat/transcribe", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          if (!res.ok) throw new Error("Transcription failed");
          const { transcript } = await res.json();
          if (transcript) {
            setMessageInput((prev) => (prev ? prev + " " : "") + transcript);
            setTimeout(() => textareaRef.current?.focus(), 50);
          }
        } catch {
          toast({ title: "Transcription failed", description: "Could not transcribe audio. Please try again.", variant: "destructive" });
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone access denied", description: "Please allow microphone access to use voice input.", variant: "destructive" });
    }
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("PATCH", `/api/conversations/${id}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      const res = await apiRequest("POST", "/api/conversations", { otherUserId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveView({ type: "dm", id: data.id });
      setSearchQuery("");
      setIsSearchOpen(false);
    },
    onError: () => {
      toast({ title: "Could not open conversation", variant: "destructive" });
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

  // Filtered sidebar lists based on search query
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(ch => ch.name.toLowerCase().includes(q));
  }, [channels, searchQuery]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      const other = conv.otherParticipant;
      if (!other) return false;
      return (
        (other.firstName || '').toLowerCase().includes(q) ||
        (other.lastName || '').toLowerCase().includes(q) ||
        (other.email || '').toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery]);

  // Team members visible in search that don't have an existing conversation yet
  const searchedMembers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const existingIds = new Set(conversations.map(c => c.otherParticipant?.id).filter(Boolean));
    return allTeamMembers.filter(m => {
      if (m.id === currentUserId) return false;
      if (existingIds.has(m.id)) return false;
      const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
      const email = (m.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [searchQuery, allTeamMembers, conversations, currentUserId]);

  // @mention filtered results
  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return allTeamMembers
      .filter(m => {
        if (m.id === currentUserId) return false;
        const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
        const email = (m.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, 6);
  }, [mentionQuery, allTeamMembers, currentUserId]);

  const handleMentionSelect = useCallback((member: Pick<AdminTeamMember, 'id' | 'firstName' | 'lastName' | 'email' | 'profileImageUrl' | 'availabilityStatus' | 'customStatusText'>) => {
    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
    const before = messageInput.slice(0, mentionAnchor);
    const after = messageInput.slice(mentionAnchor + 1 + (mentionQuery?.length || 0));
    setMessageInput(`${before}@${fullName} ${after}`);
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [messageInput, mentionAnchor, mentionQuery]);

  const handleMessageInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    const cursor = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt);
        setMentionAnchor(atIndex);
        return;
      }
    }
    setMentionQuery(null);
  }, []);

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
      } else if (lastMessage.type === "user_online" && lastMessage.userId) {
        setOnlineUserIds(prev => {
          const next = new Set(prev);
          next.add(lastMessage.userId);
          return next;
        });
      } else if (lastMessage.type === "user_offline" && lastMessage.userId) {
        setOnlineUserIds(prev => {
          const next = new Set(prev);
          next.delete(lastMessage.userId);
          return next;
        });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        uploadZanDocumentMutation.mutate({ file: pendingFile, conversationId: activeView.id });
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

        await apiRequest("POST", uploadUrl, formData);

        clearPendingFile();
        setMessageInput("");
        if (activeView.type === "dm") {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeView.id, "messages"] });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["/api/channels", activeView.id, "messages"] });
          queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
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
    
    const isZan = activeView?.type === "zan";

    const groupedMessages: { [key: string]: Message[] } = {};
    messages.forEach(msg => {
      const dateKey = format(parseISO(msg.createdAt), "yyyy-MM-dd");
      if (!groupedMessages[dateKey]) groupedMessages[dateKey] = [];
      groupedMessages[dateKey].push(msg);
    });

    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
        {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
          <div key={dateKey} className="space-y-4">
            <div className="flex justify-center">
              <span className="text-xs font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded">
                {isToday(parseISO(dateKey)) ? "Today" : format(parseISO(dateKey), "EEE, d MMM").toUpperCase()}
              </span>
            </div>
            {msgs.map((msg, idx) => {
              const isMine = isZan ? msg.role === "user" : msg.senderId === currentUserId;
              const prevMsg = msgs[idx - 1];
              const isSameSenderAsPrev = isZan
                ? prevMsg?.role === msg.role
                : prevMsg && prevMsg.senderId === msg.senderId;

              // Parse attachment metadata from sources JSON (ZAN messages only)
              let zanAttachment: { name: string; type: string; size: number } | null = null;
              if (isZan && msg.sources) {
                try {
                  const parsed = JSON.parse(msg.sources);
                  if (parsed?.attachment) zanAttachment = parsed.attachment;
                } catch { /* ignore */ }
              }

              return (
                <div key={msg.id} className={`flex gap-3 min-w-0 ${isMine ? "flex-row-reverse" : "flex-row"} ${isSameSenderAsPrev ? "mt-[-12px]" : ""}`}>
                  {!isMine && !isSameSenderAsPrev && (
                    <Avatar className={`h-8 w-8 shrink-0 ${isZan ? "border-2 border-purple-200" : ""}`}>
                      {isZan ? (
                        <>
                          <AvatarImage src={zanAvatarImage} />
                          <AvatarFallback className="bg-purple-600 text-white text-xs">Z</AvatarFallback>
                        </>
                      ) : msg.sender?.profileImageUrl ? (
                        <AvatarImage src={msg.sender.profileImageUrl} />
                      ) : (
                        <AvatarFallback>{getInitials(msg.sender?.firstName, msg.sender?.lastName)}</AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  {!isMine && isSameSenderAsPrev && <div className="w-8 shrink-0" />}
                  
                  <div className={`flex flex-col max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                    {!isSameSenderAsPrev && !isMine && !isZan && (
                      <span className="text-xs font-bold mb-1 ml-1">{msg.sender?.firstName} {msg.sender?.lastName}</span>
                    )}

                    {/* Attachment card for ZAN document uploads */}
                    {zanAttachment && (() => {
                      const cachedImg = zanImagePreviewsRef.current.get(String(msg.id));
                      if (cachedImg) {
                        return (
                          <div className="mb-1">
                            <img
                              src={cachedImg}
                              alt={zanAttachment.name}
                              className="max-w-[220px] max-h-[200px] rounded-xl object-cover border border-primary/20"
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5 ml-0.5 truncate max-w-[220px]">{zanAttachment.name}</p>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-xl px-2.5 py-1.5 text-xs mb-1 w-fit max-w-full">
                          {zanAttachment.type.startsWith("image/") ? (
                            <FileImage className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : zanAttachment.type === "application/pdf" || zanAttachment.name.endsWith(".pdf") ? (
                            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                          <span className="truncate max-w-[160px] text-foreground font-medium">{zanAttachment.name}</span>
                          <span className="text-muted-foreground shrink-0">{(zanAttachment.size / 1024).toFixed(0)} KB</span>
                        </div>
                      );
                    })()}

                    {/* Skip the bubble for bare "Document uploaded:" placeholder messages */}
                    {(!zanAttachment || !msg.content?.startsWith("[Document uploaded:")) && (
                      <div className={`group relative p-3 rounded-2xl text-sm ${
                        isMine ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"
                      }`}>
                        {msg.fileUrl && msg.content?.startsWith("Shared a file:") ? null : msg.content}
                        {msg.fileUrl && (
                          <ChatFileMessage fileUrl={msg.fileUrl} fileName={msg.fileName ?? null} isMine={isMine} />
                        )}
                        <div className={`text-[10px] mt-1 opacity-70 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          {format(parseISO(msg.createdAt), "h:mm a")}
                          {isMine && activeView?.type === "dm" && (
                            msg.isRead ? <CheckCheck className="h-3 w-3 text-white" /> : <CheckCheck className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    )}
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
    <div className="flex h-full bg-background overflow-hidden">
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
          <div className="p-2 pb-16 lg:pb-2 space-y-4">
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
                {canCreateChannel && (
                  <Plus className="h-3 w-3" onClick={(e) => { e.stopPropagation(); setIsNewChannelDialogOpen(true); }} />
                )}
              </button>
              {isChannelsExpanded && (
                <div className="mt-1 space-y-1">
                  {filteredChannels.map(ch => (
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

                  {filteredConversations.map(conv => {
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
                            getPresenceColor(other?.id, onlineUserIds, (other?.id ? teamStatusMap.get(other.id)?.availabilityStatus : null) ?? other?.availabilityStatus)
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

            {/* Directory results — team members with no existing conversation */}
            {searchedMembers.length > 0 && (
              <div>
                <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Team Members
                </div>
                <div className="mt-1 space-y-1">
                  {searchedMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => startConversationMutation.mutate(member.id)}
                      disabled={startConversationMutation.isPending}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors hover:bg-muted"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          {member.profileImageUrl ? (
                            <AvatarImage src={member.profileImageUrl} />
                          ) : (
                            <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                          )}
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${getPresenceColor(member.id, onlineUserIds, member.availabilityStatus)}`} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium truncate">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate capitalize">
                          {member.customStatusText || (member.availabilityStatus || 'available').replace(/_/g, ' ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area — full width on mobile when chat is open; hidden on mobile when showing sidebar */}
      <div className={`${activeView ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-background pb-16 lg:pb-0`}>
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
                      {(() => {
                        const dmOther = conversations.find(c => c.id === activeView.id)?.otherParticipant;
                        const liveStatus = (dmOther?.id ? teamStatusMap.get(dmOther.id)?.availabilityStatus : null) ?? dmOther?.availabilityStatus;
                        return <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${getPresenceColor(dmOther?.id, onlineUserIds, liveStatus)}`} />;
                      })()}
                    </div>
                    <div>
                      {(() => {
                        const dmOther = conversations.find(c => c.id === activeView.id)?.otherParticipant;
                        const liveEntry = dmOther?.id ? teamStatusMap.get(dmOther.id) : null;
                        const statusLabel = liveEntry?.customStatusText || dmOther?.customStatusText || (liveEntry?.availabilityStatus || dmOther?.availabilityStatus || 'Available').replace(/_/g, ' ');
                        return (
                          <>
                            <h3 className="font-bold text-sm leading-tight">{dmOther?.firstName} {dmOther?.lastName}</h3>
                            <p className="text-[11px] text-muted-foreground font-medium capitalize">{statusLabel}</p>
                          </>
                        );
                      })()}
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
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground"><Search className="h-5 w-5" /></Button>
                {activeView?.type === 'channel' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    data-testid="button-manage-members"
                    onClick={() => { setIsMemberPanelOpen(true); setMemberSearchQuery(""); }}
                  >
                    <Settings2 className="h-5 w-5" />
                  </Button>
                )}
                {activeView?.type !== 'channel' && (
                  <Button type="button" variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-5 w-5" /></Button>
                )}
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
                
                <div className="flex-1 flex flex-col min-w-0 relative">
                  {/* @mention dropdown */}
                  {mentionQuery !== null && mentionResults.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1 w-64 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
                      {mentionResults.map(member => (
                        <button
                          key={member.id}
                          onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(member); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover-elevate text-left"
                        >
                          <Avatar className="h-6 w-6 shrink-0">
                            {member.profileImageUrl ? (
                              <AvatarImage src={member.profileImageUrl} />
                            ) : (
                              <AvatarFallback className="text-[10px]">{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate leading-tight">{member.firstName} {member.lastName}</p>
                            <p className="text-[11px] text-muted-foreground truncate capitalize">{member.customStatusText || (member.availabilityStatus || 'available').replace(/_/g, ' ')}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
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
                    ref={textareaRef}
                    placeholder={isRecording ? "Listening…" : "Type a message..."}
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setMentionQuery(null);
                        return;
                      }
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
                      disabled={isUploading || uploadZanDocumentMutation.isPending}
                    >
                      {(isUploading || uploadZanDocumentMutation.isPending) ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 rounded-lg transition-colors ${isRecording ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}
                      onClick={handleVoiceInput}
                      title={isRecording ? "Stop recording" : "Voice input"}
                    >
                      {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                  )}
                </div>
              </div>
              {isRecording ? (
                <p className="text-[11px] text-red-500 mt-2 text-center font-medium flex items-center justify-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Listening… tap the mic to stop
                </p>
              ) : (
                <p className="hidden md:block text-[10px] text-muted-foreground mt-2 text-center font-medium opacity-60">
                  Press Enter to send, Shift + Enter for new line
                </p>
              )}
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
               {canCreateChannel && (
                 <Button type="button" variant="outline" onClick={() => setIsNewChannelDialogOpen(true)} className="gap-2">
                   <Hash className="h-4 w-4" />
                   New Channel
                 </Button>
               )}
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

      {/* Manage Members Dialog */}
      <Dialog open={isMemberPanelOpen} onOpenChange={setIsMemberPanelOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[80vh] flex flex-col" data-testid="dialog-manage-members">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Members — #{activeChannel?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Current Members */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {channelMembersData.length} Member{channelMembersData.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1">
                {channelMembersData.map(member => {
                  const isMe = member.userId === currentUserId;
                  const adminCount = channelMembersData.filter(m => m.role === 'admin').length;
                  const cantRemove = isMe || (member.role === 'admin' && adminCount <= 1);
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 py-2 px-2 rounded-lg hover-elevate"
                      data-testid={`row-member-${member.userId}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {member.profileImageUrl ? <AvatarImage src={member.profileImageUrl} /> : null}
                        <AvatarFallback className="text-xs">{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {member.role}
                      </Badge>
                      {canManageMembers && !cantRemove && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground shrink-0"
                          data-testid={`button-remove-member-${member.userId}`}
                          onClick={() => removeMemberMutation.mutate(member.userId)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Member Section */}
            {canManageMembers && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add Member</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search team members…"
                      value={memberSearchQuery}
                      onChange={e => setMemberSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {allTeamMembers
                      .filter(tm => {
                        const alreadyIn = channelMembersData.some(m => m.userId === tm.id);
                        if (alreadyIn) return false;
                        if (!memberSearchQuery.trim()) return true;
                        const q = memberSearchQuery.toLowerCase();
                        return (
                          tm.firstName?.toLowerCase().includes(q) ||
                          tm.lastName?.toLowerCase().includes(q) ||
                          tm.email?.toLowerCase().includes(q)
                        );
                      })
                      .map(tm => (
                        <div
                          key={tm.id}
                          className="flex items-center gap-3 py-2 px-2 rounded-lg hover-elevate"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            {tm.profileImageUrl ? <AvatarImage src={tm.profileImageUrl} /> : null}
                            <AvatarFallback className="text-xs">{getInitials(tm.firstName, tm.lastName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tm.firstName} {tm.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{tm.email}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground shrink-0"
                            data-testid={`button-add-member-${tm.id}`}
                            onClick={() => addMemberMutation.mutate(tm.id)}
                            disabled={addMemberMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    {allTeamMembers.filter(tm => !channelMembersData.some(m => m.userId === tm.id)).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">All team members are already in this channel.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
