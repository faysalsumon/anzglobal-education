import { useState, useEffect, useCallback } from "react";
import { 
  Building2, 
  Award, 
  GraduationCap, 
  MapPin,
  Image,
  Tag,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SectionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const sections: SectionConfig[] = [
  { id: "about", label: "About", icon: <Building2 className="h-4 w-4" /> },
  { id: "gallery", label: "Gallery", icon: <Image className="h-4 w-4" /> },
  { id: "features", label: "Features", icon: <Tag className="h-4 w-4" /> },
  { id: "scholarships", label: "Scholarships", icon: <Award className="h-4 w-4" /> },
  { id: "campuses", label: "Campuses", icon: <MapPin className="h-4 w-4" /> },
  { id: "featured-courses", label: "Featured", icon: <Star className="h-4 w-4" /> },
  { id: "courses", label: "Courses", icon: <GraduationCap className="h-4 w-4" /> },
];

interface InstitutionSectionNavProps {
  visibleSections: string[];
  institutionName?: string;
}

export function InstitutionSectionNav({ visibleSections, institutionName }: InstitutionSectionNavProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);

  const availableSections = sections.filter(section => 
    visibleSections.includes(section.id)
  );

  const handleScroll = useCallback(() => {
    const heroElement = document.getElementById("institution-hero");
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
      const headerOffset = 140;
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
      <div 
        className={cn(
          "hidden md:block fixed top-16 left-0 right-0 z-[9998] bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm",
          "transform transition-all duration-300 ease-out",
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
        data-testid="institution-section-nav"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center h-12 gap-4">
            {institutionName && (
              <div className="hidden lg:flex items-center gap-2 pr-4 border-r border-border/40 flex-shrink-0 max-w-xs">
                <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate" data-testid="nav-institution-name">
                  {institutionName}
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
          </div>
        </div>
      </div>

      <div 
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/40 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]",
          "transform transition-all duration-300 ease-out",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
        data-testid="institution-section-nav-mobile"
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
              <MapPin className="h-4 w-4" />
            </Button>
          )}
        </nav>
      </div>
    </>
  );
}
