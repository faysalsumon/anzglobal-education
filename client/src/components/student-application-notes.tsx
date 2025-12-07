import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Send, Loader2, RefreshCw } from "lucide-react";

interface ApplicationNote {
  id: string;
  content: string;
  authorRole: string;
  isReadByStudent: boolean;
  isReadByConsultant: boolean;
  createdAt: string;
  authorId: string;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorProfilePicture: string | null;
}

interface StudentApplicationNotesProps {
  applicationId: string;
  studentName: string;
}

export function StudentApplicationNotes({ applicationId, studentName }: StudentApplicationNotesProps) {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");

  const { data: notes = [], isLoading, refetch } = useQuery<ApplicationNote[]>({
    queryKey: [`/api/admin/applications/${applicationId}/notes`],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/admin/applications/${applicationId}/notes`, { content });
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: `Your message has been sent to ${studentName}.`,
      });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/admin/applications/${applicationId}/notes`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send message",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const unreadFromStudent = notes.filter(n => !n.isReadByConsultant && n.authorRole === 'student').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Messages with Student</h3>
          {unreadFromStudent > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
              {unreadFromStudent} new
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} data-testid="button-refresh-messages">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No messages yet</p>
          <p className="text-xs">Send a message to start the conversation</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-3 border rounded-lg p-3 bg-muted/30">
          <div className="space-y-3">
            {notes.slice().reverse().map((note) => {
              const isStudent = note.authorRole === 'student';
              const authorInitials = `${note.authorFirstName?.charAt(0) || ''}${note.authorLastName?.charAt(0) || ''}`.toUpperCase();
              
              return (
                <div 
                  key={note.id} 
                  className={`flex gap-2 ${!isStudent ? 'flex-row-reverse' : ''}`}
                  data-testid={`message-${note.id}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={note.authorProfilePicture || undefined} />
                    <AvatarFallback className="text-xs bg-muted">
                      {authorInitials || (isStudent ? 'ST' : 'CN')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] ${!isStudent ? 'items-end' : ''}`}>
                    <div 
                      className={`rounded-lg px-3 py-2 ${
                        isStudent 
                          ? 'bg-muted text-foreground' 
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${!isStudent ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] text-muted-foreground">
                        {note.authorFirstName} {note.authorLastName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                      </span>
                      {isStudent && !note.isReadByStudent && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px]">unread</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder={`Message ${studentName}...`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] resize-none"
          data-testid="input-student-message"
        />
        <Button 
          onClick={handleSend}
          disabled={!newMessage.trim() || sendMessageMutation.isPending}
          className="self-end"
          data-testid="button-send-student-message"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
