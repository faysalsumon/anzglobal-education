import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, ArrowLeft, X, Heart, CheckCircle2, XCircle, DollarSign, Clock, MapPin, BookOpen, Award, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Course } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

interface CourseComparison {
  id: string;
  courseId: string;
  studentProfileId: string;
  createdAt: string;
}

export default function CompareCourses() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const urlCourseIds = urlParams.get('courses')?.split(',').map(id => id.trim()).filter(Boolean) || [];

  // Fetch saved comparisons from API
  const { data: savedComparisons = [], isLoading: comparisonsLoading } = useQuery<CourseComparison[]>({
    queryKey: ["/api/student/comparisons"],
  });

  const { data: allCourses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  // Use URL params if provided, otherwise use saved comparisons
  const courseIds = urlCourseIds.length > 0 
    ? urlCourseIds 
    : savedComparisons.map(c => c.courseId);

  const courses = allCourses.filter(c => courseIds.includes(c.id));
  const isLoading = comparisonsLoading || coursesLoading;

  const removeComparisonMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const comparisons = await queryClient.getQueryData<any[]>(["/api/student/comparisons"]) || [];
      const comparison = comparisons.find(c => c.courseId === courseId);
      if (comparison) {
        return await apiRequest("DELETE", `/api/student/comparisons/${comparison.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({
        title: "Success",
        description: "Course removed from comparison",
      });
    },
  });

  const handleRemoveCourse = (courseId: string) => {
    const newCourseIds = courseIds.filter(id => id !== courseId);
    if (newCourseIds.length < 2) {
      window.location.href = '/courses';
    } else {
      window.location.href = `/compare-courses?courses=${newCourseIds.join(',')}`;
    }
    removeComparisonMutation.mutate(courseId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-40 backdrop-blur">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt="ANZ Global Education" className="h-8 w-auto" />
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (courses.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-lg font-medium mb-2">
                {courses.length === 0 
                  ? "No courses selected for comparison" 
                  : "Need at least 2 courses to compare"}
              </p>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                {courses.length === 0 
                  ? "Browse courses and click the compare icon to add courses to your comparison list."
                  : `You have ${courses.length} course selected. Add at least one more to compare side by side.`}
              </p>
              <Button asChild>
                <Link href="/student/courses" data-testid="button-browse-courses">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Browse Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <img src={logoUrl} alt="ANZ Global Education" className="h-8 w-auto cursor-pointer" />
              </Link>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/courses" data-testid="button-back-to-courses">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Courses
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">
                  <Home className="h-4 w-4" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/courses">Courses</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>Compare Courses</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Compare Courses</h1>
          <p className="text-muted-foreground">
            Compare up to 4 courses side-by-side to find the perfect fit for your education goals
          </p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${courses.length}, minmax(300px, 1fr))` }}>
            {courses.map((course) => (
              <Card key={course.id} className="relative" data-testid={`comparison-course-${course.id}`}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => handleRemoveCourse(course.id)}
                  data-testid={`button-remove-comparison-${course.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardHeader>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className="bg-primary/10 text-primary">{course.level}</Badge>
                    <Badge variant="outline">{course.subject}</Badge>
                  </div>
                  <CardTitle className="text-xl pr-8">{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description */}
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Description
                    </h3>
                    <p className="text-sm text-muted-foreground">{course.description || 'No description available'}</p>
                  </div>

                  {/* Location */}
                  {course.location && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </h3>
                      <p className="text-sm">{course.location}</p>
                    </div>
                  )}

                  {/* Duration */}
                  {course.duration && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duration
                      </h3>
                      <p className="text-sm">{course.duration}</p>
                    </div>
                  )}

                  {/* Fees */}
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

                  {/* Scholarship */}
                  {course.scholarshipPercentage && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Scholarship
                      </h3>
                      <p className="text-sm">Up to {course.scholarshipPercentage}%</p>
                    </div>
                  )}

                  {/* English Requirements */}
                  {course.englishRequirements && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        English Requirements
                      </h3>
                      <p className="text-sm">{course.englishRequirements}</p>
                    </div>
                  )}

                  {/* Eligibility */}
                  {course.eligibilityRequirements && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Eligibility</h3>
                      <p className="text-sm text-muted-foreground">{course.eligibilityRequirements}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 space-y-2">
                    <Button asChild className="w-full" size="sm">
                      <Link href={`/courses/${course.id}`} data-testid={`button-view-details-${course.id}`}>
                        View Full Details
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full" size="sm">
                      <Link href={`/student/courses/${course.id}`} data-testid={`button-apply-${course.id}`}>
                        Apply Now
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
