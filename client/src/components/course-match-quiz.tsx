import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap, BookOpen, Globe, DollarSign, ArrowRight, ArrowLeft, X, Sparkles, Check,
  Briefcase, TreePine, FlaskConical, Palette, Monitor, BookOpenCheck, Cog, Mountain,
  Hotel, ScrollText, Newspaper, Scale, Stethoscope, Clock, Wrench, Loader2, GraduationCap as GradCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getFlagUrl, getCountryByName } from "@/lib/countries";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface DisciplineStyle {
  icon: LucideIcon;
  bg: string;
  text: string;
  selectedBorder: string;
  selectedBg: string;
  selectedRing: string;
  checkColor: string;
}

const DISCIPLINE_STYLE_MAP: Record<string, DisciplineStyle> = {
  "accounting": { icon: Briefcase, bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", selectedBorder: "border-orange-400 dark:border-orange-500", selectedBg: "bg-orange-50 dark:bg-orange-950/30", selectedRing: "ring-orange-300/50", checkColor: "text-orange-500" },
  "business": { icon: Briefcase, bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", selectedBorder: "border-orange-400 dark:border-orange-500", selectedBg: "bg-orange-50 dark:bg-orange-950/30", selectedRing: "ring-orange-300/50", checkColor: "text-orange-500" },
  "finance": { icon: Briefcase, bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", selectedBorder: "border-orange-400 dark:border-orange-500", selectedBg: "bg-orange-50 dark:bg-orange-950/30", selectedRing: "ring-orange-300/50", checkColor: "text-orange-500" },
  "agriculture": { icon: TreePine, bg: "bg-lime-100 dark:bg-lime-950/40", text: "text-lime-600 dark:text-lime-400", selectedBorder: "border-lime-400 dark:border-lime-500", selectedBg: "bg-lime-50 dark:bg-lime-950/30", selectedRing: "ring-lime-300/50", checkColor: "text-lime-500" },
  "forestry": { icon: TreePine, bg: "bg-lime-100 dark:bg-lime-950/40", text: "text-lime-600 dark:text-lime-400", selectedBorder: "border-lime-400 dark:border-lime-500", selectedBg: "bg-lime-50 dark:bg-lime-950/30", selectedRing: "ring-lime-300/50", checkColor: "text-lime-500" },
  "applied sciences": { icon: FlaskConical, bg: "bg-cyan-100 dark:bg-cyan-950/40", text: "text-cyan-600 dark:text-cyan-400", selectedBorder: "border-cyan-400 dark:border-cyan-500", selectedBg: "bg-cyan-50 dark:bg-cyan-950/30", selectedRing: "ring-cyan-300/50", checkColor: "text-cyan-500" },
  "sciences": { icon: FlaskConical, bg: "bg-cyan-100 dark:bg-cyan-950/40", text: "text-cyan-600 dark:text-cyan-400", selectedBorder: "border-cyan-400 dark:border-cyan-500", selectedBg: "bg-cyan-50 dark:bg-cyan-950/30", selectedRing: "ring-cyan-300/50", checkColor: "text-cyan-500" },
  "arts": { icon: Palette, bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400", selectedBorder: "border-purple-400 dark:border-purple-500", selectedBg: "bg-purple-50 dark:bg-purple-950/30", selectedRing: "ring-purple-300/50", checkColor: "text-purple-500" },
  "design": { icon: Palette, bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400", selectedBorder: "border-purple-400 dark:border-purple-500", selectedBg: "bg-purple-50 dark:bg-purple-950/30", selectedRing: "ring-purple-300/50", checkColor: "text-purple-500" },
  "architecture": { icon: Palette, bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400", selectedBorder: "border-purple-400 dark:border-purple-500", selectedBg: "bg-purple-50 dark:bg-purple-950/30", selectedRing: "ring-purple-300/50", checkColor: "text-purple-500" },
  "computer": { icon: Monitor, bg: "bg-teal-100 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400", selectedBorder: "border-teal-400 dark:border-teal-500", selectedBg: "bg-teal-50 dark:bg-teal-950/30", selectedRing: "ring-teal-300/50", checkColor: "text-teal-500" },
  "it": { icon: Monitor, bg: "bg-teal-100 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400", selectedBorder: "border-teal-400 dark:border-teal-500", selectedBg: "bg-teal-50 dark:bg-teal-950/30", selectedRing: "ring-teal-300/50", checkColor: "text-teal-500" },
  "information technology": { icon: Monitor, bg: "bg-teal-100 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400", selectedBorder: "border-teal-400 dark:border-teal-500", selectedBg: "bg-teal-50 dark:bg-teal-950/30", selectedRing: "ring-teal-300/50", checkColor: "text-teal-500" },
  "education": { icon: BookOpenCheck, bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", selectedBorder: "border-emerald-400 dark:border-emerald-500", selectedBg: "bg-emerald-50 dark:bg-emerald-950/30", selectedRing: "ring-emerald-300/50", checkColor: "text-emerald-500" },
  "training": { icon: BookOpenCheck, bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", selectedBorder: "border-emerald-400 dark:border-emerald-500", selectedBg: "bg-emerald-50 dark:bg-emerald-950/30", selectedRing: "ring-emerald-300/50", checkColor: "text-emerald-500" },
  "engineering": { icon: Cog, bg: "bg-slate-100 dark:bg-slate-800/40", text: "text-slate-600 dark:text-slate-400", selectedBorder: "border-slate-400 dark:border-slate-500", selectedBg: "bg-slate-50 dark:bg-slate-900/30", selectedRing: "ring-slate-300/50", checkColor: "text-slate-500" },
  "technology": { icon: Cog, bg: "bg-slate-100 dark:bg-slate-800/40", text: "text-slate-600 dark:text-slate-400", selectedBorder: "border-slate-400 dark:border-slate-500", selectedBg: "bg-slate-50 dark:bg-slate-900/30", selectedRing: "ring-slate-300/50", checkColor: "text-slate-500" },
  "environmental": { icon: Mountain, bg: "bg-green-100 dark:bg-green-950/40", text: "text-green-600 dark:text-green-400", selectedBorder: "border-green-400 dark:border-green-500", selectedBg: "bg-green-50 dark:bg-green-950/30", selectedRing: "ring-green-300/50", checkColor: "text-green-500" },
  "earth": { icon: Mountain, bg: "bg-green-100 dark:bg-green-950/40", text: "text-green-600 dark:text-green-400", selectedBorder: "border-green-400 dark:border-green-500", selectedBg: "bg-green-50 dark:bg-green-950/30", selectedRing: "ring-green-300/50", checkColor: "text-green-500" },
  "hospitality": { icon: Hotel, bg: "bg-rose-100 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400", selectedBorder: "border-rose-400 dark:border-rose-500", selectedBg: "bg-rose-50 dark:bg-rose-950/30", selectedRing: "ring-rose-300/50", checkColor: "text-rose-500" },
  "leisure": { icon: Hotel, bg: "bg-rose-100 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400", selectedBorder: "border-rose-400 dark:border-rose-500", selectedBg: "bg-rose-50 dark:bg-rose-950/30", selectedRing: "ring-rose-300/50", checkColor: "text-rose-500" },
  "sports": { icon: Hotel, bg: "bg-rose-100 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400", selectedBorder: "border-rose-400 dark:border-rose-500", selectedBg: "bg-rose-50 dark:bg-rose-950/30", selectedRing: "ring-rose-300/50", checkColor: "text-rose-500" },
  "humanities": { icon: ScrollText, bg: "bg-indigo-100 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400", selectedBorder: "border-indigo-400 dark:border-indigo-500", selectedBg: "bg-indigo-50 dark:bg-indigo-950/30", selectedRing: "ring-indigo-300/50", checkColor: "text-indigo-500" },
  "journalism": { icon: Newspaper, bg: "bg-sky-100 dark:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400", selectedBorder: "border-sky-400 dark:border-sky-500", selectedBg: "bg-sky-50 dark:bg-sky-950/30", selectedRing: "ring-sky-300/50", checkColor: "text-sky-500" },
  "media": { icon: Newspaper, bg: "bg-sky-100 dark:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400", selectedBorder: "border-sky-400 dark:border-sky-500", selectedBg: "bg-sky-50 dark:bg-sky-950/30", selectedRing: "ring-sky-300/50", checkColor: "text-sky-500" },
  "law": { icon: Scale, bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", selectedBorder: "border-amber-400 dark:border-amber-500", selectedBg: "bg-amber-50 dark:bg-amber-950/30", selectedRing: "ring-amber-300/50", checkColor: "text-amber-500" },
  "medicine": { icon: Stethoscope, bg: "bg-red-100 dark:bg-red-950/40", text: "text-red-600 dark:text-red-400", selectedBorder: "border-red-400 dark:border-red-500", selectedBg: "bg-red-50 dark:bg-red-950/30", selectedRing: "ring-red-300/50", checkColor: "text-red-500" },
  "health": { icon: Stethoscope, bg: "bg-red-100 dark:bg-red-950/40", text: "text-red-600 dark:text-red-400", selectedBorder: "border-red-400 dark:border-red-500", selectedBg: "bg-red-50 dark:bg-red-950/30", selectedRing: "ring-red-300/50", checkColor: "text-red-500" },
  "short courses": { icon: Clock, bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", selectedBorder: "border-violet-400 dark:border-violet-500", selectedBg: "bg-violet-50 dark:bg-violet-950/30", selectedRing: "ring-violet-300/50", checkColor: "text-violet-500" },
  "trade": { icon: Wrench, bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", selectedBorder: "border-amber-400 dark:border-amber-500", selectedBg: "bg-amber-50 dark:bg-amber-950/30", selectedRing: "ring-amber-300/50", checkColor: "text-amber-500" },
  "professional": { icon: GradCap, bg: "bg-blue-100 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", selectedBorder: "border-blue-400 dark:border-blue-500", selectedBg: "bg-blue-50 dark:bg-blue-950/30", selectedRing: "ring-blue-300/50", checkColor: "text-blue-500" },
};

const DEFAULT_STYLE: DisciplineStyle = {
  icon: BookOpen,
  bg: "bg-primary/10",
  text: "text-primary",
  selectedBorder: "border-primary",
  selectedBg: "bg-primary/10",
  selectedRing: "ring-primary/30",
  checkColor: "text-primary",
};

function getStyleForDiscipline(discipline: string): DisciplineStyle {
  const lower = discipline.toLowerCase();
  for (const [keyword, style] of Object.entries(DISCIPLINE_STYLE_MAP)) {
    if (lower.includes(keyword)) return style;
  }
  return DEFAULT_STYLE;
}

interface FilterOptions {
  disciplines: string[];
  levels: string[];
  countries: string[];
}

const TOTAL_STEPS = 4;

const STEP_TITLES = [
  "What do you want to study?",
  "What level of study?",
  "Where do you want to study?",
  "What's your budget?",
];

interface CourseMatchQuizProps {
  open: boolean;
  onClose: () => void;
}

export function CourseMatchQuiz({ open, onClose }: CourseMatchQuizProps) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animating, setAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [budgetRange, setBudgetRange] = useState<[number, number]>([5000, 60000]);

  const { data: filterOptions, isLoading: filtersLoading } = useQuery<FilterOptions>({
    queryKey: ["/api/courses/filter-options"],
  });

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setStep(0);
      setDirection("forward");
      setAnimating(false);
      setSelectedDiscipline("");
      setSelectedLevel("");
      setSelectedCountry("");
      setBudgetRange([5000, 60000]);
      document.body.style.overflow = "hidden";
      setTimeout(() => modalRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return !!selectedDiscipline;
      case 1: return !!selectedLevel;
      case 2: return !!selectedCountry;
      case 3: return true;
      default: return false;
    }
  }, [step, selectedDiscipline, selectedLevel, selectedCountry]);

  const transitionTo = (nextStep: number, dir: "forward" | "backward") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 300);
  };

  const handleNext = useCallback(() => {
    if (!canProceed()) return;
    if (step < TOTAL_STEPS - 1) {
      transitionTo(step + 1, "forward");
    } else {
      handleComplete();
    }
  }, [step, canProceed]);

  const handleBack = () => {
    if (step > 0) {
      transitionTo(step - 1, "backward");
    }
  };

  const handleComplete = () => {
    const params = new URLSearchParams();
    if (selectedDiscipline) params.set("discipline", selectedDiscipline);
    if (selectedLevel) params.set("level", selectedLevel);
    if (selectedCountry) params.set("country", selectedCountry);
    if (budgetRange[0] > 5000) params.set("minFees", budgetRange[0].toString());
    if (budgetRange[1] < 100000) params.set("maxFees", budgetRange[1].toString());

    onClose();
    navigate(`/courses?${params.toString()}`);
  };

  const handleSelectDiscipline = (disc: string) => {
    setSelectedDiscipline(disc);
    setTimeout(() => {
      if (step === 0) transitionTo(1, "forward");
    }, 250);
  };

  const handleSelectLevel = (level: string) => {
    setSelectedLevel(level);
    setTimeout(() => {
      if (step === 1) transitionTo(2, "forward");
    }, 250);
  };

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    setTimeout(() => {
      if (step === 2) transitionTo(3, "forward");
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if (e.key === "Enter" && canProceed()) {
      e.preventDefault();
      handleNext();
    }
  };

  if (!open) return null;

  const disciplines = filterOptions?.disciplines || [];
  const levels = filterOptions?.levels || [];
  const countries = filterOptions?.countries || [];

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const getSlideClass = () => {
    if (animating) {
      return direction === "forward"
        ? "opacity-0 translate-y-8"
        : "opacity-0 -translate-y-8";
    }
    return "opacity-100 translate-y-0";
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-title"
      aria-describedby="quiz-description"
      data-testid="quiz-modal-overlay"
      onKeyDown={handleKeyDown}
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" data-testid="quiz-modal-container">
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden z-10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
            data-testid="quiz-progress-bar"
          />
        </div>

        <div className="flex items-center justify-between pt-6 pb-2 px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Step {step + 1} of {TOTAL_STEPS}</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close quiz"
            data-testid="quiz-close-button"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className={`flex-1 overflow-y-auto px-1 pb-4 transition-all duration-300 ease-out ${getSlideClass()}`}>
          {step === 0 && (
            <div className="space-y-6" data-testid="quiz-step-discipline">
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_TITLES[0]}</h2>
                <p id="quiz-description" className="text-muted-foreground text-base">Choose your preferred field of study</p>
              </div>
              {filtersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : disciplines.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No disciplines available at this time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {disciplines.map((disc) => {
                    const style = getStyleForDiscipline(disc);
                    const IconComponent = style.icon;
                    const isSelected = selectedDiscipline === disc;
                    return (
                      <button
                        key={disc}
                        onClick={() => handleSelectDiscipline(disc)}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all duration-200",
                          "hover-elevate",
                          isSelected
                            ? `${style.selectedBorder} ${style.selectedBg} ring-1 ${style.selectedRing}`
                            : "border-border"
                        )}
                        data-testid={`quiz-discipline-${disc.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      >
                        <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0", style.bg)}>
                          <IconComponent className={cn("h-[18px] w-[18px]", style.text)} />
                        </div>
                        <span className="text-sm font-medium text-foreground">{disc}</span>
                        {isSelected && (
                          <Check className={cn("h-4 w-4 ml-auto flex-shrink-0", style.checkColor)} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6" data-testid="quiz-step-level">
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                  <GraduationCap className="h-7 w-7 text-primary" />
                </div>
                <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_TITLES[1]}</h2>
                <p id="quiz-description" className="text-muted-foreground text-base">Select the qualification you're aiming for</p>
              </div>
              {filtersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : levels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No levels available at this time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {levels.map((level) => (
                    <button
                      key={level}
                      onClick={() => handleSelectLevel(level)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all duration-200",
                        "hover-elevate",
                        selectedLevel === level
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border"
                      )}
                      data-testid={`quiz-level-${level.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    >
                      <span className="text-sm font-medium text-foreground">{level}</span>
                      {selectedLevel === level && (
                        <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6" data-testid="quiz-step-country">
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                  <Globe className="h-7 w-7 text-primary" />
                </div>
                <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_TITLES[2]}</h2>
                <p id="quiz-description" className="text-muted-foreground text-base">Pick your dream study destination</p>
              </div>
              {filtersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : countries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No destinations available at this time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
                  {countries.map((countryName) => {
                    const countryData = getCountryByName(countryName);
                    const code = countryData?.code || "";
                    return (
                      <button
                        key={countryName}
                        onClick={() => handleSelectCountry(countryName)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-200",
                          "hover-elevate",
                          selectedCountry === countryName
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "border-border"
                        )}
                        data-testid={`quiz-country-${code.toLowerCase() || countryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      >
                        {code && (
                          <img
                            src={getFlagUrl(code)}
                            alt={countryName}
                            className="w-8 h-6 object-cover rounded-sm shadow-sm"
                          />
                        )}
                        <span className="text-base font-medium text-foreground">{countryName}</span>
                        {selectedCountry === countryName && (
                          <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8" data-testid="quiz-step-budget">
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                  <DollarSign className="h-7 w-7 text-primary" />
                </div>
                <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_TITLES[3]}</h2>
                <p id="quiz-description" className="text-muted-foreground text-base">Set your annual tuition budget range (AUD)</p>
              </div>
              <div className="max-w-md mx-auto space-y-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary" data-testid="quiz-budget-display">
                    ${budgetRange[0].toLocaleString()} &ndash; ${budgetRange[1].toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">AUD per year</p>
                </div>
                <div className="px-2">
                  <Slider
                    value={budgetRange}
                    onValueChange={(val) => setBudgetRange(val as [number, number])}
                    min={5000}
                    max={100000}
                    step={1000}
                    className="w-full"
                    data-testid="quiz-budget-slider"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-3">
                    <span>$5,000</span>
                    <span>$100,000</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 pb-2 px-1 border-t border-border/50">
          <div>
            {step > 0 ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                data-testid="quiz-back-button"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>
          <div className="flex items-center gap-2">
            {step < TOTAL_STEPS - 1 && canProceed() && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Press Enter
              </span>
            )}
            {step === TOTAL_STEPS - 1 ? (
              <Button
                onClick={handleComplete}
                className="bg-accent text-white border-accent-border"
                data-testid="quiz-find-courses-button"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Match My Courses
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : canProceed() ? (
              <Button
                onClick={handleNext}
                data-testid="quiz-next-button"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
