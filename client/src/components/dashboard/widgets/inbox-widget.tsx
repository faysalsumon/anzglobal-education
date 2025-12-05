import { useQuery } from "@tanstack/react-query";
import { WidgetCard } from "../widget-card";
import { Mail, ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  from: {
    name: string;
    email?: string;
  };
  subject: string;
  preview?: string;
  receivedAt: string;
  isRead?: boolean;
}

interface InboxWidgetProps {
  messages?: Message[];
  onViewAll?: () => void;
  onMessageClick?: (message: Message) => void;
  className?: string;
}

export function InboxWidget({
  messages: propMessages,
  onViewAll,
  onMessageClick,
  className,
}: InboxWidgetProps) {
  const [filter, setFilter] = useState("inbox");
  
  const messages = propMessages || [];

  const filterOptions = [
    { value: "inbox", label: "Inbox" },
    { value: "unread", label: "Unread" },
    { value: "starred", label: "Starred" },
  ];

  return (
    <WidgetCard
      title="Unread Mails"
      icon={<Mail className="h-4 w-4" />}
      isEmpty={messages.length === 0}
      emptyIcon={<Mail className="h-10 w-10" />}
      emptyMessage="No unread messages"
      headerDropdown={{
        label: "Filter",
        options: filterOptions,
        value: filter,
        onChange: setFilter,
      }}
      actions={
        onViewAll && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )
      }
      className={className}
      data-testid="inbox-widget"
    >
      <div className="space-y-1">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onClick={() => onMessageClick?.(message)}
          />
        ))}
      </div>
    </WidgetCard>
  );
}

function MessageItem({
  message,
  onClick,
}: {
  message: Message;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex-shrink-0 mt-0.5">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${!message.isRead ? "font-semibold" : "font-medium"}`}>
            {message.from.name}
          </p>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: false })}
          </span>
        </div>
        <p className="text-sm text-foreground truncate">{message.subject}</p>
        {message.preview && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {message.preview}
          </p>
        )}
      </div>
    </button>
  );
}
