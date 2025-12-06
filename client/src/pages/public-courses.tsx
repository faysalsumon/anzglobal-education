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
import { Search, MapPin, DollarSign, Clock, GraduationCap, Sparkles, LogIn, ArrowLeft, Eye, Home, Heart, GitCompare, X, Mail, Building2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { CourseWithDetails, University, Favorite, CourseComparison, SubDiscipline } from "@shared/schema";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { useQueryParams } from "@/hooks/useQueryParams";

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

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Browse All Courses</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Explore {courses.length} courses from top institutions worldwide</p>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                Find Your Perfect Course
              </CardTitle>
              <CardDescription className="text-sm">Filter courses by your preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <Select value={subject || "all"} onValueChange={(val) => setSubject(val === "all" ? "" : val)}>
                  <SelectTrigger data-testid="select-subject">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {availableFilters.subjects.map((subj) => (
                      <SelectItem key={subj} value={subj}>
                        {subj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={discipline || "all"} onValueChange={(val) => {
                  const newDiscipline = val === "all" ? "" : val;
                  setDiscipline(newDiscipline);
                  if (!newDiscipline) {
                    setSubDiscipline(""); // Clear sub-discipline when discipline is cleared
                  }
                }}>
                  <SelectTrigger data-testid="select-discipline">
                    <SelectValue placeholder="All Disciplines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Disciplines</SelectItem>
                    {availableFilters.disciplines.map((disc) => (
                      <SelectItem key={disc} value={disc}>
                        {disc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={subDiscipline || "all"} 
                  onValueChange={(val) => setSubDiscipline(val === "all" ? "" : val)}
                  disabled={!discipline}
                >
                  <SelectTrigger data-testid="select-sub-discipline">
                    <SelectValue placeholder={discipline ? "All Sub-disciplines" : "Select discipline first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub-disciplines</SelectItem>
                    {subDisciplines.map((sd) => (
                      <SelectItem key={sd.id} value={sd.name}>
                        {sd.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={level || "all"} onValueChange={(val) => setLevel(val === "all" ? "" : val)}>
                  <SelectTrigger data-testid="select-level">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {availableFilters.levels.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={country || "all"} onValueChange={(val) => setCountry(val === "all" ? "" : val)}>
                  <SelectTrigger data-testid="select-country">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {availableFilters.countries.map((ctry) => (
                      <SelectItem key={ctry} value={ctry}>
                        {ctry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={campusCity || "all"} onValueChange={(val) => setCampusCity(val === "all" ? "" : val)}>
                  <SelectTrigger data-testid="select-city">
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
              </div>
              {(searchTerm || subject || discipline || subDiscipline || level || country || campusCity) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSubject("");
                    setDiscipline("");
                    setSubDiscipline("");
                    setLevel("");
                    setCountry("");
                    setCampusCity("");
                    setHighlightedCourseId(null);
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground" data-testid="results-count">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse h-full">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-lg font-medium mb-2">No courses found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or search term</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredCourses.map((course) => {
                const isHighlighted = highlightedCourseId !== null && Number(course.id) === highlightedCourseId;
                return (
                  <Card 
                    key={course.id} 
                    ref={isHighlighted ? highlightedRef : null}
                    className={`hover-elevate flex flex-col h-full transition-all duration-300 ${
                      isHighlighted ? 'ring-2 ring-primary shadow-lg scale-105' : ''
                    }`}
                    data-testid={`course-card-${course.id}`}
                  >
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-start gap-2 flex-1 min-w-0">
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">{course.level}</Badge>
                          <Badge variant="outline" className="text-xs">{course.subject}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          className={`!h-11 !w-11 !min-h-11 !min-w-11 sm:!h-10 sm:!w-10 sm:!min-h-10 sm:!min-w-10 !p-0 rounded-full transition-all flex-shrink-0 ${
                            isFavorited(course.id)
                              ? "bg-primary hover:bg-primary/90 shadow-md"
                              : "bg-background/80 hover:bg-background shadow-sm"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFavoriteToggle(course.id);
                          }}
                          aria-label={isFavorited(course.id) ? "Remove from favorites" : "Add to favorites"}
                          data-testid={`button-favorite-course-${course.id}`}
                        >
                          <Heart
                            className={`h-5 w-5 transition-all ${
                              isFavorited(course.id)
                                ? "fill-white text-white"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                      </div>
                      {isHighlighted && (
                        <Badge className="mb-2 bg-accent text-accent-foreground text-xs w-fit">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Your Search Result
                        </Badge>
                      )}
                      <CardTitle className="text-lg sm:text-xl line-clamp-2">{course.title}</CardTitle>
                      {course.universityId && course.university?.name ? (
                        <Link 
                          href={`/institutions/${course.universityId}`}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors w-fit group"
                          data-testid={`link-institution-${course.id}`}
                        >
                          <Building2 className="h-3.5 w-3.5 flex-shrink-0 group-hover:text-primary" />
                          <span className="truncate">{course.university.name}</span>
                        </Link>
                      ) : (
                        <CardDescription className="line-clamp-1 text-sm">
                          Institution
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 pb-3 sm:pb-4">
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3 sm:mb-4">
                        {course.description || "No description available"}
                      </p>
                      
                      {/* Campus Availability Badges */}
                      {(() => {
                        const locations = course.campusLocations?.filter((loc: string) => loc) || [];
                        if (locations.length === 0) return null;
                        
                        return (
                          <div className="mb-3 sm:mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Available at:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {locations.slice(0, 3).map((location: string, idx: number) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2 gap-1"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    // Store raw city value (normalization happens in filtering logic)
                                    setCampusCity(location);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  aria-label={`Filter courses available in ${location}`}
                                  data-testid={`badge-campus-${course.id}-${idx}`}
                                >
                                  <MapPin className="h-3 w-3" />
                                  {location}
                                </Button>
                              ))}
                              {locations.length > 3 && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs px-2 py-0.5"
                                  data-testid={`badge-more-campuses-${course.id}`}
                                >
                                  +{locations.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      
                      <div className="space-y-2 text-sm">
                        {course.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{course.location}</span>
                          </div>
                        )}
                        {course.duration && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{course.duration}</span>
                          </div>
                        )}
                        {course.fees && (
                          <div className="flex items-center gap-2 font-semibold text-primary">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{course.currency} {Number(course.fees).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex-col gap-3">
                      <div className="flex gap-2 w-full">
                        <Button asChild variant="outline" className="flex-1" size="sm" data-testid={`button-view-course-${course.id}`}>
                          <Link href={`/courses/${course.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span className="truncate">View Course</span>
                          </Link>
                        </Button>
                        {isAuthenticated && isStudent ? (
                          <Button asChild className="flex-1" size="sm" data-testid={`button-apply-course-${course.id}`}>
                            <Link href={`/student/courses/${course.id}`}>
                              <GraduationCap className="mr-2 h-4 w-4" />
                              <span className="truncate">Apply</span>
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild className="flex-1" size="sm" data-testid={`button-apply-course-${course.id}`}>
                            <a href={`/api/login?type=student&redirect=/student/courses/${course.id}`}>
                              <LogIn className="mr-2 h-4 w-4" />
                              <span className="truncate">Login to Apply</span>
                            </a>
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedCourseForLead(course);
                        }}
                        data-testid={`button-request-info-${course.id}`}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Request More Information
                      </Button>
                      <div 
                        className="flex items-center gap-2 w-full pt-2 border-t hover-elevate rounded-md px-2 py-1.5 cursor-pointer"
                        onClick={() => handleComparisonToggle(course.id)}
                        data-testid={`checkbox-compare-${course.id}`}
                      >
                        <Checkbox 
                          checked={isInComparison(course.id)}
                          className="pointer-events-none"
                        />
                        <label className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                          <GitCompare className="h-3.5 w-3.5" />
                          Compare this course
                        </label>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
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
