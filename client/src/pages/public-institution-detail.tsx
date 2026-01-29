import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MapPin, Globe, Mail, Phone, Building2, Calendar, Award, GraduationCap, 
  ExternalLink, Home, Search, Clock, DollarSign, Loader2, X, ChevronLeft, 
  ChevronRight, ZoomIn, Image, Tag, TrendingUp, Heart, Sparkles, Info
} from "lucide-react";
import type { University, Campus, Course } from "@shared/schema";
import { InstitutionLogo } from "@/components/institution-logo";
import { GoogleCampusMap } from "@/components/google-campus-map";
import { ResponsiveSection } from "@/components/responsive-section";
import { InstitutionSectionNav } from "@/components/institution-section-nav";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { CampusMapTabs } from "@/components/campus-map-tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Favorite } from "@shared/schema";

const COURSE_LEVELS = [
  'VCE (11-12)', 'Certificate II', 'Certificate III', 'Certificate IV',
  'Diploma', 'Advanced Diploma', 'Graduate Certificate', 'Graduate Diploma',
  'Bachelor Degree', 'Professional Year', 'Masters Degree', 'Doctoral Degree',
  'Higher Doctoral Degree', 'ELICOS',
];

const INITIAL_COURSES_SHOWN = 6;
const COURSES_PER_PAGE = 6;

interface InstitutionTag {
  id: string;
  name: string;
  category: string;
  color: string | null;
}

interface Scholarship {
  id: string;
  name: string;
  valueType: string;
  value: number;
  description: string | null;
  eligibilityCriteria: string | null;
  applicationDeadline: string | null;
  isActive: boolean;
  status: string;
}

export default function PublicInstitutionDetail() {
  const [, params] = useRoute("/institutions/:id");
  const institutionId = params?.id;
  const { user, isStudent } = useAuth();
  const { toast } = useToast();
  
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapDialogCampusIndex, setMapDialogCampusIndex] = useState<number>(0);
  const [courseSearch, setCourseSearch] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [coursesShown, setCoursesShown] = useState(INITIAL_COURSES_SHOWN);
  const [leadFormOpen, setLeadFormOpen] = useState(false);

  const { data: institution, isLoading } = useQuery<University>({
    queryKey: [`/api/institutions/${institutionId}`],
    enabled: !!institutionId,
  });

  const { data: institutionCourses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses', { universityId: institutionId }],
    queryFn: async () => {
      const response = await fetch(`/api/courses?universityId=${institutionId}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    },
    enabled: !!institutionId,
  });

  const { data: institutionTags = [] } = useQuery<InstitutionTag[]>({
    queryKey: ["/api/institutions", institutionId, "tags"],
    enabled: !!institutionId,
  });

  const { data: scholarships = [] } = useQuery<Scholarship[]>({
    queryKey: ["/api/institutions", institutionId, "scholarships"],
    enabled: !!institutionId,
  });

  const { data: favorites = [] } = useQuery<Favorite[]>({
    queryKey: ["/api/student/favorites"],
    enabled: isStudent,
  });

  const isFavorited = favorites.some(
    (f) => f.itemType === "institution" && f.itemId === institutionId
  );

  const addFavoriteMutation = useMutation({
    mutationFn: async (data: { itemType: string; itemId: string }) => {
      return await apiRequest("POST", "/api/student/favorites", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({ title: "Institution saved to favorites" });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: number) => {
      return await apiRequest("DELETE", `/api/student/favorites/${favoriteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({ title: "Removed from favorites" });
    },
  });

  const handleFavoriteToggle = () => {
    if (isFavorited) {
      const favorite = favorites.find(
        (f) => f.itemType === "institution" && f.itemId === institutionId
      );
      if (favorite) {
        removeFavoriteMutation.mutate(favorite.id);
      }
    } else if (institutionId) {
      addFavoriteMutation.mutate({ itemType: "institution", itemId: institutionId });
    }
  };

  const tagsByCategory = useMemo(() => {
    const grouped: Record<string, InstitutionTag[]> = {};
    institutionTags.forEach(tag => {
      if (!grouped[tag.category]) grouped[tag.category] = [];
      grouped[tag.category].push(tag);
    });
    return grouped;
  }, [institutionTags]);

  const availableDisciplines = useMemo(() => {
    const disciplines = new Set<string>();
    institutionCourses.forEach(course => {
      if (course.discipline) disciplines.add(course.discipline);
    });
    return Array.from(disciplines).sort();
  }, [institutionCourses]);

  const availableLevels = useMemo(() => {
    const levels = new Set<string>();
    institutionCourses.forEach(course => {
      if (course.level) levels.add(course.level);
    });
    return COURSE_LEVELS.filter(level => levels.has(level));
  }, [institutionCourses]);

  const filteredCourses = useMemo(() => {
    let filtered = institutionCourses;
    if (courseSearch.trim()) {
      const searchLower = courseSearch.toLowerCase();
      filtered = filtered.filter(course => 
        course.title?.toLowerCase().includes(searchLower) ||
        course.discipline?.toLowerCase().includes(searchLower)
      );
    }
    if (disciplineFilter !== "all") {
      filtered = filtered.filter(course => course.discipline === disciplineFilter);
    }
    if (levelFilter !== "all") {
      filtered = filtered.filter(course => course.level === levelFilter);
    }
    return filtered;
  }, [institutionCourses, courseSearch, disciplineFilter, levelFilter]);

  const displayedCourses = useMemo(() => filteredCourses.slice(0, coursesShown), [filteredCourses, coursesShown]);

  const handleFilterChange = () => setCoursesShown(INITIAL_COURSES_SHOWN);

  const campuses = useMemo<Campus[]>(() => {
    if (!institution?.campusAddresses) return [];
    const addresses = institution.campusAddresses;
    if (!Array.isArray(addresses)) return [];
    return addresses.map((addr: any, index: number) => ({
      id: index,
      universityId: institutionId || "",
      name: addr.name || addr.city || `Campus ${index + 1}`,
      address: addr.address || "",
      city: addr.city || "",
      state: addr.state || "",
      postcode: addr.postcode || "",
      country: addr.country || institution.country || "",
      latitude: addr.latitude ? parseFloat(addr.latitude) : null,
      longitude: addr.longitude ? parseFloat(addr.longitude) : null,
    }));
  }, [institution, institutionId]);

  const galleryImages = institution?.institutionGallery || [];

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': closeLightbox(); break;
        case 'ArrowLeft': goToPrevImage(); break;
        case 'ArrowRight': goToNextImage(); break;
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

  const openCampusMap = useCallback((index: number) => {
    setMapDialogCampusIndex(index);
    setMapDialogOpen(true);
  }, []);

  const visibleSections = useMemo(() => {
    const sections: string[] = ["about"];
    if (galleryImages.length > 0) sections.push("gallery");
    if (institutionTags.length > 0) sections.push("features");
    if (scholarships.length > 0) sections.push("scholarships");
    if (campuses.length > 0) sections.push("campuses");
    sections.push("courses");
    return sections;
  }, [galleryImages.length, institutionTags.length, scholarships.length, campuses.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Institution Not Found</h1>
          <Button asChild>
            <Link href="/institutions">Back to Institutions</Link>
          </Button>
        </div>
      </div>
    );
  }

  const siteUrl = window.location.origin;
  const institutionUrl = `${siteUrl}/institutions/${institutionId}`;
  const metaTitle = `${institution.name} - ${institution.country || 'International University'} | ANZ Global Education`;
  const metaDescription = institution.smallDescription || institution.description?.substring(0, 160) || 
    `Discover ${institution.name}, a ${institution.providerType || 'leading institution'} in ${institution.country || 'international education'}.`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": institution.name,
    "description": institution.description || metaDescription,
    "url": institution.website,
    "logo": institution.logo,
    "address": institution.country ? { "@type": "PostalAddress", "addressCountry": institution.country } : undefined,
    "foundingDate": institution.establishedYear ? `${institution.establishedYear}-01-01` : undefined,
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
      { "@type": "ListItem", "position": 2, "name": "Institutions", "item": `${siteUrl}/institutions` },
      { "@type": "ListItem", "position": 3, "name": institution.name, "item": institutionUrl }
    ]
  };

  const activeScholarships = scholarships.filter(s => s.isActive && s.status === 'open');
  const maxScholarshipPercentage = activeScholarships
    .filter(s => s.valueType === 'percentage')
    .reduce((max, s) => Math.max(max, s.value), 0);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={institutionUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={institutionUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={institution.logo || `${siteUrl}/og-image.png`} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbData)}</script>
      </Helmet>

      <InstitutionSectionNav visibleSections={visibleSections} institutionName={institution.name} />

      {/* Modern Hero Section */}
      <div id="institution-hero" className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-12 relative">
          {/* Breadcrumb with Favorite */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <nav className="flex flex-wrap items-center gap-2 text-sm" data-testid="breadcrumb">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="breadcrumb-home">
                <Home className="h-4 w-4" />
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link href="/institutions" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="breadcrumb-institutions">
                Institutions
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium truncate max-w-md" data-testid="breadcrumb-current">{institution.name}</span>
            </nav>
            
            {isStudent && (
              <Button
                size="sm"
                variant={isFavorited ? "destructive" : "outline"}
                onClick={handleFavoriteToggle}
                disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                className={!isFavorited ? "text-destructive border-destructive" : ""}
                data-testid="button-favorite-institution"
              >
                <Heart className={`h-4 w-4 mr-1.5 ${isFavorited ? "fill-current" : ""}`} />
                {isFavorited ? "Saved" : "Save"}
              </Button>
            )}
          </div>

          {/* Mobile Quick Stats Strip */}
          <div className="md:hidden overflow-x-auto -mx-4 px-4 py-3" data-testid="container-mobile-quick-stats">
            <div className="flex gap-3 min-w-max">
              {institution.providerType && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10 shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</span>
                    <span className="text-sm font-semibold">{institution.providerType}</span>
                  </div>
                </div>
              )}
              {institution.establishedYear && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10 shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Est.</span>
                    <span className="text-sm font-semibold">{institution.establishedYear}</span>
                  </div>
                </div>
              )}
              {institution.numberOfCampuses && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10 shrink-0">
                  <MapPin className="h-4 w-4 text-accent" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Campuses</span>
                    <span className="text-sm font-semibold">{institution.numberOfCampuses}</span>
                  </div>
                </div>
              )}
              {institution.country && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10 shrink-0">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</span>
                    <span className="text-sm font-semibold">{institution.country}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Hero Content */}
            <div className="lg:col-span-2">
              <div className="flex flex-col gap-6">
                {/* Institution Badge */}
                <div className="flex flex-wrap items-center gap-3 bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-primary/10 w-fit">
                  <InstitutionLogo src={institution.logo} alt={institution.name} size="lg" testId="img-logo" />
                  <div>
                    {institution.country && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {institution.country}
                      </p>
                    )}
                  </div>
                </div>

                {/* Institution Title */}
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent mb-3" data-testid="text-name">
                    {institution.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    {institution.providerType && (
                      <Badge variant="secondary" className="text-sm" data-testid="badge-provider-type">
                        <Building2 className="h-3 w-3 mr-1" />
                        {institution.providerType}
                      </Badge>
                    )}
                    {maxScholarshipPercentage > 0 && (
                      <Badge className="bg-accent text-accent-foreground" data-testid="badge-scholarship">
                        <Award className="h-3 w-3 mr-1" />
                        Up to {maxScholarshipPercentage}% Scholarship
                      </Badge>
                    )}
                    {institution.cricosProviderCode && (
                      <Badge variant="outline" className="text-xs">CRICOS: {institution.cricosProviderCode}</Badge>
                    )}
                    {institution.rtoNumber && (
                      <Badge variant="outline" className="text-xs">RTO: {institution.rtoNumber}</Badge>
                    )}
                  </div>
                </div>

                {/* Institution Features Tags */}
                {institutionTags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" /> Institution Features
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {institutionTags.slice(0, 8).map(tag => (
                        <Badge 
                          key={tag.id} 
                          variant="outline" 
                          className="text-xs"
                          style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                        >
                          <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: tag.color || '#666' }} />
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Facts Sidebar */}
            <div className="hidden md:block">
              <Card className="bg-background/60 backdrop-blur-sm border-primary/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Quick Facts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  {institution.providerType && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Provider Type</p>
                        <p className="text-sm font-semibold" data-testid="quick-fact-type">{institution.providerType}</p>
                      </div>
                    </div>
                  )}
                  {institution.establishedYear && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-secondary/10 rounded-md">
                        <Calendar className="h-3.5 w-3.5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Established</p>
                        <p className="text-sm font-semibold" data-testid="quick-fact-established">{institution.establishedYear}</p>
                      </div>
                    </div>
                  )}
                  {institution.numberOfCampuses && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-accent/10 rounded-md">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Campuses</p>
                        <p className="text-sm font-semibold" data-testid="quick-fact-campuses">{institution.numberOfCampuses}</p>
                      </div>
                    </div>
                  )}
                  {institution.country && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm font-semibold" data-testid="quick-fact-location">{institution.country}</p>
                      </div>
                    </div>
                  )}
                  {institutionCourses.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-secondary/10 rounded-md">
                        <GraduationCap className="h-3.5 w-3.5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Available Courses</p>
                        <p className="text-sm font-semibold" data-testid="quick-fact-courses">{institutionCourses.length}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <ResponsiveSection
              id="about"
              icon={<Building2 className="h-5 w-5 text-primary" />}
              title="About This Institution"
              defaultOpen={true}
            >
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line" data-testid="text-description">
                {institution.fullDescription || institution.description || "No description available"}
              </p>
            </ResponsiveSection>

            {/* Gallery Section */}
            {galleryImages.length > 0 && (
              <ResponsiveSection
                id="gallery"
                icon={<Image className="h-5 w-5 text-primary" />}
                title="Campus Gallery"
                defaultOpen={true}
              >
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {galleryImages.map((image, index) => (
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
              </ResponsiveSection>
            )}

            {/* Features Section - Tags by Category */}
            {institutionTags.length > 0 && (
              <ResponsiveSection
                id="features"
                icon={<Tag className="h-5 w-5 text-primary" />}
                title="Institution Features"
                defaultOpen={true}
              >
                <div className="space-y-4">
                  {Object.entries(tagsByCategory).map(([category, tags]) => (
                    <div key={category}>
                      <p className="text-sm font-medium text-muted-foreground mb-2 capitalize">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <Badge 
                            key={tag.id} 
                            variant="outline"
                            style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                          >
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: tag.color || '#666' }} />
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ResponsiveSection>
            )}

            {/* Scholarships Section */}
            {activeScholarships.length > 0 && (
              <ResponsiveSection
                id="scholarships"
                icon={<Award className="h-5 w-5 text-primary" />}
                title={<>Available Scholarships<span className="text-muted-foreground font-normal text-base ml-1">• {activeScholarships.length} Active</span></>}
                defaultOpen={true}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeScholarships.map(scholarship => (
                    <div 
                      key={scholarship.id}
                      className="relative overflow-hidden rounded-xl border p-6 bg-gradient-to-br from-accent/10 to-transparent"
                      data-testid={`scholarship-${scholarship.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{scholarship.name}</h4>
                        <Badge variant="default" className="bg-accent">
                          {scholarship.valueType === 'percentage' 
                            ? `${scholarship.value}%` 
                            : `$${scholarship.value.toLocaleString()}`}
                        </Badge>
                      </div>
                      {scholarship.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{scholarship.description}</p>
                      )}
                      {scholarship.applicationDeadline && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Deadline: {scholarship.applicationDeadline}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ResponsiveSection>
            )}

            {/* Campus Locations Section */}
            {campuses.length > 0 && (
              <ResponsiveSection
                id="campuses"
                icon={<MapPin className="h-5 w-5 text-primary" />}
                title="Campus Locations"
                defaultOpen={true}
              >
                <CampusMapTabs campuses={campuses} />
              </ResponsiveSection>
            )}

            {/* Courses Section */}
            <ResponsiveSection
              id="courses"
              icon={<GraduationCap className="h-5 w-5 text-primary" />}
              title={<>Courses Offered<span className="text-muted-foreground font-normal text-base ml-1">• {institutionCourses.length} Available</span></>}
              defaultOpen={true}
            >
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={(e) => { setCourseSearch(e.target.value); handleFilterChange(); }}
                    className="pl-9"
                    data-testid="input-course-search"
                  />
                </div>
                <Select value={disciplineFilter} onValueChange={(value) => { setDisciplineFilter(value); handleFilterChange(); }}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-discipline">
                    <SelectValue placeholder="All Disciplines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Disciplines</SelectItem>
                    {availableDisciplines.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={(value) => { setLevelFilter(value); handleFilterChange(); }}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-level">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {availableLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {coursesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No courses found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedCourses.map(course => (
                      <Link key={course.id} href={`/courses/${course.id}`}>
                        <Card className="h-full hover-elevate cursor-pointer" data-testid={`course-card-${course.id}`}>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-sm line-clamp-2 mb-2">{course.title}</h3>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {course.level && <Badge variant="secondary" className="text-xs">{course.level}</Badge>}
                              {course.discipline && <Badge variant="outline" className="text-xs">{course.discipline}</Badge>}
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {course.duration && (
                                <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>{course.duration}</span></div>
                              )}
                              {course.fees && (
                                <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /><span>${Number(course.fees).toLocaleString()}/year</span></div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                  {filteredCourses.length > coursesShown && (
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={() => setCoursesShown(prev => prev + COURSES_PER_PAGE)} data-testid="button-show-more-courses">
                        Show More Courses ({filteredCourses.length - coursesShown} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </ResponsiveSection>
          </div>

          {/* Sticky Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-28 self-start">
            {/* CTA Card */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Explore This Institution
                </CardTitle>
                <p className="text-sm text-muted-foreground">Take the first step towards your future education</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild data-testid="button-browse-courses">
                  <Link href={`/courses?university=${institution.id}`}>
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Browse All Courses
                  </Link>
                </Button>
                
                <div className="text-center text-sm text-muted-foreground">or request more details first</div>
                
                <Button variant="outline" className="w-full text-accent border-accent hover:bg-accent/10" onClick={() => setLeadFormOpen(true)} data-testid="button-request-info">
                  <Info className="h-4 w-4 mr-2" />
                  Request More Information
                </Button>

                {institution.website && (
                  <Button variant="ghost" className="w-full" asChild data-testid="button-visit-website">
                    <a href={institution.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      View on Institution Website
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Contact Info Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {institution.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${institution.contactEmail}`} className="text-sm text-primary hover:underline" data-testid="link-email">
                      {institution.contactEmail}
                    </a>
                  </div>
                )}
                {institution.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${institution.contactPhone}`} className="text-sm text-primary hover:underline" data-testid="link-phone">
                      {institution.contactPhone}
                    </a>
                  </div>
                )}
                {institution.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={institution.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1" data-testid="link-website">
                      Visit Website <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Disciplines Card */}
            {institution.topDisciplines && institution.topDisciplines.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top Disciplines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {institution.topDisciplines.map((discipline, index) => (
                      <Badge key={discipline} variant="secondary" className="text-sm" data-testid={`badge-discipline-${index}`}>
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {discipline}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Lead Form Dialog */}
      <LeadFormDialog 
        open={leadFormOpen} 
        onOpenChange={setLeadFormOpen}
        prefilledData={{ institutionId: institutionId }}
      />

      {/* Gallery Lightbox Modal */}
      {lightboxIndex !== null && galleryImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox} data-testid="lightbox-overlay">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 z-10" onClick={closeLightbox} data-testid="button-close-lightbox">
            <X className="h-6 w-6" />
          </Button>
          <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {galleryImages.length}
          </div>
          {galleryImages.length > 1 && (
            <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12" onClick={(e) => { e.stopPropagation(); goToPrevImage(); }} data-testid="button-prev-image">
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
          <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={galleryImages[lightboxIndex]} alt={`${institution.name} campus ${lightboxIndex + 1}`} className="max-w-full max-h-[85vh] object-contain rounded-lg" data-testid="lightbox-image" />
          </div>
          {galleryImages.length > 1 && (
            <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12" onClick={(e) => { e.stopPropagation(); goToNextImage(); }} data-testid="button-next-image">
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
        </div>
      )}

      {/* Campus Map Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {campuses[mapDialogCampusIndex]?.name || 'Campus Location'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4">
            {campuses[mapDialogCampusIndex] && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {campuses[mapDialogCampusIndex].address && <p>{campuses[mapDialogCampusIndex].address}</p>}
                  <p>{[campuses[mapDialogCampusIndex].city, campuses[mapDialogCampusIndex].state, campuses[mapDialogCampusIndex].postcode].filter(Boolean).join(', ')}</p>
                </div>
                <div className="h-[400px] rounded-lg overflow-hidden border">
                  <GoogleCampusMap campuses={[campuses[mapDialogCampusIndex]]} selectedCampusIndex={0} onCampusSelect={() => {}} />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
