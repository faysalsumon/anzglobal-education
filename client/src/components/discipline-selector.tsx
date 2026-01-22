import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { X, BookOpen, Check, ChevronDown, Loader2 } from "lucide-react";

interface Discipline {
  name: string;
  count: number;
}

interface DisciplineSelectorProps {
  value: string[];
  onChange: (disciplines: string[]) => void;
  maxDisciplines?: number;
}

export function DisciplineSelector({
  value,
  onChange,
  maxDisciplines = 10,
}: DisciplineSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: disciplines, isLoading } = useQuery<Discipline[]>({
    queryKey: ["/api/disciplines/all"],
    enabled: open,
  });

  const availableDisciplines = disciplines || [];
  const selectedSet = new Set(value);

  const handleSelect = (disciplineName: string) => {
    if (selectedSet.has(disciplineName)) {
      onChange(value.filter(d => d !== disciplineName));
    } else if (value.length < maxDisciplines) {
      onChange([...value, disciplineName]);
    }
  };

  const handleRemove = (disciplineName: string) => {
    onChange(value.filter(d => d !== disciplineName));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[32px]" data-testid="container-selected-disciplines">
        {value.length === 0 && (
          <span className="text-sm text-muted-foreground" data-testid="text-no-disciplines">
            No disciplines selected
          </span>
        )}
        {value.map((discipline) => (
          <Badge
            key={discipline}
            variant="secondary"
            className="flex items-center gap-1"
            data-testid={`badge-discipline-${discipline.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
          >
            <BookOpen className="h-3 w-3" />
            <span className="max-w-[200px] truncate">{discipline}</span>
            <X 
              className="h-3 w-3 cursor-pointer ml-1" 
              onClick={() => handleRemove(discipline)}
              aria-label={`Remove ${discipline}`}
              data-testid={`button-remove-discipline-${discipline.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
            />
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            data-testid="button-add-disciplines"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {value.length > 0 
                ? `${value.length} discipline${value.length > 1 ? 's' : ''} selected`
                : "Select disciplines"
              }
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search disciplines..." data-testid="input-discipline-search" />
            <CommandList className="max-h-64" data-testid="list-disciplines">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  <CommandEmpty data-testid="text-no-disciplines-found">No disciplines found.</CommandEmpty>
                  <CommandGroup>
                    {availableDisciplines.map((discipline) => {
                      const isSelected = selectedSet.has(discipline.name);
                      const isDisabled = !isSelected && value.length >= maxDisciplines;
                      return (
                        <CommandItem
                          key={discipline.name}
                          value={discipline.name}
                          onSelect={() => !isDisabled && handleSelect(discipline.name)}
                          className={`flex items-center gap-2 cursor-pointer ${isDisabled ? 'opacity-50' : ''}`}
                          data-testid={`option-discipline-${discipline.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="flex-1">{discipline.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length >= maxDisciplines && (
        <p className="text-xs text-muted-foreground" data-testid="text-max-disciplines">
          Maximum {maxDisciplines} disciplines allowed
        </p>
      )}
    </div>
  );
}
