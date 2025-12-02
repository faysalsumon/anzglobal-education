import { useState, useMemo, useCallback } from "react";
import { PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from "@dnd-kit/core";

export interface UseKanbanOptions<T, S extends string> {
  items: T[];
  getItemId: (item: T) => string;
  getItemStatus: (item: T) => S;
  statuses: S[];
  onStatusChange?: (itemId: string, newStatus: S, item: T) => void;
}

export interface UseKanbanReturn<T, S extends string> {
  sensors: ReturnType<typeof useSensors>;
  activeId: string | null;
  activeItem: T | null;
  itemsByStatus: Record<S, T[]>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  getItemsForStatus: (status: S) => T[];
}

export function useKanban<T, S extends string>({
  items,
  getItemId,
  getItemStatus,
  statuses,
  onStatusChange,
}: UseKanbanOptions<T, S>): UseKanbanReturn<T, S> {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return items.find((item) => getItemId(item) === activeId) || null;
  }, [activeId, items, getItemId]);

  const itemsByStatus = useMemo(() => {
    const result = {} as Record<S, T[]>;
    statuses.forEach((status) => {
      result[status] = [];
    });
    items.forEach((item) => {
      const status = getItemStatus(item);
      if (result[status]) {
        result[status].push(item);
      }
    });
    return result;
  }, [items, getItemStatus, statuses]);

  const getItemsForStatus = useCallback(
    (status: S): T[] => {
      return itemsByStatus[status] || [];
    },
    [itemsByStatus]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || !onStatusChange) return;

      const itemId = active.id as string;
      let newStatus: S | undefined;

      if (statuses.includes(over.id as S)) {
        newStatus = over.id as S;
      } else if (over.data.current?.sortable) {
        newStatus = over.data.current.sortable.containerId as S;
      }

      if (!newStatus) return;

      const item = items.find((i) => getItemId(i) === itemId);
      if (item && getItemStatus(item) !== newStatus) {
        onStatusChange(itemId, newStatus, item);
      }
    },
    [items, getItemId, getItemStatus, statuses, onStatusChange]
  );

  return {
    sensors,
    activeId,
    activeItem,
    itemsByStatus,
    handleDragStart,
    handleDragEnd,
    getItemsForStatus,
  };
}
