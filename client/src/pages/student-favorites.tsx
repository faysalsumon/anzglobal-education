import { useQuery, useMutation } from "@tanstack/react-query";
import { StudentLayout } from "@/components/student-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Heart,
  MapPin,
  Clock,
  DollarSign,
  GraduationCap,
  Building,
  Trash2,
  ExternalLink,
  Search,
} from "lucide-react";
import type { Favorite, Course, University } from "@shared/schema";

interface FavoriteWithDetails extends Favorite {
  course?: Course;
  university?: University;
}

export default function StudentFavorites() {
  const { toast } = useToast();

  const { data: favorites = [], isLoading } = useQuery<FavoriteWithDetails[]>({
    queryKey: ["/api/student/favorites"],
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: universitiesData } = useQuery<{ universities: University[] }>({
    queryKey: ["/api/universities"],
  });
  const universities = universitiesData?.universities || [];

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      return await apiRequest("DELETE", `/api/student/favorites/${favoriteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({
        title: "Removed",
        description: "Course removed from favourites",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from favourites",
        variant: "destructive",
      });
    },
  });

  const courseFavorites = favorites.filter((f) => f.itemType === "course");

  const getCourseFavorites = () => {
    return courseFavorites.map((fav) => {
      const course = courses.find((c) => String(c.id) === fav.itemId);
      const university = course
        ? universities.find((u) => u.id === course.universityId)
        : undefined;
      return { ...fav, course, university };
    });
  };

  const favoriteCourses = getCourseFavorites();

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6 text-rose-500" />
              My Favourites
            </h1>
            <p className="text-muted-foreground mt-1">
              Courses you've saved for later
            </p>
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

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-favorites">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
            My Favourites
          </h1>
          <p className="text-muted-foreground mt-1">
            {favoriteCourses.length > 0
              ? `You have ${favoriteCourses.length} saved course${favoriteCourses.length === 1 ? "" : "s"}`
              : "Courses you've saved for later"}
          </p>
        </div>

        {favoriteCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Heart className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No favourites yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Start exploring courses and save the ones you're interested in.
                They'll appear here for easy access.
              </p>
              <Link href="/student/courses">
                <Button data-testid="button-browse-courses">
                  <Search className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {favoriteCourses.map((fav) => {
              const { course, university } = fav;
              if (!course) return null;

              return (
                <Card
                  key={fav.id}
                  className="group overflow-hidden hover-elevate"
                  data-testid={`card-favorite-${fav.id}`}
                >
                  <div className="relative">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <GraduationCap className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm text-rose-500 hover:text-rose-600 hover:bg-background"
                      onClick={() => removeFavoriteMutation.mutate(fav.id)}
                      disabled={removeFavoriteMutation.isPending}
                      data-testid={`button-remove-favorite-${fav.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <Link href={`/student/courses/${course.id}`}>
                        <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors cursor-pointer">
                          {course.title}
                        </h3>
                      </Link>
                      {university && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Building className="h-3.5 w-3.5" />
                          {university.name}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {course.level && (
                        <Badge variant="secondary" className="text-xs">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {course.level}
                        </Badge>
                      )}
                      {course.location && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {course.location}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {course.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {course.duration}
                        </span>
                      )}
                      {course.fees && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          ${Number(course.fees).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link href={`/student/courses/${course.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm" data-testid={`button-view-course-${course.id}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
