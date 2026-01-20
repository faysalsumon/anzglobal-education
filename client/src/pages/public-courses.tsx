import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, MapPin, DollarSign, Clock, GraduationCap, Sparkles, LogIn, ArrowLeft, Eye, Home, Heart, GitCompare, X, Mail, Building2, Filter, BookOpen, Layers, Globe, ChevronDown, ChevronRight, RotateCcw, ArrowUpDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { CourseWithDetails, University, Favorite, CourseComparison, SubDiscipline } from "@shared/schema";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { useQueryParams } from "@/hooks/useQueryParams";
import { ListPagination } from "@/components/list-pagination";
import { InstitutionLogo } from "@/components/institution-logo";

// Utility function to normalize city names for consistent matching
const normalizeCity = (city: string): string => {
  return city
    .toLowerCase()
    .trim()
    // Remove state/country suffixes like ", VIC", ", NSW", ", Australia"
    .replace(/,\s*(vic|nsw|qld|sa|wa|tas|nt|act|australia|bangladesh)\b.*$/i, '')
    // Remove common suburb indicators like "CBD"
    .replace(/\s+(cbd|city|metro|central)\b/i, '')
    .trim();
};

// Filter snapshot type for state/URL comparison
type FilterSnapshot = {
  searchTerm: string;
  subject: string;
  discipline: string;
  subDiscipline: string;
  level: string;
  country: string;
  universityFilter: string;
  campusCity: string;
  minFees: number | null;
  maxFees: number | null;
};

// Create snapshot from current state
const createStateSnapshot = (
  searchTerm: string,
  subject: string,
  discipline: string,
  subDiscipline: string,
  level: string,
  country: string,
  universityFilter: string,
  campusCity: string,
  minFees: number | null,
  maxFees: number | null
): FilterSnapshot => ({
  searchTerm,
  subject,
  discipline,
  subDiscipline,
  level,
  country,
  universityFilter,
  campusCity,
  minFees,
  maxFees,
});

// Create snapshot from URL params
const createParamsSnapshot = (params: URLSearchParams): FilterSnapshot => ({
  searchTerm: params.get('search') || "",
  subject: params.get('subject') || "",
  discipline: params.get('discipline') || "",
  subDiscipline: params.get('subDiscipline') || "",
  level: params.get('level') || "",
  country: params.get('country') || "",
  universityFilter: params.get('university') || "",
  campusCity: params.get('city') || "",
  minFees: params.get('minFees') ? parseInt(params.get('minFees')!) : null,
  maxFees: params.get('maxFees') ? parseInt(params.get('maxFees')!) : null,
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
    a.universityFilter === b.universityFilter &&
    a.campusCity === b.campusCity &&
    a.minFees === b.minFees &&
    a.maxFees === b.maxFees
  );
};

export default function PublicCourses() {
  const { params, setParams } = useQueryParams();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [discipline, setDiscipline] = useState<string>("");
  const [subDiscipline, setSubDiscipline] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [universityFilter, setUniversityFilter] = useState<string>("");
  const [campusCity, setCampusCity] = useState<string>("");
  const [minFees, setMinFees] = useState<number | null>(null);
  const [maxFees, setMaxFees] = useState<number | null>(null);
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
      });
    }
  };
  const highlightedRef = useRef<HTMLDivElement>(null);
  
  // Track pending URL hydration and previous URL snapshot
  const pendingUrlHydrationRef = useRef<FilterSnapshot | null>(null);
  const previousUrlSnapshotRef = useRef<FilterSnapshot | null>(null);

  const { isAuthenticated, isStudent } = useAuth();
  const { toast } = useToast();
  
  const { data: courses = [], isLoading } = useQuery<CourseWithDetails[]>({
    queryKey: ["/api/courses"],
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

  // Course comparison logic
  const [location, navigate] = useLocation();
  const { data: comparisons = [] } = useQuery<CourseComparison[]>({
    queryKey: ["/api/student/comparisons"],
    enabled: isAuthenticated && isStudent,
  });

  const addComparisonMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return await apiRequest("POST", "/api/student/comparisons", { courseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({
        title: "Success",
        description: "Course added to comparison",
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("already in comparison")) {
        toast({
          title: "Already in comparison",
          description: "This course is already in your comparison list",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add to comparison",
          variant: "destructive",
        });
      }
    },
  });

  const removeComparisonMutation = useMutation({
    mutationFn: async (comparisonId: string) => {
      return await apiRequest("DELETE", `/api/student/comparisons/${comparisonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({
        title: "Success",
        description: "Course removed from comparison",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from comparison",
        variant: "destructive",
      });
    },
  });

  const clearAllComparisonsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/student/comparisons");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/comparisons"] });
      toast({
        title: "Success",
        description: "All comparisons cleared",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear comparisons",
        variant: "destructive",
      });
    },
  });

  const handleComparisonToggle = (courseId: string) => {
    if (!isAuthenticated || !isStudent) {
      setShowLoginModal(true);
      return;
    }

    const existingComparison = comparisons.find(
      (c) => c.courseId === courseId
    );

    if (existingComparison) {
      removeComparisonMutation.mutate(existingComparison.id);
    } else {
      // Limit to 4 courses for comparison
      if (comparisons.length >= 4) {
        toast({
          title: "Comparison limit reached",
          description: "You can compare up to 4 courses at a time",
          variant: "destructive",
        });
        return;
      }
      addComparisonMutation.mutate(courseId);
    }
  };

  const isInComparison = (courseId: string) => {
    return comparisons.some((c) => c.courseId === courseId);
  };

  const handleCompare = () => {
    if (comparisons.length < 2) {
      toast({
        title: "Select more courses",
        description: "Please select at least 2 courses to compare",
        variant: "destructive",
      });
      return;
    }
    const courseIds = comparisons.map(c => c.courseId).join(',');
    navigate(`/compare-courses?courses=${courseIds}`);
  };

  // Extract unique values from actual course data
  const availableFilters = useMemo(() => {
    const subjects = new Set<string>();
    const disciplines = new Set<string>();
    const levels = new Set<string>();
    const countries = new Set<string>();
    const universities = new Map<string, string>();
    const cities = new Set<string>();

    courses.forEach((course) => {
      if (course.subject) subjects.add(course.subject);
      if (course.discipline) disciplines.add(course.discipline);
      if (course.level) levels.add(course.level);
      if (course.country) countries.add(course.country);
      if (course.university && course.universityId) {
        universities.set(course.universityId, course.university.name);
      }
      // Extract cities from campusLocations
      if (course.campusLocations) {
        course.campusLocations.forEach((location: string) => {
          if (location) cities.add(location);
        });
      }
    });

    return {
      subjects: Array.from(subjects).sort(),
      disciplines: Array.from(disciplines).sort(),
      levels: Array.from(levels).sort(),
      countries: Array.from(countries).sort(),
      universities: Array.from(universities.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      cities: Array.from(cities).sort(),
    };
  }, [courses]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (subject) count++;
    if (discipline) count++;
    if (subDiscipline) count++;
    if (level) count++;
    if (country) count++;
    if (campusCity) count++;
    return count;
  }, [searchTerm, subject, discipline, subDiscipline, level, country, campusCity]);

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
    setLevel("");
    setCountry("");
    setCampusCity("");
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
      searchTerm, subject, discipline, subDiscipline, level, country, universityFilter, campusCity, minFees, maxFees
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
      if (urlSnapshot.universityFilter !== universityFilter) setUniversityFilter(urlSnapshot.universityFilter);
      if (urlSnapshot.campusCity !== campusCity) setCampusCity(urlSnapshot.campusCity);
      if (urlSnapshot.minFees !== minFees) setMinFees(urlSnapshot.minFees);
      if (urlSnapshot.maxFees !== maxFees) setMaxFees(urlSnapshot.maxFees);
      
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
      
      // Check if this course has a campus in the selected city
      return course.campusLocations?.some((location: string) => location === campusCity);
    });
    
    if (!hasCoursesWithCity) {
      setCampusCity('');
    }
  }, [searchTerm, subject, discipline, subDiscipline, level, country, universityFilter, minFees, maxFees, campusCity, courses, subDisciplines]);

  // Sync state to URL (only after hydration complete or for user-initiated changes)
  useEffect(() => {
    // Create snapshot of current state
    const currentSnapshot = createStateSnapshot(
      searchTerm, subject, discipline, subDiscipline, level, country, universityFilter, campusCity, minFees, maxFees
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
      university: universityFilter || undefined,
      city: campusCity || undefined,
      minFees: minFees !== null ? minFees.toString() : undefined,
      maxFees: maxFees !== null ? maxFees.toString() : undefined,
    });
  }, [searchTerm, subject, discipline, subDiscipline, level, country, universityFilter, campusCity, minFees, maxFees, setParams]);

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
    
    if (level && course.level !== level) return false;
    if (country && course.country !== country) return false;
    if (universityFilter && course.universityId !== universityFilter) return false;
    
    // Campus city filtering with normalization
    if (campusCity) {
      const normalizedSearchCity = normalizeCity(campusCity);
      const hasCampusInCity = course.campusLocations?.some((location: string) => {
        if (!location) return false;
        const normalizedLocation = normalizeCity(location);
        // Flexible matching after normalization
        return normalizedLocation === normalizedSearchCity ||
               normalizedLocation.includes(normalizedSearchCity) ||
               normalizedSearchCity.includes(normalizedLocation);
      });
      if (!hasCampusInCity) return false;
    }
    
    // Budget filtering
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
  }, [searchTerm, subject, discipline, subDiscipline, level, country, universityFilter, campusCity, minFees, maxFees]);

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

      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Browse All Courses</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Explore {courses.length} courses from top institutions worldwide</p>
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
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
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
                      {/* Subject */}
                      <Collapsible open={openSections.subject} onOpenChange={(open) => toggleSection('subject', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Subject
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.subject ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <Select value={subject || "all"} onValueChange={(val) => setSubject(val === "all" ? "" : val)}>
                            <SelectTrigger data-testid="select-subject-mobile">
                              <SelectValue placeholder="All Subjects" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Subjects</SelectItem>
                              {availableFilters.subjects.map((subj) => (
                                <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

                      {/* Location */}
                      <Collapsible open={openSections.location} onOpenChange={(open) => toggleSection('location', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <Globe className="h-4 w-4 text-primary" />
                            Location
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.location ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-2">
                          <Select value={country || "all"} onValueChange={(val) => setCountry(val === "all" ? "" : val)}>
                            <SelectTrigger data-testid="select-country-mobile">
                              <SelectValue placeholder="All Countries" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Countries</SelectItem>
                              {availableFilters.countries.map((ctry) => (
                                <SelectItem key={ctry} value={ctry}>{ctry}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
              <div className="sticky top-4 space-y-4">
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
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
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
                          {campusCity && (
                            <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                              {campusCity}
                              <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setCampusCity("")} data-testid="button-clear-city">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4 space-y-1">
                      {/* Subject */}
                      <Collapsible open={openSections.subject} onOpenChange={(open) => toggleSection('subject', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2 transition-colors">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Subject
                            {subject && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.subject ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 pb-3 px-1">
                          <Select value={subject || "all"} onValueChange={(val) => setSubject(val === "all" ? "" : val)}>
                            <SelectTrigger data-testid="select-subject" className="h-9">
                              <SelectValue placeholder="All Subjects" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Subjects</SelectItem>
                              {availableFilters.subjects.map((subj) => (
                                <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

                      {/* Location */}
                      <Collapsible open={openSections.location} onOpenChange={(open) => toggleSection('location', open)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2 transition-colors">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <Globe className="h-4 w-4 text-primary" />
                            Location
                            {(country || campusCity) && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.location ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 pb-3 px-1 space-y-2">
                          <Select value={country || "all"} onValueChange={(val) => setCountry(val === "all" ? "" : val)}>
                            <SelectTrigger data-testid="select-country" className="h-9">
                              <SelectValue placeholder="All Countries" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Countries</SelectItem>
                              {availableFilters.countries.map((ctry) => (
                                <SelectItem key={ctry} value={ctry}>{ctry}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 space-y-4">
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
                {/* Course Cards - Single Column Horizontal Design */}
                {paginatedCourses.map((course) => {
                  const isHighlighted = highlightedCourseId !== null && Number(course.id) === highlightedCourseId;
                  // Helper for tag colors
                  const hexToRgba = (hex: string, alpha: number) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                  };
                  
                  return (
                    <Card 
                      key={course.id} 
                      ref={isHighlighted ? highlightedRef : null}
                      className={`hover-elevate transition-all duration-300 ${
                        isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''
                      }`}
                      data-testid={`course-card-${course.id}`}
                    >
                      <CardContent className="p-4">
                        {/* Top Row: Favorite and Compare in top right */}
                        <div className="flex justify-between items-start mb-3">
                          {/* Badges Row */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className="bg-primary/10 text-primary text-xs">{course.level}</Badge>
                            <Badge variant="outline" className="text-xs">{course.subject}</Badge>
                            {course.tags && course.tags.slice(0, 2).map((tag: { id: number; name: string; slug: string; color: string | null }) => (
                              <Badge 
                                key={tag.id}
                                variant="secondary"
                                className="text-xs"
                                style={tag.color ? { 
                                  backgroundColor: hexToRgba(tag.color, 0.15), 
                                  color: tag.color, 
                                  borderColor: hexToRgba(tag.color, 0.3) 
                                } : undefined}
                                data-testid={`badge-tag-${course.id}-${tag.slug}`}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {course.tags && course.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-more-tags-${course.id}`}>
                                +{course.tags.length - 2}
                              </Badge>
                            )}
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
                                handleFavoriteToggle(course.id);
                              }}
                              aria-label={isFavorited(course.id) ? "Remove from favorites" : "Add to favorites"}
                              data-testid={`button-favorite-course-${course.id}`}
                            >
                              <Heart className={`h-4 w-4 ${isFavorited(course.id) ? "fill-current" : ""}`} />
                            </Button>
                            <div 
                              className="flex items-center gap-1.5 hover-elevate rounded-md px-2 py-1.5 cursor-pointer text-sm"
                              onClick={() => handleComparisonToggle(course.id)}
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
                            <Link href={`/courses/${course.id}`}>
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
                            
                            {/* Campus Availability Badges */}
                            {(() => {
                              const locations = course.campusLocations?.filter((loc: string) => loc) || [];
                              if (locations.length === 0) return null;
                              
                              return (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  <span className="text-xs text-muted-foreground">Available at:</span>
                                  {locations.slice(0, 3).map((location: string, idx: number) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs cursor-pointer"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setCampusCity(location);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      data-testid={`badge-campus-${course.id}-${idx}`}
                                    >
                                      <MapPin className="h-2.5 w-2.5 mr-1" />
                                      {location}
                                    </Badge>
                                  ))}
                                  {locations.length > 3 && (
                                    <Badge variant="secondary" className="text-xs" data-testid={`badge-more-campuses-${course.id}`}>
                                      +{locations.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()}
                            
                            {/* Action Buttons - Left aligned below content */}
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              {isAuthenticated && isStudent ? (
                                <Button asChild size="sm" data-testid={`button-apply-course-${course.id}`}>
                                  <Link href={`/student/courses/${course.id}`}>
                                    <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                                    Apply
                                  </Link>
                                </Button>
                              ) : (
                                <Button asChild size="sm" data-testid={`button-apply-course-${course.id}`}>
                                  <a href="/auth">
                                    <LogIn className="mr-1.5 h-3.5 w-3.5" />
                                    Apply
                                  </a>
                                </Button>
                              )}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedCourseForLead(course);
                                }}
                                data-testid={`button-request-info-${course.id}`}
                              >
                                <Mail className="mr-1.5 h-3.5 w-3.5" />
                                Request Info
                              </Button>
                              
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                data-testid={`button-view-${course.id}`}
                              >
                                <Link href={`/courses/${course.id}`}>
                                  View Details
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Section: Stats Row */}
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <div className="flex flex-wrap items-center gap-4 text-sm">
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
                              </div>
                            )}
                            {course.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground" data-testid={`text-location-${course.id}`}>{course.location}</span>
                              </div>
                            )}
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
      </div>

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
          className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground shadow-lg border-t z-50"
          data-testid="comparison-bar"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5" />
                  <span className="font-semibold">
                    {comparisons.length} {comparisons.length === 1 ? 'course' : 'courses'} selected
                  </span>
                </div>
                <span className="text-sm opacity-90">
                  {comparisons.length < 2 ? 'Select at least 2 courses to compare' : `Select up to ${4 - comparisons.length} more`}
                </span>
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
                  disabled={comparisons.length < 2}
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
    </PublicLayout>
  );
}
