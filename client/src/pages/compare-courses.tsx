import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { X, DollarSign, Clock, MapPin, BookOpen, Award, Globe, GitCompare, Search } from "lucide-react";
import { Link } from "wouter";
import type { Course } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StudentLayout } from "@/components/student-layout";

interface CourseComparison {
  id: string;
  courseId: string;
  studentProfileId: string;
  createdAt: string;
}

export default function CompareCourses() {
  const { toast } = useToast();

  const { data: savedComparisons = [], isLoading: comparisonsLoading } = useQuery<CourseComparison[]>({
    queryKey: ["/api/student/comparisons"],
  });

  const { data: allCourses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const courseIds = savedComparisons.map(c => c.courseId);
  const courses = allCourses.filter(c => courseIds.includes(c.id));
  const isLoading = comparisonsLoading || coursesLoading;

  const removeComparisonMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const comparison = savedComparisons.find(c => c.courseId === courseId);
      if (comparison) {
        return await apiRequest("DELETE", `/api/student/comparisons/${comparison.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({
        title: "Removed",
        description: "Course removed from comparison",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove course",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitCompare className="h-6 w-6 text-primary" />
              Compare Courses
            </h1>
            <p className="text-muted-foreground mt-1">Loading your comparison...</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-40 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (courses.length < 2) {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-compare">
              <GitCompare className="h-6 w-6 text-primary" />
              Compare Courses
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare courses side-by-side to find the best fit
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {courses.length === 0 
                  ? "No courses selected for comparison" 
                  : "Need at least 2 courses to compare"}
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                {courses.length === 0 
                  ? "Browse courses and click the compare checkbox to add courses to your comparison list."
                  : `You have ${courses.length} course selected. Add at least one more to compare side by side.`}
              </p>
              <Button asChild>
                <Link href="/student/courses" data-testid="button-browse-courses">
                  <Search className="mr-2 h-4 w-4" />
                  Browse Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-compare">
              <GitCompare className="h-6 w-6 text-primary" />
              Compare Courses
            </h1>
            <p className="text-muted-foreground mt-1">
              Comparing {courses.length} courses side-by-side
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/student/courses" data-testid="button-add-more">
              Add More Courses
            </Link>
          </Button>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${courses.length}, minmax(280px, 1fr))` }}>
            {courses.map((course) => (
              <Card key={course.id} className="relative" data-testid={`comparison-course-${course.id}`}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => removeComparisonMutation.mutate(course.id)}
                  disabled={removeComparisonMutation.isPending}
                  data-testid={`button-remove-comparison-${course.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardHeader>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className="bg-primary/10 text-primary">{course.level}</Badge>
                    {course.subject && <Badge variant="outline">{course.subject}</Badge>}
                  </div>
                  <CardTitle className="text-lg pr-8 line-clamp-2">{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.description && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Description
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
                    </div>
                  )}

                  {course.location && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </h3>
                      <p className="text-sm">{course.location}</p>
                    </div>
                  )}

                  {course.duration && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duration
                      </h3>
                      <p className="text-sm">{course.duration}</p>
                    </div>
                  )}

                  {course.fees && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Tuition Fees
                      </h3>
                      <p className="text-sm font-semibold text-primary">
                        {course.currency} {Number(course.fees).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {(course.scholarshipPercentageMin || course.scholarshipPercentageMax) && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Scholarship
                      </h3>
                      <p className="text-sm">
                        {course.scholarshipPercentageMin && course.scholarshipPercentageMax
                          ? `${course.scholarshipPercentageMin}% - ${course.scholarshipPercentageMax}%`
                          : course.scholarshipPercentageMax
                          ? `Up to ${course.scholarshipPercentageMax}%`
                          : `From ${course.scholarshipPercentageMin}%`}
                      </p>
                    </div>
                  )}

                  {course.englishRequirements && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        English Requirements
                      </h3>
                      <p className="text-sm">{course.englishRequirements}</p>
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                    <Button asChild className="w-full" size="sm">
                      <Link href={`/student/courses/${course.id}`} data-testid={`button-view-details-${course.id}`}>
                        View Details & Apply
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
