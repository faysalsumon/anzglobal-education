import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { X, Plus, GraduationCap, Search, Loader2, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  level: string;
  subject: string;
  universityId: string;
}

interface FeaturedCourse {
  id: string;
  title: string;
}

interface FeaturedCoursesSelectorProps {
  institutionId: string;
  value: FeaturedCourse[];
  onChange: (courses: FeaturedCourse[]) => void;
  maxCourses?: number;
}

export function FeaturedCoursesSelector({
  institutionId,
  value,
  onChange,
  maxCourses = 10,
}: FeaturedCoursesSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: coursesData, isLoading } = useQuery<{ courses: Course[] }>({
    queryKey: ["/api/courses", { universityId: institutionId, search: searchQuery, limit: 50 }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("universityId", institutionId);
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      params.set("limit", "50");
      const res = await fetch(`/api/courses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
    enabled: open && !!institutionId,
  });

  const availableCourses = coursesData?.courses || [];
  const selectedIds = new Set(value.map(c => c.id));

  const handleSelect = (course: Course) => {
    if (selectedIds.has(course.id)) {
      onChange(value.filter(c => c.id !== course.id));
    } else if (value.length < maxCourses) {
      onChange([...value, { id: course.id, title: course.title }]);
    }
  };

  const handleRemove = (courseId: string) => {
    onChange(value.filter(c => c.id !== courseId));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[40px]" data-testid="container-featured-courses">
        {value.length === 0 && (
          <span className="text-sm text-muted-foreground" data-testid="text-no-courses">
            No featured courses selected
          </span>
        )}
        {value.map((course) => (
          <div key={course.id} className="flex items-center gap-1" data-testid={`badge-course-${course.id}`}>
            <Badge variant="secondary" className="pr-1">
              <GraduationCap className="h-3 w-3 mr-1" />
              {course.title}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => handleRemove(course.id)}
              aria-label={`Remove ${course.title}`}
              data-testid={`button-remove-course-${course.id}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            disabled={!institutionId}
            data-testid="button-add-featured-courses"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search & Add Courses
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search courses by title..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
              data-testid="input-search-courses"
            />
            <CommandList className="max-h-64" data-testid="list-courses">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && availableCourses.length === 0 && (
                <CommandEmpty data-testid="text-no-courses-found">
                  {searchQuery 
                    ? "No courses found matching your search" 
                    : "No published courses available for this institution"}
                </CommandEmpty>
              )}
              {!isLoading && availableCourses.length > 0 && (
                <CommandGroup heading="Available Courses">
                  {availableCourses.map((course) => {
                    const isSelected = selectedIds.has(course.id);
                    return (
                      <CommandItem
                        key={course.id}
                        value={course.id}
                        onSelect={() => handleSelect(course)}
                        className="flex items-center gap-2 cursor-pointer"
                        disabled={!isSelected && value.length >= maxCourses}
                        data-testid={`option-course-${course.id}`}
                      >
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{course.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {course.level} • {course.subject}
                          </p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          {value.length >= maxCourses && (
            <div className="px-3 py-2 border-t text-xs text-muted-foreground">
              Maximum {maxCourses} courses reached
            </div>
          )}
        </PopoverContent>
      </Popover>

      {!institutionId && (
        <p className="text-xs text-muted-foreground">
          Save the institution first to link featured courses
        </p>
      )}

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} of {maxCourses} featured courses selected
        </p>
      )}
    </div>
  );
}
