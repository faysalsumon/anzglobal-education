import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap, BookOpen, Globe, DollarSign, ArrowRight, ArrowLeft, X, Sparkles, Check,
  Briefcase, TreePine, FlaskConical, Palette, Monitor, BookOpenCheck, Cog, Mountain,
  Hotel, ScrollText, Newspaper, Scale, Stethoscope, Clock, Wrench, Loader2, GraduationCap as GradCap,
  User, Phone, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { getFlagUrl, getCountryByName } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { useRegion } from "@/context/RegionContext";
import { apiRequest } from "@/lib/queryClient";
import { getFrameworksForCountry, FRAMEWORK_CONFIGS } from "@shared/qualification-frameworks";
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

type StepType = "country" | "discipline" | "level" | "budget" | "name" | "email" | "phone";

const BD_STEPS: StepType[] = ["country", "discipline", "level", "budget", "name", "email", "phone"];
const AU_STEPS: StepType[] = ["discipline", "level", "budget", "name", "email", "phone"];

const STEP_CONFIG: Record<StepType, { title: string; subtitle: string; icon: LucideIcon }> = {
  country:    { title: "Where do you want to study?",   subtitle: "Pick your dream study destination",              icon: Globe },
  discipline: { title: "What do you want to study?",    subtitle: "Choose your preferred field of study",           icon: BookOpen },
  level:      { title: "What level of study?",          subtitle: "Select the qualification you're aiming for",     icon: GraduationCap },
  budget:     { title: "What's your budget?",           subtitle: "Set your annual tuition budget range (AUD)",     icon: DollarSign },
  name:       { title: "What's your name?",             subtitle: "We'd love to know who we're helping",            icon: User },
  email:      { title: "What's your email address?",    subtitle: "We'll send your matched courses here",           icon: Mail },
  phone:      { title: "What's your mobile number?",   subtitle: "Our counselor will reach out to help you",       icon: Phone },
};

interface CourseMatchQuizProps {
  open: boolean;
  onClose: () => void;
}

export function CourseMatchQuiz({ open, onClose }: CourseMatchQuizProps) {
  const [, navigate] = useLocation();
  const { regionCode } = useRegion();
  const isBD = regionCode?.toUpperCase() === "BD";
  const steps = isBD ? BD_STEPS : AU_STEPS;
  const totalSteps = steps.length;

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animating, setAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [budgetRange, setBudgetRange] = useState<[number, number]>([5000, 60000]);

  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("+880 ");
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [submittingLead, setSubmittingLead] = useState(false);

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
      setSelectedCountry(isBD ? "" : "Australia");
      setBudgetRange([5000, 60000]);
      setContactFirstName("");
      setContactLastName("");
      setContactEmail("");
      setContactPhone("+880 ");
      setContactErrors({});
      setSubmittingLead(false);
      document.body.style.overflow = "hidden";
      setTimeout(() => modalRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const currentStepType = steps[step];

  const canProceed = useCallback(() => {
    switch (currentStepType) {
      case "country":    return !!selectedCountry;
      case "discipline": return !!selectedDiscipline;
      case "level":      return !!selectedLevel;
      case "budget":     return true;
      case "name":       return !!contactFirstName.trim() && !!contactLastName.trim();
      case "email": {
        const t = contactEmail.trim();
        return !!t && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
      }
      case "phone":      return contactPhone.replace(/\D/g, "").length >= 10;
      default:           return false;
    }
  }, [currentStepType, selectedCountry, selectedDiscipline, selectedLevel, contactFirstName, contactLastName, contactEmail, contactPhone]);

  const transitionTo = (nextStep: number, dir: "forward" | "backward") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => { setStep(nextStep); setAnimating(false); }, 300);
  };

  const handleBack = () => {
    if (step > 0) transitionTo(step - 1, "backward");
  };

  const buildCourseUrl = () => {
    const params = new URLSearchParams();
    if (selectedDiscipline) params.set("discipline", selectedDiscipline);
    if (selectedLevel) params.set("level", selectedLevel);
    if (selectedCountry) params.set("country", selectedCountry);
    if (budgetRange[0] > 5000)    params.set("minFees", budgetRange[0].toString());
    if (budgetRange[1] < 100000)  params.set("maxFees", budgetRange[1].toString());
    if (isBD) params.set("region", "BD");
    return `/courses?${params.toString()}`;
  };

  const handleComplete = () => {
    onClose();
    navigate(buildCourseUrl());
  };

  const handleNext = useCallback(() => {
    if (!canProceed()) return;
    if (step < totalSteps - 1) {
      transitionTo(step + 1, "forward");
    } else {
      handleComplete();
    }
  }, [step, totalSteps, canProceed]);

  const handleSubmitAndNavigate = async () => {
    const phoneDigits = contactPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setContactErrors({ phone: "Please enter a valid phone number (min 10 digits)" });
      return;
    }
    setSubmittingLead(true);
    setContactErrors({});
    try {
      await apiRequest("POST", "/api/public/quiz-leads", {
        firstName: contactFirstName.trim(),
        lastName: contactLastName.trim(),
        email: contactEmail.trim().toLowerCase(),
        phone: contactPhone.trim(),
        discipline: selectedDiscipline,
        level: selectedLevel,
        country: selectedCountry,
        budgetMin: budgetRange[0],
        budgetMax: budgetRange[1],
        regionCode: regionCode || "AU",
      });
      onClose();
      navigate(buildCourseUrl());
    } catch {
      setContactErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleSelectDiscipline = (disc: string) => {
    setSelectedDiscipline(disc);
    const idx = steps.indexOf("discipline");
    setTimeout(() => { if (step === idx) transitionTo(step + 1, "forward"); }, 250);
  };

  const handleSelectLevel = (level: string) => {
    setSelectedLevel(level);
    const idx = steps.indexOf("level");
    setTimeout(() => { if (step === idx) transitionTo(step + 1, "forward"); }, 250);
  };

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    setSelectedLevel("");
    const idx = steps.indexOf("country");
    setTimeout(() => { if (step === idx) transitionTo(step + 1, "forward"); }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if (e.key === "Enter" && canProceed() && currentStepType !== "phone") {
      e.preventDefault();
      handleNext();
    }
  };

  if (!open) return null;

  const disciplines = filterOptions?.disciplines || [];
  const allLevels   = filterOptions?.levels || [];
  const countries   = filterOptions?.countries || [];

  const progress = ((step + 1) / totalSteps) * 100;

  const getSlideClass = () => {
    if (animating) {
      return direction === "forward" ? "opacity-0 translate-y-8" : "opacity-0 -translate-y-8";
    }
    return "opacity-100 translate-y-0";
  };

  const renderDisciplineStep = () => (
    <div className="space-y-6" data-testid="quiz-step-discipline">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>
        <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_CONFIG.discipline.title}</h2>
        <p id="quiz-description" className="text-muted-foreground text-base">{STEP_CONFIG.discipline.subtitle}</p>
      </div>
      {filtersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : disciplines.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><p>No disciplines available at this time.</p></div>
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
                  "flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all duration-200 hover-elevate",
                  isSelected ? `${style.selectedBorder} ${style.selectedBg} ring-1 ${style.selectedRing}` : "border-border"
                )}
                data-testid={`quiz-discipline-${disc.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              >
                <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0", style.bg)}>
                  <IconComponent className={cn("h-[18px] w-[18px]", style.text)} />
                </div>
                <span className="text-sm font-medium text-foreground">{disc}</span>
                {isSelected && <Check className={cn("h-4 w-4 ml-auto flex-shrink-0", style.checkColor)} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderLevelStep = () => {
    const effectiveCountry = isBD ? (selectedCountry || null) : 'Australia';
    const frameworks = getFrameworksForCountry(effectiveCountry);
    const allowedValues = new Set(
      frameworks.flatMap(fw => (FRAMEWORK_CONFIGS[fw]?.levels ?? []).map(l => l.value))
    );
    const displayLevels = effectiveCountry
      ? allLevels.filter(l => allowedValues.has(l))
      : allLevels;

    return (
      <div className="space-y-6" data-testid="quiz-step-level">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_CONFIG.level.title}</h2>
          <p id="quiz-description" className="text-muted-foreground text-base">{STEP_CONFIG.level.subtitle}</p>
          {isBD && selectedCountry && (
            <p className="text-xs text-muted-foreground/70">Showing qualifications for {selectedCountry}</p>
          )}
        </div>
        {filtersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : displayLevels.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No qualification levels found for {selectedCountry || "this selection"}.</p>
            <p className="text-xs mt-1">Please go back and choose a different country.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {displayLevels.map((level) => (
              <button
                key={level}
                onClick={() => handleSelectLevel(level)}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all duration-200 hover-elevate",
                  selectedLevel === level ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border"
                )}
                data-testid={`quiz-level-${level.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              >
                <span className="text-sm font-medium text-foreground">{level}</span>
                {selectedLevel === level && <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCountryStep = () => (
    <div className="space-y-6" data-testid="quiz-step-country">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
          <Globe className="h-7 w-7 text-primary" />
        </div>
        <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_CONFIG.country.title}</h2>
        <p id="quiz-description" className="text-muted-foreground text-base">{STEP_CONFIG.country.subtitle}</p>
      </div>
      {filtersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : countries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><p>No destinations available at this time.</p></div>
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
                  "flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-200 hover-elevate",
                  selectedCountry === countryName ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border"
                )}
                data-testid={`quiz-country-${code.toLowerCase() || countryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              >
                {code && (
                  <img src={getFlagUrl(code)} alt={countryName} className="w-8 h-6 object-cover rounded-sm shadow-sm" />
                )}
                <span className="text-base font-medium text-foreground">{countryName}</span>
                {selectedCountry === countryName && <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderBudgetStep = () => (
    <div className="space-y-8" data-testid="quiz-step-budget">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
          <DollarSign className="h-7 w-7 text-primary" />
        </div>
        <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_CONFIG.budget.title}</h2>
        <p id="quiz-description" className="text-muted-foreground text-base">{STEP_CONFIG.budget.subtitle}</p>
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
  );

  const renderNameStep = () => (
    <div className="space-y-8" data-testid="quiz-step-name">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_CONFIG.name.title}</h2>
        <p id="quiz-description" className="text-muted-foreground text-base">{STEP_CONFIG.name.subtitle}</p>
      </div>
      <div className="max-w-md mx-auto space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quiz-first-name" className="text-sm font-medium">First Name</Label>
            <Input
              id="quiz-first-name"
              autoFocus
              value={contactFirstName}
              onChange={(e) => { setContactFirstName(e.target.value); setContactErrors(p => ({ ...p, firstName: "" })); }}
              placeholder="Your first name"
              data-testid="quiz-input-first-name"
            />
            {contactErrors.firstName && <p className="text-xs text-destructive">{contactErrors.firstName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiz-last-name" className="text-sm font-medium">Last Name</Label>
            <Input
              id="quiz-last-name"
              value={contactLastName}
              onChange={(e) => { setContactLastName(e.target.value); setContactErrors(p => ({ ...p, lastName: "" })); }}
              placeholder="Your last name"
              data-testid="quiz-input-last-name"
            />
            {contactErrors.lastName && <p className="text-xs text-destructive">{contactErrors.lastName}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmailStep = () => (
    <div className="space-y-8" data-testid="quiz-step-email">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_CONFIG.email.title}</h2>
        <p id="quiz-description" className="text-muted-foreground text-base">{STEP_CONFIG.email.subtitle}</p>
      </div>
      <div className="max-w-md mx-auto space-y-2">
        <Label htmlFor="quiz-email" className="text-sm font-medium">Email Address</Label>
        <Input
          id="quiz-email"
          type="email"
          autoFocus
          value={contactEmail}
          onChange={(e) => { setContactEmail(e.target.value); setContactErrors(p => ({ ...p, email: "" })); }}
          placeholder="you@example.com"
          data-testid="quiz-input-email"
        />
        {contactErrors.email && <p className="text-xs text-destructive">{contactErrors.email}</p>}
      </div>
    </div>
  );

  const renderPhoneStep = () => (
    <div className="space-y-8" data-testid="quiz-step-phone">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
          <Phone className="h-7 w-7 text-primary" />
        </div>
        <h2 id="quiz-title" className="text-2xl sm:text-3xl font-bold text-foreground">{STEP_CONFIG.phone.title}</h2>
        <p id="quiz-description" className="text-muted-foreground text-base">{STEP_CONFIG.phone.subtitle}</p>
      </div>
      <div className="max-w-md mx-auto space-y-2">
        <Label htmlFor="quiz-phone" className="text-sm font-medium">Mobile Number</Label>
        <Input
          id="quiz-phone"
          type="tel"
          autoFocus
          value={contactPhone}
          onChange={(e) => { setContactPhone(e.target.value); setContactErrors(p => ({ ...p, phone: "" })); }}
          placeholder={isBD ? "+880 1XXXXXXXXX" : "+61 4XX XXX XXX"}
          data-testid="quiz-input-phone"
        />
        {contactErrors.phone && <p className="text-xs text-destructive">{contactErrors.phone}</p>}
        {contactErrors.submit && (
          <p className="text-sm text-destructive text-center pt-2">{contactErrors.submit}</p>
        )}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStepType) {
      case "country":    return renderCountryStep();
      case "discipline": return renderDisciplineStep();
      case "level":      return renderLevelStep();
      case "budget":     return renderBudgetStep();
      case "name":       return renderNameStep();
      case "email":      return renderEmailStep();
      case "phone":      return renderPhoneStep();
      default:           return null;
    }
  };

  const isPhoneStep = currentStepType === "phone";

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
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden z-10"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
            data-testid="quiz-progress-bar"
          />
        </div>

        <div className="flex items-center justify-between pt-6 pb-2 px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Step {step + 1} of {totalSteps}</span>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close quiz" data-testid="quiz-close-button">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className={`flex-1 overflow-y-auto px-1 pb-4 transition-all duration-300 ease-out ${getSlideClass()}`}>
          {renderCurrentStep()}
        </div>

        <div className="flex items-center justify-between pt-4 pb-2 px-1 border-t border-border/50">
          <div>
            {step > 0 ? (
              <Button variant="ghost" onClick={handleBack} data-testid="quiz-back-button">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPhoneStep ? (
              <Button
                onClick={handleSubmitAndNavigate}
                disabled={submittingLead || !canProceed()}
                className="bg-accent text-white border-accent-border"
                data-testid="quiz-get-results-button"
              >
                {submittingLead ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Get My Results
                {!submittingLead && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            ) : canProceed() ? (
              <Button onClick={handleNext} data-testid="quiz-next-button">
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
