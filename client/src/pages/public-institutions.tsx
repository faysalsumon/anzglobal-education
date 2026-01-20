import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Home, Heart, Map as MapIcon, List } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useInstitutionFilters } from "@/hooks/useInstitutionFilters";
import { InstitutionFilterBar } from "@/components/institution-filter-bar";
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

export default function PublicInstitutions() {
  const [location, setLocation] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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

  const institutions = institutionsData?.items ?? [];
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

  // SEO data
  const siteUrl = window.location.origin;
  const pageUrl = `${siteUrl}/institutions`;
  const pageTitle = "Find Institutions - ANZ Global Education";
  const pageDescription = `Explore ${filterMetadata?.totalCount || 100}+ top universities and institutions worldwide. Search by country, ranking, programs, and facilities. Find your ideal institution for international study.`;
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

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search institutions, disciplines..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
              data-testid="input-search-institutions"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Modern Horizontal Filter Bar */}
        <InstitutionFilterBar
          filterMetadata={filterMetadata}
          filters={filters}
          toggleMultiSelect={toggleMultiSelect}
          setRange={setRange}
          clearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Results Count & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="text-sm text-muted-foreground">
            {!isLoading && viewMode === "list" && (
              <span data-testid="text-results-count">
                {institutions.length} institution{institutions.length !== 1 ? 's' : ''} found
              </span>
            )}
            {viewMode === "map" && campusData && (
              <span data-testid="text-map-results-count">
                {campusData.campusesWithCoordinates} campus{campusData.campusesWithCoordinates !== 1 ? 'es' : ''} on map
              </span>
            )}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-3"
              data-testid="button-view-list"
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="h-8 px-3"
              data-testid="button-view-map"
            >
              <MapIcon className="h-4 w-4 mr-1" />
              Map
            </Button>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {institutions.map((institution) => (
              <Card
                key={institution.id}
                className="hover-elevate active-elevate-2"
                data-testid={`card-institution-${institution.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    <InstitutionLogo
                      src={institution.logo}
                      alt={institution.name}
                      size="md"
                      testId={`img-logo-${institution.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        {institution.providerType && (
                          <Badge variant="secondary" className="text-xs">
                            {institution.providerType}
                          </Badge>
                        )}
                        {institution.rankingBand && (
                          <Badge variant="outline" className="text-xs">
                            {institution.rankingBand}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg" data-testid={`text-name-${institution.id}`}>
                        {institution.name}
                      </h3>
                      {institution.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span>{institution.location}, {institution.country}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      className={`!h-11 !w-11 !min-h-11 !min-w-11 sm:!h-10 sm:!w-10 sm:!min-h-10 sm:!min-w-10 !p-0 rounded-full transition-all flex-shrink-0 ${
                        isFavorited(institution.id)
                          ? "bg-primary hover:bg-primary/90 shadow-md"
                          : "bg-background/80 hover:bg-background shadow-sm"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleFavoriteToggle(institution.id);
                      }}
                      aria-label={isFavorited(institution.id) ? "Remove from favorites" : "Add to favorites"}
                      data-testid={`button-favorite-${institution.id}`}
                    >
                      <Heart
                        className={`h-5 w-5 transition-all ${
                          isFavorited(institution.id)
                            ? "fill-white text-white"
                            : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {institution.description}
                  </p>

                  {/* Enhanced metadata display */}
                  <div className="space-y-3 mb-4">
                    {/* Scholarship & Tuition */}
                    {(institution.scholarshipPercentageMin || institution.tuitionFeesMin) && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {institution.scholarshipPercentageMin !== null && institution.scholarshipPercentageMax !== null && (
                          <Badge variant="secondary">
                            Scholarship: {institution.scholarshipPercentageMin}% - {institution.scholarshipPercentageMax}%
                          </Badge>
                        )}
                        {institution.tuitionFeesMin && institution.tuitionFeesMax && (
                          <Badge variant="outline">
                            Tuition: ${parseFloat(institution.tuitionFeesMin).toLocaleString()} - ${parseFloat(institution.tuitionFeesMax).toLocaleString()} {institution.tuitionCurrency || 'AUD'}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Delivery Modes */}
                    {institution.deliveryModes && institution.deliveryModes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1">Delivery Modes:</p>
                        <div className="flex flex-wrap gap-1">
                          {institution.deliveryModes.map((mode) => (
                            <Badge key={mode} variant="secondary" className="text-xs">
                              {mode}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Intake Periods */}
                    {institution.intakePeriods && institution.intakePeriods.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1">Intakes:</p>
                        <div className="flex flex-wrap gap-1">
                          {institution.intakePeriods.map((intake) => (
                            <Badge key={intake} variant="outline" className="text-xs">
                              {intake}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Disciplines */}
                    {institution.topDisciplines && institution.topDisciplines.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1">Top Disciplines:</p>
                        <div className="flex flex-wrap gap-1">
                          {institution.topDisciplines.slice(0, 3).map((discipline) => (
                            <Badge key={discipline} variant="secondary" className="text-xs">
                              {discipline}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      asChild
                      data-testid={`button-view-institution-${institution.id}`}
                    >
                      <Link href={`/institutions/${institution.id}`}>
                        View Institution
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      asChild
                      data-testid={`button-view-courses-${institution.id}`}
                    >
                      <a href={`/courses?university=${institution.id}`}>
                        View Courses
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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
