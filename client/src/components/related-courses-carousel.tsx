import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Building2, Clock, Monitor, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseThumbnail } from "@/components/course-thumbnail";

interface RelatedCourse {
  id: string;
  title: string;
  slug: string | null;
  discipline: string | null;
  level: string | null;
  duration: string | null;
  deliveryMode: string | null;
  thumbnailUrl: string | null;
  tuitionFee: number | null;
  currency: string;
  university: { id: string; name: string; logo: string | null } | null;
}

interface RelatedCoursesCarouselProps {
  courseId: string;
  discipline: string | null;
}

function formatFee(fee: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    maximumFractionDigits: 0,
  }).format(fee);
}

function formatDeliveryMode(mode: string | null) {
  if (!mode || mode === "null") return null;
  const map: Record<string, string> = {
    online: "Online",
    "on-campus": "On Campus",
    hybrid: "Hybrid",
  };
  return map[mode] || mode;
}

export function RelatedCoursesCarousel({ courseId, discipline }: RelatedCoursesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: courses = [], isLoading } = useQuery<RelatedCourse[]>({
    queryKey: ["/api/public/courses", courseId, "related"],
    queryFn: () =>
      fetch(`/api/public/courses/${courseId}/related?limit=8`).then((r) => r.json()),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector("[data-related-card]") as HTMLElement | null;
    const amount = card ? card.offsetWidth + 16 : 280;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!isLoading && courses.length === 0) return null;

  const sectionTitle = discipline
    ? `More ${discipline} Courses`
    : "More Courses Like This";

  return (
    <section className="py-8 md:py-10" data-testid="section-related-courses">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h2 className="text-xl font-bold" data-testid="heading-related-courses">
              {sectionTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Explore similar courses that may interest you
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="icon"
              variant="outline"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              data-testid="button-related-scroll-left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              data-testid="button-related-scroll-right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          data-testid="carousel-related-courses"
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-64 md:w-72"
                  data-related-card
                >
                  <Card>
                    <Skeleton className="aspect-video w-full rounded-t-md rounded-b-none" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
                </div>
              ))
            : courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug || course.id}`}
                  data-testid={`card-related-course-${course.id}`}
                  data-related-card
                  className="flex-shrink-0 w-64 md:w-72 block"
                >
                  <Card className="hover-elevate h-full cursor-pointer overflow-hidden">
                    <CourseThumbnail
                      src={course.thumbnailUrl}
                      alt={course.title}
                      aspectRatio="video"
                      testId={`img-related-thumbnail-${course.id}`}
                    />
                    <CardContent className="p-4 flex flex-col gap-2">
                      {course.level && (
                        <Badge variant="secondary" className="w-fit text-xs">
                          {course.level}
                        </Badge>
                      )}

                      <h3
                        className="font-semibold text-sm leading-snug line-clamp-2"
                        data-testid={`text-related-title-${course.id}`}
                      >
                        {course.title}
                      </h3>

                      {course.university && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate" data-testid={`text-related-uni-${course.id}`}>
                            {course.university.name}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-auto pt-1">
                        {course.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {course.duration}
                          </span>
                        )}
                        {course.deliveryMode && (
                          <span className="flex items-center gap-1">
                            <Monitor className="h-3 w-3 flex-shrink-0" />
                            {formatDeliveryMode(course.deliveryMode)}
                          </span>
                        )}
                      </div>

                      {course.tuitionFee && (
                        <div className="text-sm font-semibold text-primary" data-testid={`text-related-fee-${course.id}`}>
                          {formatFee(course.tuitionFee, course.currency)}
                          <span className="text-xs font-normal text-muted-foreground ml-1">/ year</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
