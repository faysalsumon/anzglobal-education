import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, MapPin, Home, Heart, Map as MapIcon, List, 
  Building2, GraduationCap, Award, BookOpen, Sparkles,
  ChevronDown, ChevronRight, RotateCcw, Filter, X, ArrowUpDown,
  Globe, Percent
} from "lucide-react";
import { InstitutionMapSearch } from "@/components/institution-map-search";
import type { InstitutionCampus } from "@/components/institution-map-search";
import { PublicLayout } from "@/components/public-layout";
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
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useInstitutionFilters } from "@/hooks/useInstitutionFilters";
import { InstitutionLogo } from "@/components/institution-logo";
import { ListPagination } from "@/components/list-pagination";
import type { Favorite } from "@shared/schema";

type University = {
  id: string;
  name: string;
  description: string;
  logo: string;
  website: string;
  location: string;
  country: string;
  establishedYear: number | null;
  contactEmail: string;
  contactPhone: string;
  userId: string;
  providerType: string | null;
  numberOfCampuses: number | null;
  scholarshipPercentageMin: number | null;
  scholarshipPercentageMax: number | null;
  tuitionFeesMin: string | null;
  tuitionFeesMax: string | null;
  tuitionCurrency: string | null;
  deliveryModes: string[] | null;
  intakePeriods: string[] | null;
  accreditationStatus: string | null;
  rankingBand: string | null;
  facilities: string[] | null;
  internationalStudentSupport: boolean | null;
  tags: string[] | null;
  topDisciplines: string[] | null;
  coursesCount?: number;
};

type FilterMetadata = {
  countries: string[];
  providerTypes: string[];
  deliveryModes: string[];
  intakePeriods: string[];
  facilities: string[];
  accreditationStatuses: string[];
  rankingBands: string[];
  tags: string[];
  disciplines: string[];
  scholarshipRange: { min: number; max: number };
  tuitionRange: { min: number; max: number };
  totalCount: number;
};

type SortOption = "name-asc" | "name-desc" | "ranking" | "courses";

export default function PublicInstitutions() {
  const [location, setLocation] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    country: true,
    discipline: true,
    providerType: true,
    ranking: true,
  });
  
  const { user, isAuthenticated, isStudent } = useAuth();
  const { toast } = useToast();

  const {
    filters,
    setSearch,
    toggleMultiSelect,
    setRange,
    clearFilters,
    hasActiveFilters,
    queryParamsString,
  } = useInstitutionFilters();

  // Toggle section open/close
  const toggleSection = (section: string, open: boolean) => {
    setOpenSections(prev => ({ ...prev, [section]: open }));
  };

  // Reset collapsible sections when mobile sheet closes
  const handleMobileFiltersChange = (open: boolean) => {
    setMobileFiltersOpen(open);
    if (!open) {
      setOpenSections({
        country: true,
        discipline: true,
        providerType: true,
        ranking: true,
      });
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [queryParamsString]);

  // Initialize search input from filters (preserves URL param)
  const [searchInput, setSearchInput] = useState(filters.search);

  // Sync searchInput with filters.search when it changes externally
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  // Fetch filter metadata
  const { data: filterMetadata } = useQuery<FilterMetadata>({
    queryKey: ["/api/institutions/filter-metadata"],
  });

  // Build pagination params
  const paginationParams = `page=${currentPage}&pageSize=${pageSize}`;
  const fullQueryString = queryParamsString 
    ? `${queryParamsString}&${paginationParams}` 
    : paginationParams;

  // Fetch institutions with filters and pagination
  const { data: institutionsData, isLoading } = useQuery<{
    items: University[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: ["/api/institutions", fullQueryString],
    queryFn: async () => {
      const url = `/api/institutions?${fullQueryString}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch institutions");
      return response.json();
    },
  });

  // Sort institutions
  const institutions = useMemo(() => {
    const items = institutionsData?.items ?? [];
    const sorted = [...items];
    
    switch (sortBy) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "ranking":
        sorted.sort((a, b) => {
          const rankOrder: Record<string, number> = {
            "Top 100": 1, "Top 200": 2, "Top 500": 3, "Top 1000": 4
          };
          const aRank = a.rankingBand ? (rankOrder[a.rankingBand] ?? 99) : 99;
          const bRank = b.rankingBand ? (rankOrder[b.rankingBand] ?? 99) : 99;
          return aRank - bRank;
        });
        break;
      case "courses":
        sorted.sort((a, b) => (b.coursesCount ?? 0) - (a.coursesCount ?? 0));
        break;
    }
    return sorted;
  }, [institutionsData?.items, sortBy]);

  const totalCount = institutionsData?.totalCount ?? 0;

  const { data: favorites = [] } = useQuery<Favorite[]>({
    queryKey: ["/api/student/favorites"],
    enabled: isAuthenticated && isStudent,
  });

  // Fetch campus locations for map view
  const boundsQueryString = mapBounds
    ? `?north=${mapBounds.north}&south=${mapBounds.south}&east=${mapBounds.east}&west=${mapBounds.west}`
    : "";
  const { data: campusData } = useQuery<{
    campuses: InstitutionCampus[];
    totalInstitutions: number;
    campusesWithCoordinates: number;
  }>({
    queryKey: ["/api/institutions/campus-locations", boundsQueryString],
    queryFn: async () => {
      const response = await fetch(`/api/institutions/campus-locations${boundsQueryString}`);
      if (!response.ok) throw new Error("Failed to fetch campus locations");
      return response.json();
    },
    enabled: viewMode === "map",
  });

  // Handle map bounds change for dynamic campus filtering
  const handleMapBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    setMapBounds(bounds);
  }, []);

  // Handle institution click from map
  const handleInstitutionClick = useCallback((institutionId: string) => {
    setLocation(`/institutions/${institutionId}`);
  }, [setLocation]);

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
          description: "This institution is already in your favorites",
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

  const handleFavoriteToggle = (institutionId: string) => {
    if (!isAuthenticated || !isStudent) {
      setShowLoginModal(true);
      return;
    }

    const existingFavorite = favorites.find(
      (f) => f.itemType === "university" && f.itemId === institutionId
    );

    if (existingFavorite) {
      removeFavoriteMutation.mutate(existingFavorite.id);
    } else {
      addFavoriteMutation.mutate({
        itemType: "university",
        itemId: institutionId,
      });
    }
  };

  const isFavorited = (institutionId: string) => {
    return favorites.some(
      (f) => f.itemType === "university" && f.itemId === institutionId
    );
  };

  // Count active filters
  const activeFilterCount = 
    filters.countries.length + 
    filters.disciplines.length + 
    filters.providerTypes.length +
    (filters.scholarshipMin !== undefined || filters.scholarshipMax !== undefined ? 1 : 0) +
    (searchInput ? 1 : 0);

  const clearAllFilters = () => {
    clearFilters();
    setSearchInput("");
  };

  // SEO data
  const siteUrl = window.location.origin;
  const pageUrl = `${siteUrl}/institutions`;
  const pageTitle = "Find Institutions - ANZ Global Education";
  const pageDescription = `Explore ${filterMetadata?.totalCount || 100}+ top universities and institutions worldwide. Search by country, ranking, programs, and facilities. Find your ideal institution for international study.`;
  const ogImage = `${siteUrl}/og-image.png`;

  // Filter sidebar content (shared between desktop and mobile)
  const FilterSidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="space-y-4">
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
            {searchInput && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                "{searchInput.length > 15 ? searchInput.slice(0, 15) + '...' : searchInput}"
                <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setSearchInput("")} data-testid="button-clear-search">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.countries.map(country => (
              <Badge key={country} variant="secondary" className="gap-1 pr-1 text-xs">
                {country}
                <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => toggleMultiSelect('countries', country)} data-testid={`button-clear-country-${country.toLowerCase().replace(/\s+/g, '-')}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.disciplines.map(discipline => (
              <Badge key={discipline} variant="secondary" className="gap-1 pr-1 text-xs">
                {discipline.length > 20 ? discipline.slice(0, 20) + '...' : discipline}
                <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => toggleMultiSelect('disciplines', discipline)} data-testid={`button-clear-discipline-${discipline.toLowerCase().replace(/\s+/g, '-')}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.providerTypes.map(type => (
              <Badge key={type} variant="secondary" className="gap-1 pr-1 text-xs">
                {type}
                <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => toggleMultiSelect('providerTypes', type)} data-testid={`button-clear-type-${type.toLowerCase().replace(/\s+/g, '-')}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Country Filter */}
      {filterMetadata && filterMetadata.countries.length > 0 && (
        <Collapsible open={openSections.country} onOpenChange={(open) => toggleSection('country', open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Globe className="h-4 w-4 text-primary" />
              Country
              {filters.countries.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            {openSections.country ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {filterMetadata.countries.slice(0, 10).map((country) => (
              <label key={country} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate">
                <Checkbox
                  checked={filters.countries.includes(country)}
                  onCheckedChange={() => toggleMultiSelect('countries', country)}
                  data-testid={`checkbox-country-${country.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <span className="text-sm">{country}</span>
              </label>
            ))}
            {filterMetadata.countries.length > 10 && (
              <p className="text-xs text-muted-foreground px-2 pt-1">+{filterMetadata.countries.length - 10} more</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Discipline Filter */}
      {filterMetadata && filterMetadata.disciplines.length > 0 && (
        <Collapsible open={openSections.discipline} onOpenChange={(open) => toggleSection('discipline', open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <GraduationCap className="h-4 w-4 text-primary" />
              Discipline
              {filters.disciplines.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            {openSections.discipline ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {filterMetadata.disciplines.slice(0, 10).map((discipline) => (
              <label key={discipline} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate">
                <Checkbox
                  checked={filters.disciplines.includes(discipline)}
                  onCheckedChange={() => toggleMultiSelect('disciplines', discipline)}
                  data-testid={`checkbox-discipline-${discipline.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <span className="text-sm truncate">{discipline}</span>
              </label>
            ))}
            {filterMetadata.disciplines.length > 10 && (
              <p className="text-xs text-muted-foreground px-2 pt-1">+{filterMetadata.disciplines.length - 10} more</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Provider Type Filter */}
      {filterMetadata && filterMetadata.providerTypes.length > 0 && (
        <Collapsible open={openSections.providerType} onOpenChange={(open) => toggleSection('providerType', open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Institution Type
              {filters.providerTypes.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            {openSections.providerType ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {filterMetadata.providerTypes.map((type) => (
              <label key={type} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate">
                <Checkbox
                  checked={filters.providerTypes.includes(type)}
                  onCheckedChange={() => toggleMultiSelect('providerTypes', type)}
                  data-testid={`checkbox-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <span className="text-sm">{type}</span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Ranking Filter */}
      {filterMetadata && filterMetadata.rankingBands.length > 0 && (
        <Collapsible open={openSections.ranking} onOpenChange={(open) => toggleSection('ranking', open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Award className="h-4 w-4 text-primary" />
              Ranking
            </div>
            {openSections.ranking ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {filterMetadata.rankingBands.map((band) => (
              <label key={band} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => {}}
                  data-testid={`checkbox-ranking-${band.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <span className="text-sm">{band}</span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  return (
    <PublicLayout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="ANZ Global Education" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Breadcrumb data-testid="breadcrumb" className="mb-4">
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
              <BreadcrumbPage data-testid="breadcrumb-current">Institutions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Universities & Institutions</h1>
          <p className="text-muted-foreground">Discover world-class institutions for your education journey</p>
        </div>

        {/* Tabs for Programmes/Universities */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex border rounded-lg p-1 bg-muted/30">
            <Link href="/courses">
              <Button variant="ghost" size="sm" className="px-6" data-testid="tab-programmes">
                Programmes
              </Button>
            </Link>
            <Button variant="default" size="sm" className="px-6" data-testid="tab-universities">
              Universities
            </Button>
          </div>
        </div>

        {/* Two-Column Layout */}
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
                <SheetHeader className="mb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Filter Institutions
                  </SheetTitle>
                </SheetHeader>
                
                {/* Search in Mobile */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search institutions..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-mobile"
                  />
                </div>

                <FilterSidebarContent isMobile={true} />
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
                    Find Institutions
                  </CardTitle>
                  <CardDescription>Filter by your preferences</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search institutions..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-institutions"
                    />
                  </div>

                  <FilterSidebarContent />
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Results Header with Sort and View Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="text-sm text-muted-foreground">
                {!isLoading && viewMode === "list" && (
                  <span data-testid="text-results-count">
                    <strong>{totalCount}</strong> institution{totalCount !== 1 ? 's' : ''} found
                  </span>
                )}
                {viewMode === "map" && campusData && (
                  <span data-testid="text-map-results-count">
                    {campusData.campusesWithCoordinates} campus{campusData.campusesWithCoordinates !== 1 ? 'es' : ''} on map
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-44" data-testid="select-sort">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="ranking">Ranking</SelectItem>
                    <SelectItem value="courses">Courses</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border rounded-md p-1">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-7 px-2.5"
                    data-testid="button-view-list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "map" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("map")}
                    className="h-7 px-2.5"
                    data-testid="button-view-map"
                  >
                    <MapIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Map View */}
            {viewMode === "map" && (
              <div className="h-[600px] rounded-lg overflow-hidden border" data-testid="container-map-view">
                <InstitutionMapSearch
                  campuses={campusData?.campuses || []}
                  onInstitutionClick={handleInstitutionClick}
                  onBoundsChange={handleMapBoundsChange}
                  hideInternalToggle={true}
                />
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading institutions...
              </div>
            ) : viewMode === "list" && institutions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No institutions found matching your criteria.
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-4">
                {/* Institution Cards - Single Row Design */}
                {institutions.map((institution) => (
                  <Card
                    key={institution.id}
                    className="hover-elevate"
                    data-testid={`card-institution-${institution.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Left: Logo and Basic Info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <InstitutionLogo
                            src={institution.logo}
                            alt={institution.name}
                            size="md"
                            testId={`img-logo-${institution.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Link href={`/institutions/${institution.id}`}>
                                <h3 className="font-bold text-lg hover:text-primary transition-colors cursor-pointer" data-testid={`text-name-${institution.id}`}>
                                  {institution.name}
                                </h3>
                              </Link>
                              {institution.rankingBand && (
                                <Badge variant="outline" className="text-xs">
                                  {institution.rankingBand}
                                </Badge>
                              )}
                            </div>
                            
                            {institution.location && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span>{institution.location}, {institution.country}</span>
                              </div>
                            )}
                            
                            {institution.deliveryModes && institution.deliveryModes.length > 0 && (
                              <div className="text-sm text-muted-foreground">
                                <span>Attendance: </span>
                                {institution.deliveryModes.join(' / ')}
                              </div>
                            )}

                            <Link href={`/institutions/${institution.id}`}>
                              <span className="text-sm text-primary hover:underline cursor-pointer mt-1 inline-block">
                                Visit Institution Page
                              </span>
                            </Link>
                          </div>
                        </div>

                        {/* Right: Stats Grid */}
                        <div className="flex-shrink-0">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {institution.rankingBand && (
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="text-xs text-muted-foreground">Global Ranking</div>
                                  <div className="font-medium">{institution.rankingBand}</div>
                                </div>
                              </div>
                            )}
                            {institution.providerType && (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="text-xs text-muted-foreground">Institution Type</div>
                                  <div className="font-medium">{institution.providerType}</div>
                                </div>
                              </div>
                            )}
                            {institution.coursesCount !== undefined && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="text-xs text-muted-foreground">Courses</div>
                                  <div className="font-medium">{institution.coursesCount}</div>
                                </div>
                              </div>
                            )}
                            {institution.scholarshipPercentageMax !== null && institution.scholarshipPercentageMax > 0 && (
                              <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="text-xs text-muted-foreground">Scholarships</div>
                                  <div className="font-medium">Up to {institution.scholarshipPercentageMax}%</div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Badges */}
                          <div className="flex gap-2 mt-3 justify-end">
                            {institution.rankingBand === "Top 100" && (
                              <Badge variant="secondary" className="text-xs">Global Top 100</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 rounded-full ${
                                isFavorited(institution.id)
                                  ? "bg-primary text-white hover:bg-primary/90"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                handleFavoriteToggle(institution.id);
                              }}
                              aria-label={isFavorited(institution.id) ? "Remove from favorites" : "Add to favorites"}
                              data-testid={`button-favorite-${institution.id}`}
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  isFavorited(institution.id) ? "fill-current" : ""
                                }`}
                              />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {totalCount > 0 && (
                  <ListPagination
                    currentPage={currentPage}
                    totalItems={totalCount}
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
                    itemLabel="institutions"
                  />
                )}
              </div>
            ) : null}
          </main>
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
    </PublicLayout>
  );
}
