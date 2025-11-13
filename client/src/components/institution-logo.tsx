import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstitutionLogoProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  testId?: string;
}

const sizeClasses = {
  sm: "w-12 h-12 sm:w-14 sm:h-14",   // 48-56px for small cards
  md: "w-14 h-14 sm:w-16 sm:h-16",   // 56-64px for listings
  lg: "w-20 h-20 sm:w-24 sm:h-24",   // 80-96px for headers
  xl: "w-28 h-28 sm:w-32 sm:h-32",   // 112-128px for detail pages
};

const iconSizes = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-14 w-14",
};

export function InstitutionLogo({
  src,
  alt,
  size = "md",
  className,
  testId,
}: InstitutionLogoProps) {
  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        "border border-border bg-background flex-shrink-0",
        className
      )}
      data-testid={testId}
    >
      <AvatarImage
        src={src || ""}
        alt={alt}
        className="object-cover"
      />
      <AvatarFallback className="bg-muted">
        <Building2 className={cn("text-muted-foreground", iconSizes[size])} />
      </AvatarFallback>
    </Avatar>
  );
}
