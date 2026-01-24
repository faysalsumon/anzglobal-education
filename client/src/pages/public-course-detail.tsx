import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, Clock, DollarSign, Calendar, GraduationCap, ArrowLeft, 
  Download, LogIn, Award, Globe, BookOpen, Home, Sparkles,
  Users, TrendingUp, CheckCircle, Building2, Briefcase, FileText,
  Target, MonitorPlay, Plane, Star, Info, ExternalLink, ArrowUpRight, Layers, Tag, Heart, Minus
} from "lucide-react";
import type { Course, University, Application, Favorite } from "@shared/schema";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { CampusLocationMapDialog } from "@/components/campus-location-map-dialog";
import { CampusMapTabs } from "@/components/campus-map-tabs";
import { useAuth } from "@/hooks/useAuth";
import { CourseSectionNav } from "@/components/course-section-nav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type CourseWithUniversity = Course & { university?: University };

// English language test types configuration
const TEST_TYPE_CONFIG: Record<string, { label: string }> = {
  ielts: { label: "IELTS" },
  toefl: { label: "TOEFL iBT" },
  pte: { label: "PTE Academic" },
  duolingo: { label: "Duolingo" },
};

interface EnglishRequirement {
  id: string;
  courseId: string;
  testType: string;
  minOverallScore: string;
  minListeningScore: string | null;
  minReadingScore: string | null;
  minWritingScore: string | null;
  minSpeakingScore: string | null;
  notes: string | null;
  isPreferred: boolean;
}

export default function PublicCourseDetail() {
  const [, params] = useRoute("/courses/:id");
  const courseId = params?.id;
  const [selectedCampusLocation, setSelectedCampusLocation] = useState<string | null>(null);
  const [selectedEntryCountry, setSelectedEntryCountry] = useState<string | null>(null);
  const { user, isStudent } = useAuth();

  const { data: course, isLoading } = useQuery<CourseWithUniversity>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
  });

  // Fetch structured English requirements
  const { data: englishRequirements = [] } = useQuery<EnglishRequirement[]>({
    queryKey: ["/api/courses", courseId, "english-requirements"],
    enabled: !!courseId,
  });

  // Fetch academic entry requirements (AI-generated qualification requirements)
  interface CourseEntryRequirement {
    id: string;
    courseId: string;
    qualificationTypeId: string;
    minGrade: string | null;
    customNotes: string | null;
    displayOrder: number;
    qualification: {
      id: string;
      name: string;
      country: string;
      category: string;
      levelOrder: number;
    };
  }
  const { data: entryRequirements = [] } = useQuery<CourseEntryRequirement[]>({
    queryKey: ["/api/courses", courseId, "entry-requirements"],
    enabled: !!courseId,
  });

  // Fetch course tags
  interface CourseTag {
    id: number;
    name: string;
    slug: string;
    category: string;
    color: string | null;
  }
  const { data: courseTags = [] } = useQuery<CourseTag[]>({
    queryKey: ["/api/courses", courseId, "tags"],
    enabled: !!courseId,
  });

  // Check if student has already applied for this course
  const { data: applicationsData } = useQuery<{ applications: Array<{ application: Application }> }>({
    queryKey: ["/api/student/applications"],
    enabled: isStudent,
  });

  const applications = applicationsData?.applications || [];
  const existingApplication = applications.find(app => app.application.courseId === courseId);

  const { toast } = useToast();

  // Favorites functionality for students
  const { data: favorites = [] } = useQuery<Favorite[]>({
    queryKey: ["/api/student/favorites"],
    enabled: isStudent,
  });

  const isFavorited = favorites.some(
    (f) => f.itemType === "course" && f.itemId === courseId
  );

  const addFavoriteMutation = useMutation({
    mutationFn: async (data: { itemType: string; itemId: string }) => {
      return await apiRequest("POST", "/api/student/favorites", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({
        title: "Added to favorites",
        description: "Course saved to your favorites!",
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
        title: "Removed from favorites",
        description: "Course removed from your favorites",
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

  const handleFavoriteToggle = () => {
    if (!isStudent || !courseId) return;

    const existingFavorite = favorites.find(
      (f) => f.itemType === "course" && f.itemId === courseId
    );

    if (existingFavorite) {
      removeFavoriteMutation.mutate(existingFavorite.id);
    } else {
      addFavoriteMutation.mutate({ itemType: "course", itemId: courseId });
    }
  };

  // Calculate which sections are visible based on course data (must be before early returns for React hooks rules)
  const visibleSections = useMemo(() => {
    if (!course) return [];
    const sections: string[] = [];
    
    // About section is always visible
    sections.push("about");
    
    // Fees section
    if (course.fees || course.costOfLiving || course.applicationFees) {
      sections.push("fees");
    }
    
    // Requirements section (combines eligibility, english, prerequisites)
    if (course.eligibilityRequirements || englishRequirements.length > 0 || course.englishRequirementsStructured || course.prerequisites || entryRequirements.length > 0) {
      sections.push("eligibility");
    }
    
    // Academic requirements section
    if (course.academicRequirements || course.minimumAge) {
      sections.push("academic");
    }
    
    // Career section
    if ((course.careerOutcomes && course.careerOutcomes.length > 0) || course.careerPath) {
      sections.push("career");
    }
    
    // Pathways section
    if (course.pathways && course.pathways.length > 0) {
      sections.push("pathways");
    }
    
    // Internship details section
    if (course.internshipDetails) {
      sections.push("internship");
    }
    
    // Course details section (includes specialization)
    if (course.campusLocations?.length) {
      sections.push("details");
    }
    
    return sections;
  }, [course, englishRequirements, entryRequirements]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading course details...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <Button asChild>
            <Link href="/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Prepare SEO data
  const siteUrl = window.location.origin;
  const courseUrl = `${siteUrl}/courses/${courseId}`;
  const metaTitle = `${course.title} - ${course.university?.name || 'University'} | ANZ Global Education`;
  const metaDescription = course.description 
    ? course.description.substring(0, 160)
    : `Study ${course.title} at ${course.university?.name || 'a top university'}. ${course.level || 'Degree'} program in ${course.subject || 'your field'}. ${course.country ? `Location: ${course.country}.` : ''}`;
  const ogImage = course.university?.logo || `${siteUrl}/og-image.png`;

  // Create JSON-LD structured data for Course
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.description || metaDescription,
    "provider": course.university ? {
      "@type": "Organization",
      "name": course.university.name,
      "url": course.university.website,
      "logo": course.university.logo
    } : undefined,
    "teaches": course.subject || undefined,
    "educationalLevel": course.level || undefined,
    "timeToComplete": course.duration || undefined,
    "totalCost": course.fees ? `${course.currency || 'AUD'} ${course.fees}` : undefined,
    "offers": course.fees ? {
      "@type": "Offer",
      "price": course.fees,
      "priceCurrency": course.currency || 'AUD'
    } : undefined
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{metaTitle}</title>
        <meta name="title" content={metaTitle} />
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={courseUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={courseUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="ANZ Global Education" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={courseUrl} />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      {/* Course Section Navigation - Shows when scrolling past hero */}
      <CourseSectionNav 
        visibleSections={visibleSections} 
        courseTitle={course.title}
      />
      {/* Modern AI-Style Hero Section */}
      <div id="course-hero" className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-12 relative">
          {/* Breadcrumb with Favorite Button */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <nav className="flex flex-wrap items-center gap-2 text-sm" data-testid="breadcrumb">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="breadcrumb-home">
                <Home className="h-4 w-4" />
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link href="/courses" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="breadcrumb-courses">
                Courses
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium truncate max-w-md" data-testid="breadcrumb-current">{course.title}</span>
            </nav>
            
            {/* Favorite Button - Red heart for students */}
            {isStudent && (
              <Button
                size="sm"
                variant={isFavorited ? "default" : "outline"}
                onClick={handleFavoriteToggle}
                disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                className={isFavorited 
                  ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
                  : "text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600"
                }
                data-testid="button-favorite-course"
              >
                <Heart className={`h-4 w-4 mr-1.5 ${isFavorited ? "fill-current" : ""}`} />
                {isFavorited ? "Saved" : "Save"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Hero Content */}
            <div className="lg:col-span-2">
              <div className="flex flex-col gap-6">
                {/* University Badge */}
                {course.university && (
                  <div className="flex flex-wrap items-center gap-3 bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-primary/10 w-fit">
                    {course.university.logo && (
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white p-2 flex items-center justify-center">
                        <img
                          src={course.university.logo}
                          alt={course.university.name}
                          className="w-full h-full object-contain"
                          data-testid="img-university-logo"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold" data-testid="text-university-name">{course.university.name}</p>
                    </div>
                  </div>
                )}

                {/* Course Title with Gradient */}
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent mb-3" data-testid="text-course-title">
                    {course.title}
                  </h1>
                  {/* Course Code with Level */}
                  <div className="flex flex-wrap items-center gap-3">
                    {course.courseCode && (
                      <Badge className="bg-accent/15 text-accent border border-accent/30 px-3 py-1" data-testid="badge-course-code">
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        Code: {course.courseCode}
                      </Badge>
                    )}
                    {course.level && (
                      <Badge className="bg-accent/15 text-accent border border-accent/30 px-3 py-1" data-testid="badge-course-level">
                        <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                        {course.level}
                      </Badge>
                    )}
                  </div>
                  {course.studyAreas && course.studyAreas.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {(() => {
                        const colorPalette = [
                          { text: "text-[#3465A5]", border: "border-[#3465A5]/30" },
                          { text: "text-[#FF5000]", border: "border-[#FF5000]/30" },
                          { text: "text-[#10b981]", border: "border-[#10b981]/30" },
                          { text: "text-[#8b5cf6]", border: "border-[#8b5cf6]/30" },
                          { text: "text-[#f59e0b]", border: "border-[#f59e0b]/30" },
                        ];
                        return course.studyAreas.map((area, index) => {
                          const color = colorPalette[index % colorPalette.length];
                          return (
                            <Badge 
                              key={index} 
                              className={`px-2.5 py-0.5 bg-background/80 border ${color.border} ${color.text} font-semibold text-xs`}
                              data-testid={`badge-study-area-${index}`}
                            >
                              {area}
                            </Badge>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Feature Badges - Prominent highlights only */}
                <div className="flex flex-wrap gap-2">
                  {course.prPathway && (
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 border-0 text-white px-4 py-1.5" data-testid="badge-pr-pathway">
                      <Plane className="h-3 w-3 mr-1" />
                      PR Pathway
                    </Badge>
                  )}
                  {course.deliveryMode && (
                    <Badge className="bg-gradient-to-r from-accent to-accent/80 border-0 text-white px-4 py-1.5" data-testid="badge-delivery-mode">
                      <MonitorPlay className="h-3 w-3 mr-1" />
                      {course.deliveryMode === "online" ? "Online" : course.deliveryMode === "on-campus" ? "On-Campus" : "Hybrid"}
                    </Badge>
                  )}
                  {course.internshipAvailable && (
                    <Badge className="bg-gradient-to-r from-accent to-accent/80 border-0 text-white px-4 py-1.5" data-testid="badge-internship">
                      <Briefcase className="h-3 w-3 mr-1" />
                      Internship Available
                    </Badge>
                  )}
                  {course.workRights && (
                    <Badge className="bg-gradient-to-r from-green-600 to-green-500 border-0 text-white px-4 py-1.5" data-testid="badge-work-rights">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Work Rights Eligible
                    </Badge>
                  )}
                  {/* Location Badge */}
                  {(course.location || course.country) && (
                    <Badge variant="outline" className="px-3 py-1" data-testid="badge-location">
                      <MapPin className="h-3 w-3 mr-1" />
                      {course.location || course.country}
                    </Badge>
                  )}
                </div>

                {/* Tags Ribbon Section */}
                {courseTags.length > 0 && (
                  <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-xl p-4 border border-primary/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Course Features</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {courseTags.map((tag) => (
                        <Badge 
                          key={tag.id} 
                          className="px-3 py-1.5 bg-background/80 border border-primary/20 text-[#3573A7] font-semibold text-[14px]"
                          data-testid={`badge-tag-${tag.slug}`}
                        >
                          <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Card - Compact & Responsive */}
            <div className="lg:col-span-1 flex">
              <Card className="bg-background/60 backdrop-blur-sm border-primary/20 flex-1">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Quick Facts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  {(course.subject || course.discipline) && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Discipline</p>
                        <p className="text-sm font-semibold truncate" data-testid="text-discipline">{course.subject || course.discipline}</p>
                      </div>
                    </div>
                  )}
                  {course.specialization && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Specialization</p>
                        <p className="text-sm font-semibold truncate" data-testid="text-specialization">{course.specialization}</p>
                      </div>
                    </div>
                  )}
                  {course.fees && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Annual Tuition</p>
                        <p className="text-sm font-bold truncate" data-testid="text-annual-tuition">{course.currency} {Number(course.fees).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {course.duration && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-secondary/10 rounded-md">
                        <Clock className="h-3.5 w-3.5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-semibold" data-testid="text-duration">{course.duration}</p>
                      </div>
                    </div>
                  )}
                  {course.startDate && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-secondary/10 rounded-md">
                        <Calendar className="h-3.5 w-3.5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Next Intake</p>
                        <p className="text-sm font-semibold" data-testid="text-next-intake">{course.startDate}</p>
                      </div>
                    </div>
                  )}
                  {course.applicationDeadline && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-accent/10 rounded-md">
                        <Calendar className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Application Deadline</p>
                        <p className="text-sm font-semibold" data-testid="text-application-deadline">{course.applicationDeadline}</p>
                      </div>
                    </div>
                  )}
                  {course.deliveryMode && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-secondary/10 rounded-md">
                        <MonitorPlay className="h-3.5 w-3.5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Delivery Mode</p>
                        <p className="text-sm font-semibold" data-testid="text-delivery-mode">
                          {course.deliveryMode === "online" ? "Online Learning" : course.deliveryMode === "on-campus" ? "On-Campus" : "Hybrid (Online + On-Campus)"}
                        </p>
                      </div>
                    </div>
                  )}
                  {course.intakes && course.intakes.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-secondary/10 rounded-md mt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Available Intakes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const colorPalette = [
                              { text: "text-[#3465A5]", border: "border-[#3465A5]/30" },
                              { text: "text-[#FF5000]", border: "border-[#FF5000]/30" },
                              { text: "text-[#10b981]", border: "border-[#10b981]/30" },
                              { text: "text-[#8b5cf6]", border: "border-[#8b5cf6]/30" },
                              { text: "text-[#f59e0b]", border: "border-[#f59e0b]/30" },
                            ];
                            return course.intakes.map((intake, index) => {
                              const color = colorPalette[index % colorPalette.length];
                              return (
                                <Badge 
                                  key={index} 
                                  className={`text-xs px-2 py-0.5 bg-background/80 border ${color.border} ${color.text} font-semibold`}
                                  data-testid={`badge-intake-${index}`}
                                >
                                  {intake}
                                </Badge>
                              );
                            });
                          })()}
                        </div>
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
            {/* About Course Section */}
            <Card id="about" className="border-primary/10 hover-elevate transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  About This Program
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line" data-testid="text-description">
                  {course.description || "No description available"}
                </p>
              </CardContent>
            </Card>

            {/* Modern Financial Breakdown */}
            {(course.fees || course.costOfLiving || course.applicationFees) && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300" id="fees">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Tuition Fees
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {course.fees && (
                      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-6" data-testid="card-annual-tuition">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Annual Tuition</span>
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <GraduationCap className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-3xl font-bold" data-testid="text-tuition-amount">{course.currency} {Number(course.fees).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Per year</p>
                      </div>
                    )}
                    {course.costOfLiving && (
                      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-secondary/5 to-transparent p-6" data-testid="card-living-costs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Living Costs</span>
                          <div className="p-2 bg-secondary/10 rounded-lg">
                            <Home className="h-4 w-4 text-secondary" />
                          </div>
                        </div>
                        <p className="text-3xl font-bold" data-testid="text-living-cost-amount">{course.currency} {Number(course.costOfLiving).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Estimated yearly</p>
                      </div>
                    )}
                    {course.applicationFees !== null && course.applicationFees !== undefined && (
                      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-accent/5 to-transparent p-6" data-testid="card-application-fee">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Application Fee</span>
                          <div className="p-2 bg-accent/10 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-accent" />
                          </div>
                        </div>
                        <p className="text-3xl font-bold" data-testid="text-application-fee-amount">
                          {Number(course.applicationFees) > 0 
                            ? `${course.currency} ${Number(course.applicationFees).toLocaleString()}`
                            : "Waived"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">One-time</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Combined Requirements Section (English, Eligibility, Prerequisites) */}
            {(course.eligibilityRequirements || englishRequirements.length > 0 || course.englishRequirementsStructured || course.prerequisites || entryRequirements.length > 0) && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300" id="eligibility" data-testid="card-requirements">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Entry Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue={englishRequirements.length > 0 || course.englishRequirementsStructured ? "english" : (course.eligibilityRequirements || entryRequirements.length > 0) ? "eligibility" : "prerequisites"} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger 
                        value="english" 
                        disabled={!(englishRequirements.length > 0 || course.englishRequirementsStructured)}
                        className="flex items-center gap-2"
                        data-testid="tab-english"
                      >
                        <Globe className="h-4 w-4" />
                        <span className="hidden sm:inline">English</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="eligibility" 
                        disabled={!(course.eligibilityRequirements || entryRequirements.length > 0)}
                        className="flex items-center gap-2"
                        data-testid="tab-eligibility"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Eligibility</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="prerequisites" 
                        disabled={!course.prerequisites}
                        className="flex items-center gap-2"
                        data-testid="tab-prerequisites"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Prerequisites</span>
                      </TabsTrigger>
                    </TabsList>

                    {/* English Language Requirements Tab */}
                    <TabsContent value="english" className="space-y-6">
                      {englishRequirements.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="p-3 text-left font-semibold">Test Type</th>
                                <th className="p-3 text-center font-semibold">Overall</th>
                                <th className="p-3 text-center font-semibold">Listening</th>
                                <th className="p-3 text-center font-semibold">Reading</th>
                                <th className="p-3 text-center font-semibold">Writing</th>
                                <th className="p-3 text-center font-semibold">Speaking</th>
                                <th className="p-3 text-left font-semibold">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {englishRequirements.map((req) => (
                                <tr key={req.id} className="border-b" data-testid={`row-english-req-${req.id}`}>
                                  <td className="p-3 font-medium">
                                    <div className="flex items-center gap-2">
                                      {TEST_TYPE_CONFIG[req.testType]?.label || req.testType.toUpperCase()}
                                      {req.isPreferred && (
                                        <Badge variant="secondary" className="text-xs">
                                          <Star className="h-3 w-3 mr-1" />
                                          Preferred
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center font-semibold text-primary" data-testid={`text-${req.testType}-overall`}>
                                    {req.minOverallScore}
                                  </td>
                                  <td className="p-3 text-center" data-testid={`text-${req.testType}-listening`}>
                                    {req.minListeningScore || "—"}
                                  </td>
                                  <td className="p-3 text-center" data-testid={`text-${req.testType}-reading`}>
                                    {req.minReadingScore || "—"}
                                  </td>
                                  <td className="p-3 text-center" data-testid={`text-${req.testType}-writing`}>
                                    {req.minWritingScore || "—"}
                                  </td>
                                  <td className="p-3 text-center" data-testid={`text-${req.testType}-speaking`}>
                                    {req.minSpeakingScore || "—"}
                                  </td>
                                  <td className="p-3 text-sm text-muted-foreground">
                                    {req.notes || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : course.englishRequirementsStructured && (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="p-3 text-left font-semibold">Test Type</th>
                                <th className="p-3 text-center font-semibold">Overall</th>
                                <th className="p-3 text-center font-semibold">Min Each Band</th>
                              </tr>
                            </thead>
                            <tbody>
                              {course.englishRequirementsStructured.IELTS && (
                                <tr className="border-b">
                                  <td className="p-3 font-medium">IELTS</td>
                                  <td className="p-3 text-center font-semibold text-primary" data-testid="text-ielts-overall">
                                    {course.englishRequirementsStructured.IELTS.overall || "—"}
                                  </td>
                                  <td className="p-3 text-center" data-testid="text-ielts-min-band">
                                    {course.englishRequirementsStructured.IELTS.min_each_band || "—"}
                                  </td>
                                </tr>
                              )}
                              {course.englishRequirementsStructured.TOEFL && (
                                <tr className="border-b">
                                  <td className="p-3 font-medium">TOEFL</td>
                                  <td className="p-3 text-center font-semibold text-primary" data-testid="text-toefl-overall">
                                    {course.englishRequirementsStructured.TOEFL.overall || "—"}
                                  </td>
                                  <td className="p-3 text-center">—</td>
                                </tr>
                              )}
                              {course.englishRequirementsStructured.PTE && (
                                <tr className="border-b">
                                  <td className="p-3 font-medium">PTE</td>
                                  <td className="p-3 text-center font-semibold text-primary" data-testid="text-pte-overall">
                                    {course.englishRequirementsStructured.PTE.overall || "—"}
                                  </td>
                                  <td className="p-3 text-center">—</td>
                                </tr>
                              )}
                              {course.englishRequirementsStructured.Duolingo && (
                                <tr className="border-b">
                                  <td className="p-3 font-medium">Duolingo</td>
                                  <td className="p-3 text-center font-semibold text-primary" data-testid="text-duolingo-overall">
                                    {course.englishRequirementsStructured.Duolingo.overall || "—"}
                                  </td>
                                  <td className="p-3 text-center">—</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </TabsContent>

                    {/* Eligibility Requirements Tab */}
                    <TabsContent value="eligibility" className="space-y-6">
                      {/* AI-Generated Academic Entry Requirements - Country Selector */}
                      {entryRequirements.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold">International Year 12 Equivalent Qualification Table</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Please select the country of your qualification to see if we consider it to be equivalent to an Australian Year 12, and the minimum results for admission to this course.
                          </p>
                          
                          {/* Country Dropdown Selector */}
                          {(() => {
                            const groupedByCountry = entryRequirements.reduce((acc, req) => {
                              const country = req.qualification.country || 'Other';
                              if (!acc[country]) acc[country] = [];
                              acc[country].push(req);
                              return acc;
                            }, {} as Record<string, typeof entryRequirements>);
                            
                            const availableCountries = Object.keys(groupedByCountry).sort((a, b) => {
                              if (a === 'Australia') return -1;
                              if (b === 'Australia') return 1;
                              if (a === 'Bangladesh') return -1;
                              if (b === 'Bangladesh') return 1;
                              return a.localeCompare(b);
                            });
                            
                            const currentCountry = selectedEntryCountry || availableCountries[0] || 'Australia';
                            const currentReqs = groupedByCountry[currentCountry] || [];
                            
                            return (
                              <div className="space-y-4">
                                <Select 
                                  value={currentCountry} 
                                  onValueChange={setSelectedEntryCountry}
                                >
                                  <SelectTrigger 
                                    className="w-full max-w-xs" 
                                    data-testid="select-entry-country"
                                  >
                                    <SelectValue placeholder="Select your country" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableCountries.map((country) => (
                                      <SelectItem 
                                        key={country} 
                                        value={country}
                                        data-testid={`option-country-${country.toLowerCase().replace(/\s+/g, '-')}`}
                                      >
                                        {country}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                {currentReqs.length > 0 && (
                                  <div className="border rounded-lg overflow-hidden" data-testid={`entry-reqs-${currentCountry.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <table className="w-full">
                                      <thead>
                                        <tr className="bg-primary text-primary-foreground">
                                          <th className="p-3 text-left font-semibold text-sm">Qualifications</th>
                                          <th className="p-3 text-left font-semibold text-sm">Standard Entry</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {currentReqs.map((req, idx) => (
                                          <tr 
                                            key={req.id} 
                                            className={idx !== currentReqs.length - 1 ? "border-b" : ""}
                                            data-testid={`entry-req-${req.id}`}
                                          >
                                            <td className="p-3 align-top border-r bg-muted/30">
                                              <span className="font-medium text-sm" data-testid={`entry-req-name-${req.id}`}>
                                                {req.qualification.name}
                                              </span>
                                            </td>
                                            <td className="p-3 align-top" data-testid={`entry-req-details-${req.id}`}>
                                              <div className="space-y-1">
                                                {req.customNotes ? (
                                                  <ul className="text-sm space-y-2">
                                                    {req.customNotes.split(/[;]/).filter(Boolean).map((note, i, arr) => (
                                                      <li key={i} className="flex items-start gap-2" data-testid={`entry-req-note-${req.id}-${i}`}>
                                                        <Minus className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
                                                        <span>{note.trim()}{i < arr.length - 1 ? ', or' : ''}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                ) : req.minGrade ? (
                                                  <div className="flex items-start gap-2">
                                                    <Minus className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
                                                    <span className="text-sm" data-testid={`entry-req-grade-${req.id}`}>
                                                      Minimum grade/score: <strong className="text-primary">{req.minGrade}</strong>
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <span className="text-sm text-muted-foreground" data-testid={`entry-req-default-${req.id}`}>
                                                    Successful completion required
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          
                          <p className="text-xs text-muted-foreground italic bg-muted/50 p-3 rounded-lg" data-testid="text-entry-requirements-note">
                            <strong>Please note:</strong> If you can't find your qualification in this list, simply submit your application and our International Admissions team will assess them for you.
                          </p>
                        </div>
                      )}
                      
                      {/* Legacy Text-Based Eligibility Requirements */}
                      {course.eligibilityRequirements && (
                        <div className="space-y-2">
                          {entryRequirements.length > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                              <Info className="h-4 w-4 text-muted-foreground" />
                              <h4 className="font-semibold text-sm text-muted-foreground">Additional Notes</h4>
                            </div>
                          )}
                          <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-eligibility">
                            {course.eligibilityRequirements}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Prerequisites Tab */}
                    <TabsContent value="prerequisites">
                      <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-prerequisites">
                        {course.prerequisites}
                      </p>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Academic Requirements */}
            {(course.academicRequirements || course.minimumAge) && (
              <Card id="academic" className="border-primary/10 hover-elevate transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Academic Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {course.minimumAge && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Minimum Age</p>
                      <p className="text-lg font-semibold" data-testid="text-minimum-age">{course.minimumAge} years old</p>
                    </div>
                  )}
                  {course.academicRequirements && (
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-academic-requirements">
                      {course.academicRequirements}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Career Outcomes & Career Path */}
            {((course.careerOutcomes && course.careerOutcomes.length > 0) || course.careerPath) && (
              <Card id="career" className="border-primary/10 hover-elevate transition-all duration-300" data-testid="card-career-pathways">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Career Outcomes & Progression
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {course.careerOutcomes && course.careerOutcomes.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-3">Potential Career Roles</h3>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const colorPalette = [
                            { dot: "bg-[#3465A5]", text: "text-[#3465A5]", border: "border-[#3465A5]/30" },
                            { dot: "bg-[#FF5000]", text: "text-[#FF5000]", border: "border-[#FF5000]/30" },
                            { dot: "bg-[#10b981]", text: "text-[#10b981]", border: "border-[#10b981]/30" },
                            { dot: "bg-[#8b5cf6]", text: "text-[#8b5cf6]", border: "border-[#8b5cf6]/30" },
                            { dot: "bg-[#f59e0b]", text: "text-[#f59e0b]", border: "border-[#f59e0b]/30" },
                          ];
                          return course.careerOutcomes.map((career, index) => {
                            const color = colorPalette[index % colorPalette.length];
                            return (
                              <Badge 
                                key={index} 
                                className={`px-3 py-1.5 bg-background/80 border ${color.border} ${color.text} font-semibold text-[14px]`}
                                data-testid={`badge-career-${index}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${color.dot} mr-2`} />
                                {career}
                              </Badge>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                  {course.careerPath && (
                    <div className="border-l-4 border-primary/30 pl-6 space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Your Career Journey
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-career-path">
                        {course.careerPath}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pathways Section - Progression Routes */}
            {course.pathways && course.pathways.length > 0 && (
              <Card id="pathways" className="border-primary/10 hover-elevate transition-all duration-300" data-testid="card-pathways">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Progression Pathways
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    This course can lead to further study opportunities:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {course.pathways.map((pathway, index) => (
                      <Badge key={index} variant="outline" className="px-3 py-1.5" data-testid={`badge-pathway-${index}`}>
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        {pathway}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Internship Details Section */}
            {course.internshipDetails && (
              <Card id="internship" className="border-primary/10 hover-elevate transition-all duration-300" data-testid="card-internship-details">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Internship & Work Placement
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-internship-details">
                    {course.internshipDetails}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Course Details */}
            {course.campusLocations?.length && (
              <Card id="details" className="border-primary/10 hover-elevate transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Available Campus Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {course.campusLocations && course.campusLocations.length > 0 && (
                    <CampusMapTabs 
                      campusLocations={course.campusLocations}
                      institutionName={course.university?.name || undefined}
                      institutionLogo={course.university?.logo || undefined}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Enhanced Sidebar - Sticky Container */}
          <div className="lg:sticky lg:top-28 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
            {/* Action Buttons Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="cta-card">
              <CardHeader className="pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Ready to Start Your Journey?
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Take the first step towards your future education
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Primary CTA - Apply */}
                {existingApplication ? (
                  <Button 
                    asChild 
                    className="w-full shadow-md shadow-green-500/20 bg-green-600" 
                    size="sm"
                    data-testid="button-already-applied"
                  >
                    <Link href="/student/applications">
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      Applied for this course
                    </Link>
                  </Button>
                ) : isStudent ? (
                  <Button 
                    asChild 
                    className="w-full shadow-md shadow-primary/20" 
                    size="sm"
                    data-testid="button-apply-now"
                  >
                    <Link href={`/student/courses/${course.id}`}>
                      <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                      Apply Now
                    </Link>
                  </Button>
                ) : (
                  <Button 
                    asChild 
                    className="w-full shadow-md shadow-primary/20" 
                    size="sm"
                    data-testid="button-login-apply"
                  >
                    <a href="/auth">
                      <LogIn className="h-3.5 w-3.5 mr-1.5" />
                      Login to Apply
                    </a>
                  </Button>
                )}

                {/* Secondary CTA - Request Information */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    or request more details first
                  </p>
                  {course.university && (
                    <LeadFormDialog
                      courseId={course.id}
                      universityId={course.universityId}
                      courseName={course.title}
                      universityName={course.university.name}
                      buttonVariant="outline"
                    />
                  )}
                </div>

                {/* Visit Course Link */}
                {course.curriculumUrl && (
                  <Button 
                    asChild 
                    variant="ghost" 
                    className="w-full text-muted-foreground" 
                    size="sm"
                    data-testid="button-visit-course"
                  >
                    <a href={course.curriculumUrl} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Official Course Page
                    </a>
                  </Button>
                )}

                {/* Source URL Link */}
                {course.sourceUrl && (
                  <Button 
                    asChild 
                    variant="ghost" 
                    className="w-full text-muted-foreground" 
                    size="sm"
                    data-testid="button-source-url"
                  >
                    <a href={course.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Institution Website
                    </a>
                  </Button>
                )}

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>AI-Powered Application Assistance</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced University Info Card */}
            {course.university && (
              <Card className="border-primary/20 hover-elevate transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-8 bg-gradient-to-r from-primary to-accent rounded-full"></div>
                    <CardTitle className="text-sm uppercase tracking-wider text-primary">Offered By</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Institution Logo and Name */}
                  <div className="flex items-center gap-3 pb-4 border-b">
                    {course.university.logo && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-primary/10 bg-white p-2 flex items-center justify-center">
                        <img
                          src={course.university.logo}
                          alt={course.university.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-tight mb-1" data-testid="text-institution-name">
                        {course.university.name}
                      </h3>
                      {course.university.country && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{course.university.country}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Institution Details Grid */}
                  <div className="space-y-3">
                    {course.university.providerType && (
                      <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Type
                        </span>
                        <Badge variant="secondary" className="font-normal" data-testid="badge-institution-type">
                          {course.university.providerType}
                        </Badge>
                      </div>
                    )}
                    {course.university.establishedYear && (
                      <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Established
                        </span>
                        <span className="font-semibold" data-testid="text-institution-established">{course.university.establishedYear}</span>
                      </div>
                    )}
                    {course.university.numberOfCampuses && (
                      <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Campuses
                        </span>
                        <span className="font-semibold" data-testid="text-institution-campuses">{course.university.numberOfCampuses}</span>
                      </div>
                    )}
                    {course.university.scholarshipPercentageMax && (
                      <div className="flex items-center justify-between text-sm p-3 bg-gradient-to-r from-secondary/10 to-transparent rounded-lg border border-secondary/20">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Award className="h-4 w-4 text-secondary" />
                          Scholarship
                        </span>
                        <Badge className="bg-secondary text-white font-semibold border-0" data-testid="badge-institution-scholarship">
                          Up to {course.university.scholarshipPercentageMax}%
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* View Institution Button */}
                  <Button asChild variant="outline" className="w-full" data-testid="button-view-institution">
                    <Link href={`/institutions/${course.university.id}`}>
                      <Globe className="h-4 w-4 mr-2" />
                      View Institution Profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {/* Campus Location Map Dialog */}
      <CampusLocationMapDialog
        location={selectedCampusLocation || ""}
        isOpen={!!selectedCampusLocation}
        onClose={() => setSelectedCampusLocation(null)}
      />
    </div>
  );
}
