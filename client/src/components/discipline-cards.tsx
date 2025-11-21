import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Calculator, 
  Tractor, 
  Atom, 
  Palette, 
  Monitor, 
  GraduationCap, 
  Wrench, 
  Globe, 
  Utensils, 
  BookOpen, 
  Newspaper, 
  Scale, 
  Stethoscope, 
  Clock
} from "lucide-react";

const disciplineIcons: Record<string, any> = {
  "Accounting, Business & Finance": Calculator,
  "Agriculture & Forestry": Tractor,
  "Applied Sciences & Professions": Atom,
  "Arts, Design & Architecture": Palette,
  "Computer Science & IT": Monitor,
  "Education & Training": GraduationCap,
  "Engineering & Technology": Wrench,
  "Environmental Studies & Earth Sciences": Globe,
  "Hospitality, Leisure & Sports": Utensils,
  "Humanities": BookOpen,
  "Journalism & Media": Newspaper,
  "Law": Scale,
  "Medicine & Health": Stethoscope,
  "Short Courses": Clock,
  "Trade": Wrench,
};

interface Discipline {
  name: string;
  count: number;
}

export function DisciplineCards() {
  const { data: disciplines, isLoading } = useQuery<Discipline[]>({
    queryKey: ["/api/disciplines"],
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {[...Array(15)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-4">
              <div className="h-12 w-12 bg-muted rounded-lg"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!disciplines || disciplines.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No disciplines available yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="discipline-cards-container">
      {disciplines.map((discipline) => {
        const Icon = disciplineIcons[discipline.name] || BookOpen;
        const disciplineSlug = discipline.name.toLowerCase().replace(/[,\s&]+/g, '-');
        
        return (
          <Link
            key={discipline.name}
            href={`/courses?discipline=${encodeURIComponent(discipline.name)}`}
            data-testid={`link-discipline-${disciplineSlug}`}
          >
            <Card 
              className="hover-elevate cursor-pointer transition-all h-full"
              data-testid={`card-discipline-${disciplineSlug}`}
            >
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" data-testid={`icon-discipline-${disciplineSlug}`} />
                </div>
                <CardTitle className="text-base leading-tight" data-testid={`title-discipline-${disciplineSlug}`}>
                  {discipline.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <Badge variant="secondary" className="text-xs" data-testid={`badge-count-${disciplineSlug}`}>
                  {discipline.count} {discipline.count === 1 ? 'course' : 'courses'}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
