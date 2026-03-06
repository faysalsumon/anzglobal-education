import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Slider } from "@/components/ui/slider";
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  GraduationCap,
  Sparkles,
  Heart,
  GitCompare,
  X,
  Mail,
  Building2,
  Filter,
  BookOpen,
  Layers,
  Globe,
  ChevronDown,
  RotateCcw,
  ArrowUpDown,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { CourseWithDetails, Favorite, CourseComparison, SubDiscipline } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StudentLayout } from "@/components/student-layout";
import { useQueryParams } from "@/hooks/useQueryParams";
import { ListPagination } from "@/components/list-pagination";
import { InstitutionLogo } from "@/components/institution-logo";
import { getCountryByName, getFlagUrl } from "@/lib/countries";
import { TagMarquee } from "@/components/ui/tag-marquee";
import { getFeePeriodLabel } from "@/lib/utils";
import { useRegion } from "@/context/RegionContext";

// Normalize Australian state names to abbreviations
const normalizeAustralianState = (state: string): string => {
  const s = state.trim();
  const map: Record<string, string> = {
    "Victoria": "VIC", "New South Wales": "NSW", "Queensland": "QLD",
    "South Australia": "SA", "Western Australia": "WA",
    "Tasmania": "TAS", "Northern Territory": "NT",
    "Australian Capital Territory": "ACT",
  };
  return map[s] || s;
};

type CampusAddress = { country?: string; state?: string; city?: string };

const extractCourseCities = (
  course: { university?: { campusAddresses?: CampusAddress[] } | null; campusLocations?: string[]; location?: string | null }
): string[] => {
  const cities: string[] = [];
  const campusAddresses = course.university?.campusAddresses;
  if (campusAddresses && Array.isArray(campusAddresses)) {
    campusAddresses.forEach((campus) => {
      if (campus.city && !cities.includes(campus.city)) {
        cities.push(campus.city);
      }
    });
  }
  if (cities.length === 0 && course.campusLocations) {
    course.campusLocations.forEach((loc: string) => {
      if (loc && !cities.includes(loc)) {
        cities.push(loc);
      }
    });
  }
  return cities;
};

// Filter snapshot for URL/state comparison
type FilterSnapshot = {
  searchTerm: string;
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

const createStateSnapshot = (
  searchTerm: string, discipline: string, subDiscipline: string, level: string,
  country: string, campusState: string, universityFilter: string, campusCity: string,
  minFees: number | null, maxFees: number | null, feeCurrency: string
): FilterSnapshot => ({
  searchTerm, discipline, subDiscipline, level, country,
  campusState, universityFilter, campusCity, minFees, maxFees, feeCurrency,
});

const createParamsSnapshot = (params: URLSearchParams): FilterSnapshot => ({
  searchTerm: params.get("search") || "",
  discipline: params.get("discipline") || "",
  subDiscipline: params.get("subDiscipline") || "",
  level: params.get("level") || "",
  country: params.get("country") || "",
  campusState: params.get("state") || "",
  universityFilter: params.get("university") || "",
  campusCity: params.get("city") || "",
  minFees: params.get("minFees") ? parseInt(params.get("minFees")!) : null,
  maxFees: params.get("maxFees") ? parseInt(params.get("maxFees")!) : null,
  feeCurrency: params.get("currency") || "",
});

const snapshotsEqual = (a: FilterSnapshot, b: FilterSnapshot): boolean =>
  a.searchTerm === b.searchTerm &&
  a.discipline === b.discipline &&
  a.subDiscipline === b.subDiscipline &&
  a.level === b.level &&
  a.country === b.country &&
  a.campusState === b.campusState &&
  a.universityFilter === b.universityFilter &&
  a.campusCity === b.campusCity &&
  a.minFees === b.minFees &&
  a.maxFees === b.maxFees &&
  a.feeCurrency === b.feeCurrency;

function StudentCoursesContent() {
  const { params, setParams } = useQueryParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { regionCode } = useRegion();
  const isAU = regionCode?.toUpperCase() === "AU";

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [discipline, setDiscipline] = useState<string>("");
  const [subDiscipline, setSubDiscipline] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [campusState, setCampusState] = useState<string>("");
  const [universityFilter, setUniversityFilter] = useState<string>("");
  const [campusCity, setCampusCity] = useState<string>("");
  const [minFees, setMinFees] = useState<number | null>(null);
  const [maxFees, setMaxFees] = useState<number | null>(null);
  const [feeCurrency, setFeeCurrency] = useState<string>("");

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "price-low" | "price-high" | "duration">("name-asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    location: true,
    discipline: true,
    level: true,
    tuition: true,
  });

  const pendingUrlHydrationRef = useRef<FilterSnapshot | null>(null);
  const previousUrlSnapshotRef = useRef<FilterSnapshot | null>(null);

  // Data queries
  const { data: courses = [], isLoading } = useQuery<CourseWithDetails[]>({
    queryKey: ["/api/courses", { includePrivate: "true" }],
  });

  const { data: subDisciplines = [] } = useQuery<SubDiscipline[]>({
    queryKey: ["/api/sub-disciplines", discipline],
    enabled: !!discipline,
  });

  const { data: favorites = [] } = useQuery<Favorite[]>({
    queryKey: ["/api/student/favorites"],
  });

  const { data: apiComparisons = [] } = useQuery<CourseComparison[]>({
    queryKey: ["/api/student/comparisons"],
  });

  // Favorites mutations
  const addFavoriteMutation = useMutation({
    mutationFn: async (data: { itemType: string; itemId: string }) =>
      apiRequest("POST", "/api/student/favorites", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({ title: "Added to favorites" });
    },
    onError: (error: any) => {
      if (error.message?.includes("already favorited")) {
        toast({ title: "Already in favorites", variant: "destructive" });
      } else {
        toast({ title: "Failed to add to favorites", variant: "destructive" });
      }
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) =>
      apiRequest("DELETE", `/api/student/favorites/${favoriteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({ title: "Removed from favorites" });
    },
    onError: () => toast({ title: "Failed to remove from favorites", variant: "destructive" }),
  });

  const handleFavoriteToggle = (courseId: string) => {
    const existing = favorites.find((f) => f.itemType === "course" && f.itemId === courseId);
    if (existing) {
      removeFavoriteMutation.mutate(existing.id);
    } else {
      addFavoriteMutation.mutate({ itemType: "course", itemId: courseId });
    }
  };

  const isFavorited = (courseId: string) =>
    favorites.some((f) => f.itemType === "course" && f.itemId === courseId);

  // Comparison mutations (API-based for logged-in students)
  const addComparisonMutation = useMutation({
    mutationFn: async (courseId: string) =>
      apiRequest("POST", "/api/student/comparisons", { courseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({ title: "Added to comparison" });
    },
    onError: (error: any) => {
      if (error.message?.includes("already")) {
        toast({ title: "Already in comparison", variant: "destructive" });
      } else if (error.message?.includes("maximum")) {
        toast({ title: "Comparison limit reached (max 4)", variant: "destructive" });
      } else {
        toast({ title: "Failed to add comparison", variant: "destructive" });
      }
    },
  });

  const removeComparisonMutation = useMutation({
    mutationFn: async (comparisonId: string) =>
      apiRequest("DELETE", `/api/student/comparisons/${comparisonId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({ title: "Removed from comparison" });
    },
    onError: () => toast({ title: "Failed to remove comparison", variant: "destructive" }),
  });

  const clearAllComparisonsMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", "/api/student/comparisons"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({ title: "All comparisons cleared" });
    },
  });

  const handleComparisonToggle = (courseId: string) => {
    const existing = apiComparisons.find((c) => c.courseId === courseId);
    if (existing) {
      removeComparisonMutation.mutate(existing.id);
    } else {
      if (apiComparisons.length >= 4) {
        toast({ title: "Comparison limit reached", description: "You can compare up to 4 courses at a time", variant: "destructive" });
        return;
      }
      addComparisonMutation.mutate(courseId);
    }
  };

  const isInComparison = (courseId: string) =>
    apiComparisons.some((c) => c.courseId === courseId);

  const handleCompare = () => {
    if (apiComparisons.length < 2) {
      toast({ title: "Select at least 2 courses to compare", variant: "destructive" });
      return;
    }
    navigate("/compare-courses");
  };

  // Build available filter options from course data
  const availableFilters = useMemo(() => {
    const disciplines = new Set<string>();
    const levels = new Set<string>();
    const countries = new Set<string>();
    const universities = new Map<string, string>();
    const statesByCountry: Record<string, Set<string>> = {};
    const citiesByState: Record<string, Set<string>> = {};
    const currencies = new Set<string>();
    let maxTuitionFee = 0;
    let minTuitionFee = Infinity;

    courses.forEach((course) => {
      if (course.discipline) disciplines.add(course.discipline);
      if (course.level) levels.add(course.level);
      if (course.country) countries.add(course.country);
      if (course.university && (course.university as any).country) {
        countries.add((course.university as any).country);
      }
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
      const institution = course.university;
      if (institution && (institution as any).campusAddresses) {
        const campusAddresses = (institution as any).campusAddresses as CampusAddress[];
        if (Array.isArray(campusAddresses)) {
          campusAddresses.forEach((campus) => {
            const campusCountry = (campus.country || course.country || "").trim();
            if (campusCountry && campus.state) {
              const normalizedState = campusCountry === "Australia"
                ? normalizeAustralianState(campus.state)
                : campus.state.trim();
              if (!statesByCountry[campusCountry]) statesByCountry[campusCountry] = new Set();
              statesByCountry[campusCountry].add(normalizedState);
              const stateKey = `${campusCountry}:${normalizedState}`;
              if (campus.city) {
                if (!citiesByState[stateKey]) citiesByState[stateKey] = new Set();
                citiesByState[stateKey].add(campus.city.trim());
              }
            }
          });
        }
      }
    });

    const statesForCountry = country && statesByCountry[country]
      ? Array.from(statesByCountry[country]).sort()
      : [];
    const stateKey = country && campusState ? `${country}:${campusState}` : "";
    const citiesForState = stateKey && citiesByState[stateKey]
      ? Array.from(citiesByState[stateKey]).sort()
      : [];

    return {
      disciplines: Array.from(disciplines).sort(),
      levels: Array.from(levels).sort(),
      countries: Array.from(countries).sort(),
      universities: Array.from(universities.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      states: statesForCountry,
      cities: citiesForState,
      currencies: Array.from(currencies).sort(),
      minTuition: minTuitionFee === Infinity ? 0 : minTuitionFee,
      maxTuition: maxTuitionFee || 100000,
    };
  }, [courses, country, campusState]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (discipline) count++;
    if (subDiscipline) count++;
    if (level) count++;
    if (country && !isAU) count++;
    if (campusState) count++;
    if (campusCity) count++;
    if (feeCurrency) count++;
    if (minFees !== null || maxFees !== null) count++;
    if (universityFilter) count++;
    return count;
  }, [searchTerm, discipline, subDiscipline, level, country, campusState, campusCity, feeCurrency, minFees, maxFees, universityFilter, isAU]);

  const toggleSection = (section: string, open?: boolean) => {
    setOpenSections(prev => ({ ...prev, [section]: open !== undefined ? open : !prev[section] }));
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setDiscipline("");
    setSubDiscipline("");
    setLevel("");
    setCountry(isAU ? "Australia" : "");
    setCampusState("");
    setCampusCity("");
    setFeeCurrency("");
    setMinFees(null);
    setMaxFees(null);
    setUniversityFilter("");
    setCurrentPage(1);
  };

  // URL hydration: parse URL params into state when URL changes
  useEffect(() => {
    const urlSnapshot = createParamsSnapshot(params);
    if (previousUrlSnapshotRef.current && snapshotsEqual(urlSnapshot, previousUrlSnapshotRef.current)) return;
    previousUrlSnapshotRef.current = urlSnapshot;
    const currentSnapshot = createStateSnapshot(
      searchTerm, discipline, subDiscipline, level, country, campusState, universityFilter, campusCity, minFees, maxFees, feeCurrency
    );
    if (!snapshotsEqual(urlSnapshot, currentSnapshot)) {
      if (urlSnapshot.searchTerm !== searchTerm) setSearchTerm(urlSnapshot.searchTerm);
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
      pendingUrlHydrationRef.current = urlSnapshot;
    }
  }, [params]);

  // Auto-set country to Australia for AU region
  useEffect(() => {
    if (isAU && !country) setCountry("Australia");
  }, [isAU]);

  // Cascading filter clears
  useEffect(() => {
    if (!discipline && subDiscipline) setSubDiscipline("");
  }, [discipline, subDiscipline]);

  useEffect(() => {
    if (!country && !isAU && (campusState || campusCity)) {
      setCampusState("");
      setCampusCity("");
    }
  }, [country, campusState, campusCity, isAU]);

  useEffect(() => {
    if (!campusState && campusCity) setCampusCity("");
  }, [campusState, campusCity]);

  // Sync state to URL
  useEffect(() => {
    const currentSnapshot = createStateSnapshot(
      searchTerm, discipline, subDiscipline, level, country, campusState, universityFilter, campusCity, minFees, maxFees, feeCurrency
    );
    if (pendingUrlHydrationRef.current) {
      if (snapshotsEqual(currentSnapshot, pendingUrlHydrationRef.current)) {
        pendingUrlHydrationRef.current = null;
      }
      return;
    }
    setParams({
      search: searchTerm || undefined,
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
  }, [searchTerm, discipline, subDiscipline, level, country, campusState, universityFilter, campusCity, minFees, maxFees, feeCurrency, setParams]);

  // Filter courses
  const filteredCourses = useMemo(() => courses.filter((course) => {
    if (searchTerm && !course.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !course.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !course.subject?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (discipline && course.discipline !== discipline) return false;
    if (subDiscipline) {
      const selectedSd = subDisciplines.find(sd => sd.name === subDiscipline);
      if (selectedSd && course.subDisciplineId !== selectedSd.id) return false;
    }
    if (level && course.level !== level) return false;
    if (universityFilter && course.universityId !== universityFilter) return false;
    if (country) {
      const institution = course.university;
      const campuses = institution && (institution as any).campusAddresses
        ? (institution as any).campusAddresses as CampusAddress[]
        : null;
      if (campuses && Array.isArray(campuses) && campuses.length > 0) {
        const hasMatchingCampus = campuses.some(c => (c.country || course.country) === country);
        if (!hasMatchingCampus && course.country !== country) return false;
      } else if (course.country !== country) {
        return false;
      }
    }
    if (campusState) {
      const institution = course.university;
      const campuses = institution && (institution as any).campusAddresses
        ? (institution as any).campusAddresses as CampusAddress[]
        : null;
      if (!campuses || !Array.isArray(campuses)) return false;
      const normalizedFilter = country === "Australia" ? normalizeAustralianState(campusState) : campusState;
      const hasState = campuses.some(c => {
        const cs = c.state ? (country === "Australia" ? normalizeAustralianState(c.state) : c.state.trim()) : "";
        return cs === normalizedFilter;
      });
      if (!hasState) return false;
    }
    if (campusCity) {
      const institution = course.university;
      const campuses = institution && (institution as any).campusAddresses
        ? (institution as any).campusAddresses as CampusAddress[]
        : null;
      if (!campuses || !Array.isArray(campuses)) return false;
      if (!campuses.some(c => c.city === campusCity)) return false;
    }
    if (minFees !== null || maxFees !== null) {
      if (feeCurrency && course.currency && course.currency !== feeCurrency) return false;
      const courseFees = Number(course.fees) || 0;
      if (minFees !== null && courseFees < minFees) return false;
      if (maxFees !== null && courseFees > maxFees) return false;
    }
    return true;
  }), [courses, searchTerm, discipline, subDiscipline, level, country, campusState, campusCity, universityFilter, minFees, maxFees, feeCurrency, subDisciplines]);

  // Sort
  const sortedCourses = useMemo(() => {
    const sorted = [...filteredCourses];
    switch (sortBy) {
      case "name-asc": sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "name-desc": sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
      case "price-low": sorted.sort((a, b) => (Number(a.fees) || 0) - (Number(b.fees) || 0)); break;
      case "price-high": sorted.sort((a, b) => (Number(b.fees) || 0) - (Number(a.fees) || 0)); break;
      case "duration": sorted.sort((a, b) => (Number(a.duration) || 0) - (Number(b.duration) || 0)); break;
    }
    return sorted;
  }, [filteredCourses, sortBy]);

  const totalFilteredCourses = sortedCourses.length;
  const paginatedCourses = sortedCourses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filter panel content (shared between Sheet)
  const filterPanelContent = (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          data-testid="input-search-courses-filter"
        />
      </div>

      {/* Active filter tags */}
      {activeFilterCount > 0 && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Filters</span>
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs px-2" data-testid="button-clear-all-filters">
              <RotateCcw className="mr-1 h-3 w-3" />
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {searchTerm && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                "{searchTerm.length > 15 ? searchTerm.slice(0, 15) + "..." : searchTerm}"
                <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setSearchTerm("")} data-testid="button-clear-search">
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
            {country && !isAU && (
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
                  ? `${minFees.toLocaleString()} – ${maxFees.toLocaleString()}`
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
        {/* Location */}
        <Collapsible open={openSections.location} onOpenChange={(open) => toggleSection("location", open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Globe className="h-4 w-4 text-primary" />
              Location
              {(country || campusState || campusCity) && <span className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.location ? "rotate-180" : ""}`} />
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
        <Collapsible open={openSections.discipline} onOpenChange={(open) => toggleSection("discipline", open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Layers className="h-4 w-4 text-primary" />
              Discipline
              {(discipline || subDiscipline) && <span className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.discipline ? "rotate-180" : ""}`} />
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

        {/* Level */}
        <Collapsible open={openSections.level} onOpenChange={(open) => toggleSection("level", open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <GraduationCap className="h-4 w-4 text-primary" />
              Course Level
              {level && <span className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.level ? "rotate-180" : ""}`} />
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

        {/* Institution */}
        {availableFilters.universities.length > 0 && (
          <Collapsible open={openSections.university} onOpenChange={(open) => toggleSection("university", open)}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <BookOpen className="h-4 w-4 text-primary" />
                Institution
                {universityFilter && <span className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.university ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pb-3 px-1">
              <Select value={universityFilter || "all"} onValueChange={(val) => setUniversityFilter(val === "all" ? "" : val)}>
                <SelectTrigger data-testid="select-university" className="h-9">
                  <SelectValue placeholder="All Institutions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Institutions</SelectItem>
                  {availableFilters.universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Tuition Fees */}
        <Collapsible open={openSections.tuition} onOpenChange={(open) => toggleSection("tuition", open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <DollarSign className="h-4 w-4 text-primary" />
              Tuition Fees
              {(feeCurrency || minFees !== null || maxFees !== null) && <span className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.tuition ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pb-3 px-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Fee range</span>
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
                  onChange={(e) => setMinFees(e.target.value ? Math.max(0, parseInt(e.target.value)) : null)}
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
                  onChange={(e) => setMaxFees(e.target.value ? Math.max(0, parseInt(e.target.value)) : null)}
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
    </div>
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Top bar: search + filters button + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-9"
            data-testid="input-search-courses"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v as typeof sortBy); setCurrentPage(1); }}>
            <SelectTrigger className="w-44" data-testid="select-sort">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A–Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z–A)</SelectItem>
              <SelectItem value="price-low">Price (Low–High)</SelectItem>
              <SelectItem value="price-high">Price (High–Low)</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters sheet trigger */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" data-testid="button-filters">
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
                  Filter Courses
                </SheetTitle>
              </SheetHeader>
              {filterPanelContent}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground" data-testid="results-count">
        <strong>{totalFilteredCourses}</strong> course{totalFilteredCourses !== 1 ? "s" : ""} found
      </p>

      {/* Course list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-16 h-16 bg-muted rounded flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : totalFilteredCourses === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-lg font-medium mb-2">No courses found</p>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search term</p>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={clearAllFilters} data-testid="button-clear-filters-empty">
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedCourses.map((course) => (
            <Card
              key={course.id}
              className="hover-elevate shadow-sm transition-all duration-200 cursor-pointer"
              onClick={() => navigate(`/student/courses/${course.id}`)}
              data-testid={`course-card-${course.id}`}
            >
              <CardContent className="p-4">
                {/* Top Row: favorite + compare */}
                <div className="flex justify-end items-center mb-3 gap-2">
                  <Button
                    variant={isFavorited(course.id) ? "default" : "ghost"}
                    size="icon"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFavoriteToggle(course.id); }}
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
                    <Checkbox checked={isInComparison(course.id)} className="pointer-events-none" />
                    <label className="cursor-pointer flex items-center gap-1 text-muted-foreground">
                      <GitCompare className="h-3 w-3" />
                      Compare
                    </label>
                  </div>
                </div>

                {/* Main content: logo + info */}
                <div className="flex items-start gap-3">
                  <InstitutionLogo
                    src={course.university?.logo}
                    alt={course.university?.name || "Institution"}
                    size="sm"
                    testId={`img-logo-${course.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <Link href={`/student/courses/${course.id}`}>
                      <h3 className="font-bold text-lg hover:text-primary transition-colors cursor-pointer line-clamp-2 mb-1" data-testid={`text-title-${course.id}`}>
                        {course.title}
                      </h3>
                    </Link>
                    {course.universityId && course.university?.name ? (
                      <Link
                        href={`/institutions/${course.universityId}`}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors w-fit"
                        data-testid={`link-institution-${course.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{course.university.name}</span>
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">Institution</span>
                    )}
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2" data-testid={`text-description-${course.id}`}>
                        {course.description}
                      </p>
                    )}
                    {/* Campus cities */}
                    {(() => {
                      const cities = extractCourseCities(course as any);
                      if (cities.length === 0) return null;
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
                                const campusWithCity = campusAddresses?.find(c => c.city === city);
                                if (campusWithCity?.country && campusWithCity?.state) {
                                  setCountry(campusWithCity.country);
                                  setCampusState(campusWithCity.state);
                                  setCampusCity(city);
                                } else {
                                  setCampusCity(city);
                                }
                                window.scrollTo({ top: 0, behavior: "smooth" });
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
                    {/* Duration and fees */}
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

                {/* Bottom: tags + apply button */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <TagMarquee
                        level={course.level || ""}
                        subject={course.subject}
                        tags={(course as any).tags as { id: number; name: string; slug: string; color: string | null }[] | undefined}
                        testId={`tag-marquee-${course.id}`}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        asChild
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`button-apply-course-${course.id}`}
                      >
                        <Link href={`/student/courses/${course.id}`}>
                          <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                          View & Apply
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalFilteredCourses > 0 && (
            <ListPagination
              currentPage={currentPage}
              totalItems={totalFilteredCourses}
              pageSize={pageSize}
              pageSizeOptions={[20, 30, 50]}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
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

      {/* Sticky Comparison Bar */}
      {apiComparisons.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground shadow-lg border-t z-50" data-testid="comparison-bar">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <GitCompare className="h-5 w-5" />
                <div>
                  <span className="font-semibold">{apiComparisons.length} {apiComparisons.length === 1 ? "course" : "courses"} selected</span>
                  <span className="text-sm opacity-90 ml-2">
                    {apiComparisons.length < 2 ? "Select at least 2 to compare" : `Up to ${4 - apiComparisons.length} more`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearAllComparisonsMutation.mutate()}
                  className="bg-transparent text-primary-foreground hover:bg-primary-foreground/10 border-primary-foreground/30"
                  data-testid="button-clear-comparisons"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCompare}
                  disabled={apiComparisons.length < 2}
                  data-testid="button-compare-courses"
                >
                  <GitCompare className="mr-2 h-4 w-4" />
                  Compare Courses
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentCourses() {
  return (
    <StudentLayout breadcrumbTitle="Browse Courses">
      <StudentCoursesContent />
    </StudentLayout>
  );
}
