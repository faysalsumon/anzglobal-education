import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Home } from "lucide-react";
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
import { Link, useLocation } from "wouter";

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
  scholarshipPercentage: number | null;
  topDisciplines: string[] | null;
};

export default function PublicInstitutions() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [scholarshipFilter, setScholarshipFilter] = useState("all");

  // Read search query from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [location]);

  const { data: institutions = [], isLoading } = useQuery<University[]>({
    queryKey: ["/api/institutions"],
  });

  // Get unique locations for filter
  const locations = Array.from(new Set(institutions.map((i) => i.location))).filter((loc): loc is string => Boolean(loc));

  // Get unique provider types for filter
  const providerTypes = Array.from(new Set(institutions.map((i) => i.providerType))).filter((type): type is string => Boolean(type));

  // Get unique scholarship percentages for filter
  const scholarshipPercentages = Array.from(
    new Set(institutions.map((i) => i.scholarshipPercentage).filter((s) => s !== null))
  ).sort((a, b) => (a as number) - (b as number));

  // Filter institutions based on search and filters
  const filteredInstitutions = institutions.filter((institution) => {
    const matchesSearch =
      searchQuery === "" ||
      institution.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      institution.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      institution.topDisciplines?.some((d) =>
        d.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesLocation =
      locationFilter === "all" || institution.location === locationFilter;

    const matchesType =
      typeFilter === "all" || institution.providerType === typeFilter;

    const matchesScholarship =
      scholarshipFilter === "all" ||
      (institution.scholarshipPercentage !== null &&
        institution.scholarshipPercentage.toString() === scholarshipFilter);

    return matchesSearch && matchesLocation && matchesType && matchesScholarship;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <h1 className="text-2xl font-bold text-primary" data-testid="link-home">
                ANZ Global Education
              </h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/courses">
                <Button variant="ghost" data-testid="link-courses">
                  Find Courses
                </Button>
              </Link>
            </div>
          </div>

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
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Find Your Institutes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-institutions"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger data-testid="select-location">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Type of Institution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {providerTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters Sidebar */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4">Filters:</h2>

                {/* Scholarship Filter */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2 text-sm">Scholarship</h3>
                  <Select value={scholarshipFilter} onValueChange={setScholarshipFilter}>
                    <SelectTrigger data-testid="select-scholarship">
                      <SelectValue placeholder="Scholarship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {scholarshipPercentages.map((percentage) => (
                        <SelectItem key={percentage} value={String(percentage)}>
                          {percentage}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                {(searchQuery || locationFilter !== "all" || typeFilter !== "all" || scholarshipFilter !== "all") && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSearchQuery("");
                      setLocationFilter("all");
                      setTypeFilter("all");
                      setScholarshipFilter("all");
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Institutions Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading institutions...
              </div>
            ) : filteredInstitutions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No institutions found matching your criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredInstitutions.map((institution) => (
                  <Card
                    key={institution.id}
                    className="hover-elevate active-elevate-2"
                    data-testid={`card-institution-${institution.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        {institution.logo && (
                          <img
                            src={institution.logo}
                            alt={institution.name}
                            className="w-16 h-16 object-contain rounded"
                            data-testid={`img-logo-${institution.id}`}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                              {institution.providerType || "Institution"}
                            </span>
                            {institution.scholarshipPercentage && (
                              <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded">
                                {institution.scholarshipPercentage}% Scholarship
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-lg" data-testid={`text-name-${institution.id}`}>
                            {institution.name}
                          </h3>
                          {institution.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>{institution.location}, {institution.country}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {institution.description}
                      </p>

                      {institution.topDisciplines && institution.topDisciplines.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold mb-2">Top Disciplines:</p>
                          <div className="flex flex-wrap gap-2">
                            {institution.topDisciplines.slice(0, 3).map((discipline) => (
                              <span
                                key={discipline}
                                className="text-xs px-2 py-1 bg-secondary rounded"
                              >
                                {discipline}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {institution.numberOfCampuses && (
                        <p className="text-xs text-muted-foreground mb-4">
                          Number of Campuses: {institution.numberOfCampuses}
                        </p>
                      )}

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
    </div>
  );
}
