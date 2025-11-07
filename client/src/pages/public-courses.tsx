import { useState, useEffect, useRef, useMemo } from "react";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Search, MapPin, DollarSign, Clock, GraduationCap, Sparkles, LogIn, ArrowLeft, Eye, Home } from "lucide-react";
import { Link } from "wouter";
import type { Course, University } from "@shared/schema";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { useAuth } from "@/hooks/useAuth";

type CourseWithUniversity = Course & { university?: University };

export default function PublicCourses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [universityFilter, setUniversityFilter] = useState<string>("");
  const [highlightedCourseId, setHighlightedCourseId] = useState<number | null>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated, isStudent } = useAuth();
  const { data: courses = [], isLoading } = useQuery<CourseWithUniversity[]>({
    queryKey: ["/api/courses"],
  });

  // Extract unique values from actual course data
  const availableFilters = useMemo(() => {
    const subjects = new Set<string>();
    const levels = new Set<string>();
    const countries = new Set<string>();
    const universities = new Map<string, string>();

    courses.forEach((course) => {
      if (course.subject) subjects.add(course.subject);
      if (course.level) levels.add(course.level);
      if (course.country) countries.add(course.country);
      if (course.university && course.universityId) {
        universities.set(course.universityId, course.university.name);
      }
    });

    return {
      subjects: Array.from(subjects).sort(),
      levels: Array.from(levels).sort(),
      countries: Array.from(countries).sort(),
      universities: Array.from(universities.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [courses]);

  // Check for search query and highlight parameters in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const highlightParam = urlParams.get('highlight');
    const universityParam = urlParams.get('university');
    
    if (searchParam) {
      setSearchTerm(searchParam);
    }
    
    if (highlightParam) {
      setHighlightedCourseId(parseInt(highlightParam));
    }

    if (universityParam) {
      setUniversityFilter(universityParam);
    }
    
    // Only clear the highlight parameter after using it
    if (highlightParam) {
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('highlight');
      const newSearch = newParams.toString();
      window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
    }
  }, []);

  // Scroll to highlighted course
  useEffect(() => {
    if (highlightedCourseId && highlightedRef.current) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightedCourseId, courses]);

  const filteredCourses = courses.filter((course) => {
    if (searchTerm && !course.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !course.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !course.subject?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (subject && course.subject !== subject) return false;
    if (level && course.level !== level) return false;
    if (country && course.country !== country) return false;
    if (universityFilter && course.universityId !== universityFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/" className="flex items-center gap-2 md:gap-3">
              <img src={logoUrl} alt="ANZ Global Education" className="h-8 sm:h-10 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <Button variant="outline" asChild size="sm" data-testid="button-back-home" className="hidden sm:flex">
              <a href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </a>
            </Button>
            <Button variant="outline" asChild size="icon" data-testid="button-back-home-mobile" className="sm:hidden">
              <a href="/">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="sm" data-testid="button-login-header">
              <a href="/api/login?type=student" className="flex items-center">
                <LogIn className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Login to Apply</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Breadcrumb */}
          <Breadcrumb data-testid="breadcrumb">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" data-testid="breadcrumb-home">
                    <Home className="h-4 w-4" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage data-testid="breadcrumb-current">Courses</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Browse All Courses</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Explore {courses.length} courses from top institutions worldwide</p>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                Find Your Perfect Course
              </CardTitle>
              <CardDescription className="text-sm">Filter courses by your preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-courses"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                    setHighlightedCourseId(null);
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
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse h-full">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded"></div>
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
              {filteredCourses.map((course) => {
                const isHighlighted = highlightedCourseId !== null && Number(course.id) === highlightedCourseId;
                return (
                  <Card 
                    key={course.id} 
                    ref={isHighlighted ? highlightedRef : null}
                    className={`hover-elevate flex flex-col h-full transition-all duration-300 ${
                      isHighlighted ? 'ring-2 ring-primary shadow-lg scale-105' : ''
                    }`}
                    data-testid={`course-card-${course.id}`}
                  >
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex flex-wrap items-start gap-2 mb-2">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">{course.level}</Badge>
                        <Badge variant="outline" className="text-xs">{course.subject}</Badge>
                      </div>
                      {isHighlighted && (
                        <Badge className="mb-2 bg-accent text-accent-foreground text-xs w-fit">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Your Search Result
                        </Badge>
                      )}
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
                      <div className="flex gap-2 w-full">
                        <Button asChild variant="outline" className="flex-1" size="sm" data-testid={`button-view-course-${course.id}`}>
                          <Link href={`/courses/${course.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span className="truncate">View Course</span>
                          </Link>
                        </Button>
                        {isAuthenticated && isStudent ? (
                          <Button asChild className="flex-1" size="sm" data-testid={`button-apply-course-${course.id}`}>
                            <Link href={`/student/courses/${course.id}`}>
                              <GraduationCap className="mr-2 h-4 w-4" />
                              <span className="truncate">Apply</span>
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild className="flex-1" size="sm" data-testid={`button-apply-course-${course.id}`}>
                            <a href={`/api/login?type=student&redirect=/student/courses/${course.id}`}>
                              <LogIn className="mr-2 h-4 w-4" />
                              <span className="truncate">Login to Apply</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ANZ Global Education. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
