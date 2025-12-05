import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, RefreshCw, Maximize2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onRefresh?: () => void;
  onExpand?: () => void;
  headerDropdown?: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
  };
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
  "data-testid"?: string;
}

export function WidgetCard({
  title,
  subtitle,
  icon,
  actions,
  children,
  isLoading = false,
  isEmpty = false,
  emptyIcon,
  emptyMessage = "No data available",
  emptyAction,
  onRefresh,
  onExpand,
  headerDropdown,
  className,
  contentClassName,
  noPadding = false,
  "data-testid": testId,
}: WidgetCardProps) {
  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden border-border/50 shadow-sm",
        className
      )}
      data-testid={testId}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <div className="flex-shrink-0 text-muted-foreground">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium truncate flex items-center gap-2">
              {title}
              {headerDropdown && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-normal text-muted-foreground">
                      {headerDropdown.options.find(o => o.value === headerDropdown.value)?.label || headerDropdown.label}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {headerDropdown.options.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => headerDropdown.onChange(option.value)}
                        className={cn(
                          "text-sm",
                          headerDropdown.value === option.value && "bg-accent"
                        )}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {actions}
          {(onRefresh || onExpand) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRefresh && (
                  <DropdownMenuItem onClick={onRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </DropdownMenuItem>
                )}
                {onExpand && (
                  <DropdownMenuItem onClick={onExpand}>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Expand
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn(
        "flex-1 overflow-auto",
        noPadding ? "p-0" : "p-4",
        contentClassName
      )}>
        {isLoading ? (
          <WidgetSkeleton />
        ) : isEmpty ? (
          <WidgetEmptyState
            icon={emptyIcon}
            message={emptyMessage}
            action={emptyAction}
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

interface WidgetEmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}

function WidgetEmptyState({ icon, message, action }: WidgetEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {icon && (
        <div className="mb-3 text-muted-foreground/50">
          {icon}
        </div>
      )}
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {action}
    </div>
  );
}

export function WidgetGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "grid gap-4 auto-rows-min",
      "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
      className
    )}>
      {children}
    </div>
  );
}

export function WidgetRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-4 grid-cols-1 lg:grid-cols-2", className)}>
      {children}
    </div>
  );
}
