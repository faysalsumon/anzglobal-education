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
}

export function CourseSectionNav({ visibleSections, courseTitle }: CourseSectionNavProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);

  // Filter sections to only show ones that exist on the page
  const availableSections = sections.filter(section => 
    visibleSections.includes(section.id)
  );

  // Detect scroll position and update active section
  const handleScroll = useCallback(() => {
    const heroElement = document.getElementById("course-hero");
    const heroBottom = heroElement?.getBoundingClientRect().bottom || 0;
    
    // Show nav when hero is scrolled past
    setIsVisible(heroBottom < 80);

    // Find active section
    let currentSection = "";
    const offset = 150; // Account for sticky header height

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

    // If no section is in view, find the closest one above
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
    handleScroll(); // Check initial state
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 140; // Account for both headers
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
            {/* Course title (truncated) */}
            {courseTitle && (
              <div className="hidden lg:flex items-center gap-2 pr-4 border-r border-border/40 flex-shrink-0 max-w-xs">
                <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate" data-testid="nav-course-title">
                  {courseTitle}
                </span>
              </div>
            )}
            
            {/* Section navigation */}
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
        <nav className="flex items-center justify-around gap-2 py-2 px-2">
          {availableSections.slice(0, 5).map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "default" : "ghost"}
              size="sm"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                activeSection !== section.id && "text-muted-foreground"
              )}
              data-testid={`nav-section-mobile-${section.id}`}
            >
              {section.icon}
            </Button>
          ))}
          {/* More button if there are more than 5 sections */}
          {availableSections.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const moreSection = availableSections[5];
                if (moreSection) scrollToSection(moreSection.id);
              }}
              className="text-muted-foreground"
              data-testid="nav-section-mobile-more"
            >
              <Globe className="h-4 w-4" />
            </Button>
          )}
        </nav>
      </div>
    </>
  );
}
