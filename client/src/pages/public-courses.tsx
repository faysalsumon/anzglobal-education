/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/useTranslation";
import { trackSearch } from "@/lib/meta-pixel";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/public-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, MapPin, DollarSign, Clock, GraduationCap, Sparkles, LogIn, Home, Heart, GitCompare, X, Mail, Building2, Filter, BookOpen, Layers, Globe, ChevronDown, RotateCcw, ArrowUpDown, CheckCircle2, Loader2, PhoneCall } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { CourseWithDetails, Favorite, CourseComparison, SubDiscipline } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getFeePeriodLabel } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { useQueryParams } from "@/hooks/useQueryParams";
import { ListPagination } from "@/components/list-pagination";
import { InstitutionLogo } from "@/components/institution-logo";
import { getCountryByName, getFlagUrl } from "@/lib/countries";
import { Slider } from "@/components/ui/slider";
import { TagMarquee } from "@/components/ui/tag-marquee";
import { useRegion } from "@/context/RegionContext";

// Normalize Australian state names to abbreviations (mirrors backend logic)
const normalizeAustralianState = (state: string): string => {
  const s = state.trim();
  const map: Record<string, string> = {
    'Victoria': 'VIC', 'New South Wales': 'NSW', 'Queensland': 'QLD',
    'South Australia': 'SA', 'Western Australia': 'WA',
    'Tasmania': 'TAS', 'Northern Territory': 'NT',
    'Australian Capital Territory': 'ACT',
  };
  return map[s] || s;
};

// Utility function to normalize city names for consistent matching
const _normalizeCity = (city: string): string => {
  return city
    .toLowerCase()
    .trim()
    // Remove state/country suffixes like ", VIC", ", NSW", ", Australia"
    .replace(/,\s*(vic|nsw|qld|sa|wa|tas|nt|act|australia|bangladesh)\b.*$/i, '')
    // Remove common suburb indicators like "CBD"
    .replace(/\s+(cbd|city|metro|central)\b/i, '')
    .trim();
};

// Helper type for campus address
type CampusAddress = { country?: string; state?: string; city?: string };

// Helper function to extract unique cities from a course's institution campusAddresses
// with fallback to campusLocations and course.location
const extractCourseCities = (
  course: { university?: { campusAddresses?: CampusAddress[] } | null; campusLocations?: string[]; location?: string | null }
): string[] => {
  const cities: string[] = [];
  
  // First try to get cities from institution campusAddresses
  const campusAddresses = course.university?.campusAddresses;
  if (campusAddresses && Array.isArray(campusAddresses)) {
    campusAddresses.forEach((campus) => {
      if (campus.city && !cities.includes(campus.city)) {
        cities.push(campus.city);
      }
    });
  }
  
  // Fallback to campusLocations if no campusAddresses cities
  if (cities.length === 0 && course.campusLocations) {
    course.campusLocations.forEach((loc: string) => {
      if (loc && !cities.includes(loc)) {
        cities.push(loc);
      }
    });
  }
  
  return cities;
};

// Filter snapshot type for state/URL comparison
type FilterSnapshot = {
  searchTerm: string;
  subject: string;
  discipline: string;
  subDiscipline: string;
  level: string;
  country: string;
  campusState: string;
  universityFilter: string;
  campusCity: string;
  minFees: number | null;
  maxFees: number | null;
  feeCurrency: string;
};

// Create snapshot from current state
const createStateSnapshot = (
  searchTerm: string,
  subject: string,
  discipline: string,
  subDiscipline: string,
  level: string,
  country: string,
  campusState: string,
  universityFilter: string,
  campusCity: string,
  minFees: number | null,
  maxFees: number | null,
  feeCurrency: string
): FilterSnapshot => ({
  searchTerm,
  subject,
  discipline,
  subDiscipline,
  level,
  country,
  campusState,
  universityFilter,
  campusCity,
  minFees,
  maxFees,
  feeCurrency,
});

// Create snapshot from URL params
const createParamsSnapshot = (params: URLSearchParams): FilterSnapshot => ({
  searchTerm: params.get('search') || "",
  subject: params.get('subject') || "",
  discipline: params.get('discipline') || "",
  subDiscipline: params.get('subDiscipline') || "",
  level: params.get('level') || "",
  country: params.get('country') || "",
  campusState: params.get('state') || "",
  universityFilter: params.get('university') || "",
  campusCity: params.get('city') || "",
  minFees: params.get('minFees') ? parseInt(params.get('minFees')!) : null,
  maxFees: params.get('maxFees') ? parseInt(params.get('maxFees')!) : null,
  feeCurrency: params.get('currency') || "",
});

// Compare two snapshots
const snapshotsEqual = (a: FilterSnapshot, b: FilterSnapshot): boolean => {
  return (
    a.searchTerm === b.searchTerm &&
    a.subject === b.subject &&
    a.discipline === b.discipline &&
    a.subDiscipline === b.subDiscipline &&
    a.level === b.level &&
    a.country === b.country &&
    a.campusState === b.campusState &&
    a.universityFilter === b.universityFilter &&
    a.campusCity === b.campusCity &&
    a.minFees === b.minFees &&
    a.maxFees === b.maxFees &&
    a.feeCurrency === b.feeCurrency
  );
};

const courseSearchLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  lookingFor: z.string().optional(),
});
type CourseSearchLeadForm = z.infer<typeof courseSearchLeadSchema>;

function CourseSearchLeadCapture({
  searchTerm,
  discipline,
  level,
  country,
}: {
  searchTerm: string;
  discipline: string;
  level: string;
  country: string;
}) {
  const { toast } = useToast();
  const { regionCode } = useRegion();
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("quiz_lead_submitted");
      if (raw) {
        sessionStorage.removeItem("quiz_lead_submitted");
        const { firstName } = JSON.parse(raw) as { firstName: string; submittedAt: number };
        setSubmittedName(firstName || null);
        setSubmitted(true);
      }
    } catch {
      // ignore malformed sessionStorage entries
    }
  }, []);

  const form = useForm<CourseSearchLeadForm>({
    resolver: zodResolver(courseSearchLeadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      lookingFor: searchTerm || "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CourseSearchLeadForm) =>
      apiRequest("POST", "/api/public/course-search-leads", {
        ...values,
        discipline: discipline || undefined,
        level: level || undefined,
        country: country || undefined,
        regionCode: regionCode || undefined,
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-primary opacity-80" />
          <p className="text-lg font-semibold mb-2">
            {submittedName ? `Thanks, ${submittedName}!` : "Thank you!"}
          </p>
          <p className="text-sm text-muted-foreground">
            {submittedName
              ? "We already have your details — an education consultant will be in touch with you shortly."
              : "We've received your request and an education consultant will be in touch with you shortly."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <PhoneCall className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Can't find what you're looking for?</CardTitle>
        </div>
        <CardDescription>
          Tell us what you need and our education consultants will reach out to help.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
            data-testid="form-course-search-lead"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane" {...field} data-testid="input-lead-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} data-testid="input-lead-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@example.com" {...field} data-testid="input-lead-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder={regionCode?.toUpperCase() === "AU" ? "+61 400 000 000" : regionCode?.toUpperCase() === "BD" ? "+880 1XXXXXXXXX" : "+XX ..."} {...field} data-testid="input-lead-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lookingFor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are you looking for? <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Masters in Computer Science in the UK"
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="textarea-lead-looking-for"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
              data-testid="button-lead-submit"
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request Consultation
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function PublicCourses() {
  const { t } = useTranslation();
  const { params, setParams } = useQueryParams();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [discipline, setDiscipline] = useState<string>("");
  const [subDiscipline, setSubDiscipline] = useState<string>("");
  const [framework, setFramework] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [campusState, setCampusState] = useState<string>("");
  const [universityFilter, setUniversityFilter] = useState<string>("");
  const [campusCity, setCampusCity] = useState<string>("");
  const [minFees, setMinFees] = useState<number | null>(null);
  const [maxFees, setMaxFees] = useState<number | null>(null);
  const [feeCurrency, setFeeCurrency] = useState<string>("");
  const [highlightedCourseId, setHighlightedCourseId] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedCourseForLead, setSelectedCourseForLead] = useState<CourseWithDetails | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "price-low" | "price-high" | "duration">("name-asc");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    subject: true,
    discipline: true,
    level: true,
    location: true,
    tuition: true,
  });
  
  // Reset collapsible sections to open when mobile sheet closes
  const handleMobileFiltersChange = (open: boolean) => {
    setMobileFiltersOpen(open);
    if (!open) {
      setOpenSections({
        subject: true,
        discipline: true,
        level: true,
        location: true,
        tuition: true,
      });
    }
  };
  const highlightedRef = useRef<HTMLDivElement>(null);
  
  // Track pending URL hydration and previous URL snapshot
  const pendingUrlHydrationRef = useRef<FilterSnapshot | null>(null);
  const previousUrlSnapshotRef = useRef<FilterSnapshot | null>(null);

  // Quiz lead confirmation banner
  const [quizLeadFirstName, setQuizLeadFirstName] = useState<string | null>(null);
  const [showQuizBanner, setShowQuizBanner] = useState(false);
  const [bannerDismissing, setBannerDismissing] = useState(false);
  const quizBannerDecidedRef = useRef(false);
  const quizBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissQuizBanner = () => {
    if (quizBannerTimerRef.current) {
      clearTimeout(quizBannerTimerRef.current);
      quizBannerTimerRef.current = null;
    }
    setBannerDismissing(true);
    setTimeout(() => {
      setShowQuizBanner(false);
      setBannerDismissing(false);
    }, 400);
  };

  useEffect(() => {
    if (!showQuizBanner) return;
    setBannerDismissing(false);
    quizBannerTimerRef.current = setTimeout(() => {
      dismissQuizBanner();
    }, 8000);
    return () => {
      if (quizBannerTimerRef.current) {
        clearTimeout(quizBannerTimerRef.current);
        quizBannerTimerRef.current = null;
      }
    };
  }, [showQuizBanner]);

  const { isAuthenticated, isStudent } = useAuth();
  const { toast } = useToast();
  const { region, regionCode } = useRegion();
  const regionQuery = region?.code ? { region: region.code } : {};
  const isAU = regionCode?.toUpperCase() === 'AU';
  
  const { data: courses = [], isLoading } = useQuery<CourseWithDetails[]>({
    queryKey: ["/api/courses", regionQuery],
  });

  const { data: filterOptions } = useQuery<{ countries: string[]; disciplines: string[]; levels: string[] }>({
    queryKey: ["/api/courses/filter-options"],
  });

  const { data: subDisciplines = [] } = useQuery<SubDiscipline[]>({
    queryKey: ["/api/sub-disciplines", discipline],
    enabled: !!discipline,
  });

  const { data: favorites = [] } = useQuery<Favorite[]>({
    queryKey: ["/api/student/favorites"],
    enabled: isAuthenticated && isStudent,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (data: { itemType: string; itemId: string }) => {
      return await apiRequest("POST", "/api/student/favorites", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({
        title: "Success",
        description: "Added to favorites",
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("already favorited")) {
        toast({
          title: "Already favorited",
          description: "This course is already in your favorites",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add to favorites",
          variant: "destructive",
        });
      }
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      return await apiRequest("DELETE", `/api/student/favorites/${favoriteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({
        title: "Success",
        description: "Removed from favorites",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteToggle = (courseId: string) => {
    if (!isAuthenticated || !isStudent) {
      setShowLoginModal(true);
      return;
    }

    const existingFavorite = favorites.find(
      (f) => f.itemType === "course" && f.itemId === courseId
    );

    if (existingFavorite) {
      removeFavoriteMutation.mutate(existingFavorite.id);
    } else {
      addFavoriteMutation.mutate({
        itemType: "course",
        itemId: courseId,
      });
    }
  };

  const isFavorited = (courseId: string) => {
    return favorites.some(
      (f) => f.itemType === "course" && f.itemId === courseId
    );
  };

  // Course comparison logic - works for guests (localStorage) and logged-in students (API)
  const [_location, navigate] = useLocation();
  const COMPARISON_STORAGE_KEY = 'course_comparisons';
  
  // Guest comparisons stored in localStorage
  const [guestComparisons, setGuestComparisons] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(COMPARISON_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync guest comparisons to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(guestComparisons));
    } catch {
      // localStorage might be full or disabled
    }
  }, [guestComparisons]);

  // API comparisons for logged-in students (optional enhancement)
  const { data: _apiComparisons = [] } = useQuery<CourseComparison[]>({
    queryKey: ["/api/student/comparisons"],
    enabled: isAuthenticated && isStudent,
  });

  // Use guest comparisons (localStorage-based) for everyone
  // This keeps it simple - comparisons work without login
  const comparisons = guestComparisons.map((courseId, index) => ({
    id: `guest-${index}`,
    courseId,
    userId: 'guest',
    createdAt: new Date(),
  }));

  const handleComparisonToggle = (courseId: string) => {
    const isAlreadyComparing = guestComparisons.includes(courseId);

    if (isAlreadyComparing) {
      setGuestComparisons(prev => prev.filter(id => id !== courseId));
      toast({
        title: "Removed",
        description: "Course removed from comparison",
      });
    } else {
      if (guestComparisons.length >= 4) {
        toast({
          title: "Comparison limit reached",
          description: "You can compare up to 4 courses at a time",
          variant: "destructive",
        });
        return;
      }
      setGuestComparisons(prev => [...prev, courseId]);
      toast({
        title: "Added",
        description: "Course added to comparison",
      });
    }
  };

  const clearAllComparisonsMutation = {
    mutate: () => {
      setGuestComparisons([]);
      toast({
        title: "Cleared",
        description: "All comparisons cleared",
      });
    }
  };

  const isInComparison = (courseId: string) => {
    return guestComparisons.includes(courseId);
  };

  const handleCompare = () => {
    if (guestComparisons.length < 2) {
      toast({
        title: "Select more courses",
        description: "Please select at least 2 courses to compare",
        variant: "destructive",
      });
      return;
    }
    const courseIds = guestComparisons.join(',');
    navigate(`/compare-courses?courses=${courseIds}`);
  };

  // Extract unique values from actual course data
  const availableFilters = useMemo(() => {
    const subjects = new Set<string>();
    const disciplines = new Set<string>();
    const frameworks = new Set<string>();
    const levels = new Set<string>();
    const universities = new Map<string, string>();
    const statesByCountry: Record<string, Set<string>> = {};
    const citiesByState: Record<string, Set<string>> = {};

    const currencies = new Set<string>();
    let maxTuitionFee = 0;
    let minTuitionFee = Infinity;
    
    courses.forEach((course) => {
      if (course.subject) subjects.add(course.subject);
      if (course.discipline) disciplines.add(course.discipline);
      if ((course as any).qualificationFramework) frameworks.add((course as any).qualificationFramework);
      if (course.level) levels.add(course.level);
      if (course.currency) currencies.add(course.currency);
      if (course.fees) {
        const fee = Number(course.fees);
        if (fee > 0) {
          if (fee > maxTuitionFee) maxTuitionFee = fee;
          if (fee < minTuitionFee) minTuitionFee = fee;
        }
      }
      if (course.university && course.universityId) {
        universities.set(course.universityId, course.university.name);
      }
      // Extract states and cities from institution campusAddresses if available
      const institution = course.university;
      if (institution && (institution as any).campusAddresses) {
        const campusAddresses = (institution as any).campusAddresses as Array<{ country?: string; state?: string; city?: string }>;
        if (Array.isArray(campusAddresses)) {
          campusAddresses.forEach((campus) => {
            const campusCountry = (campus.country || course.country || "").trim();
            if (campusCountry && campus.state) {
              const normalizedState = campusCountry === 'Australia'
                ? normalizeAustralianState(campus.state)
                : campus.state.trim();
              if (!statesByCountry[campusCountry]) {
                statesByCountry[campusCountry] = new Set();
              }
              statesByCountry[campusCountry].add(normalizedState);

              // Track cities by state key (country:normalizedState)
              const stateKey = `${campusCountry}:${normalizedState}`;
              if (campus.city) {
                if (!citiesByState[stateKey]) {
                  citiesByState[stateKey] = new Set();
                }
                citiesByState[stateKey].add(campus.city.trim());
              }
            }
          });
        }
      }
    });

    // Get states for selected country (cascading)
    const statesForCountry = country && statesByCountry[country] 
      ? Array.from(statesByCountry[country]).sort()
      : [];

    // Get cities for selected state (cascading)
    const stateKey = country && campusState ? `${country}:${campusState}` : '';
    const citiesForState = stateKey && citiesByState[stateKey]
      ? Array.from(citiesByState[stateKey]).sort()
      : [];

    // Round max tuition up to nearest 10000 for nice slider steps
    const roundedMaxTuition = Math.ceil(maxTuitionFee / 10000) * 10000 || 100000;
    // Round min tuition down to nearest 1000 for nice slider steps
    const roundedMinTuition = minTuitionFee === Infinity ? 0 : Math.floor(minTuitionFee / 1000) * 1000;
    
    return {
      subjects: Array.from(subjects).sort(),
      disciplines: Array.from(disciplines).sort(),
      frameworks: Array.from(frameworks).sort(),
      levels: Array.from(levels).sort(),
      countries: filterOptions?.countries ?? [],
      currencies: Array.from(currencies).sort(),
      universities: Array.from(universities.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      states: statesForCountry,
      cities: citiesForState,
      minTuition: roundedMinTuition,
      maxTuition: roundedMaxTuition,
    };
  }, [courses, country, campusState, filterOptions]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (subject) count++;
    if (discipline) count++;
    if (subDiscipline) count++;
    if (framework) count++;
    if (level) count++;
    if (country && !isAU) count++;
    if (campusState) count++;
    if (campusCity) count++;
    if (feeCurrency) count++;
    if (minFees !== null || maxFees !== null) count++;
    return count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, subject, discipline, subDiscipline, framework, level, country, campusState, campusCity, feeCurrency, minFees, maxFees]);

  useEffect(() => {
    if (searchTerm && searchTerm.length >= 3) {
      const timer = setTimeout(() => {
        trackSearch(searchTerm, "Courses");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  // Toggle collapsible section
  const toggleSection = (section: string, open?: boolean) => {
    setOpenSections(prev => ({ ...prev, [section]: open !== undefined ? open : !prev[section] }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSubject("");
    setDiscipline("");
    setSubDiscipline("");
    setFramework("");
    setLevel("");
    setCountry(isAU ? 'Australia' : '');
    setCampusState("");
    setCampusCity("");
    setFeeCurrency("");
    setMinFees(null);
    setMaxFees(null);
    setHighlightedCourseId(null);
    setCurrentPage(1);
  };

  // Parse URL params into state ONLY when URL actually changes
  useEffect(() => {
    // Create snapshot of what the URL wants
    const urlSnapshot = createParamsSnapshot(params);
    
    // Check if URL snapshot changed from previous
    if (previousUrlSnapshotRef.current && snapshotsEqual(urlSnapshot, previousUrlSnapshotRef.current)) {
      // URL hasn't changed, don't parse
      return;
    }
    
    // URL changed! Update previous snapshot
    previousUrlSnapshotRef.current = urlSnapshot;
    
    // Create snapshot of current state
    const currentSnapshot = createStateSnapshot(
      searchTerm, subject, discipline, subDiscipline, level, country, campusState, universityFilter, campusCity, minFees, maxFees, feeCurrency
    );
    
    // If they don't match, hydrate state from URL
    if (!snapshotsEqual(urlSnapshot, currentSnapshot)) {
      // Update state to match URL
      if (urlSnapshot.searchTerm !== searchTerm) setSearchTerm(urlSnapshot.searchTerm);
      if (urlSnapshot.subject !== subject) setSubject(urlSnapshot.subject);
      if (urlSnapshot.discipline !== discipline) setDiscipline(urlSnapshot.discipline);
      if (urlSnapshot.subDiscipline !== subDiscipline) setSubDiscipline(urlSnapshot.subDiscipline);
      if (urlSnapshot.level !== level) setLevel(urlSnapshot.level);
      if (urlSnapshot.country !== country) setCountry(urlSnapshot.country);
      if (urlSnapshot.campusState !== campusState) setCampusState(urlSnapshot.campusState);
      if (urlSnapshot.universityFilter !== universityFilter) setUniversityFilter(urlSnapshot.universityFilter);
      if (urlSnapshot.campusCity !== campusCity) setCampusCity(urlSnapshot.campusCity);
      if (urlSnapshot.minFees !== minFees) setMinFees(urlSnapshot.minFees);
      if (urlSnapshot.maxFees !== maxFees) setMaxFees(urlSnapshot.maxFees);
      if (urlSnapshot.feeCurrency !== feeCurrency) setFeeCurrency(urlSnapshot.feeCurrency);
      
      // Mark that we're pending hydration of this snapshot
      pendingUrlHydrationRef.current = urlSnapshot;
    }
    
    // Handle highlight parameter
    const highlightParam = params.get('highlight');
    if (highlightParam) {
      setHighlightedCourseId(parseInt(highlightParam));
      // Remove highlight from URL after using it
      setParams({ highlight: undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Scroll to highlighted course
  useEffect(() => {
    if (highlightedCourseId && highlightedRef.current) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightedCourseId, courses]);

  // Clear sub-discipline when discipline is cleared
  useEffect(() => {
    if (!discipline && subDiscipline) {
      setSubDiscipline('');
    }
  }, [discipline, subDiscipline]);

  // For AU site, auto-set country to Australia so state/city filters activate immediately
  useEffect(() => {
    if (isAU && !country) {
      setCountry('Australia');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAU]);

  // Clear state and city when country changes (cascading filters)
  useEffect(() => {
    if (!country && !isAU && (campusState || campusCity)) {
      setCampusState('');
      setCampusCity('');
    }
  }, [country, campusState, campusCity, isAU]);

  // Clear city when state changes (cascading filters)
  useEffect(() => {
    if (!campusState && campusCity) {
      setCampusCity('');
    }
  }, [campusState, campusCity]);

  // Clear campus city when any other filter changes and makes the selected city invalid
  useEffect(() => {
    // Only run clearing logic after data has loaded to prevent clearing during initial load/URL hydration
    if (!campusCity || courses.length === 0) return;
    
    // Check if there are any courses matching ALL current filters (except city) that have the selected city
    const hasCoursesWithCity = courses.some(course => {
      // Apply all filters except campusCity (matching filteredCourses logic)
      if (searchTerm && !course.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !course.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !course.subject?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (subject && course.subject !== subject) return false;
      if (discipline && course.discipline !== discipline) return false;
      
      // Sub-discipline filtering
      if (subDiscipline) {
        const selectedSubDiscipline = subDisciplines.find(sd => sd.name === subDiscipline);
        if (selectedSubDiscipline && course.subDisciplineId !== selectedSubDiscipline.id) {
          return false;
        }
      }
      
      if (level && course.level !== level) return false;
      if (country && course.country !== country) return false;
      if (universityFilter && course.universityId !== universityFilter) return false;
      
      // Budget filtering
      if (minFees !== null || maxFees !== null) {
        const courseFees = Number(course.fees) || 0;
        if (minFees !== null && courseFees < minFees) return false;
        if (maxFees !== null && courseFees > maxFees) return false;
      }
      
      // Check if this course has a campus in the selected city using campusAddresses
      const institution = course.university;
      const campusAddresses = institution && (institution as any).campusAddresses 
        ? (institution as any).campusAddresses as Array<{ country?: string; state?: string; city?: string }>
        : null;
      
      if (!campusAddresses || !Array.isArray(campusAddresses)) return false;
      return campusAddresses.some((campus) => {
        const campusCountry = campus.country || course.country;
        return campusCountry === country && campus.state === campusState && campus.city === campusCity;
      });
    });
    
    if (!hasCoursesWithCity) {
      setCampusCity('');
    }
  }, [searchTerm, subject, discipline, subDiscipline, level, country, campusState, universityFilter, minFees, maxFees, campusCity, courses, subDisciplines]);

  // Sync state to URL (only after hydration complete or for user-initiated changes)
  useEffect(() => {
    // Create snapshot of current state
    const currentSnapshot = createStateSnapshot(
      searchTerm, subject, discipline, subDiscipline, level, country, campusState, universityFilter, campusCity, minFees, maxFees, feeCurrency
    );
    
    // If we're pending hydration
    if (pendingUrlHydrationRef.current) {
      // Check if state now matches the pending snapshot
      if (snapshotsEqual(currentSnapshot, pendingUrlHydrationRef.current)) {
        // Hydration complete! Clear the pending flag
        pendingUrlHydrationRef.current = null;
      }
      // Don't sync to URL while hydration is pending
      return;
    }
    
    // No pending hydration - this is a user-initiated change
    // Sync state to URL
    setParams({
      search: searchTerm || undefined,
      subject: subject || undefined,
      discipline: discipline || undefined,
      subDiscipline: subDiscipline || undefined,
      level: level || undefined,
      country: country || undefined,
      state: campusState || undefined,
      university: universityFilter || undefined,
      city: campusCity || undefined,
      minFees: minFees !== null ? minFees.toString() : undefined,
      maxFees: maxFees !== null ? maxFees.toString() : undefined,
      currency: feeCurrency || undefined,
    });
  }, [searchTerm, subject, discipline, subDiscipline, level, country, campusState, universityFilter, campusCity, minFees, maxFees, feeCurrency, setParams]);

  const filteredCourses = courses.filter((course) => {
    if (searchTerm && !course.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !course.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !course.subject?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (subject && course.subject !== subject) return false;
    if (discipline && course.discipline !== discipline) return false;
    
    // Sub-discipline filtering
    if (subDiscipline) {
      const selectedSubDiscipline = subDisciplines.find(sd => sd.name === subDiscipline);
      if (selectedSubDiscipline && course.subDisciplineId !== selectedSubDiscipline.id) {
        return false;
      }
    }
    
    // Framework filtering
    if (framework && (course as any).qualificationFramework !== framework) return false;
    
    if (level && course.level !== level) return false;
    if (country) {
      const courseCountry = course.country;
      const institution = course.university;
      const campuses = institution && (institution as any).campusAddresses
        ? (institution as any).campusAddresses as CampusAddress[]
        : null;
      const institutionCountry = institution ? (institution as any).country : null;
      const matchesCourse = courseCountry === country;
      const matchesInstitution = institutionCountry === country;
      const matchesCampus = campuses && Array.isArray(campuses) && campuses.some(c => c.country === country);
      if (!matchesCourse && !matchesInstitution && !matchesCampus) return false;
    }
    if (universityFilter && course.universityId !== universityFilter) return false;
    
    // State and city filtering using institution campusAddresses
    const institution = course.university;
    const campusAddresses = institution && (institution as any).campusAddresses 
      ? (institution as any).campusAddresses as Array<{ country?: string; state?: string; city?: string }>
      : null;
    
    // State filtering - must match selected state in selected country
    if (campusState) {
      if (!campusAddresses || !Array.isArray(campusAddresses)) return false;
      const hasMatchingState = campusAddresses.some((campus) => {
        const campusCountry = campus.country || course.country;
        return campusCountry === country && campus.state === campusState;
      });
      if (!hasMatchingState) return false;
    }
    
    // City filtering - must match selected city in selected state and country
    if (campusCity) {
      if (!campusAddresses || !Array.isArray(campusAddresses)) return false;
      const hasMatchingCity = campusAddresses.some((campus) => {
        const campusCountry = campus.country || course.country;
        return campusCountry === country && campus.state === campusState && campus.city === campusCity;
      });
      if (!hasMatchingCity) return false;
    }
    
    // Currency filtering
    if (feeCurrency && course.currency !== feeCurrency) return false;
    
    // Budget filtering (only filter if there are fees to compare)
    if (minFees !== null || maxFees !== null) {
      const courseFees = Number(course.fees) || 0;
      if (minFees !== null && courseFees < minFees) return false;
      if (maxFees !== null && courseFees > maxFees) return false;
    }
    
    return true;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, subject, discipline, subDiscipline, framework, level, country, campusState, universityFilter, campusCity, minFees, maxFees, feeCurrency]);

  // Read quiz lead from sessionStorage on mount (without clearing, so no-results path can still use it)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("quiz_lead_submitted");
      if (raw) {
        const { firstName } = JSON.parse(raw) as { firstName: string; submittedAt: number };
        setQuizLeadFirstName(firstName || null);
      }
    } catch {
      // ignore malformed entries
    }
  }, []);

  // Once courses finish loading, decide whether to show banner (only when results ARE found)
  useEffect(() => {
    if (isLoading || quizBannerDecidedRef.current || quizLeadFirstName === null) return;
    quizBannerDecidedRef.current = true;
    if (filteredCourses.length > 0) {
      setShowQuizBanner(true);
      sessionStorage.removeItem("quiz_lead_submitted");
    }
    // If no results, CourseSearchLeadCapture will handle the sessionStorage entry itself
  }, [isLoading, quizLeadFirstName, filteredCourses.length]);

  // Sort filtered courses
  const sortedCourses = useMemo(() => {
    const sorted = [...filteredCourses];
    switch (sortBy) {
      case "name-asc":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "price-low":
        sorted.sort((a, b) => (Number(a.fees) || 0) - (Number(b.fees) || 0));
        break;
      case "price-high":
        sorted.sort((a, b) => (Number(b.fees) || 0) - (Number(a.fees) || 0));
        break;
      case "duration":
        sorted.sort((a, b) => (Number(a.duration) || 0) - (Number(b.duration) || 0));
        break;
    }
    return sorted;
  }, [filteredCourses, sortBy]);

  // Paginate sorted courses
  const totalFilteredCourses = sortedCourses.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCourses = sortedCourses.slice(startIndex, endIndex);

  // SEO data
  const siteUrl = window.location.origin;
  const pageUrl = `${siteUrl}/courses`;
  const pageTitle = "Find Courses - ANZ Global Education";
  const pageDescription = `Explore ${courses.length}+ international courses from top universities worldwide. Search by subject, level, country, and more. Compare courses and find your perfect academic path.`;
  const ogImage = `${siteUrl}/og-image.png`;

  return (
    <PublicLayout>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="ANZ Global Education" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <main id="main-content" className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Breadcrumb */}
          <Breadcrumb data-testid="breadcrumb">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" data-testid="breadcrumb-home">
                    <Home className="h-4 w-4" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage data-testid="breadcrumb-current">Courses</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{t("courses.browseAll")}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t("courses.exploreCount", { count: String(courses.length) })}</p>
          </div>

          {/* Tabs for Courses/Institutions */}
          <div className="flex justify-center">
            <div className="inline-flex border rounded-lg p-1 bg-muted/30">
              <Button variant="default" size="sm" className="px-6" data-testid="tab-courses">
                Courses
              </Button>
              <Link href="/institutions">
                <Button variant="ghost" size="sm" className="px-6" data-testid="tab-institutions">
                  Institutions
                </Button>
              </Link>
            </div>
          </div>

          {/* Two-Column Layout with Filter Sidebar */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mobile Filter Button */}
            <div className="lg:hidden">
              <Sheet open={mobileFiltersOpen} onOpenChange={handleMobileFiltersChange}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full" data-testid="button-mobile-filters">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      Find Your Course
                    </SheetTitle>
                  </SheetHeader>
                  
                  {/* Mobile Filter Content - Same as Desktop */}
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                        aria-label="Search courses"
                        data-testid="input-search-courses-mobile"
                      />
                    </div>

                    {/* Active Filters */}
                    {activeFilterCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Active Filters</span>
                          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs" data-testid="button-clear-all-mobile">
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Clear all
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {subject && (
                            <Badge variant="secondary" className="gap-1 pr-1">
                              {subject}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setSubject("")} data-testid="button-clear-subject-mobile">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {discipline && (
                            <Badge variant="secondary" className="gap-1 pr-1">
                              {discipline}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => { setDiscipline(""); setSubDiscipline(""); }} data-testid="button-clear-discipline-mobile">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {level && (
                            <Badge variant="secondary" className="gap-1 pr-1">
                              {level}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setLevel("")} data-testid="button-clear-level-mobile">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {country && (
                            <Badge variant="secondary" className="gap-1 pr-1">
                              {country}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setCountry("")} data-testid="button-clear-country-mobile">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {campusState && (
                            <Badge variant="secondary" className="gap-1 pr-1">
                              {campusState}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setCampusState("")} data-testid="button-clear-state-mobile">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {campusCity && (
                            <Badge variant="secondary" className="gap-1 pr-1">
                              {campusCity}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setCampusCity("")} data-testid="button-clear-city-mobile">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4 space-y-3">
                      {/* Location - Moved to top */}
                      <Collapsible open={openSections.location} onOpenChange={(open) => toggleSection('location', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <Globe className="h-4 w-4 text-primary" />
                            Location
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.location ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-2">
                          {!isAU && (
                            <Select value={country || "all"} onValueChange={(val) => { setCountry(val === "all" ? "" : val); if (val === "all") { setCampusState(""); setCampusCity(""); } }}>
                              <SelectTrigger data-testid="select-country-mobile">
                                <SelectValue placeholder="All Countries" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Countries</SelectItem>
                                {availableFilters.countries.map((ctry) => {
                                  const countryData = getCountryByName(ctry);
                                  const flagUrl = countryData ? getFlagUrl(countryData.code) : null;
                                  return (
                                    <SelectItem key={ctry} value={ctry}>
                                      <div className="flex items-center gap-2">
                                        {flagUrl && <img src={flagUrl} alt={`${ctry} flag`} loading="lazy" width={20} height={15} className="w-5 h-auto rounded-sm" />}
                                        {ctry}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          )}
                          {(country || isAU) && availableFilters.states.length > 0 && (
                            <Select value={campusState || "all"} onValueChange={(val) => { setCampusState(val === "all" ? "" : val); if (val === "all") setCampusCity(""); }}>
                              <SelectTrigger data-testid="select-state-mobile">
                                <SelectValue placeholder="All States" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All States</SelectItem>
                                {availableFilters.states.map((st) => (
                                  <SelectItem key={st} value={st}>{st}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {campusState && availableFilters.cities.length > 0 && (
                            <Select value={campusCity || "all"} onValueChange={(val) => setCampusCity(val === "all" ? "" : val)}>
                              <SelectTrigger data-testid="select-city-mobile">
                                <SelectValue placeholder="All Cities" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Cities</SelectItem>
                                {availableFilters.cities.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-3 w-3" />
                                      {city}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Discipline */}
                      <Collapsible open={openSections.discipline} onOpenChange={(open) => toggleSection('discipline', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <Layers className="h-4 w-4 text-primary" />
                            Discipline
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.discipline ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-2">
                          <Select value={discipline || "all"} onValueChange={(val) => { setDiscipline(val === "all" ? "" : val); if (val === "all") setSubDiscipline(""); }}>
                            <SelectTrigger data-testid="select-discipline-mobile">
                              <SelectValue placeholder="All Disciplines" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Disciplines</SelectItem>
                              {availableFilters.disciplines.map((disc) => (
                                <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {discipline && (
                            <Select value={subDiscipline || "all"} onValueChange={(val) => setSubDiscipline(val === "all" ? "" : val)}>
                              <SelectTrigger data-testid="select-sub-discipline-mobile">
                                <SelectValue placeholder="All Sub-disciplines" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Sub-disciplines</SelectItem>
                                {subDisciplines.map((sd) => (
                                  <SelectItem key={sd.id} value={sd.name}>{sd.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Framework (only show if multiple frameworks available) */}
                      {availableFilters.frameworks.length > 1 && (
                        <Collapsible open={openSections.framework} onOpenChange={(open) => toggleSection('framework', open)}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
                            <div className="flex items-center gap-2 font-medium text-sm">
                              <Layers className="h-4 w-4 text-primary" />
                              Framework
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.framework ? 'rotate-180' : ''}`} />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <Select value={framework || "all"} onValueChange={(val) => { setFramework(val === "all" ? "" : val); setLevel(""); }}>
                              <SelectTrigger data-testid="select-framework-mobile">
                                <SelectValue placeholder="All Frameworks" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Frameworks</SelectItem>
                                {availableFilters.frameworks.map((fw) => (
                                  <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Level */}
                      <Collapsible open={openSections.level} onOpenChange={(open) => toggleSection('level', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            Course Level
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.level ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <Select value={level || "all"} onValueChange={(val) => setLevel(val === "all" ? "" : val)}>
                            <SelectTrigger data-testid="select-level-mobile">
                              <SelectValue placeholder="All Levels" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Levels</SelectItem>
                              {availableFilters.levels.map((lvl) => (
                                <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Tuition Fees */}
                      <Collapsible open={openSections.tuition} onOpenChange={(open) => toggleSection('tuition', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <DollarSign className="h-4 w-4 text-primary" />
                            Tuition Fees
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.tuition ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Tuition fee range</span>
                            <Select value={feeCurrency || "all"} onValueChange={(val) => setFeeCurrency(val === "all" ? "" : val)}>
                              <SelectTrigger data-testid="select-currency-mobile" className="h-7 w-20 text-xs text-primary font-medium border-0 p-0 focus:ring-0">
                                <SelectValue placeholder="Any" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any</SelectItem>
                                {availableFilters.currencies.map((curr) => (
                                  <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                              <Input
                                type="number"
                                min={0}
                                placeholder={availableFilters.minTuition.toLocaleString()}
                                value={minFees ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value ? Math.max(0, parseInt(e.target.value)) : null;
                                  setMinFees(val);
                                }}
                                className="h-8 text-sm"
                                data-testid="input-min-fees-mobile"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="No Max"
                                value={maxFees ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value ? Math.max(0, parseInt(e.target.value)) : null;
                                  setMaxFees(val);
                                }}
                                className="h-8 text-sm"
                                data-testid="input-max-fees-mobile"
                              />
                            </div>
                          </div>
                          <div className="px-1 pt-1">
                            <Slider
                              value={[minFees ?? availableFilters.minTuition, maxFees ?? availableFilters.maxTuition]}
                              min={availableFilters.minTuition}
                              max={availableFilters.maxTuition}
                              step={1000}
                              onValueChange={([min, max]) => {
                                setMinFees(min === availableFilters.minTuition ? null : min);
                                setMaxFees(max === availableFilters.maxTuition ? null : max);
                              }}
                              className="w-full"
                              data-testid="slider-tuition-range-mobile"
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                    </div>

                    <Button className="w-full mt-4" onClick={() => setMobileFiltersOpen(false)} data-testid="button-apply-filters-mobile">
                      Show {totalFilteredCourses} Results
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Filter Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-5 w-5 text-accent" />
                      Find Your Course
                    </CardTitle>
                    <CardDescription>Filter by your preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                        aria-label="Search courses"
                        data-testid="input-search-courses"
                      />
                    </div>

                    {/* Active Filters */}
                    {activeFilterCount > 0 && (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Filters</span>
                          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs px-2" data-testid="button-clear-all">
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Clear
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {searchTerm && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              "{searchTerm.length > 15 ? searchTerm.slice(0, 15) + '...' : searchTerm}"
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setSearchTerm("")} data-testid="button-clear-search">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {subject && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {subject}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setSubject("")} data-testid="button-clear-subject">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {discipline && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {discipline}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => { setDiscipline(""); setSubDiscipline(""); }} data-testid="button-clear-discipline">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {subDiscipline && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {subDiscipline}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setSubDiscipline("")} data-testid="button-clear-subdiscipline">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {level && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {level}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setLevel("")} data-testid="button-clear-level">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {country && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {country}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setCountry("")} data-testid="button-clear-country">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {campusState && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {campusState}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setCampusState("")} data-testid="button-clear-state">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {campusCity && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {campusCity}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setCampusCity("")} data-testid="button-clear-city">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {feeCurrency && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {feeCurrency}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setFeeCurrency("")} data-testid="button-clear-currency">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                          {(minFees !== null || maxFees !== null) && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {minFees !== null && maxFees !== null 
                                ? `${minFees.toLocaleString()} - ${maxFees.toLocaleString()}`
                                : minFees !== null 
                                  ? `Min: ${minFees.toLocaleString()}`
                                  : `Max: ${maxFees?.toLocaleString()}`}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => { setMinFees(null); setMaxFees(null); }} data-testid="button-clear-fees">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4 space-y-1">
                      {/* Location - Moved to top */}
                      <Collapsible open={openSections.location} onOpenChange={(open) => toggleSection('location', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2 transition-colors">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <Globe className="h-4 w-4 text-primary" />
                            Location
                            {(country || campusState || campusCity) && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.location ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 pb-3 px-1 space-y-2">
                          {!isAU && (
                            <Select value={country || "all"} onValueChange={(val) => { setCountry(val === "all" ? "" : val); if (val === "all") { setCampusState(""); setCampusCity(""); } }}>
                              <SelectTrigger data-testid="select-country" className="h-9">
                                <SelectValue placeholder="All Countries" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Countries</SelectItem>
                                {availableFilters.countries.map((ctry) => {
                                  const countryData = getCountryByName(ctry);
                                  const flagUrl = countryData ? getFlagUrl(countryData.code) : null;
                                  return (
                                    <SelectItem key={ctry} value={ctry}>
                                      <div className="flex items-center gap-2">
                                        {flagUrl && <img src={flagUrl} alt={`${ctry} flag`} loading="lazy" width={20} height={15} className="w-5 h-auto rounded-sm" />}
                                        {ctry}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          )}
                          {(country || isAU) && availableFilters.states.length > 0 && (
                            <Select value={campusState || "all"} onValueChange={(val) => { setCampusState(val === "all" ? "" : val); if (val === "all") setCampusCity(""); }}>
                              <SelectTrigger data-testid="select-state" className="h-9">
                                <SelectValue placeholder="All States" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All States</SelectItem>
                                {availableFilters.states.map((st) => (
                                  <SelectItem key={st} value={st}>{st}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {campusState && availableFilters.cities.length > 0 && (
                            <Select value={campusCity || "all"} onValueChange={(val) => setCampusCity(val === "all" ? "" : val)}>
                              <SelectTrigger data-testid="select-city" className="h-9">
                                <SelectValue placeholder="All Cities" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Cities</SelectItem>
                                {availableFilters.cities.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-3 w-3" />
                                      {city}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Discipline */}
                      <Collapsible open={openSections.discipline} onOpenChange={(open) => toggleSection('discipline', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2 transition-colors">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <Layers className="h-4 w-4 text-primary" />
                            Discipline
                            {(discipline || subDiscipline) && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.discipline ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 pb-3 px-1 space-y-2">
                          <Select value={discipline || "all"} onValueChange={(val) => { setDiscipline(val === "all" ? "" : val); if (val === "all") setSubDiscipline(""); }}>
                            <SelectTrigger data-testid="select-discipline" className="h-9">
                              <SelectValue placeholder="All Disciplines" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Disciplines</SelectItem>
                              {availableFilters.disciplines.map((disc) => (
                                <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {discipline && (
                            <Select value={subDiscipline || "all"} onValueChange={(val) => setSubDiscipline(val === "all" ? "" : val)}>
                              <SelectTrigger data-testid="select-sub-discipline" className="h-9">
                                <SelectValue placeholder="All Sub-disciplines" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Sub-disciplines</SelectItem>
                                {subDisciplines.map((sd) => (
                                  <SelectItem key={sd.id} value={sd.name}>{sd.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Framework (only show if multiple frameworks available) */}
                      {availableFilters.frameworks.length > 1 && (
                        <Collapsible open={openSections.framework} onOpenChange={(open) => toggleSection('framework', open)}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2 transition-colors">
                            <div className="flex items-center gap-2 font-medium text-sm">
                              <BookOpen className="h-4 w-4 text-primary" />
                              Framework
                              {framework && <span className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.framework ? 'rotate-180' : ''}`} />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2 pb-3 px-1">
                            <Select value={framework || "all"} onValueChange={(val) => { setFramework(val === "all" ? "" : val); setLevel(""); }}>
                              <SelectTrigger data-testid="select-framework" className="h-9">
                                <SelectValue placeholder="All Frameworks" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Frameworks</SelectItem>
                                {availableFilters.frameworks.map((fw) => (
                                  <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Level */}
                      <Collapsible open={openSections.level} onOpenChange={(open) => toggleSection('level', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2 transition-colors">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            Course Level
                            {level && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.level ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 pb-3 px-1">
                          <Select value={level || "all"} onValueChange={(val) => setLevel(val === "all" ? "" : val)}>
                            <SelectTrigger data-testid="select-level" className="h-9">
                              <SelectValue placeholder="All Levels" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Levels</SelectItem>
                              {availableFilters.levels.map((lvl) => (
                                <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Tuition Fees */}
                      <Collapsible open={openSections.tuition} onOpenChange={(open) => toggleSection('tuition', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2 transition-colors">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <DollarSign className="h-4 w-4 text-primary" />
                            Tuition Fees
                            {(feeCurrency || minFees !== null || maxFees !== null) && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.tuition ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 pb-3 px-1 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Tuition fee range</span>
                            <Select value={feeCurrency || "all"} onValueChange={(val) => setFeeCurrency(val === "all" ? "" : val)}>
                              <SelectTrigger data-testid="select-currency" className="h-7 w-20 text-xs text-primary font-medium border-0 p-0 focus:ring-0">
                                <SelectValue placeholder="Any" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any</SelectItem>
                                {availableFilters.currencies.map((curr) => (
                                  <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                              <Input
                                type="number"
                                min={0}
                                placeholder={availableFilters.minTuition.toLocaleString()}
                                value={minFees ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value ? Math.max(0, parseInt(e.target.value)) : null;
                                  setMinFees(val);
                                }}
                                className="h-8 text-sm"
                                data-testid="input-min-fees"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="No Max"
                                value={maxFees ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value ? Math.max(0, parseInt(e.target.value)) : null;
                                  setMaxFees(val);
                                }}
                                className="h-8 text-sm"
                                data-testid="input-max-fees"
                              />
                            </div>
                          </div>
                          <div className="px-1 pt-1">
                            <Slider
                              value={[minFees ?? availableFilters.minTuition, maxFees ?? availableFilters.maxTuition]}
                              min={availableFilters.minTuition}
                              max={availableFilters.maxTuition}
                              step={1000}
                              onValueChange={([min, max]) => {
                                setMinFees(min === availableFilters.minTuition ? null : min);
                                setMaxFees(max === availableFilters.maxTuition ? null : max);
                              }}
                              className="w-full"
                              data-testid="slider-tuition-range"
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Quiz lead confirmation banner */}
              {showQuizBanner && (
                <div
                  className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm"
                  style={{
                    transition: "opacity 0.4s ease, max-height 0.4s ease, padding 0.4s ease",
                    opacity: bannerDismissing ? 0 : 1,
                    maxHeight: bannerDismissing ? 0 : "10rem",
                    overflow: "hidden",
                    paddingTop: bannerDismissing ? 0 : undefined,
                    paddingBottom: bannerDismissing ? 0 : undefined,
                  }}
                  role="status"
                  data-testid="banner-quiz-confirmation"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                  <p className="flex-1 text-foreground">
                    <span className="font-semibold">
                      {quizLeadFirstName ? `Thanks, ${quizLeadFirstName}!` : "Thanks!"}
                    </span>{" "}
                    Here are your matches. We'll also reach out to help you find the right course.
                  </p>
                  <button
                    onClick={dismissQuizBanner}
                    aria-label="Dismiss confirmation"
                    className="ml-1 flex-shrink-0 text-muted-foreground opacity-70 hover:opacity-100"
                    data-testid="button-dismiss-quiz-banner"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Results Header with Sort */}
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground" data-testid="results-count">
                  <strong>{totalFilteredCourses}</strong> course{totalFilteredCourses !== 1 ? "s" : ""} found
                </p>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-44" data-testid="select-sort">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="price-low">Price (Low-High)</SelectItem>
                    <SelectItem value="price-high">Price (High-Low)</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="w-16 h-16 bg-muted rounded flex-shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-5 bg-muted rounded w-3/4"></div>
                            <div className="h-4 bg-muted rounded w-1/2"></div>
                            <div className="h-3 bg-muted rounded w-1/3"></div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 w-48">
                            <div className="h-10 bg-muted rounded"></div>
                            <div className="h-10 bg-muted rounded"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : totalFilteredCourses === 0 ? (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                      <p className="text-lg font-medium mb-2">{t("courses.noResults")}</p>
                      <p className="text-sm text-muted-foreground mb-4">{t("courses.noResultsDesc")}</p>
                      {activeFilterCount > 0 && (
                        <Button type="button" variant="outline" onClick={clearAllFilters} data-testid="button-clear-filters-empty">
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Clear All Filters
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                  <CourseSearchLeadCapture
                    searchTerm={searchTerm}
                    discipline={discipline}
                    level={level}
                    country={country}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                {/* Course Cards - Single Column Horizontal Design */}
                {paginatedCourses.map((course) => {
                  const isHighlighted = highlightedCourseId !== null && Number(course.id) === highlightedCourseId;
                  // Helper for tag colors
                  const _hexToRgba = (hex: string, alpha: number) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                  };
                  
                  return (
                    <Card 
                      key={course.id} 
                      ref={isHighlighted ? highlightedRef : null}
                      className={`hover-elevate shadow-md transition-all duration-300 cursor-pointer ${
                        isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''
                      }`}
                      onClick={() => navigate(`/courses/${course.slug || course.id}`)}
                      data-testid={`course-card-${course.id}`}
                    >
                      <CardContent className="p-4">
                        {/* Top Row: Favorite and Compare in top right */}
                        <div className="flex justify-between items-start mb-3 gap-2">
                          {/* Top Left: Search Highlight Badge */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            {isHighlighted && (
                              <Badge className="bg-accent text-accent-foreground text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Your Search Result
                              </Badge>
                            )}
                          </div>
                          
                          {/* Top Right: Favorite + Compare */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant={isFavorited(course.id) ? "default" : "ghost"}
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleFavoriteToggle(course.id);
                              }}
                              aria-label={isFavorited(course.id) ? "Remove from favorites" : "Add to favorites"}
                              data-testid={`button-favorite-course-${course.id}`}
                            >
                              <Heart className={`h-4 w-4 ${isFavorited(course.id) ? "fill-current" : ""}`} />
                            </Button>
                            <div 
                              className="flex items-center gap-1.5 hover-elevate rounded-md px-2 py-1.5 cursor-pointer text-sm"
                              onClick={(e) => { e.stopPropagation(); handleComparisonToggle(course.id); }}
                              data-testid={`checkbox-compare-${course.id}`}
                            >
                              <Checkbox 
                                checked={isInComparison(course.id)}
                                className="pointer-events-none"
                              />
                              <label className="cursor-pointer flex items-center gap-1 text-muted-foreground">
                                <GitCompare className="h-3 w-3" />
                                Compare
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Main Content: Logo + Course Info */}
                        <div className="flex items-start gap-3">
                          {/* Institution Logo */}
                          <InstitutionLogo
                            src={course.university?.logo}
                            alt={course.university?.name || "Institution"}
                            size="sm"
                            testId={`img-logo-${course.id}`}
                          />
                          
                          <div className="flex-1 min-w-0">
                            {/* Course Title */}
                            <Link href={`/courses/${course.slug || course.id}`}>
                              <h3 className="font-bold text-lg hover:text-primary transition-colors cursor-pointer line-clamp-2 mb-1" data-testid={`text-title-${course.id}`}>
                                {course.title}
                              </h3>
                            </Link>
                            
                            {/* Institution Name */}
                            {course.universityId && course.university?.name ? (
                              <Link 
                                href={`/institutions/${course.universityId}`}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors w-fit"
                                data-testid={`link-institution-${course.id}`}
                              >
                                <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{course.university.name}</span>
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">Institution</span>
                            )}
                            
                            {/* Brief Description */}
                            {course.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-2" data-testid={`text-description-${course.id}`}>
                                {course.description}
                              </p>
                            )}
                            
                            {/* Campus Availability Badges - use campusAddresses for cities with fallback */}
                            {(() => {
                              // Use shared helper to extract cities
                              const cities = extractCourseCities(course as any);
                              
                              if (cities.length === 0) return null;
                              
                              // Get campusAddresses for potential filter setting
                              const campusAddresses = (course.university as any)?.campusAddresses as CampusAddress[] | undefined;
                              
                              return (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  <span className="text-xs text-muted-foreground">Available at:</span>
                                  {cities.slice(0, 3).map((city: string, idx: number) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs cursor-pointer"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Only set full cascading filters if we have unambiguous campusAddresses data
                                        // and the course country matches the campus country
                                        const campusWithCity = campusAddresses?.find(c => c.city === city);
                                        if (campusWithCity?.country && campusWithCity?.state) {
                                          // Set full cascading filters
                                          setCountry(campusWithCity.country);
                                          setCampusState(campusWithCity.state);
                                          setCampusCity(city);
                                        } else {
                                          // Just set the city for simple filtering
                                          setCampusCity(city);
                                        }
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      data-testid={`badge-campus-${course.id}-${idx}`}
                                    >
                                      <MapPin className="h-2.5 w-2.5 mr-1" />
                                      {city}
                                    </Badge>
                                  ))}
                                  {cities.length > 3 && (
                                    <Badge variant="secondary" className="text-xs" data-testid={`badge-more-campuses-${course.id}`}>
                                      +{cities.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()}
                            
                            {/* Duration and Fees Row */}
                            <div className="flex flex-wrap items-center gap-4 text-sm mt-3">
                              {course.duration && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground" data-testid={`text-duration-${course.id}`}>{course.duration}</span>
                                </div>
                              )}
                              {course.fees && (
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-primary" data-testid={`text-fees-${course.id}`}>{course.currency} {Number(course.fees).toLocaleString()}</span>
                                  <span className="text-xs text-muted-foreground">{getFeePeriodLabel((course as any).feePeriod)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Section: Tag Marquee + Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Left: Tag Marquee */}
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <TagMarquee
                                level={course.level || ''}
                                subject={course.subject}
                                tags={(course as any).tags as { id: number; name: string; slug: string; color: string | null }[] | undefined}
                                testId={`tag-marquee-${course.id}`}
                              />
                            </div>
                            
                            {/* Right: Action Buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                className="bg-accent text-white border-accent-border"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCourseForLead(course);
                                }}
                                data-testid={`button-request-info-${course.id}`}
                              >
                                <Mail className="mr-1.5 h-3.5 w-3.5" />
                                Request Info
                              </Button>
                              {isAuthenticated && isStudent ? (
                                <Button asChild size="sm" onClick={(e) => e.stopPropagation()} data-testid={`button-apply-course-${course.id}`}>
                                  <Link href={`/student/courses/${course.id}`}>
                                    <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                                    Apply
                                  </Link>
                                </Button>
                              ) : (
                                <Button asChild size="sm" onClick={(e) => e.stopPropagation()} data-testid={`button-apply-course-${course.id}`}>
                                  <a href="/auth">
                                    <LogIn className="mr-1.5 h-3.5 w-3.5" />
                                    Apply
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

            {/* Pagination */}
            {totalFilteredCourses > 0 && (
              <ListPagination
                currentPage={currentPage}
                totalItems={totalFilteredCourses}
                pageSize={pageSize}
                pageSizeOptions={[20, 30, 50]}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                itemLabel="courses"
              />
            )}
            </div>
          )}
            </div>
          </div>
        </div>
      </main>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent data-testid="dialog-login-required">
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              You need to be logged in as a student to save favorites. Please log in to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLoginModal(false)}
              data-testid="button-cancel-login"
            >
              Cancel
            </Button>
            <Button
              asChild
              data-testid="button-go-to-login"
            >
              <Link href="/">Go to Login</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Form Dialog */}
      {selectedCourseForLead && selectedCourseForLead.universityId && (
        <LeadFormDialog
          courseId={selectedCourseForLead.id}
          universityId={selectedCourseForLead.universityId}
          courseName={selectedCourseForLead.title}
          universityName={selectedCourseForLead.university?.name || "Institution"}
          trigger={false}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCourseForLead(null);
            }
          }}
        />
      )}

      {/* Sticky Comparison Bar */}
      {comparisons.length > 0 && (
        <div 
          className="fixed bottom-14 md:bottom-0 left-0 right-0 bg-primary text-primary-foreground shadow-lg border-t z-50"
          data-testid="comparison-bar"
        >
          <div className="container mx-auto px-3 py-2 md:px-4 md:py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 shrink-0" />
                <span className="font-semibold text-sm">
                  {comparisons.length} {comparisons.length === 1 ? 'course' : 'courses'} selected
                </span>
                <span className="text-xs opacity-80">
                  {comparisons.length < 2 ? '· Select at least 2 to compare' : `· Select up to ${4 - comparisons.length} more`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearAllComparisonsMutation.mutate()}
                  className="bg-transparent text-primary-foreground hover:bg-primary-foreground/10 border-primary-foreground/30 flex-1 md:flex-none"
                  data-testid="button-clear-comparisons"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCompare}
                  disabled={comparisons.length < 2}
                  className="flex-1 md:flex-none"
                  data-testid="button-compare-courses"
                >
                  <GitCompare className="mr-1 h-3 w-3" />
                  Compare Courses
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
