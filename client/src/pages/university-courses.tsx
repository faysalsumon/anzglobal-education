import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, DollarSign, Clock, Edit, Eye } from "lucide-react";
import { Link } from "wouter";
import type { Course } from "@shared/schema";
import { UniversityLayout } from "@/components/university-layout";

function UniversityCoursesContent() {
  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/university/courses"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Courses</h1>
          <p className="text-muted-foreground">Manage your course offerings</p>
        </div>
        <Button asChild data-testid="button-create-course">
          <Link href="/university/courses/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Link>
        </Button>
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
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-lg font-medium mb-2">No courses yet</p>
            <p className="text-sm text-muted-foreground mb-6">Create your first course to start attracting students</p>
            <Button asChild>
              <Link href="/university/courses/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover-elevate flex flex-col" data-testid={`course-card-${course.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className={course.isActive ? "bg-secondary" : "bg-muted"}>
                    {course.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">{course.level}</Badge>
                </div>
                <CardTitle className="text-xl line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-1">{course.subject}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {course.description || "No description"}
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
              <CardFooter className="flex gap-2">
                <Button asChild size="sm" variant="outline" className="flex-1" data-testid={`button-edit-${course.id}`}>
                  <Link href={`/university/courses/${course.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button asChild size="sm" className="flex-1" data-testid={`button-view-${course.id}`}>
                  <Link href={`/university/courses/${course.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
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

export default function UniversityCourses() {
  return (
    <UniversityLayout breadcrumbTitle="Courses">
      <UniversityCoursesContent />
    </UniversityLayout>
  );
}
