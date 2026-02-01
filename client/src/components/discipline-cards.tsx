import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  Clock,
  type LucideIcon
} from "lucide-react";

interface DisciplineConfig {
  icon: LucideIcon;
  gradient: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
}

const disciplineConfig: Record<string, DisciplineConfig> = {
  "Accounting, Business & Finance": {
    icon: Calculator,
    gradient: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200/50 dark:border-blue-800/50"
  },
  "Agriculture & Forestry": {
    icon: Tractor,
    gradient: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
    iconBg: "bg-green-100 dark:bg-green-900/50",
    iconColor: "text-green-600 dark:text-green-400",
    borderColor: "border-green-200/50 dark:border-green-800/50"
  },
  "Applied Sciences & Professions": {
    icon: Atom,
    gradient: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-200/50 dark:border-purple-800/50"
  },
  "Arts, Design & Architecture": {
    icon: Palette,
    gradient: "from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30",
    iconBg: "bg-pink-100 dark:bg-pink-900/50",
    iconColor: "text-pink-600 dark:text-pink-400",
    borderColor: "border-pink-200/50 dark:border-pink-800/50"
  },
  "Computer Science & IT": {
    icon: Monitor,
    gradient: "from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    borderColor: "border-cyan-200/50 dark:border-cyan-800/50"
  },
  "Education & Training": {
    icon: GraduationCap,
    gradient: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-200/50 dark:border-amber-800/50"
  },
  "Engineering & Technology": {
    icon: Wrench,
    gradient: "from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30",
    iconBg: "bg-slate-100 dark:bg-slate-900/50",
    iconColor: "text-slate-600 dark:text-slate-400",
    borderColor: "border-slate-200/50 dark:border-slate-800/50"
  },
  "Environmental Studies & Earth Sciences": {
    icon: Globe,
    gradient: "from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30",
    iconBg: "bg-teal-100 dark:bg-teal-900/50",
    iconColor: "text-teal-600 dark:text-teal-400",
    borderColor: "border-teal-200/50 dark:border-teal-800/50"
  },
  "Hospitality, Leisure & Sports": {
    icon: Utensils,
    gradient: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    iconColor: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-200/50 dark:border-orange-800/50"
  },
  "Humanities": {
    icon: BookOpen,
    gradient: "from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    borderColor: "border-indigo-200/50 dark:border-indigo-800/50"
  },
  "Journalism & Media": {
    icon: Newspaper,
    gradient: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    iconColor: "text-red-600 dark:text-red-400",
    borderColor: "border-red-200/50 dark:border-red-800/50"
  },
  "Law": {
    icon: Scale,
    gradient: "from-stone-50 to-neutral-50 dark:from-stone-950/30 dark:to-neutral-950/30",
    iconBg: "bg-stone-100 dark:bg-stone-900/50",
    iconColor: "text-stone-600 dark:text-stone-400",
    borderColor: "border-stone-200/50 dark:border-stone-800/50"
  },
  "Medicine & Health": {
    icon: Stethoscope,
    gradient: "from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    iconColor: "text-rose-600 dark:text-rose-400",
    borderColor: "border-rose-200/50 dark:border-rose-800/50"
  },
  "Short Courses": {
    icon: Clock,
    gradient: "from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/30 dark:to-pink-950/30",
    iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/50",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
    borderColor: "border-fuchsia-200/50 dark:border-fuchsia-800/50"
  },
  "Trade": {
    icon: Wrench,
    gradient: "from-zinc-50 to-slate-50 dark:from-zinc-950/30 dark:to-slate-950/30",
    iconBg: "bg-zinc-100 dark:bg-zinc-900/50",
    iconColor: "text-zinc-600 dark:text-zinc-400",
    borderColor: "border-zinc-200/50 dark:border-zinc-800/50"
  },
};

const defaultConfig: DisciplineConfig = {
  icon: BookOpen,
  gradient: "from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30",
  iconBg: "bg-gray-100 dark:bg-gray-900/50",
  iconColor: "text-gray-600 dark:text-gray-400",
  borderColor: "border-gray-200/50 dark:border-gray-800/50"
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 md:h-14 md:w-14 bg-muted rounded-xl"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-5 bg-muted rounded-full w-16"></div>
              </div>
            </CardContent>
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
    <div 
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4" 
      data-testid="discipline-cards-container"
    >
      {disciplines.map((discipline) => {
        const config = disciplineConfig[discipline.name] || defaultConfig;
        const Icon = config.icon;
        const disciplineSlug = discipline.name.toLowerCase().replace(/[,\s&]+/g, '-');
        
        return (
          <Link
            key={discipline.name}
            href={`/courses?discipline=${encodeURIComponent(discipline.name)}`}
            data-testid={`link-discipline-${disciplineSlug}`}
          >
            <Card 
              className={`
                relative overflow-hidden cursor-pointer h-full
                bg-gradient-to-br ${config.gradient}
                border ${config.borderColor}
                transition-all duration-300 ease-out
                hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20
                hover:-translate-y-1 hover:scale-[1.02]
                group
              `}
              data-testid={`card-discipline-${disciplineSlug}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <CardContent className="relative p-4 md:p-6">
                <div className="flex flex-col items-center gap-2 md:gap-3 text-center">
                  <div 
                    className={`
                      flex items-center justify-center 
                      h-12 w-12 md:h-14 md:w-14 
                      rounded-xl ${config.iconBg}
                      transition-transform duration-300 group-hover:scale-110
                    `}
                  >
                    <Icon 
                      className={`h-6 w-6 md:h-7 md:w-7 ${config.iconColor}`} 
                      data-testid={`icon-discipline-${disciplineSlug}`} 
                    />
                  </div>
                  
                  <h3 
                    className="font-semibold text-sm md:text-base leading-tight text-foreground line-clamp-2 min-h-[2.5rem] md:min-h-[3rem] flex items-center"
                    data-testid={`title-discipline-${disciplineSlug}`}
                  >
                    {discipline.name}
                  </h3>
                  
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-medium px-3 py-1 bg-primary text-primary-foreground"
                    data-testid={`badge-count-${disciplineSlug}`}
                  >
                    {discipline.count} {discipline.count === 1 ? 'course' : 'courses'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
