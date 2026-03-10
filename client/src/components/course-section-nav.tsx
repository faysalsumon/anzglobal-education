import { useState, useEffect, useCallback } from "react";
import { 
  GraduationCap, 
  DollarSign, 
  CheckCircle, 
  Target, 
  BookOpen,
  Globe,
  FileText,
  Layers,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SectionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const sections: SectionConfig[] = [
  { id: "about", label: "About", icon: <GraduationCap className="h-4 w-4" /> },
  { id: "fees", label: "Tuition Fees", icon: <DollarSign className="h-4 w-4" /> },
  { id: "eligibility", label: "Requirements", icon: <CheckCircle className="h-4 w-4" /> },
  { id: "academic", label: "Academic", icon: <FileText className="h-4 w-4" /> },
  { id: "career", label: "Career", icon: <Target className="h-4 w-4" /> },
  { id: "pathways", label: "Pathways", icon: <Layers className="h-4 w-4" /> },
  { id: "internship", label: "Internship", icon: <Briefcase className="h-4 w-4" /> },
  { id: "details", label: "Location", icon: <BookOpen className="h-4 w-4" /> },
];

interface CourseSectionNavProps {
  visibleSections: string[];
  courseTitle?: string;
  ctaContent?: React.ReactNode;
}

export function CourseSectionNav({ visibleSections, courseTitle, ctaContent }: CourseSectionNavProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);

  const availableSections = sections.filter(section => 
    visibleSections.includes(section.id)
  );

  const handleScroll = useCallback(() => {
    const heroElement = document.getElementById("course-hero");
    const heroBottom = heroElement?.getBoundingClientRect().bottom || 0;
    
    setIsVisible(heroBottom < 80);

    let currentSection = "";
    const offset = 150;

    for (const section of availableSections) {
      const element = document.getElementById(section.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= offset && rect.bottom > offset) {
          currentSection = section.id;
          break;
        }
      }
    }

    if (!currentSection) {
      for (let i = availableSections.length - 1; i >= 0; i--) {
        const element = document.getElementById(availableSections[i].id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top < offset) {
            currentSection = availableSections[i].id;
            break;
          }
        }
      }
    }

    setActiveSection(currentSection);
  }, [availableSections]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // On mobile the section nav is at the bottom, so only offset for the top navbar (~64px).
      // On desktop the section nav is at the top, so offset for navbar + section nav bar (~140px).
      const isMobile = window.innerWidth < 768;
      const headerOffset = isMobile ? 72 : 140;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  if (!isVisible || availableSections.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop: Top sticky nav */}
      <div 
        className={cn(
          "hidden md:block fixed top-16 left-0 right-0 z-[9998] bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm",
          "transform transition-all duration-300 ease-out",
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
        data-testid="course-section-nav"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center h-12 gap-4">
            {courseTitle && (
              <div className="hidden lg:flex items-center gap-2 pr-4 border-r border-border/40 flex-shrink-0 max-w-xs">
                <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate" data-testid="nav-course-title">
                  {courseTitle}
                </span>
              </div>
            )}
            
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
              {availableSections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "whitespace-nowrap",
                    activeSection !== section.id && "text-muted-foreground"
                  )}
                  data-testid={`nav-section-${section.id}`}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </Button>
              ))}
            </nav>

            {ctaContent && (
              <div className="flex items-center gap-2 flex-shrink-0 pl-4 border-l border-border/40" data-testid="nav-cta-buttons">
                {ctaContent}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Bottom tab bar (positioned above the sticky CTA) */}
      <div 
        className={cn(
          "md:hidden fixed bottom-[72px] left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/40 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]",
          "transform transition-all duration-300 ease-out",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
        data-testid="course-section-nav-mobile"
      >
        <nav className="flex items-center justify-around px-1 py-1">
          {availableSections.slice(0, 5).map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                type="button"
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-0 flex-1",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
                data-testid={`nav-section-mobile-${section.id}`}
              >
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-md transition-colors",
                  isActive ? "bg-primary/10" : ""
                )}>
                  {section.icon}
                </span>
                <span className={cn(
                  "text-[9px] leading-tight font-medium truncate w-full text-center",
                  isActive ? "font-semibold" : ""
                )}>
                  {section.label}
                </span>
              </button>
            );
          })}
          {availableSections.length > 5 && (
            <button
              type="button"
              onClick={() => {
                const moreSection = availableSections[5];
                if (moreSection) scrollToSection(moreSection.id);
              }}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-muted-foreground flex-1"
              data-testid="nav-section-mobile-more"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-md">
                <Globe className="h-4 w-4" />
              </span>
              <span className="text-[9px] leading-tight font-medium">More</span>
            </button>
          )}
        </nav>
      </div>
    </>
  );
}
