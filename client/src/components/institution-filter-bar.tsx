import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, X, Search, GraduationCap, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filterMetadata: {
    disciplines: string[];
    scholarshipRange: { min: number; max: number };
  } | undefined;
  filters: {
    disciplines: string[];
    scholarshipMin?: number;
    scholarshipMax?: number;
  };
  toggleMultiSelect: (key: 'disciplines' | 'countries' | 'providerTypes' | 'deliveryModes' | 'intakePeriods' | 'facilities' | 'tags', value: string) => void;
  setRange: (key: 'scholarship' | 'tuition', min: number | undefined, max: number | undefined) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function InstitutionFilterBar({
  filterMetadata,
  filters,
  toggleMultiSelect,
  setRange,
  clearFilters,
  hasActiveFilters,
}: FilterBarProps) {
  const [disciplineSearch, setDisciplineSearch] = useState("");
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [scholarshipOpen, setScholarshipOpen] = useState(false);
  
  const [localScholarshipRange, setLocalScholarshipRange] = useState<[number, number]>([
    filterMetadata?.scholarshipRange.min ?? 0,
    filterMetadata?.scholarshipRange.max ?? 100
  ]);

  useEffect(() => {
    if (filterMetadata) {
      setLocalScholarshipRange([
        filters.scholarshipMin ?? filterMetadata.scholarshipRange.min,
        filters.scholarshipMax ?? filterMetadata.scholarshipRange.max
      ]);
    }
  }, [filters.scholarshipMin, filters.scholarshipMax, filterMetadata]);

  const filteredDisciplines = filterMetadata?.disciplines.filter(d =>
    d.toLowerCase().includes(disciplineSearch.toLowerCase())
  ) ?? [];

  const hasScholarshipFilter = filters.scholarshipMin !== undefined || filters.scholarshipMax !== undefined;

  const handleScholarshipApply = () => {
    setRange('scholarship', localScholarshipRange[0], localScholarshipRange[1]);
    setScholarshipOpen(false);
  };

  const handleScholarshipClear = () => {
    if (filterMetadata) {
      setLocalScholarshipRange([filterMetadata.scholarshipRange.min, filterMetadata.scholarshipRange.max]);
    }
    setRange('scholarship', undefined, undefined);
    setScholarshipOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      {filterMetadata && filterMetadata.disciplines.length > 0 && (
        <Popover open={disciplineOpen} onOpenChange={setDisciplineOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 border-dashed",
                filters.disciplines.length > 0 && "border-primary bg-primary/5"
              )}
              data-testid="filter-disciplines-trigger"
            >
              <GraduationCap className="h-4 w-4" />
              Disciplines
              {filters.disciplines.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-medium">
                  {filters.disciplines.length}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search disciplines..."
                  value={disciplineSearch}
                  onChange={(e) => setDisciplineSearch(e.target.value)}
                  className="pl-8"
                  data-testid="filter-disciplines-search"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredDisciplines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No disciplines found</p>
              ) : (
                <div className="space-y-1">
                  {filteredDisciplines.map((discipline) => (
                    <label
                      key={discipline}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate"
                    >
                      <Checkbox
                        checked={filters.disciplines.includes(discipline)}
                        onCheckedChange={() => toggleMultiSelect('disciplines', discipline)}
                        data-testid={`checkbox-discipline-${discipline.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                      <span className="text-sm">{discipline}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {filters.disciplines.length > 0 && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    filters.disciplines.forEach(d => toggleMultiSelect('disciplines', d));
                  }}
                  data-testid="button-clear-disciplines"
                >
                  Clear selection
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      {filterMetadata && filterMetadata.scholarshipRange.max > filterMetadata.scholarshipRange.min && (
        <Popover open={scholarshipOpen} onOpenChange={setScholarshipOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 border-dashed",
                hasScholarshipFilter && "border-primary bg-primary/5"
              )}
              data-testid="filter-scholarship-trigger"
            >
              <Percent className="h-4 w-4" />
              Scholarship
              {hasScholarshipFilter && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-medium">
                  {filters.scholarshipMin ?? filterMetadata.scholarshipRange.min}-{filters.scholarshipMax ?? filterMetadata.scholarshipRange.max}%
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Range</span>
                  <span className="font-medium">{localScholarshipRange[0]}% - {localScholarshipRange[1]}%</span>
                </div>
                <Slider
                  min={filterMetadata.scholarshipRange.min}
                  max={filterMetadata.scholarshipRange.max}
                  step={1}
                  value={localScholarshipRange}
                  onValueChange={(value) => setLocalScholarshipRange(value as [number, number])}
                  className="py-2"
                  data-testid="filter-scholarship-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{filterMetadata.scholarshipRange.min}%</span>
                  <span>{filterMetadata.scholarshipRange.max}%</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleScholarshipClear}
                  data-testid="button-scholarship-clear"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleScholarshipApply}
                  data-testid="button-scholarship-apply"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={clearFilters}
          data-testid="button-clear-all-filters"
        >
          <X className="h-3.5 w-3.5" />
          Clear all
        </Button>
      )}

      {filters.disciplines.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-2">
          {filters.disciplines.slice(0, 3).map((discipline) => (
            <Badge
              key={discipline}
              variant="secondary"
              className="gap-1 pl-2 pr-1 cursor-pointer"
              onClick={() => toggleMultiSelect('disciplines', discipline)}
              data-testid={`badge-discipline-${discipline.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {discipline}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {filters.disciplines.length > 3 && (
            <Badge variant="outline" className="text-muted-foreground">
              +{filters.disciplines.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
