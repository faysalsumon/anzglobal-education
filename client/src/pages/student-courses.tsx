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
import { Search, MapPin, DollarSign, Clock, GraduationCap, Sparkles, Heart, GitCompare, X, Filter } from "lucide-react";
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
    <div className="space-y-8 pb-24">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-secondary/80 p-8 md:p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -ml-40 -mb-40 animate-float" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Search className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">Browse Courses</h1>
          </div>
          <p className="text-white/90 text-lg md:text-xl max-w-3xl">
            Discover your perfect course with AI-powered search and intelligent recommendations
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-2 shadow-lg overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
        <CardHeader className="bg-gradient-to-br from-muted/30 to-transparent pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Smart Course Search</CardTitle>
              <CardDescription className="text-base">Filter courses by your preferences and requirements</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base border-2"
              data-testid="input-search-courses"
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Subject
              </label>
              <Select value={subject || "all"} onValueChange={(val) => setSubject(val === "all" ? "" : val)}>
                <SelectTrigger data-testid="select-subject" className="border-2">
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Level
              </label>
              <Select value={level || "all"} onValueChange={(val) => setLevel(val === "all" ? "" : val)}>
                <SelectTrigger data-testid="select-level" className="border-2">
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Country
              </label>
              <Select value={country || "all"} onValueChange={(val) => setCountry(val === "all" ? "" : val)}>
                <SelectTrigger data-testid="select-country" className="border-2">
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
          </div>
          
          {(searchTerm || subject || level || country) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSubject("");
                setLevel("");
                setCountry("");
              }}
              data-testid="button-clear-filters"
              className="border-2"
            >
              <X className="mr-2 h-4 w-4" />
              Clear All Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between px-2">
        <p className="text-base font-semibold text-foreground flex items-center gap-2" data-testid="results-count">
          <Sparkles className="h-5 w-5 text-primary" />
          {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse h-full border-2">
              <CardHeader className="pb-4">
                <div className="flex gap-2 mb-3">
                  <div className="h-6 bg-muted rounded-lg w-20"></div>
                  <div className="h-6 bg-muted rounded-lg w-24"></div>
                </div>
                <div className="h-7 bg-muted rounded-lg w-3/4 mb-2"></div>
                <div className="h-5 bg-muted rounded-lg w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded-lg mb-4"></div>
                <div className="space-y-3">
                  <div className="h-5 bg-muted rounded-lg w-full"></div>
                  <div className="h-5 bg-muted rounded-lg w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-20 text-center">
            <div className="p-6 bg-muted/20 rounded-2xl w-28 h-28 mx-auto mb-6 flex items-center justify-center">
              <Search className="h-14 w-14 text-muted-foreground opacity-30" />
            </div>
            <p className="text-2xl font-bold mb-3">No courses found</p>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Try adjusting your filters or search term to discover more courses
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => (
            <Card 
              key={course.id} 
              className="flex flex-col h-full relative border-2 group overflow-hidden transition-transform duration-300 hover:-translate-y-1"
              data-testid={`course-card-${course.id}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Favorite Button */}
              <Button
                size="icon"
                variant="ghost"
                className={`absolute top-3 right-3 h-11 w-11 rounded-full z-10 transition-all shadow-lg ${
                  isFavorited(course.id)
                    ? "bg-destructive hover:bg-destructive/90 scale-110"
                    : "bg-background/95 hover:bg-background backdrop-blur-sm"
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
                      : "text-muted-foreground group-hover:text-destructive"
                  }`}
                />
              </Button>

              <CardHeader className="pb-4 relative">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs font-semibold px-3 py-1">
                    {course.level}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-semibold px-3 py-1 border-2">
                    {course.subject}
                  </Badge>
                </div>
                <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors duration-300">
                  {course.title}
                </CardTitle>
                <CardDescription className="line-clamp-1 text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {course.university?.name || "Institution"}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 pb-4 relative">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                  {course.description || "No description available"}
                </p>
                <div className="space-y-2.5 text-sm">
                  {course.location && (
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{course.location}</span>
                    </div>
                  )}
                  {course.duration && (
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{course.duration}</span>
                    </div>
                  )}
                  {course.fees && (
                    <div className="flex items-center gap-2.5 font-bold text-primary text-base">
                      <DollarSign className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{course.currency} {Number(course.fees).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-0 flex-col gap-3 relative">
                <Button 
                  asChild 
                  className="w-full shadow-sm" 
                  data-testid={`button-view-course-${course.id}`}
                >
                  <Link href={`/student/courses/${course.id}`}>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    View Details & Apply
                  </Link>
                </Button>
                
                <div 
                  className="flex items-center gap-3 w-full pt-3 border-t-2 rounded-lg px-3 py-2.5 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors duration-300"
                  onClick={(e) => {
                    e.preventDefault();
                    handleComparisonToggle(course.id);
                  }}
                  data-testid={`checkbox-compare-${course.id}`}
                >
                  <Checkbox 
                    checked={isInComparison(course.id)}
                    onCheckedChange={() => handleComparisonToggle(course.id)}
                    className="cursor-pointer h-5 w-5"
                  />
                  <label className="text-sm font-semibold cursor-pointer flex items-center gap-2 flex-1">
                    <GitCompare className="h-4 w-4" />
                    Compare this course
                  </label>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Sticky Comparison Bar */}
      {comparisons.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-secondary via-primary to-secondary border-t-2 border-white/20 shadow-2xl p-5 z-50 backdrop-blur-lg">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <GitCompare className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <p className="font-bold text-lg">
                  {comparisons.length} course{comparisons.length !== 1 ? "s" : ""} selected
                </p>
                <p className="text-sm text-white/80">
                  {comparisons.length < 2 ? "Select at least 2 courses to compare" : "Ready to compare"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => clearAllComparisonsMutation.mutate()}
                data-testid="button-clear-comparison"
                className="border-2 border-white/30 text-white shadow-lg backdrop-blur-sm"
              >
                <X className="mr-2 h-5 w-5" />
                Clear All
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate("/compare-courses")}
                disabled={comparisons.length < 2}
                data-testid="button-compare-courses"
                className="shadow-lg font-bold"
              >
                <GitCompare className="mr-2 h-5 w-5" />
                Compare Courses ({comparisons.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
