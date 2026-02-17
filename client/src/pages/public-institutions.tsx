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
  Globe, Navigation, Tag
} from "lucide-react";
import { InstitutionMapSearch } from "@/components/institution-map-search";
import type { InstitutionCampus } from "@/components/institution-map-search";
import { PublicLayout } from "@/components/public-layout";
import { GoogleCampusMap } from "@/components/google-campus-map";
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
import { ScholarshipMarquee } from "@/components/ui/scholarship-marquee";
import { getCountryCode, getFlagUrl } from "@/lib/country-flags";
import type { Favorite, SubDiscipline } from "@shared/schema";
import { useRegion } from "@/context/RegionContext";

type CampusAddress = {
  name?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
};

type StructuredTag = {
  id: string;
  name: string;
  category: string;
  color: string | null;
};

type University = {
  id: string;
  name: string;
  description: string;
  slug: string | null;
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
  tags: string[] | null;
  topDisciplines: string[] | null;
  coursesCount?: number;
  campusAddresses?: CampusAddress[] | null;
  structuredTags?: StructuredTag[];
  activeScholarshipMaxPercentage?: number | null;
  activeScholarshipMaxFixed?: number | null;
  activeScholarshipCount?: number;
  activeScholarships?: Array<{ name: string; valueType: string; value: number; }>;
};

type TagInfo = {
  id: string;
  name: string;
  color: string | null;
  count: number;
};

type FilterMetadata = {
  countries: string[];
  statesByCountry: Record<string, string[]>;
  citiesByState: Record<string, string[]>;
  providerTypes: string[];
  tags: string[];
  disciplines: string[];
  tagsByCategory?: Record<string, TagInfo[]>;
  scholarshipRange: { min: number; max: number };
  totalCount: number;
};

type SortOption = "name-asc" | "name-desc" | "courses";

export default function PublicInstitutions() {
  const [location, setLocation] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  
  // Campus map dialog state
  const [campusMapDialogOpen, setCampusMapDialogOpen] = useState(false);
  const [selectedInstitutionForMap, setSelectedInstitutionForMap] = useState<University | null>(null);
  const [selectedCampusIndex, setSelectedCampusIndex] = useState<number>(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    country: true,
    state: true,
    city: true,
    discipline: true,
    providerType: true,
    ranking: true,
    tagType: true,
    tagLocation: true,
    tagSpecialization: true,
  });
  
  const { user, isAuthenticated, isStudent } = useAuth();
  const { toast } = useToast();
  const { region } = useRegion();
  const regionParam = region?.code ? `region=${region.code}` : '';
  const regionQuery = region?.code ? { region: region.code } : {};

  const {
    filters,
    setFilters,
    setSearch,
    toggleMultiSelect,
    setDiscipline,
    setSubDiscipline,
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
        state: true,
        city: true,
        discipline: true,
        providerType: true,
        ranking: true,
        tagType: true,
        tagLocation: true,
        tagSpecialization: true,
      });
    }
  };

  // Open campus map dialog for a specific city or show all campuses
  const openCampusMapForCity = useCallback((institution: University, cityName?: string) => {
    const campuses = institution.campusAddresses || [];
    
    if (cityName) {
      // Find the campus index matching this city (case-insensitive, trimmed)
      const normalizedCity = cityName.trim().toLowerCase();
      const campusIndex = campuses.findIndex((c: CampusAddress) => 
        c.city?.trim().toLowerCase() === normalizedCity
      );
      setSelectedCampusIndex(campusIndex >= 0 ? campusIndex : 0);
    } else {
      // No specific city - show first campus (for "+N more" button)
      setSelectedCampusIndex(0);
    }
    
    setSelectedInstitutionForMap(institution);
    setCampusMapDialogOpen(true);
  }, []);

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
    queryKey: ["/api/institutions/filter-metadata", regionQuery],
  });

  // Fetch sub-disciplines when a discipline is selected
  const { data: subDisciplines = [] } = useQuery<SubDiscipline[]>({
    queryKey: ["/api/sub-disciplines", filters.discipline],
    enabled: !!filters.discipline,
  });

  // Build pagination params
  const paginationParams = `page=${currentPage}&pageSize=${pageSize}`;
  const baseQueryString = queryParamsString 
    ? `${queryParamsString}&${paginationParams}` 
    : paginationParams;
  const fullQueryString = regionParam
    ? `${baseQueryString}&${regionParam}`
    : baseQueryString;

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

  // Fetch campus locations for map view - includes sidebar filters and map bounds
  const campusQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    // Add sidebar filter parameters
    if (filters.countries.length > 0) params.set('countries', filters.countries.join(','));
    if (filters.states.length > 0) params.set('states', filters.states.join(','));
    if (filters.cities.length > 0) params.set('cities', filters.cities.join(','));
    if (filters.discipline) params.set('discipline', filters.discipline);
    if (filters.subDiscipline) params.set('subDiscipline', filters.subDiscipline);
    if (filters.providerTypes.length > 0) params.set('providerTypes', filters.providerTypes.join(','));
    if (filters.search) params.set('search', filters.search);
    
    // Add map bounds if available
    if (mapBounds) {
      params.set('north', mapBounds.north.toString());
      params.set('south', mapBounds.south.toString());
      params.set('east', mapBounds.east.toString());
      params.set('west', mapBounds.west.toString());
    }
    
    return params.toString();
  }, [filters, mapBounds]);

  const { data: campusData } = useQuery<{
    campuses: InstitutionCampus[];
    totalInstitutions: number;
    campusesWithCoordinates: number;
  }>({
    queryKey: ["/api/institutions/campus-locations", campusQueryParams],
    queryFn: async () => {
      const url = campusQueryParams 
        ? `/api/institutions/campus-locations?${campusQueryParams}`
        : `/api/institutions/campus-locations`;
      const response = await fetch(url);
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
    filters.states.length +
    filters.cities.length +
    (filters.discipline ? 1 : 0) + 
    (filters.subDiscipline ? 1 : 0) + 
    filters.providerTypes.length +
    filters.tags.length +
    (filters.scholarshipMin !== undefined || filters.scholarshipMax !== undefined ? 1 : 0) +
    (searchInput ? 1 : 0);

  const clearAllFilters = () => {
    clearFilters();
    setSearchInput("");
    // Reset map bounds to trigger full data refetch
    setMapBounds(null);
    // Invalidate campus locations cache to force refetch
    queryClient.invalidateQueries({ queryKey: ["/api/institutions/campus-locations"] });
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
            {filters.discipline && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                {filters.discipline.length > 20 ? filters.discipline.slice(0, 20) + '...' : filters.discipline}
                <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setDiscipline("")} data-testid={`button-clear-discipline-${filters.discipline.toLowerCase().replace(/\s+/g, '-')}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.subDiscipline && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                {filters.subDiscipline.length > 20 ? filters.subDiscipline.slice(0, 20) + '...' : filters.subDiscipline}
                <button className="ml-0.5 rounded-sm opacity-70 hover:opacity-100" onClick={() => setSubDiscipline("")} data-testid={`button-clear-subdiscipline-${filters.subDiscipline.toLowerCase().replace(/\s+/g, '-')}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
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

      {/* Location Filter - Cascading Country → State → City */}
      {filterMetadata && filterMetadata.countries.length > 0 && (() => {
        const selectedCountry = filters.countries[0] || "";
        const selectedState = filters.states[0] || "";
        const selectedCity = filters.cities[0] || "";
        
        const availableStates = selectedCountry 
          ? Array.from(new Set(filterMetadata.statesByCountry?.[selectedCountry] || [])).sort()
          : [];
        
        const availableCities = selectedCountry && selectedState
          ? Array.from(new Set(filterMetadata.citiesByState?.[`${selectedCountry}:${selectedState}`] || [])).sort()
          : [];
        
        const handleCountryChange = (val: string) => {
          if (val === "all") {
            setFilters(prev => ({ ...prev, countries: [], states: [], cities: [] }));
          } else {
            setFilters(prev => ({ ...prev, countries: [val], states: [], cities: [] }));
          }
        };
        
        const handleStateChange = (val: string) => {
          if (val === "all") {
            setFilters(prev => ({ ...prev, states: [], cities: [] }));
          } else {
            setFilters(prev => ({ ...prev, states: [val], cities: [] }));
          }
        };
        
        const handleCityChange = (val: string) => {
          if (val === "all") {
            setFilters(prev => ({ ...prev, cities: [] }));
          } else {
            setFilters(prev => ({ ...prev, cities: [val] }));
          }
        };
        
        return (
          <Collapsible open={openSections.country} onOpenChange={(open) => toggleSection('country', open)}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Globe className="h-4 w-4 text-primary" />
                Location
                {(selectedCountry || selectedState || selectedCity) && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.country ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pb-3 px-1 space-y-2">
              <Select value={selectedCountry || "all"} onValueChange={handleCountryChange}>
                <SelectTrigger data-testid="select-country" className="h-9">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {filterMetadata.countries.map((ctry) => {
                    const countryCodeMap: Record<string, string> = {
                      'Australia': 'au',
                      'United States': 'us',
                      'United Kingdom': 'gb',
                      'Canada': 'ca',
                      'New Zealand': 'nz',
                      'Germany': 'de',
                      'France': 'fr',
                      'Ireland': 'ie',
                      'Netherlands': 'nl',
                      'Singapore': 'sg',
                      'Japan': 'jp',
                      'South Korea': 'kr',
                      'China': 'cn',
                      'India': 'in',
                      'Malaysia': 'my',
                      'Bangladesh': 'bd',
                      'UAE': 'ae',
                      'United Arab Emirates': 'ae',
                      'Italy': 'it',
                      'Spain': 'es',
                      'Switzerland': 'ch',
                      'Sweden': 'se',
                      'Norway': 'no',
                      'Denmark': 'dk',
                      'Finland': 'fi',
                      'Austria': 'at',
                      'Belgium': 'be',
                      'Portugal': 'pt',
                      'Philippines': 'ph',
                      'Vietnam': 'vn',
                      'Thailand': 'th',
                      'Indonesia': 'id',
                      'Pakistan': 'pk',
                      'Nepal': 'np',
                      'Sri Lanka': 'lk',
                    };
                    const countryCode = countryCodeMap[ctry] || 'un';
                    const flagUrl = `https://flagcdn.com/w20/${countryCode}.png`;
                    return (
                      <SelectItem key={ctry} value={ctry}>
                        <div className="flex items-center gap-2">
                          <img 
                            src={flagUrl} 
                            alt={`${ctry} flag`}
                            loading="lazy"
                            width={16}
                            height={12} 
                            className="w-4 h-auto rounded-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          {ctry}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedCountry && availableStates.length > 0 && (
                <Select value={selectedState || "all"} onValueChange={handleStateChange}>
                  <SelectTrigger data-testid="select-state" className="h-9">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {availableStates.map((st) => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedState && availableCities.length > 0 && (
                <Select value={selectedCity || "all"} onValueChange={handleCityChange}>
                  <SelectTrigger data-testid="select-city" className="h-9">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {availableCities.map((city) => (
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
        );
      })()}

      {/* Provider Type Filter - Institution Type */}
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

      {/* Discipline Filter */}
      {filterMetadata && filterMetadata.disciplines.length > 0 && (
        <Collapsible open={openSections.discipline} onOpenChange={(open) => toggleSection('discipline', open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <GraduationCap className="h-4 w-4 text-primary" />
              Discipline
              {filters.discipline && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            {openSections.discipline ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pb-3 px-1 space-y-2">
            <Select value={filters.discipline || "all"} onValueChange={(val) => setDiscipline(val === "all" ? "" : val)}>
              <SelectTrigger data-testid="select-discipline" className="h-9">
                <SelectValue placeholder="All Disciplines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disciplines</SelectItem>
                {filterMetadata.disciplines.map((disc) => (
                  <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filters.discipline && subDisciplines.length > 0 && (
              <Select value={filters.subDiscipline || "all"} onValueChange={(val) => setSubDiscipline(val === "all" ? "" : val)}>
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
      )}

      {/* Tag Filters by Category */}
      {/* Type Tags (Public/Private) */}
      {filterMetadata?.tagsByCategory?.type && filterMetadata.tagsByCategory.type.length > 0 && (
        <Collapsible open={openSections.tagType} onOpenChange={(open) => toggleSection('tagType', open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Tag className="h-4 w-4 text-primary" />
              Ownership Type
              {filters.tags.some(t => filterMetadata.tagsByCategory?.type?.some(tag => tag.name === t)) && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            {openSections.tagType ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {filterMetadata.tagsByCategory.type.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate">
                <Checkbox
                  checked={filters.tags.includes(tag.name)}
                  onCheckedChange={() => toggleMultiSelect('tags', tag.name)}
                  data-testid={`checkbox-tag-type-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <span className="text-sm flex items-center gap-1.5">
                  {tag.color && (
                    <span 
                      className="h-2 w-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: tag.color }} 
                    />
                  )}
                  {tag.name}
                  <span className="text-muted-foreground text-xs">({tag.count})</span>
                </span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Location Tags (Multi Campus, Regional Study) */}
      {filterMetadata?.tagsByCategory?.location && filterMetadata.tagsByCategory.location.length > 0 && (
        <Collapsible open={openSections.tagLocation} onOpenChange={(open) => toggleSection('tagLocation', open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Tag className="h-4 w-4 text-primary" />
              Campus Options
              {filters.tags.some(t => filterMetadata.tagsByCategory?.location?.some(tag => tag.name === t)) && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            {openSections.tagLocation ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {filterMetadata.tagsByCategory.location.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate">
                <Checkbox
                  checked={filters.tags.includes(tag.name)}
                  onCheckedChange={() => toggleMultiSelect('tags', tag.name)}
                  data-testid={`checkbox-tag-location-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <span className="text-sm flex items-center gap-1.5">
                  {tag.color && (
                    <span 
                      className="h-2 w-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: tag.color }} 
                    />
                  )}
                  {tag.name}
                  <span className="text-muted-foreground text-xs">({tag.count})</span>
                </span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Specialization Tags (Professional Year) */}
      {filterMetadata?.tagsByCategory?.specialization && filterMetadata.tagsByCategory.specialization.length > 0 && (
        <Collapsible open={openSections.tagSpecialization} onOpenChange={(open) => toggleSection('tagSpecialization', open)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Tag className="h-4 w-4 text-primary" />
              Specializations
              {filters.tags.some(t => filterMetadata.tagsByCategory?.specialization?.some(tag => tag.name === t)) && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            {openSections.tagSpecialization ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {filterMetadata.tagsByCategory.specialization.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate">
                <Checkbox
                  checked={filters.tags.includes(tag.name)}
                  onCheckedChange={() => toggleMultiSelect('tags', tag.name)}
                  data-testid={`checkbox-tag-specialization-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <span className="text-sm flex items-center gap-1.5">
                  {tag.color && (
                    <span 
                      className="h-2 w-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: tag.color }} 
                    />
                  )}
                  {tag.name}
                  <span className="text-muted-foreground text-xs">({tag.count})</span>
                </span>
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

      <div id="main-content" className="container mx-auto px-4 py-6">
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
          <h1 className="text-3xl font-bold mb-2">Browse Institutions</h1>
          <p className="text-muted-foreground">Discover world-class institutions for your education journey</p>
        </div>

        {/* Tabs for Courses/Institutions */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex border rounded-lg p-1 bg-muted/30">
            <Link href="/courses">
              <Button variant="ghost" size="sm" className="px-6" data-testid="tab-courses">
                Courses
              </Button>
            </Link>
            <Button variant="default" size="sm" className="px-6" data-testid="tab-institutions">
              Institutions
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
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search institutions..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                    aria-label="Search institutions"
                    data-testid="input-search-mobile"
                  />
                </div>

                <FilterSidebarContent isMobile={true} />
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
                    Find Institutions
                  </CardTitle>
                  <CardDescription>Filter by your preferences</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      placeholder="Search institutions..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9"
                      aria-label="Search institutions"
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
              <div className="space-y-6">
                {/* Institution Cards - Single Row Design */}
                {institutions.map((institution) => (
                  <Card
                    key={institution.id}
                    className="hover-elevate shadow-md"
                    data-testid={`card-institution-${institution.id}`}
                  >
                    <CardContent className="p-4">
                      {/* Top Row: Animated Scholarship Marquee or fallback badge */}
                      {institution.activeScholarships && institution.activeScholarships.length > 0 ? (
                        <div className="flex justify-between items-center gap-2 mb-3">
                          <ScholarshipMarquee 
                            scholarships={institution.activeScholarships}
                            className="flex-1 max-w-[280px]"
                            testId={`marquee-scholarship-${institution.id}`}
                          />
                          <Button
                            variant={isFavorited(institution.id) ? "default" : "ghost"}
                            size="icon"
                            className="flex-shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleFavoriteToggle(institution.id);
                            }}
                            disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                            data-testid={`button-favorite-${institution.id}`}
                          >
                            <Heart className={`h-4 w-4 ${isFavorited(institution.id) ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(institution.activeScholarshipMaxPercentage ?? institution.scholarshipPercentageMax) !== null && 
                             (institution.activeScholarshipMaxPercentage ?? institution.scholarshipPercentageMax)! > 0 && (
                              <Badge variant="default" className="text-xs" data-testid={`badge-scholarship-${institution.id}`}>
                                <Award className="h-3 w-3 mr-1" />
                                Up to {institution.activeScholarshipMaxPercentage ?? institution.scholarshipPercentageMax}% Scholarship
                              </Badge>
                            )}
                          </div>
                        
                          {/* Top Right: Favorite */}
                          <Button
                            variant={isFavorited(institution.id) ? "default" : "ghost"}
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleFavoriteToggle(institution.id);
                            }}
                            disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                            aria-label={isFavorited(institution.id) ? "Remove from favorites" : "Add to favorites"}
                            data-testid={`button-favorite-fallback-${institution.id}`}
                          >
                            <Heart className={`h-4 w-4 ${isFavorited(institution.id) ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                      )}

                      {/* Main Content: Logo + Institution Info */}
                      <div className="flex items-center gap-3">
                        <InstitutionLogo
                          src={institution.logo}
                          alt={institution.name}
                          size="md"
                          testId={`img-logo-${institution.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <Link href={`/institutions/${institution.slug || institution.id}`}>
                            <h3 className="font-bold text-lg hover:text-primary transition-colors cursor-pointer mb-1 flex items-center gap-2 flex-wrap" data-testid={`text-name-${institution.id}`}>
                              {institution.name}
                              {(() => {
                                const countryCode = getCountryCode(institution.country);
                                if (countryCode) {
                                  return (
                                    <img 
                                      src={getFlagUrl(countryCode)} 
                                      alt={`${institution.country} flag`}
                                      loading="lazy"
                                      width={20}
                                      height={16}
                                      className="h-4 w-5 object-cover rounded-sm flex-shrink-0"
                                      data-testid={`flag-name-${institution.id}`}
                                    />
                                  );
                                }
                                return null;
                              })()}
                            </h3>
                          </Link>
                          
                          {institution.description && (
                            <p 
                              className="text-sm text-muted-foreground mb-1 line-clamp-2"
                              data-testid={`text-description-${institution.id}`}
                            >
                              {institution.description}
                            </p>
                          )}
                          
                          {institution.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span>{institution.location}, {institution.country}</span>
                            </div>
                          )}
                          
                        </div>
                      </div>

                      {/* Bottom Section: Stats Row + Campus Cities + View Details Button */}
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex flex-col gap-3">
                          {/* Stats Row */}
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
                            {/* Institution Type */}
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground" data-testid={`text-provider-type-${institution.id}`}>
                                {institution.providerType || 'Institution'}
                              </span>
                            </div>
                            {institution.coursesCount !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{institution.coursesCount} Courses</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Location & Type Tags */}
                          {(() => {
                            const locationTags = institution.structuredTags?.filter(t => t.category === 'location') || [];
                            const typeTags = institution.structuredTags?.filter(t => t.category === 'type') || [];
                            const relevantTags = [...typeTags, ...locationTags];
                            
                            if (relevantTags.length === 0) return null;
                            
                            return (
                              <div 
                                className="flex flex-wrap items-center gap-1.5"
                                data-testid={`institution-tags-${institution.id}`}
                              >
                                {relevantTags.slice(0, 5).map((tag) => (
                                  <Badge 
                                    key={tag.id}
                                    variant="secondary" 
                                    className="text-xs py-0 px-2"
                                    style={tag.color ? { backgroundColor: `${tag.color}20`, borderColor: tag.color, color: tag.color } : undefined}
                                    data-testid={`badge-tag-${institution.id}-${tag.id}`}
                                  >
                                    {tag.name}
                                  </Badge>
                                ))}
                                {relevantTags.length > 5 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs py-0 px-1.5"
                                    data-testid={`badge-tags-more-${institution.id}`}
                                  >
                                    +{relevantTags.length - 5}
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}
                          
                          {/* Campus Cities Row + View Details Button */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            {/* Campus Cities */}
                            {(() => {
                              const uniqueCities = institution.campusAddresses 
                                ? Array.from(new Set(
                                    institution.campusAddresses
                                      .map((c: CampusAddress) => c.city)
                                      .filter(Boolean)
                                  )) as string[]
                                : [];
                              
                              if (uniqueCities.length === 0) return null;
                              
                              return (
                                <div 
                                  className="flex flex-wrap items-center gap-1.5"
                                  data-testid={`campus-cities-${institution.id}`}
                                >
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <div className="flex flex-wrap gap-1">
                                    {uniqueCities.slice(0, 4).map((city, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openCampusMapForCity(institution, city);
                                        }}
                                        className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
                                        data-testid={`button-city-map-${institution.id}-${idx}`}
                                      >
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs py-0 px-1.5 cursor-pointer"
                                          data-testid={`badge-city-${institution.id}-${idx}`}
                                        >
                                          {city}
                                        </Badge>
                                      </button>
                                    ))}
                                    {uniqueCities.length > 4 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openCampusMapForCity(institution);
                                        }}
                                        className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
                                        data-testid={`button-city-more-${institution.id}`}
                                      >
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs py-0 px-1.5 cursor-pointer"
                                          data-testid={`badge-city-more-${institution.id}`}
                                        >
                                          +{uniqueCities.length - 4} more
                                        </Badge>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                            
                            {/* View Details Button - Primary Blue */}
                            <Button
                              asChild
                              variant="default"
                              size="sm"
                              className="w-full sm:w-auto"
                              data-testid={`button-view-${institution.id}`}
                            >
                              <Link href={`/institutions/${institution.slug || institution.id}`}>
                                View Details
                              </Link>
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

      {/* Campus Map Dialog - Compact Medium Size */}
      <Dialog open={campusMapDialogOpen} onOpenChange={setCampusMapDialogOpen}>
        <DialogContent className="max-w-lg p-4" data-testid="dialog-campus-map">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedInstitutionForMap?.logo ? (
                <img 
                  src={selectedInstitutionForMap.logo} 
                  alt={selectedInstitutionForMap.name}
                  loading="lazy"
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded object-contain"
                />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {selectedInstitutionForMap?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Selected Campus Info - Compact */}
            {selectedInstitutionForMap?.campusAddresses && selectedInstitutionForMap.campusAddresses.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium text-sm" data-testid="text-dialog-campus-name">
                    {selectedInstitutionForMap.campusAddresses[selectedCampusIndex]?.name || 'Main Campus'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1" data-testid="text-dialog-campus-address">
                    — {[
                      selectedInstitutionForMap.campusAddresses[selectedCampusIndex]?.city,
                      selectedInstitutionForMap.campusAddresses[selectedCampusIndex]?.state,
                      selectedInstitutionForMap.campusAddresses[selectedCampusIndex]?.postcode
                    ].filter(Boolean).join(', ')}
                  </span>
                </div>
              </div>
            )}
            
            {/* Compact Map */}
            {selectedInstitutionForMap?.campusAddresses && selectedInstitutionForMap.campusAddresses.length > 0 && (
              <div className="rounded-md overflow-hidden border h-[260px]">
                <GoogleCampusMap
                  campuses={selectedInstitutionForMap.campusAddresses.map((c: CampusAddress) => ({
                    name: c.name || 'Campus',
                    address: c.address || [c.street, c.city, c.state, c.postcode, c.country].filter(Boolean).join(', '),
                    city: c.city || '',
                    state: c.state || '',
                    postcode: c.postcode || '',
                    country: c.country || '',
                    latitude: c.latitude || '',
                    longitude: c.longitude || ''
                  }))}
                  institutionName={selectedInstitutionForMap.name}
                  selectedCampusIndex={selectedCampusIndex}
                  onMarkerClick={(index) => setSelectedCampusIndex(index)}
                  height="260px"
                  logoUrl={selectedInstitutionForMap.logo}
                />
              </div>
            )}

            {/* Campus Switcher - Compact */}
            {selectedInstitutionForMap?.campusAddresses && selectedInstitutionForMap.campusAddresses.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Campus:</span>
                {selectedInstitutionForMap.campusAddresses.map((campus: CampusAddress, index: number) => (
                  <Button
                    key={index}
                    variant={selectedCampusIndex === index ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setSelectedCampusIndex(index)}
                    data-testid={`button-switch-campus-${index}`}
                  >
                    {campus.name || campus.city || `Campus ${index + 1}`}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
