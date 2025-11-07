import { useState, useEffect } from "react";
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
                <SelectItem value="Computer Science">Computer Science</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Medicine">Medicine</SelectItem>
                <SelectItem value="Arts">Arts</SelectItem>
              </SelectContent>
            </Select>

            <Select value={level || "all"} onValueChange={(val) => setLevel(val === "all" ? "" : val)}>
              <SelectTrigger data-testid="select-level">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="undergraduate">Undergraduate</SelectItem>
                <SelectItem value="postgraduate">Postgraduate</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="diploma">Diploma</SelectItem>
              </SelectContent>
            </Select>

            <Select value={country || "all"} onValueChange={(val) => setCountry(val === "all" ? "" : val)}>
              <SelectTrigger data-testid="select-country">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="New Zealand">New Zealand</SelectItem>
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
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
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
        <div className="grid gap-6 md:grid-cols-3">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover-elevate flex flex-col" data-testid={`course-card-${course.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">{course.level}</Badge>
                  <Badge variant="outline">{course.subject}</Badge>
                </div>
                <CardTitle className="text-xl line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-1">
                  {course.university?.name || "Institution"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {course.description || "No description available"}
                </p>
                <div className="space-y-2 text-sm">
                  {course.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{course.location}</span>
                    </div>
                  )}
                  {course.duration && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                  )}
                  {course.fees && (
                    <div className="flex items-center gap-2 font-semibold text-primary">
                      <DollarSign className="h-4 w-4" />
                      <span>{course.currency} {Number(course.fees).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" data-testid={`button-view-course-${course.id}`}>
                  <Link href={`/student/courses/${course.id}`}>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    View Details & Apply
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
