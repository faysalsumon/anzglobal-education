import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Home, Heart, SlidersHorizontal, X } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useInstitutionFilters } from "@/hooks/useInstitutionFilters";
import { FilterCommandMultiSelect } from "@/components/filter-command-multi-select";
import { FilterRangeSlider } from "@/components/filter-range-slider";
import { ActiveFilterChips } from "@/components/active-filter-chips";
import { InstitutionLogo } from "@/components/institution-logo";
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
  const [location] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const { user, isAuthenticated, isStudent } = useAuth();
  const { toast } = useToast();

  const {
    filters,
    setSearch,
    toggleMultiSelect,
    setRange,
    setSingleSelect,
    setInternationalSupport,
    clearFilters,
    activeFilterChips,
    hasActiveFilters,
    queryParamsString,
  } = useInstitutionFilters();

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

  // Fetch institutions with filters - use stable queryParamsString from hook
  const { data: institutions = [], isLoading } = useQuery<University[]>({
    queryKey: ["/api/institutions", queryParamsString],
    queryFn: async () => {
      const url = queryParamsString ? `/api/institutions?${queryParamsString}` : "/api/institutions";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch institutions");
      return response.json();
    },
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

  // Filter controls component (used in both Sheet and desktop sidebar)
  const FilterControls = () => (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={["disciplines", "location", "type"]} className="w-full">
        {/* Disciplines */}
        {filterMetadata && filterMetadata.disciplines.length > 0 && (
          <AccordionItem value="disciplines">
            <AccordionTrigger>Disciplines</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <FilterCommandMultiSelect
                label="Select disciplines"
                options={filterMetadata.disciplines}
                selected={filters.disciplines}
                onToggle={(value) => toggleMultiSelect('disciplines', value)}
                placeholder="Search disciplines..."
                testId="filter-disciplines"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Location */}
        {filterMetadata && filterMetadata.countries.length > 0 && (
          <AccordionItem value="location">
            <AccordionTrigger>Location</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <FilterCommandMultiSelect
                label="Select countries"
                options={filterMetadata.countries}
                selected={filters.countries}
                onToggle={(value) => toggleMultiSelect('countries', value)}
                placeholder="Search countries..."
                testId="filter-countries"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Institution Type */}
        {filterMetadata && filterMetadata.providerTypes.length > 0 && (
          <AccordionItem value="type">
            <AccordionTrigger>Institution Type</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <FilterCommandMultiSelect
                label="Select types"
                options={filterMetadata.providerTypes}
                selected={filters.providerTypes}
                onToggle={(value) => toggleMultiSelect('providerTypes', value)}
                placeholder="Search types..."
                testId="filter-provider-types"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Delivery Modes */}
        {filterMetadata && filterMetadata.deliveryModes.length > 0 && (
          <AccordionItem value="delivery">
            <AccordionTrigger>Delivery Modes</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <FilterCommandMultiSelect
                label="Select modes"
                options={filterMetadata.deliveryModes}
                selected={filters.deliveryModes}
                onToggle={(value) => toggleMultiSelect('deliveryModes', value)}
                placeholder="Search delivery modes..."
                testId="filter-delivery-modes"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Intake Periods */}
        {filterMetadata && filterMetadata.intakePeriods.length > 0 && (
          <AccordionItem value="intake">
            <AccordionTrigger>Intake Periods</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <FilterCommandMultiSelect
                label="Select intakes"
                options={filterMetadata.intakePeriods}
                selected={filters.intakePeriods}
                onToggle={(value) => toggleMultiSelect('intakePeriods', value)}
                placeholder="Search intake periods..."
                testId="filter-intake-periods"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Facilities */}
        {filterMetadata && filterMetadata.facilities.length > 0 && (
          <AccordionItem value="facilities">
            <AccordionTrigger>Facilities</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <FilterCommandMultiSelect
                label="Select facilities"
                options={filterMetadata.facilities}
                selected={filters.facilities}
                onToggle={(value) => toggleMultiSelect('facilities', value)}
                placeholder="Search facilities..."
                testId="filter-facilities"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Scholarship Range */}
        {filterMetadata && (
          <AccordionItem value="scholarship">
            <AccordionTrigger>Scholarship Range</AccordionTrigger>
            <AccordionContent>
              <FilterRangeSlider
                label="Percentage"
                min={filterMetadata.scholarshipRange.min}
                max={filterMetadata.scholarshipRange.max}
                value={filters.scholarshipMin !== undefined || filters.scholarshipMax !== undefined
                  ? [filters.scholarshipMin || filterMetadata.scholarshipRange.min, filters.scholarshipMax || filterMetadata.scholarshipRange.max]
                  : undefined}
                onChange={(min, max) => setRange('scholarship', min, max)}
                formatValue={(v) => `${v}%`}
                testId="filter-scholarship-range"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Tuition Range */}
        {filterMetadata && (
          <AccordionItem value="tuition">
            <AccordionTrigger>Tuition Range</AccordionTrigger>
            <AccordionContent>
              <FilterRangeSlider
                label="Annual Fees"
                min={filterMetadata.tuitionRange.min}
                max={filterMetadata.tuitionRange.max}
                value={filters.tuitionMin !== undefined || filters.tuitionMax !== undefined
                  ? [filters.tuitionMin || filterMetadata.tuitionRange.min, filters.tuitionMax || filterMetadata.tuitionRange.max]
                  : undefined}
                onChange={(min, max) => setRange('tuition', min, max)}
                formatValue={(v) => `$${v.toLocaleString()}`}
                step={1000}
                testId="filter-tuition-range"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Accreditation */}
        {filterMetadata && filterMetadata.accreditationStatuses.length > 0 && (
          <AccordionItem value="accreditation">
            <AccordionTrigger>Accreditation</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {filterMetadata.accreditationStatuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`accred-${status}`}
                    checked={filters.accreditationStatus === status}
                    onCheckedChange={(checked) =>
                      setSingleSelect('accreditationStatus', checked ? status : undefined)
                    }
                    data-testid={`checkbox-accreditation-${status}`}
                  />
                  <Label htmlFor={`accred-${status}`} className="text-sm font-normal cursor-pointer">
                    {status}
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Ranking */}
        {filterMetadata && filterMetadata.rankingBands.length > 0 && (
          <AccordionItem value="ranking">
            <AccordionTrigger>Ranking Band</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {filterMetadata.rankingBands.map((band) => (
                <div key={band} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rank-${band}`}
                    checked={filters.rankingBand === band}
                    onCheckedChange={(checked) =>
                      setSingleSelect('rankingBand', checked ? band : undefined)
                    }
                    data-testid={`checkbox-ranking-${band}`}
                  />
                  <Label htmlFor={`rank-${band}`} className="text-sm font-normal cursor-pointer">
                    {band}
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* International Support */}
        <AccordionItem value="support">
          <AccordionTrigger>Other</AccordionTrigger>
          <AccordionContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="international-support"
                checked={filters.internationalSupport === true}
                onCheckedChange={(checked) =>
                  setInternationalSupport(checked ? true : undefined)
                }
                data-testid="checkbox-international-support"
              />
              <Label htmlFor="international-support" className="text-sm font-normal cursor-pointer">
                International Student Support
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {hasActiveFilters && (
        <Button
          variant="outline"
          className="w-full"
          onClick={clearFilters}
          data-testid="button-clear-all-filters-sidebar"
        >
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <PublicLayout>
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
      <div className="container mx-auto px-4 py-8">
        {/* Mobile Filter Button + Active Chips */}
        <div className="lg:hidden mb-6 space-y-4">
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full" data-testid="button-open-filters">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterChips.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Institutions</SheetTitle>
                <SheetDescription>
                  Refine your search with the filters below
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FilterControls />
              </div>
            </SheetContent>
          </Sheet>

          {hasActiveFilters && (
            <ActiveFilterChips
              chips={activeFilterChips}
              onClearAll={clearFilters}
              testId="active-filters-mobile"
            />
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4">Filters</h2>
                <FilterControls />
              </CardContent>
            </Card>
          </aside>

          {/* Institutions Grid */}
          <div className="flex-1">
            {/* Desktop Active Chips */}
            {hasActiveFilters && (
              <div className="hidden lg:block mb-6">
                <ActiveFilterChips
                  chips={activeFilterChips}
                  onClearAll={clearFilters}
                  testId="active-filters-desktop"
                />
              </div>
            )}

            {/* Results Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              {!isLoading && (
                <span data-testid="text-results-count">
                  {institutions.length} institution{institutions.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading institutions...
              </div>
            ) : institutions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No institutions found matching your criteria.
              </div>
            ) : (
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
            )}
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
    </PublicLayout>
  );
}
