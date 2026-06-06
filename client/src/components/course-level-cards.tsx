/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Award,
  BookCheck,
  BookOpen,
  GraduationCap,
  Medal,
  School,
  ScrollText,
  Trophy,
  Briefcase
} from "lucide-react";

const levelIcons: Record<string, any> = {
  "VCE (11-12)": BookOpen,
  "Certificate II": BookCheck,
  "Certificate III": BookCheck,
  "Certificate IV": Award,
  "Diploma": ScrollText,
  "Advanced Diploma": Medal,
  "Graduate Certificate": School,
  "Graduate Diploma": School,
  "Bachelor Degree": GraduationCap,
  "Professional Year": Briefcase,
  "Masters Degree": Trophy,
  "Doctoral Degree": Trophy,
  "Higher Doctoral Degree": Trophy,
  "ELICOS": BookOpen,
};

interface CourseLevel {
  name: string;
  count: number;
}

export function CourseLevelCards() {
  const { data: courseLevels, isLoading } = useQuery<CourseLevel[]>({
    queryKey: ["/api/course-levels"],
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {[...Array(14)].map((_, i) => (
          <Card key={i} className="animate-pulse min-h-[160px]">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto h-12 w-12 bg-muted rounded-lg"></div>
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            </CardHeader>
            <CardContent className="text-center">
              <div className="h-5 bg-muted rounded-full w-20 mx-auto"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!courseLevels || courseLevels.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No course levels available yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="course-level-cards-container">
      {courseLevels.map((level) => {
        const Icon = levelIcons[level.name] || GraduationCap;
        const levelSlug = level.name.toLowerCase().replace(/[(),\s]+/g, '-');
        
        return (
          <Link
            key={level.name}
            href={`/courses?level=${encodeURIComponent(level.name)}`}
            data-testid={`link-level-${levelSlug}`}
          >
            <Card 
              className="hover-elevate cursor-pointer transition-all h-full"
              data-testid={`card-level-${levelSlug}`}
            >
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" data-testid={`icon-level-${levelSlug}`} />
                </div>
                <CardTitle className="text-base leading-tight" data-testid={`title-level-${levelSlug}`}>
                  {level.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <Badge variant="secondary" className="text-xs" data-testid={`badge-count-${levelSlug}`}>
                  {level.count} {level.count === 1 ? 'course' : 'courses'}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
