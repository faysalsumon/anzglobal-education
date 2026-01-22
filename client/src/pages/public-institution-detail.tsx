import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { MapPin, Globe, Mail, Phone, Building2, Calendar, Award, GraduationCap, ArrowLeft, ExternalLink, Home, Search, Clock, DollarSign, Loader2, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import type { University, Campus, Course } from "@shared/schema";
import { InstitutionLogo } from "@/components/institution-logo";
import { GoogleCampusMap } from "@/components/google-campus-map";

// Available course levels for filtering
const COURSE_LEVELS = [
  'VCE (11-12)',
  'Certificate II',
  'Certificate III',
  'Certificate IV',
  'Diploma',
  'Advanced Diploma',
  'Graduate Certificate',
  'Graduate Diploma',
  'Bachelor Degree',
  'Professional Year',
  'Masters Degree',
  'Doctoral Degree',
  'Higher Doctoral Degree',
  'ELICOS',
];

// Number of courses to show initially
const INITIAL_COURSES_SHOWN = 6;
const COURSES_PER_PAGE = 6;

export default function PublicInstitutionDetail() {
  const [, params] = useRoute("/institutions/:id");
  const institutionId = params?.id;
  const [selectedCampusIndex, setSelectedCampusIndex] = useState<number | null>(null);
  
  // Gallery lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // Course filter states
  const [courseSearch, setCourseSearch] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [coursesShown, setCoursesShown] = useState(INITIAL_COURSES_SHOWN);

  const { data: institution, isLoading } = useQuery<University>({
    queryKey: [`/api/institutions/${institutionId}`],
    enabled: !!institutionId,
  });

  // Fetch courses for this specific institution
  const { data: institutionCourses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses', { universityId: institutionId }],
    queryFn: async () => {
      const response = await fetch(`/api/courses?universityId=${institutionId}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    },
    enabled: !!institutionId,
  });

  // Get unique disciplines from institution's courses
  const availableDisciplines = useMemo(() => {
    const disciplines = new Set<string>();
    institutionCourses.forEach(course => {
      if (course.discipline) {
        disciplines.add(course.discipline);
      }
    });
    return Array.from(disciplines).sort();
  }, [institutionCourses]);

  // Get unique levels from institution's courses
  const availableLevels = useMemo(() => {
    const levels = new Set<string>();
    institutionCourses.forEach(course => {
      if (course.level) {
        levels.add(course.level);
      }
    });
    return COURSE_LEVELS.filter(level => levels.has(level));
  }, [institutionCourses]);

  // Apply filters to courses
  const filteredCourses = useMemo(() => {
    let filtered = institutionCourses;

    // Search filter
    if (courseSearch.trim()) {
      const searchLower = courseSearch.toLowerCase();
      filtered = filtered.filter(course => 
        course.title?.toLowerCase().includes(searchLower) ||
        course.discipline?.toLowerCase().includes(searchLower) ||
        course.level?.toLowerCase().includes(searchLower)
      );
    }

    // Discipline filter
    if (disciplineFilter && disciplineFilter !== "all") {
      filtered = filtered.filter(course => course.discipline === disciplineFilter);
    }

    // Level filter
    if (levelFilter && levelFilter !== "all") {
      filtered = filtered.filter(course => course.level === levelFilter);
    }

    return filtered;
  }, [institutionCourses, courseSearch, disciplineFilter, levelFilter]);

  // Courses to display (with pagination)
  const displayedCourses = useMemo(() => {
    return filteredCourses.slice(0, coursesShown);
  }, [filteredCourses, coursesShown]);

  // Reset pagination when filters change
  const handleFilterChange = () => {
    setCoursesShown(INITIAL_COURSES_SHOWN);
  };

  // Transform campusAddresses JSONB field to Campus[] format for the map component
  const campuses = useMemo<Campus[]>(() => {
    if (!institution?.campusAddresses || !Array.isArray(institution.campusAddresses)) {
      return [];
    }
    return institution.campusAddresses.map((campus: any) => ({
      name: campus.name || `${campus.city || ''} Campus`,
      address: campus.address || '',
      street: campus.address || campus.street || '',
      city: campus.city || '',
      state: campus.state || '',
      postcode: campus.postcode || '',
      country: campus.country || '',
      latitude: campus.latitude,
      longitude: campus.longitude,
    }));
  }, [institution?.campusAddresses]);

  // Gallery lightbox navigation
  const galleryImages = institution?.institutionGallery || [];
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goToPrevImage = useCallback(() => {
    if (lightboxIndex !== null && galleryImages.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + galleryImages.length) % galleryImages.length);
    }
  }, [lightboxIndex, galleryImages.length]);

  const goToNextImage = useCallback(() => {
    if (lightboxIndex !== null && galleryImages.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % galleryImages.length);
    }
  }, [lightboxIndex, galleryImages.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          goToPrevImage();
          break;
        case 'ArrowRight':
          goToNextImage();
          break;
      }
    };

    if (lightboxIndex !== null) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, closeLightbox, goToPrevImage, goToNextImage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading institution details...</div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Institution Not Found</h1>
          <Button asChild>
            <Link href="/institutions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Institutions
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Prepare SEO data
  const siteUrl = window.location.origin;
  const institutionUrl = `${siteUrl}/institutions/${institutionId}`;
  const metaTitle = `${institution.name} - ${institution.country || 'International University'} | ANZ Global Education`;
  const metaDescription = institution.description 
    ? institution.description.substring(0, 160)
    : `Discover ${institution.name}, ${institution.providerType || 'a leading institution'} in ${institution.country || 'international education'}. ${institution.establishedYear ? `Established ${institution.establishedYear}.` : ''} ${institution.scholarshipPercentageMin !== null || institution.scholarshipPercentageMax !== null ? 'Scholarships available.' : ''}`;
  const ogImage = institution.logo || `${siteUrl}/og-image.png`;

  // Create JSON-LD structured data for Organization
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": institution.name,
    "description": institution.description || metaDescription,
    "url": institution.website,
    "logo": institution.logo,
    "address": institution.country ? {
      "@type": "PostalAddress",
      "addressCountry": institution.country
    } : undefined,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": institution.contactPhone,
      "email": institution.contactEmail,
      "contactType": "Admissions"
    },
    "foundingDate": institution.establishedYear ? `${institution.establishedYear}-01-01` : undefined
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{metaTitle}</title>
        <meta name="title" content={metaTitle} />
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={institutionUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={institutionUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="ANZ Global Education" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={institutionUrl} />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
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
                <BreadcrumbLink asChild>
                  <Link href="/institutions" data-testid="breadcrumb-institutions">
                    Institutions
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage data-testid="breadcrumb-current">{institution.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <InstitutionLogo
              src={institution.logo}
              alt={institution.name}
              size="xl"
              testId="img-logo"
            />
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                {institution.providerType && (
                  <Badge variant="secondary" data-testid="badge-provider-type">
                    {institution.providerType}
                  </Badge>
                )}
                {(institution.scholarshipPercentageMin !== null || institution.scholarshipPercentageMax !== null) && (
                  <Badge className="bg-accent text-accent-foreground" data-testid="badge-scholarship">
                    <Award className="h-3 w-3 mr-1" />
                    {institution.scholarshipPercentageMin !== null && institution.scholarshipPercentageMax !== null
                      ? `${institution.scholarshipPercentageMin}%-${institution.scholarshipPercentageMax}% Scholarship Available`
                      : institution.scholarshipPercentageMin !== null
                      ? `From ${institution.scholarshipPercentageMin}% Scholarship Available`
                      : `Up to ${institution.scholarshipPercentageMax}% Scholarship Available`}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2" data-testid="text-name">
                {institution.name}
              </h1>
              {institution.country && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  <span data-testid="text-country">
                    {institution.country}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* About (Full Description or Legacy Description) - moved to top */}
            <Card>
              <CardHeader>
                <CardTitle>About {institution.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line" data-testid="text-full-description">
                  {institution.fullDescription || institution.description}
                </div>
              </CardContent>
            </Card>

            {/* Institution Gallery */}
            {institution.institutionGallery && institution.institutionGallery.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Campus Gallery</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Explore our campus facilities and environment
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {institution.institutionGallery.map((image, index) => (
                      <div 
                        key={index} 
                        className="group relative aspect-[3/2] rounded-md overflow-hidden border hover-elevate cursor-pointer"
                        onClick={() => openLightbox(index)}
                        data-testid={`gallery-item-${index}`}
                      >
                        <img
                          src={image}
                          alt={`${institution.name} campus ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          data-testid={`img-gallery-${index}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-white text-xs">
                            <ZoomIn className="h-4 w-4" />
                            <span>Click to enlarge</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overview (Small Description) */}
            {institution.smallDescription && (
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-small-description">
                    {institution.smallDescription}
                  </p>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Institution Details - moved to top */}
            <Card>
              <CardHeader>
                <CardTitle>Institution Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {institution.establishedYear && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Established</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-established">
                        {institution.establishedYear}
                      </p>
                    </div>
                  </div>
                )}

                {institution.numberOfCampuses && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Number of Campuses</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-campuses">
                        {institution.numberOfCampuses}
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-3">Contact Information</p>
                  
                  {institution.contactEmail && (
                    <div className="flex items-start gap-3 mb-3">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <a
                        href={`mailto:${institution.contactEmail}`}
                        className="text-sm text-primary hover:underline"
                        data-testid="link-email"
                      >
                        {institution.contactEmail}
                      </a>
                    </div>
                  )}

                  {institution.contactPhone && (
                    <div className="flex items-start gap-3 mb-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <a
                        href={`tel:${institution.contactPhone}`}
                        className="text-sm text-primary hover:underline"
                        data-testid="link-phone"
                      >
                        {institution.contactPhone}
                      </a>
                    </div>
                  )}

                  {institution.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <a
                        href={institution.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                        data-testid="link-website"
                      >
                        Visit Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Disciplines - moved to sidebar */}
            {institution.topDisciplines && institution.topDisciplines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Disciplines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {institution.topDisciplines.map((discipline, index) => (
                      <Badge
                        key={discipline}
                        variant="secondary"
                        className="text-sm"
                        data-testid={`badge-discipline-${index}`}
                      >
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {discipline}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Featured Courses - moved to sidebar */}
            {institution.topCourses && institution.topCourses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Featured Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {institution.topCourses.map((course, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <GraduationCap className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span className="text-muted-foreground" data-testid={`text-course-${index}`}>
                          {course}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Google Map for Campus Locations */}
            {campuses.length > 0 ? (
              <GoogleCampusMap
                campuses={campuses}
                institutionName={institution.name}
                selectedCampusIndex={selectedCampusIndex}
                onMarkerClick={(index) => setSelectedCampusIndex(index)}
              />
            ) : null}

            {/* Campus Locations Text */}
            {campuses.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Campus Addresses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campuses.map((campus, index) => (
                    <div 
                      key={index} 
                      className={`space-y-1 p-3 rounded-md cursor-pointer transition-colors hover-elevate ${
                        selectedCampusIndex === index 
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-2 border-primary' 
                          : 'border-2 border-transparent'
                      }`}
                      data-testid={`campus-${index}`}
                      onClick={() => setSelectedCampusIndex(selectedCampusIndex === index ? null : index)}
                    >
                      <p className={`text-sm font-medium ${
                        selectedCampusIndex === index ? 'text-primary' : ''
                      }`}>
                        {campus.name}
                      </p>
                      <div className="flex items-start gap-2">
                        <MapPin className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          selectedCampusIndex === index ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <div className="text-sm text-muted-foreground">
                          {(campus.street || campus.address) && <p>{campus.street || campus.address}</p>}
                          <p>
                            {[campus.city, campus.state, campus.postcode].filter(Boolean).join(', ')}
                          </p>
                          {campus.country && <p>{campus.country}</p>}
                        </div>
                      </div>
                      {index < campuses.length - 1 && (
                        <div className="border-t pt-4 mt-4" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        {/* Courses Section - Full Width */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Courses Offered
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {institutionCourses.length} course{institutionCourses.length !== 1 ? 's' : ''} available
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" data-testid="button-view-all-courses">
                  <Link href={`/courses?university=${institution.id}`}>
                    View Full Catalog
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={(e) => {
                      setCourseSearch(e.target.value);
                      handleFilterChange();
                    }}
                    className="pl-9"
                    data-testid="input-course-search"
                  />
                </div>
                <Select 
                  value={disciplineFilter} 
                  onValueChange={(value) => {
                    setDisciplineFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-discipline">
                    <SelectValue placeholder="All Disciplines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Disciplines</SelectItem>
                    {availableDisciplines.map((discipline) => (
                      <SelectItem key={discipline} value={discipline}>
                        {discipline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={levelFilter} 
                  onValueChange={(value) => {
                    setLevelFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-level">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {availableLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(courseSearch || disciplineFilter !== "all" || levelFilter !== "all") && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setCourseSearch("");
                      setDisciplineFilter("all");
                      setLevelFilter("all");
                      handleFilterChange();
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Course Loading State */}
              {coursesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredCourses.length === 0 ? (
                /* Empty State */
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  {institutionCourses.length === 0 ? (
                    <>
                      <h3 className="text-lg font-medium mb-2">No courses listed yet</h3>
                      <p className="text-muted-foreground">
                        Check back soon for available courses from {institution.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium mb-2">No matching courses</h3>
                      <p className="text-muted-foreground mb-4">
                        Try adjusting your filters to see more courses
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setCourseSearch("");
                          setDisciplineFilter("all");
                          setLevelFilter("all");
                          handleFilterChange();
                        }}
                      >
                        Clear Filters
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Results Count */}
                  {(courseSearch || disciplineFilter !== "all" || levelFilter !== "all") && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Showing {displayedCourses.length} of {filteredCourses.length} matching course{filteredCourses.length !== 1 ? 's' : ''}
                    </p>
                  )}

                  {/* Course Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedCourses.map((course) => (
                      <Link key={course.id} href={`/courses/${course.id}`}>
                        <Card 
                          className="h-full hover-elevate cursor-pointer transition-all duration-200"
                          data-testid={`course-card-${course.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col h-full">
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm line-clamp-2 mb-2" data-testid={`course-title-${course.id}`}>
                                  {course.title}
                                </h3>
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {course.level && (
                                    <Badge variant="secondary" className="text-xs">
                                      {course.level}
                                    </Badge>
                                  )}
                                  {course.discipline && (
                                    <Badge variant="outline" className="text-xs">
                                      {course.discipline}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground mt-auto">
                                {course.duration && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{course.duration}</span>
                                  </div>
                                )}
                                {course.fees && (
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>${Number(course.fees).toLocaleString()}/year</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>

                  {/* Show More Button */}
                  {filteredCourses.length > coursesShown && (
                    <div className="flex justify-center mt-6">
                      <Button 
                        variant="outline"
                        onClick={() => setCoursesShown(prev => prev + COURSES_PER_PAGE)}
                        data-testid="button-show-more-courses"
                      >
                        Show More Courses ({filteredCourses.length - coursesShown} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gallery Lightbox Modal */}
      {lightboxIndex !== null && galleryImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
          data-testid="lightbox-overlay"
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={closeLightbox}
            data-testid="button-close-lightbox"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {galleryImages.length}
          </div>

          {/* Previous Button */}
          {galleryImages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevImage();
              }}
              data-testid="button-prev-image"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Main Image */}
          <div 
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[lightboxIndex]}
              alt={`${institution?.name || 'Institution'} campus ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              data-testid="lightbox-image"
            />
          </div>

          {/* Next Button */}
          {galleryImages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
              onClick={(e) => {
                e.stopPropagation();
                goToNextImage();
              }}
              data-testid="button-next-image"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Keyboard Instructions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs flex items-center gap-4">
            <span>Use arrow keys to navigate</span>
            <span>Press ESC to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
