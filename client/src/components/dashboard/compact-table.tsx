import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface CompactTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  density?: "compact" | "normal" | "comfortable";
  stickyHeader?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function CompactTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyIcon,
  emptyMessage = "No data found",
  emptyAction,
  pagination,
  density = "compact",
  stickyHeader = false,
  className,
  "data-testid": testId,
}: CompactTableProps<T>) {
  const densityClasses = {
    compact: "text-xs",
    normal: "text-sm",
    comfortable: "text-base",
  };

  const cellPadding = {
    compact: "px-2 py-1.5",
    normal: "px-3 py-2",
    comfortable: "px-4 py-3",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        {emptyIcon || <Search className="h-10 w-10 text-muted-foreground/30 mb-2" />}
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        {emptyAction && <div className="mt-3">{emptyAction}</div>}
      </div>
    );
  }

  const totalPages = pagination && pagination.pageSize > 0 && pagination.total > 0
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;
  const startItem = pagination && pagination.total > 0
    ? (pagination.page - 1) * pagination.pageSize + 1
    : data.length > 0 ? 1 : 0;
  const endItem = pagination && pagination.total > 0
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : data.length;

  return (
    <div className={cn("w-full", className)} data-testid={testId}>
      <div className="overflow-auto">
        <Table className={densityClasses[density]}>
          <TableHeader className={stickyHeader ? "sticky top-0 bg-background z-10" : ""}>
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    cellPadding[density],
                    "font-medium text-muted-foreground whitespace-nowrap",
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow
                key={keyExtractor(item)}
                className={cn(
                  "border-b border-border/30",
                  onRowClick && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => onRowClick?.(item)}
                data-testid={`table-row-${keyExtractor(item)}`}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(cellPadding[density], "whitespace-nowrap", column.className)}
                  >
                    {column.render
                      ? column.render(item, index)
                      : (item[column.key] as React.ReactNode) ?? "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-2 border-t border-border/30 text-xs text-muted-foreground">
          <span>
            {startItem}-{endItem} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StageBadgeProps {
  stage: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const stageColors: Record<string, string> = {
  assessment: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "documents-verification": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "offer-letter": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "gs-clearance": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  coe: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "visa-lodgment": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "application-won": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "application-lost": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  "not-started": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  qualified: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  unqualified: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function StageBadge({ stage, className }: StageBadgeProps) {
  const normalizedStage = stage.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  const colorClass = stageColors[normalizedStage] || stageColors["pending"];
  
  const displayText = stage
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        colorClass,
        className
      )}
    >
      {displayText}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <StageBadge stage={priority} />;
}

export function StatusBadge({ status }: { status: string }) {
  return <StageBadge stage={status} />;
}
