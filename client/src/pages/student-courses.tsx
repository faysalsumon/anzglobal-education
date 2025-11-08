import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, DollarSign, Clock, GraduationCap, Sparkles, Heart, GitCompare, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Course, University, Favorite, CourseComparison } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CourseWithUniversity = Course & { university?: University };

export default function StudentCourses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Check for search query parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: courses = [], isLoading } = useQuery<CourseWithUniversity[]>({
    queryKey: ["/api/courses"],
  });

  // Favorites functionality
  const { data: favorites = [] } = useQuery<Favorite[]>({
    queryKey: ["/api/student/favorites"],
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (data: { itemType: string; itemId: string }) => {
      return await apiRequest("POST", "/api/student/favorites", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({
        title: "Success",
        description: "Added to favorites",
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("already favorited")) {
        toast({
          title: "Already favorited",
          description: "This course is already in your favorites",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add to favorites",
          variant: "destructive",
        });
      }
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      return await apiRequest("DELETE", `/api/student/favorites/${favoriteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({
        title: "Success",
        description: "Removed from favorites",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteToggle = (courseId: string) => {
    const existingFavorite = favorites.find(
      (f) => f.itemType === "course" && f.itemId === courseId
    );

    if (existingFavorite) {
      removeFavoriteMutation.mutate(existingFavorite.id);
    } else {
      addFavoriteMutation.mutate({
        itemType: "course",
        itemId: courseId,
      });
    }
  };

  const isFavorited = (courseId: string) => {
    return favorites.some(
      (f) => f.itemType === "course" && f.itemId === courseId
    );
  };

  // Course comparison functionality
  const { data: comparisons = [] } = useQuery<CourseComparison[]>({
    queryKey: ["/api/student/comparisons"],
  });

  const addComparisonMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return await apiRequest("POST", "/api/student/comparisons", { courseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({
        title: "Success",
        description: "Course added to comparison",
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("already in comparison")) {
        toast({
          title: "Already in comparison",
          description: "This course is already in your comparison list",
          variant: "destructive",
        });
      } else if (error.message?.includes("maximum")) {
        toast({
          title: "Comparison limit reached",
          description: "You can compare up to 4 courses at a time",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add to comparison",
          variant: "destructive",
        });
      }
    },
  });

  const removeComparisonMutation = useMutation({
    mutationFn: async (comparisonId: string) => {
      return await apiRequest("DELETE", `/api/student/comparisons/${comparisonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({
        title: "Success",
        description: "Removed from comparison",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from comparison",
        variant: "destructive",
      });
    },
  });

  const clearAllComparisonsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/student/comparisons");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({
        title: "Success",
        description: "All comparisons cleared",
      });
    },
  });

  const handleComparisonToggle = (courseId: string) => {
    const existingComparison = comparisons.find(
      (c) => c.courseId === courseId
    );

    if (existingComparison) {
      removeComparisonMutation.mutate(existingComparison.id);
    } else {
      if (comparisons.length >= 4) {
        toast({
          title: "Comparison limit reached",
          description: "You can compare up to 4 courses at a time. Remove one to add another.",
          variant: "destructive",
        });
        return;
      }
      addComparisonMutation.mutate(courseId);
    }
  };

  const isInComparison = (courseId: string) => {
    return comparisons.some((c) => c.courseId === courseId);
  };

  // Extract unique values from actual course data
  const availableFilters = useMemo(() => {
    const subjects = new Set<string>();
    const levels = new Set<string>();
    const countries = new Set<string>();

    courses.forEach((course) => {
      if (course.subject) subjects.add(course.subject);
      if (course.level) levels.add(course.level);
      if (course.country) countries.add(course.country);
    });

    return {
      subjects: Array.from(subjects).sort(),
      levels: Array.from(levels).sort(),
      countries: Array.from(countries).sort(),
    };
  }, [courses]);

  const filteredCourses = courses.filter((course) => {
    if (searchTerm && !course.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !course.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (subject && course.subject !== subject) return false;
    if (level && course.level !== level) return false;
    if (country && course.country !== country) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Browse Courses</h1>
        <p className="text-muted-foreground">Discover your perfect course with AI-powered search</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Smart Course Search
          </CardTitle>
          <CardDescription>Filter courses by your preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-courses"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Select value={subject || "all"} onValueChange={(val) => setSubject(val === "all" ? "" : val)}>
              <SelectTrigger data-testid="select-subject">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {availableFilters.subjects.map((subj) => (
                  <SelectItem key={subj} value={subj}>
                    {subj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={level || "all"} onValueChange={(val) => setLevel(val === "all" ? "" : val)}>
              <SelectTrigger data-testid="select-level">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {availableFilters.levels.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={country || "all"} onValueChange={(val) => setCountry(val === "all" ? "" : val)}>
              <SelectTrigger data-testid="select-country">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {availableFilters.countries.map((ctry) => (
                  <SelectItem key={ctry} value={ctry}>
                    {ctry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(searchTerm || subject || level || country) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSubject("");
                setLevel("");
                setCountry("");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" data-testid="results-count">
          {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse h-full">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex gap-2 mb-2">
                  <div className="h-5 bg-muted rounded w-16"></div>
                  <div className="h-5 bg-muted rounded w-20"></div>
                </div>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-lg font-medium mb-2">No courses found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search term</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover-elevate flex flex-col h-full relative" data-testid={`course-card-${course.id}`}>
              <Button
                size="icon"
                variant="ghost"
                className={`absolute top-2 right-2 h-10 w-10 rounded-full transition-all z-10 ${
                  isFavorited(course.id)
                    ? "bg-primary hover:bg-primary/90 shadow-md"
                    : "bg-background/80 hover:bg-background shadow-sm"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleFavoriteToggle(course.id);
                }}
                data-testid={`button-favorite-course-${course.id}`}
              >
                <Heart
                  className={`h-5 w-5 transition-all ${
                    isFavorited(course.id)
                      ? "fill-white text-white"
                      : "text-muted-foreground"
                  }`}
                />
              </Button>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">{course.level}</Badge>
                  <Badge variant="outline" className="text-xs">{course.subject}</Badge>
                </div>
                <CardTitle className="text-lg sm:text-xl line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-1 text-sm">
                  {course.university?.name || "Institution"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-3 sm:pb-4">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3 sm:mb-4">
                  {course.description || "No description available"}
                </p>
                <div className="space-y-2 text-sm">
                  {course.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{course.location}</span>
                    </div>
                  )}
                  {course.duration && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{course.duration}</span>
                    </div>
                  )}
                  {course.fees && (
                    <div className="flex items-center gap-2 font-semibold text-primary">
                      <DollarSign className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{course.currency} {Number(course.fees).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex-col gap-3">
                <Button asChild className="w-full" size="sm" data-testid={`button-view-course-${course.id}`}>
                  <Link href={`/student/courses/${course.id}`}>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    <span className="truncate">View Details & Apply</span>
                  </Link>
                </Button>
                <div 
                  className="flex items-center gap-2 w-full pt-2 border-t hover-elevate rounded-md px-2 py-1.5 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    handleComparisonToggle(course.id);
                  }}
                  data-testid={`checkbox-compare-${course.id}`}
                >
                  <Checkbox 
                    checked={isInComparison(course.id)}
                    onCheckedChange={() => handleComparisonToggle(course.id)}
                    className="cursor-pointer"
                  />
                  <label className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                    <GitCompare className="h-3.5 w-3.5" />
                    Compare this course
                  </label>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison Bar */}
      {comparisons.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg p-4 z-50">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GitCompare className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {comparisons.length} course{comparisons.length !== 1 ? "s" : ""} selected for comparison
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearAllComparisonsMutation.mutate()}
                data-testid="button-clear-comparison"
              >
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/compare-courses")}
                disabled={comparisons.length < 2}
                data-testid="button-compare-courses"
              >
                <GitCompare className="mr-2 h-4 w-4" />
                Compare Courses ({comparisons.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
