import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import chatAvatarImage from "@assets/generated_images/friendly_education_consultant_avatar.webp";

const STUDENT_PHRASES = [
  "Thinking...",
  "Searching courses...",
  "Checking universities...",
  "Looking that up...",
  "Reviewing options...",
  "Gathering information...",
  "Finding the best match...",
  "Reading our database...",
];

const ADMIN_PHRASES = [
  "Thinking...",
  "Researching...",
  "Checking the database...",
  "Analyzing data...",
  "Preparing response...",
  "Working on it...",
  "Reviewing records...",
  "Processing...",
  "Checking details...",
];

interface ZanThinkingIndicatorProps {
  variant?: "student" | "admin";
  size?: "sm" | "md";
}

export function ZanThinkingIndicator({
  variant = "student",
  size = "md",
}: ZanThinkingIndicatorProps) {
  const phrases = variant === "admin" ? ADMIN_PHRASES : STUDENT_PHRASES;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const t = setTimeout(() => {
        setIndex((prev) => (prev + 1) % phrases.length);
        setVisible(true);
      }, 280);
      return () => clearTimeout(t);
    }, 2300);
    return () => clearInterval(interval);
  }, [phrases.length]);

  const avatarSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className="flex items-start gap-2" data-testid="zan-thinking-indicator">
      <Avatar className={`${avatarSize} shrink-0 mt-0.5`}>
        <AvatarImage src={chatAvatarImage} alt="Zan" />
        <AvatarFallback className="text-[10px]">Z</AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2 flex items-center gap-2 min-w-[148px]">
        <span className="flex gap-[3px] shrink-0">
          <span className="w-1 h-1 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1 h-1 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1 h-1 bg-primary/70 rounded-full animate-bounce" />
        </span>
        <span
          className="text-xs text-muted-foreground select-none"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.25s ease",
          }}
        >
          {phrases[index]}
        </span>
      </div>
    </div>
  );
}
