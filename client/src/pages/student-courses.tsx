import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, DollarSign, Clock, GraduationCap, Sparkles } from "lucide-react";
import { Link } from "wouter";
import type { Course, University } from "@shared/schema";

type CourseWithUniversity = Course & { university?: University };

export default function StudentCourses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [country, setCountry] = useState<string>("");

  // Check for search query parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
      // Clear the URL parameter to keep URL clean
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: courses = [], isLoading } = useQuery<CourseWithUniversity[]>({
    queryKey: ["/api/courses"],
  });

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
            <Card key={course.id} className="hover-elevate flex flex-col h-full" data-testid={`course-card-${course.id}`}>
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
              <CardFooter className="pt-0">
                <Button asChild className="w-full" size="sm" data-testid={`button-view-course-${course.id}`}>
                  <Link href={`/student/courses/${course.id}`}>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    <span className="truncate">View Details & Apply</span>
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
