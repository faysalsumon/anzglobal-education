import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FilterChip } from "@/hooks/useInstitutionFilters";

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
  testId?: string;
}

export function ActiveFilterChips({
  chips,
  onClearAll,
  testId,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid={testId}>
      <span className="text-sm font-semibold text-muted-foreground shrink-0">
        Active filters:
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {chips.map((chip) => (
          <Badge
            key={chip.key}
            variant="secondary"
            className="gap-1 pr-1"
            data-testid={`chip-${chip.key}`}
          >
            {chip.label}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={chip.onRemove}
              data-testid={`button-remove-${chip.key}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 text-xs"
          data-testid="button-clear-all-filters"
        >
          Clear all
        </Button>
      </div>
    </div>
  );
}
