import { ReactNode } from "react";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  children: ReactNode;
  sensors: any;
  onDragStart: (event: any) => void;
  onDragEnd: (event: any) => void;
  overlay?: ReactNode;
}

export function KanbanBoard({
  children,
  sensors,
  onDragStart,
  onDragEnd,
  overlay,
}: KanbanBoardProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {children}
      <DragOverlay>{overlay}</DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  children: ReactNode;
  itemIds: string[];
  className?: string;
  headerClassName?: string;
  emptyMessage?: string;
  height?: string;
}

export function KanbanColumn({
  id,
  title,
  count,
  children,
  itemIds,
  className,
  headerClassName,
  emptyMessage = "No items",
  height = "h-96",
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-72 sm:w-80",
        isOver && "ring-2 ring-primary ring-offset-2 rounded-lg",
        className
      )}
    >
      <SortableContext id={id} items={itemIds} strategy={verticalListSortingStrategy}>
        <Card>
          <CardHeader className={cn("pb-3", headerClassName)}>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {count}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className={height}>
              <div className="space-y-3 pr-4">
                {count === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {emptyMessage}
                  </p>
                ) : (
                  children
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </SortableContext>
    </div>
  );
}

interface KanbanCardProps {
  id: string;
  children: ReactNode;
  className?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export function KanbanCard({
  id,
  children,
  className,
  isSelected = false,
  onClick,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "hover-elevate cursor-move transition-all",
        isSelected && "ring-2 ring-primary ring-offset-1",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing pt-0.5 flex-shrink-0"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface KanbanCardOverlayProps {
  children: ReactNode;
  className?: string;
}

export function KanbanCardOverlay({ children, className }: KanbanCardOverlayProps) {
  return (
    <Card className={cn("shadow-lg rotate-2", className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="cursor-grabbing pt-0.5 flex-shrink-0">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 36,
  strokeWidth = 3,
  showPercentage = true,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const getColor = () => {
    if (progress >= 80) return "text-green-500";
    if (progress >= 40) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={getColor()}
        />
      </svg>
      {showPercentage && (
        <span className="absolute text-[10px] font-medium">{progress}%</span>
      )}
    </div>
  );
}

interface ViewToggleProps {
  viewMode: "list" | "kanban";
  onViewModeChange: (mode: "list" | "kanban") => void;
  listIcon?: ReactNode;
  kanbanIcon?: ReactNode;
}

export function ViewToggle({
  viewMode,
  onViewModeChange,
  listIcon,
  kanbanIcon,
}: ViewToggleProps) {
  const { List, LayoutGrid } = require("lucide-react");
  const { Button } = require("@/components/ui/button");

  return (
    <div className="flex items-center border rounded-lg p-1">
      <Button
        variant={viewMode === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("list")}
        data-testid="button-view-list"
      >
        {listIcon || <List className="h-4 w-4" />}
      </Button>
      <Button
        variant={viewMode === "kanban" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("kanban")}
        data-testid="button-view-kanban"
      >
        {kanbanIcon || <LayoutGrid className="h-4 w-4" />}
      </Button>
    </div>
  );
}
