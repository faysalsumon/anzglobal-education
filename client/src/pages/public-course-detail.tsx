import { useState, useMemo, useEffect } from "react";
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
  Target, MonitorPlay, Plane, Star, Info, ExternalLink, ArrowUpRight, Layers, Tag, Heart, Minus,
  Share2, MoreHorizontal, MessageCircle, HelpCircle
} from "lucide-react";
import type { Course, University, Application, Favorite, CourseIntakeTemplate } from "@shared/schema";
import { 
  computeIntakesFromTemplates,
  getNextIntake,
  MONTH_NAMES,
} from "@shared/intake-utils";
import { trackViewContent, trackInitiateApplication } from "@/lib/meta-pixel";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { CampusLocationMapDialog } from "@/components/campus-location-map-dialog";
import { CampusMapTabs } from "@/components/campus-map-tabs";
import { useAuth } from "@/hooks/useAuth";
import { CourseSectionNav } from "@/components/course-section-nav";
import { ResponsiveSection } from "@/components/responsive-section";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getFeePeriodTitle, getFeePeriodFullLabel } from "@/lib/utils";

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
  const [mobileLeadFormOpen, setMobileLeadFormOpen] = useState(false);
  const { user, isStudent } = useAuth();

  const { data: course, isLoading } = useQuery<CourseWithUniversity>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
  });

  useEffect(() => {
    if (course) {
      trackViewContent(course.title, (course as any).discipline || "Course", String(course.id), {
        content_type: "course",
        currency: course.currency || "AUD",
        ...(course.fees ? { value: Number(course.fees) } : {}),
        education_level: course.level || "",
        institution_name: course.university?.name || "",
      });
    }
  }, [course?.id]);

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

  // Fetch intake templates for the course
  const { data: intakeTemplates = [] } = useQuery<CourseIntakeTemplate[]>({
    queryKey: ["/api/courses", courseId, "intake-templates"],
    enabled: !!courseId,
  });

  // Compute intakes from templates
  const computedIntakes = useMemo(() => {
    if (intakeTemplates.length === 0) return [];
    return computeIntakesFromTemplates(intakeTemplates, new Date());
  }, [intakeTemplates]);

  const nextIntake = useMemo(() => {
    if (intakeTemplates.length === 0) return null;
    return getNextIntake(intakeTemplates, new Date());
  }, [intakeTemplates]);

  // Format date helper
  const formatIntakeDate = (date: Date) => {
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Fetch pricing config for the course (includes feePeriod)
  interface PricingConfig {
    pricingModel: 'fixed' | 'dynamic';
    feePeriod: 'annual' | 'per_semester' | 'per_trimester' | 'per_term' | 'total';
    enablePaymentOptions: boolean;
    enableStudyModes: boolean;
    enableLocationPricing: boolean;
  }
  const { data: pricingConfig } = useQuery<PricingConfig | null>({
    queryKey: ["/api/courses", courseId, "pricing-config"],
    enabled: !!courseId,
  });

  // Fetch dynamic pricing tiers for the course
  interface PricingTier {
    id: string;
    courseId: string;
    paymentOption: 'upfront' | 'installment';
    studyMode: 'full_time' | 'part_time' | 'weekend' | 'evening' | 'online' | 'all' | 'weekday';
    locationType: 'all' | 'onshore' | 'offshore' | 'country';
    country: string | null;
    isDefaultPrice: boolean;
    amount: string;
    currency: string;
    label: string | null;
    description: string | null;
  }
  const { data: pricingTiers = [] } = useQuery<PricingTier[]>({
    queryKey: ["/api/courses", courseId, "pricing-tiers"],
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
    
    // Fees section - include dynamic pricing tiers
    if (pricingTiers.length > 0 || course.fees || course.costOfLiving || course.applicationFees) {
      sections.push("fees");
    }
    
    // Requirements section (combines eligibility, english, prerequisites)
    if (course.eligibilityRequirements || englishRequirements.length > 0 || course.englishRequirementsStructured || course.prerequisites || entryRequirements.length > 0) {
      sections.push("eligibility");
    }
    
    // Academic requirements section
    if (course.minimumAge) {
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
  }, [course, englishRequirements, entryRequirements, pricingTiers]);

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

  // Create JSON-LD structured data for Course (Enhanced for AI/GEO)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.description || metaDescription,
    "provider": course.university ? {
      "@type": "EducationalOrganization",
      "name": course.university.name,
      "url": course.university.website,
      "logo": course.university.logo,
      "address": course.country ? {
        "@type": "PostalAddress",
        "addressCountry": course.country
      } : undefined
    } : undefined,
    "teaches": course.subject || undefined,
    "educationalLevel": course.level || undefined,
    "timeToComplete": course.duration || undefined,
    "courseMode": course.deliveryMode === "online" ? "online" : course.deliveryMode === "on-campus" ? "onsite" : "blended",
    "inLanguage": "en",
    "hasCourseInstance": computedIntakes.length > 0 ? computedIntakes.map((intake) => ({
      "@type": "CourseInstance",
      "courseMode": course.deliveryMode === "online" ? "online" : course.deliveryMode === "on-campus" ? "onsite" : "blended",
      "startDate": intake.startDate.toISOString().split('T')[0],
      "applicationDeadline": intake.applicationDeadline.toISOString().split('T')[0],
      "locationCreated": course.country ? {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": course.country
        }
      } : undefined
    })) : undefined,
    "totalCost": course.fees ? {
      "@type": "MonetaryAmount",
      "value": course.fees,
      "currency": course.currency || 'AUD'
    } : undefined,
    "offers": course.fees ? {
      "@type": "Offer",
      "price": course.fees,
      "priceCurrency": course.currency || 'AUD',
      "availability": "https://schema.org/InStock",
      "url": courseUrl
    } : undefined,
    "coursePrerequisites": course.prerequisites || undefined,
    "occupationalCredentialAwarded": course.level || undefined
  };

  // Generate FAQ schema from course data (critical for AI extraction)
  const faqItems = [];
  
  if (course.fees) {
    faqItems.push({
      "@type": "Question",
      "name": `How much does ${course.title} cost?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `The tuition fee for ${course.title} is ${course.currency || 'AUD'} ${course.fees.toLocaleString()}.`
      }
    });
  }
  
  if (course.duration) {
    faqItems.push({
      "@type": "Question",
      "name": `How long is the ${course.title} program?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `The ${course.title} program has a duration of ${course.duration}.`
      }
    });
  }
  
  if (course.deliveryMode) {
    const modeText = course.deliveryMode === "online" ? "fully online" : course.deliveryMode === "on-campus" ? "on-campus" : "hybrid (combination of online and on-campus)";
    faqItems.push({
      "@type": "Question",
      "name": `Is ${course.title} available online?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `${course.title} is offered ${modeText}${course.university ? ` at ${course.university.name}` : ''}.`
      }
    });
  }
  
  if (computedIntakes.length > 0) {
    const intakeMonths = computedIntakes.map(i => i.monthName).join(', ');
    const nextIntakeText = nextIntake 
      ? ` The next intake starts on ${formatIntakeDate(nextIntake.startDate)}.` 
      : '';
    faqItems.push({
      "@type": "Question",
      "name": `When can I start ${course.title}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `${course.title} has intake periods in ${intakeMonths}.${nextIntakeText}`
      }
    });
  }
  
  if (course.prerequisites) {
    faqItems.push({
      "@type": "Question",
      "name": `What are the entry requirements for ${course.title}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": course.prerequisites
      }
    });
  }
  
  if (nextIntake && nextIntake.status === "open") {
    faqItems.push({
      "@type": "Question",
      "name": `What is the application deadline for ${course.title}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `The application deadline for the ${nextIntake.monthName} ${nextIntake.year} intake of ${course.title} is ${formatIntakeDate(nextIntake.applicationDeadline)}.`
      }
    });
  }

  const faqSchema = faqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems
  } : null;

  // Create JSON-LD Breadcrumb structured data for rich snippets
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Courses",
        "item": `${siteUrl}/courses`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": course.title,
        "item": courseUrl
      }
    ]
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
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
        {/* FAQ Schema for AI/LLM extraction */}
        {faqSchema && (
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        )}
      </Helmet>
      {/* Course Section Navigation - Shows when scrolling past hero */}
      <CourseSectionNav 
        visibleSections={visibleSections} 
        courseTitle={course.title}
        ctaContent={
          <>
            {existingApplication ? (
              <Button asChild variant="secondary" data-testid="sticky-nav-applied">
                <Link href="/student/applications">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Applied
                </Link>
              </Button>
            ) : isStudent ? (
              <Button asChild data-testid="sticky-nav-apply" onClick={() => trackInitiateApplication(course.title, String(course.id), course.fees ? Number(course.fees) : undefined, course.currency || "AUD")}>
                <Link href={`/student/courses/${course.id}`}>
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Apply Now
                </Link>
              </Button>
            ) : (
              <Button asChild data-testid="sticky-nav-login">
                <a href="/auth">
                  <LogIn className="h-4 w-4 mr-1" />
                  Apply
                </a>
              </Button>
            )}
            {course.university && (
              <LeadFormDialog
                courseId={course.id}
                universityId={course.universityId}
                courseName={course.title}
                universityName={course.university.name}
                buttonVariant="ghost"
                buttonClassName="whitespace-nowrap"
                buttonLabel="Request Info"
                courseValue={course.fees ? Number(course.fees) : undefined}
                courseCurrency={course.currency || "AUD"}
              />
            )}
          </>
        }
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

          {/* Mobile Quick Stats Strip - Horizontally scrollable on mobile only */}
          <div className="md:hidden overflow-x-auto -mx-4 px-4 py-3" data-testid="container-mobile-quick-stats">
            <div className="flex gap-3 min-w-max">
              {course.duration && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10 shrink-0" data-testid="stat-duration">
                  <Clock className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration</span>
                    <span className="text-sm font-semibold">{course.duration}</span>
                  </div>
                </div>
              )}
              {course.fees && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10 shrink-0" data-testid="stat-fees">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Tuition/Year</span>
                    <span className="text-sm font-semibold">{course.currency} {Number(course.fees).toLocaleString()}</span>
                  </div>
                </div>
              )}
              {course.deliveryMode && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10 shrink-0" data-testid="stat-mode">
                  <MonitorPlay className="h-4 w-4 text-accent" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Mode</span>
                    <span className="text-sm font-semibold">
                      {course.deliveryMode === "online" ? "Online" : course.deliveryMode === "on-campus" ? "On-Campus" : "Hybrid"}
                    </span>
                  </div>
                </div>
              )}
              {nextIntake && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10 shrink-0" data-testid="stat-next-intake">
                  <Calendar className="h-4 w-4 text-secondary" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Next Intake</span>
                    <span className="text-sm font-semibold">{formatIntakeDate(nextIntake.startDate)}</span>
                  </div>
                </div>
              )}
              {(course.location || course.country) && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10 shrink-0" data-testid="stat-location">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</span>
                    <span className="text-sm font-semibold">{course.location || course.country}</span>
                  </div>
                </div>
              )}
            </div>
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
                          { text: "text-[#3455A5]", border: "border-[#3455A5]/30" },
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

            {/* Hero CTA Card - Clean & Focused */}
            <div className="lg:col-span-1 flex">
              <Card className="bg-background/60 backdrop-blur-sm border-primary/20 flex-1" data-testid="hero-cta-card">
                <CardContent className="p-4 space-y-4">
                  <p className="text-sm font-semibold text-foreground">Interested in this course?</p>

                  {existingApplication ? (
                    <Button 
                      asChild 
                      className="w-full bg-green-600" 
                      data-testid="button-already-applied"
                    >
                      <Link href="/student/applications">
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Applied for this course
                      </Link>
                    </Button>
                  ) : isStudent ? (
                    <Button 
                      asChild 
                      className="w-full" 
                      data-testid="button-apply-now"
                      onClick={() => trackInitiateApplication(course.title, String(course.id), course.fees ? Number(course.fees) : undefined, course.currency || "AUD")}
                    >
                      <Link href={`/student/courses/${course.id}`}>
                        <GraduationCap className="h-4 w-4 mr-1.5" />
                        Apply Now
                      </Link>
                    </Button>
                  ) : (
                    <Button 
                      asChild 
                      className="w-full" 
                      data-testid="button-login-apply"
                    >
                      <a href="/auth">
                        <LogIn className="h-4 w-4 mr-1.5" />
                        Login to Apply
                      </a>
                    </Button>
                  )}

                  {course.university && (
                    <div className="pt-2 border-t">
                      <p className="text-[11px] text-muted-foreground text-center mb-2">Not ready to apply?</p>
                      <LeadFormDialog
                        courseId={course.id}
                        universityId={course.universityId}
                        courseName={course.title}
                        universityName={course.university.name}
                        buttonVariant="ghost"
                        courseValue={course.fees ? Number(course.fees) : undefined}
                        courseCurrency={course.currency || "AUD"}
                      />
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
            <ResponsiveSection
              id="about"
              icon={<GraduationCap className="h-5 w-5 text-primary" />}
              title="About This Program"
              defaultOpen={true}
            >
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line" data-testid="text-description">
                {course.description || "No description available"}
              </p>
            </ResponsiveSection>

            {/* Modern Financial Breakdown - Show if pricing tiers exist OR static fees exist */}
            {(pricingTiers.length > 0 || course.fees || course.costOfLiving || course.applicationFees) && (
              <ResponsiveSection
                id="fees"
                icon={<DollarSign className="h-5 w-5 text-primary" />}
                title={<>Tuition Fees{pricingTiers.length > 0 && <span className="text-muted-foreground font-normal text-base ml-1">• Dynamic Pricing</span>}</>}
                defaultOpen={true}
              >
                  {/* Dynamic Pricing Tiers - Show when available */}
                  {pricingTiers.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pricingTiers.map((tier) => {
                          // Use shared helper for fee period label
                          const feePeriodLabel = getFeePeriodFullLabel(pricingConfig?.feePeriod);
                          
                          // Format study mode label
                          const studyModeLabels: Record<string, string> = {
                            'full_time': 'Full-Time',
                            'part_time': 'Part-Time',
                            'weekday': 'Weekday',
                            'weekend': 'Weekend',
                            'evening': 'Evening',
                            'online': 'Online',
                            'all': '',
                          };
                          // Format payment option label
                          const paymentLabels: Record<string, string> = {
                            'upfront': 'Upfront',
                            'installment': 'Installment',
                            'payment_plan': 'Payment Plan',
                            'per_term': 'Per Term',
                            'per_unit': 'Per Unit',
                          };
                          // Format location label
                          const locationLabels: Record<string, string> = {
                            'all': '',
                            'onshore': 'Onshore',
                            'offshore': 'Offshore',
                            'domestic': 'Domestic',
                            'international': 'International',
                            'country': tier.country || '',
                          };
                          
                          // Build display label from tier data or use custom label
                          const displayParts = [
                            studyModeLabels[tier.studyMode],
                            paymentLabels[tier.paymentOption],
                            locationLabels[tier.locationType],
                          ].filter(Boolean);
                          
                          const displayLabel = tier.label || displayParts.join(' • ') || 'Tuition';
                          
                          return (
                            <div 
                              key={tier.id} 
                              className={`relative overflow-hidden rounded-xl border p-6 ${
                                tier.isDefaultPrice 
                                  ? 'bg-gradient-to-br from-primary/10 to-transparent border-primary/30' 
                                  : 'bg-gradient-to-br from-muted/30 to-transparent'
                              }`}
                              data-testid={`card-pricing-tier-${tier.id}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  {tier.isDefaultPrice && (
                                    <Badge className="text-xs bg-primary text-primary-foreground" variant="default">
                                      <Star className="h-3 w-3 mr-1 fill-primary-foreground" />
                                      Default
                                    </Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground font-medium">{displayLabel}</span>
                                </div>
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <GraduationCap className="h-4 w-4 text-primary" />
                                </div>
                              </div>
                              <p className="text-3xl font-bold text-primary" data-testid={`text-tier-amount-${tier.id}`}>
                                {tier.currency} {Number(tier.amount).toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{feePeriodLabel}</p>
                              {tier.description && (
                                <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Static Fees - Show only when NO dynamic pricing exists */}
                  {pricingTiers.length === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {course.fees && (
                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-6" data-testid="card-tuition">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className="text-sm text-muted-foreground">{getFeePeriodTitle(pricingConfig?.feePeriod)}</span>
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <GraduationCap className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                          <p className="text-3xl font-bold" data-testid="text-tuition-amount">{course.currency} {Number(course.fees).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground mt-1">{getFeePeriodFullLabel(pricingConfig?.feePeriod)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Living Costs and Application Fee - Only show if at least one is available */}
                  {(course.costOfLiving || (course.applicationFees !== null && course.applicationFees !== undefined)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                  )}
              </ResponsiveSection>
            )}

            {/* Combined Requirements Section (English, Eligibility, Prerequisites) */}
            {(course.eligibilityRequirements || englishRequirements.length > 0 || course.englishRequirementsStructured || course.prerequisites || entryRequirements.length > 0) && (
              <ResponsiveSection
                id="eligibility"
                icon={<CheckCircle className="h-5 w-5 text-primary" />}
                title="Entry Requirements"
                testId="card-requirements"
                defaultOpen={true}
              >
                  <Tabs defaultValue={(course.eligibilityRequirements || entryRequirements.length > 0 || course.prerequisites) ? "academic" : "english"} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger 
                        value="academic" 
                        disabled={!(course.eligibilityRequirements || entryRequirements.length > 0 || course.prerequisites)}
                        className="flex items-center gap-2"
                        data-testid="tab-academic"
                      >
                        <GraduationCap className="h-4 w-4" />
                        <span className="hidden sm:inline">Academic</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="english" 
                        disabled={!(englishRequirements.length > 0 || course.englishRequirementsStructured)}
                        className="flex items-center gap-2"
                        data-testid="tab-english"
                      >
                        <Globe className="h-4 w-4" />
                        <span className="hidden sm:inline">English</span>
                      </TabsTrigger>
                    </TabsList>

                    {/* Academic Requirements Tab (merged eligibility + prerequisites) */}
                    <TabsContent value="academic" className="space-y-6">
                      {/* International Year 12 Qualification Table with Country Dropdown */}
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
                      
                      {/* Prerequisites Section */}
                      {course.prerequisites && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold">Prerequisites</h4>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-prerequisites">
                            {course.prerequisites}
                          </p>
                        </div>
                      )}
                      
                      {/* Legacy Text-Based Eligibility Requirements */}
                      {course.eligibilityRequirements && (
                        <div className="space-y-2">
                          {(entryRequirements.length > 0 || course.prerequisites) && (
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

                    {/* English Language Requirements Tab */}
                    <TabsContent value="english" className="space-y-6">
                      {englishRequirements.length > 0 ? (
                        <>
                          {/* Mobile: Card Layout */}
                          <div className="md:hidden space-y-4">
                            {englishRequirements.map((req) => (
                              <Card 
                                key={req.id} 
                                data-testid={`card-english-req-${req.id}`}
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-base">
                                      {TEST_TYPE_CONFIG[req.testType]?.label || req.testType.toUpperCase()}
                                    </span>
                                    {req.isPreferred && (
                                      <Badge variant="default" className="text-xs">
                                        <Star className="h-3 w-3 mr-1" />
                                        Preferred
                                      </Badge>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="text-center p-2 bg-primary/10 rounded-md">
                                      <div className="text-xs text-muted-foreground mb-1">Overall</div>
                                      <div className="font-bold text-lg text-primary" data-testid={`mobile-${req.testType}-overall`}>
                                        {req.minOverallScore}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-muted/50 rounded-md">
                                      <div className="text-xs text-muted-foreground mb-1">Listening</div>
                                      <div className="font-semibold" data-testid={`mobile-${req.testType}-listening`}>
                                        {req.minListeningScore || "—"}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-muted/50 rounded-md">
                                      <div className="text-xs text-muted-foreground mb-1">Reading</div>
                                      <div className="font-semibold" data-testid={`mobile-${req.testType}-reading`}>
                                        {req.minReadingScore || "—"}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-muted/50 rounded-md">
                                      <div className="text-xs text-muted-foreground mb-1">Writing</div>
                                      <div className="font-semibold" data-testid={`mobile-${req.testType}-writing`}>
                                        {req.minWritingScore || "—"}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-muted/50 rounded-md col-span-2">
                                      <div className="text-xs text-muted-foreground mb-1">Speaking</div>
                                      <div className="font-semibold" data-testid={`mobile-${req.testType}-speaking`}>
                                        {req.minSpeakingScore || "—"}
                                      </div>
                                    </div>
                                  </div>
                                  {req.notes && (
                                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                                      {req.notes}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          {/* Desktop: Table Layout */}
                          <div className="hidden md:block overflow-x-auto">
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
                        </>
                      ) : course.englishRequirementsStructured && (
                        <>
                          {/* Mobile: Card Layout for legacy structured data */}
                          <div className="md:hidden space-y-4">
                            {course.englishRequirementsStructured.IELTS && (
                              <Card data-testid="card-legacy-ielts">
                                <CardHeader className="pb-2">
                                  <span className="font-semibold text-base">IELTS</span>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="text-center p-2 bg-primary/10 rounded-md">
                                      <div className="text-xs text-muted-foreground mb-1">Overall</div>
                                      <div className="font-bold text-lg text-primary" data-testid="mobile-ielts-overall">
                                        {course.englishRequirementsStructured.IELTS.overall || "—"}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-muted/50 rounded-md">
                                      <div className="text-xs text-muted-foreground mb-1">Min Each Band</div>
                                      <div className="font-semibold" data-testid="mobile-ielts-min-band">
                                        {course.englishRequirementsStructured.IELTS.min_each_band || "—"}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                            {course.englishRequirementsStructured.TOEFL && (
                              <Card data-testid="card-legacy-toefl">
                                <CardHeader className="pb-2">
                                  <span className="font-semibold text-base">TOEFL</span>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="text-center p-2 bg-primary/10 rounded-md col-span-2">
                                      <div className="text-xs text-muted-foreground mb-1">Overall</div>
                                      <div className="font-bold text-lg text-primary" data-testid="mobile-toefl-overall">
                                        {course.englishRequirementsStructured.TOEFL.overall || "—"}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                            {course.englishRequirementsStructured.PTE && (
                              <Card data-testid="card-legacy-pte">
                                <CardHeader className="pb-2">
                                  <span className="font-semibold text-base">PTE</span>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="text-center p-2 bg-primary/10 rounded-md col-span-2">
                                      <div className="text-xs text-muted-foreground mb-1">Overall</div>
                                      <div className="font-bold text-lg text-primary" data-testid="mobile-pte-overall">
                                        {course.englishRequirementsStructured.PTE.overall || "—"}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                            {course.englishRequirementsStructured.Duolingo && (
                              <Card data-testid="card-legacy-duolingo">
                                <CardHeader className="pb-2">
                                  <span className="font-semibold text-base">Duolingo</span>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="text-center p-2 bg-primary/10 rounded-md col-span-2">
                                      <div className="text-xs text-muted-foreground mb-1">Overall</div>
                                      <div className="font-bold text-lg text-primary" data-testid="mobile-duolingo-overall">
                                        {course.englishRequirementsStructured.Duolingo.overall || "—"}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>

                          {/* Desktop: Table Layout for legacy structured data */}
                          <div className="hidden md:block overflow-x-auto">
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
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
              </ResponsiveSection>
            )}

            {/* Academic Requirements */}
            {course.minimumAge && (
              <ResponsiveSection
                id="academic"
                icon={<FileText className="h-5 w-5 text-primary" />}
                title="Academic Requirements"
                defaultOpen={false}
              >
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Minimum Age</p>
                    <p className="text-lg font-semibold" data-testid="text-minimum-age">{course.minimumAge} years old</p>
                  </div>
                </div>
              </ResponsiveSection>
            )}

            {/* Career Outcomes & Career Path */}
            {((course.careerOutcomes && course.careerOutcomes.length > 0) || course.careerPath) && (
              <ResponsiveSection
                id="career"
                icon={<Target className="h-5 w-5 text-primary" />}
                title="Career Outcomes & Progression"
                testId="card-career-pathways"
                defaultOpen={false}
              >
                <div className="space-y-6">
                  {course.careerOutcomes && course.careerOutcomes.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-3">Potential Career Roles</h3>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const colorPalette = [
                            { dot: "bg-[#3455A5]", text: "text-[#3455A5]", border: "border-[#3455A5]/30" },
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
                </div>
              </ResponsiveSection>
            )}

            {/* Pathways Section - Progression Routes */}
            {course.pathways && course.pathways.length > 0 && (
              <ResponsiveSection
                id="pathways"
                icon={<Layers className="h-5 w-5 text-primary" />}
                title="Progression Pathways"
                testId="card-pathways"
                defaultOpen={false}
              >
                <div>
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
                </div>
              </ResponsiveSection>
            )}

            {/* Internship Details Section */}
            {course.internshipDetails && (
              <ResponsiveSection
                id="internship"
                icon={<Briefcase className="h-5 w-5 text-primary" />}
                title="Internship & Work Placement"
                testId="card-internship-details"
                defaultOpen={false}
              >
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-internship-details">
                  {course.internshipDetails}
                </p>
              </ResponsiveSection>
            )}

            {/* Course Details */}
            {course.campusLocations?.length && (
              <ResponsiveSection
                id="details"
                icon={<MapPin className="h-5 w-5 text-primary" />}
                title="Available Campus Locations"
                defaultOpen={false}
              >
                {course.campusLocations && course.campusLocations.length > 0 && (
                  <CampusMapTabs 
                    campusLocations={course.campusLocations}
                    institutionName={course.university?.name || undefined}
                    institutionLogo={course.university?.logo || undefined}
                  />
                )}
              </ResponsiveSection>
            )}
          </div>

          {/* Enhanced Sidebar - Sticky Container */}
          <div className="lg:sticky lg:top-28 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
            {/* Quick Facts Card - Sidebar */}
            <Card className="border-primary/20" data-testid="sidebar-quick-facts">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Quick Facts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                {nextIntake && (
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-secondary/10 rounded-md">
                      <Calendar className="h-3.5 w-3.5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Next Intake</p>
                      <p className="text-sm font-semibold" data-testid="text-next-intake">
                        {formatIntakeDate(nextIntake.startDate)}
                        {nextIntake.status === "open" && (
                          <Badge variant="default" className="ml-2 text-[10px]">Applications Open</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {nextIntake && nextIntake.status === "open" && (
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-accent/10 rounded-md">
                      <Calendar className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Application Deadline</p>
                      <p className="text-sm font-semibold" data-testid="text-application-deadline">{formatIntakeDate(nextIntake.applicationDeadline)}</p>
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
                {computedIntakes.length > 0 && (
                  <div className="flex items-start gap-3" data-testid="available-intakes-section">
                    <div className="p-1.5 bg-secondary/10 rounded-md mt-0.5">
                      <Calendar className="h-3.5 w-3.5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1" data-testid="available-intakes-label">Available Intakes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {computedIntakes.map((intake, index) => {
                          const statusColors = {
                            open: { text: "text-[#10b981]", border: "border-[#10b981]/30", label: "Open" },
                            upcoming: { text: "text-[#3455A5]", border: "border-[#3455A5]/30", label: "Upcoming" },
                            closed: { text: "text-muted-foreground", border: "border-muted/30", label: "Closed" },
                          };
                          const color = statusColors[intake.status];
                          return (
                            <Badge 
                              key={intake.templateId} 
                              className={`text-xs px-2 py-0.5 bg-background/80 border ${color.border} ${color.text} font-semibold`}
                              data-testid={`badge-intake-${index}`}
                            >
                              {intake.displayLabel}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
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

                  {/* External Course Links */}
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

      {/* FAQ Section for AI/LLM Extraction - Visible natural language content */}
      <section className="container mx-auto px-4 py-12 border-t bg-muted/30" id="faq">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" data-testid="text-faq-heading">
            <HelpCircle className="h-6 w-6 text-primary" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {course.fees && (
              <div className="bg-background rounded-lg p-5 border" data-testid="faq-item-fees">
                <h3 className="font-semibold mb-2" data-testid="faq-question-fees">How much does {course.title} cost?</h3>
                <p className="text-muted-foreground" data-testid="faq-answer-fees">
                  The tuition fee for {course.title} is {course.currency || 'AUD'} {course.fees.toLocaleString()}.
                  {course.university?.name && ` This program is offered by ${course.university.name}.`}
                </p>
              </div>
            )}
            {course.duration && (
              <div className="bg-background rounded-lg p-5 border" data-testid="faq-item-duration">
                <h3 className="font-semibold mb-2" data-testid="faq-question-duration">How long is the {course.title} program?</h3>
                <p className="text-muted-foreground" data-testid="faq-answer-duration">
                  The {course.title} program takes {course.duration} to complete.
                  {course.courseLevel && ` This is a ${course.courseLevel} level qualification.`}
                </p>
              </div>
            )}
            {computedIntakes.length > 0 && (
              <div className="bg-background rounded-lg p-5 border" data-testid="faq-item-intakes">
                <h3 className="font-semibold mb-2" data-testid="faq-question-intakes">When can I start studying {course.title}?</h3>
                <p className="text-muted-foreground" data-testid="faq-answer-intakes">
                  This course has intake periods in {computedIntakes.map(i => i.monthName).join(', ')}.
                  {nextIntake && nextIntake.status === "open" && 
                    ` The next intake starts on ${formatIntakeDate(nextIntake.startDate)} with applications due by ${formatIntakeDate(nextIntake.applicationDeadline)}.`}
                  {nextIntake && nextIntake.status === "upcoming" && 
                    ` The next intake starts on ${formatIntakeDate(nextIntake.startDate)}. Applications will open soon.`}
                </p>
              </div>
            )}
            {course.location && (
              <div className="bg-background rounded-lg p-5 border" data-testid="faq-item-location">
                <h3 className="font-semibold mb-2" data-testid="faq-question-location">Where is {course.title} offered?</h3>
                <p className="text-muted-foreground" data-testid="faq-answer-location">
                  {course.title} is offered in {course.location}.
                  {course.university?.name && ` It is provided by ${course.university.name}.`}
                  {course.campusLocations && course.campusLocations.length > 0 && 
                    ` Campus locations include: ${course.campusLocations.join(', ')}.`}
                </p>
              </div>
            )}
            {course.englishRequirements && (
              <div className="bg-background rounded-lg p-5 border" data-testid="faq-item-english">
                <h3 className="font-semibold mb-2" data-testid="faq-question-english">What are the English requirements for {course.title}?</h3>
                <p className="text-muted-foreground" data-testid="faq-answer-english">
                  {course.englishRequirements}
                </p>
              </div>
            )}
            <div className="bg-background rounded-lg p-5 border" data-testid="faq-item-apply">
              <h3 className="font-semibold mb-2" data-testid="faq-question-apply">How do I apply for {course.title}?</h3>
              <p className="text-muted-foreground" data-testid="faq-answer-apply">
                You can apply for {course.title} through ANZ Global Education. 
                Create an account, complete your student profile, and submit your application. 
                Our team will guide you through the visa process and help you get started.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Sticky Bottom CTA Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 safe-area-bottom" data-testid="mobile-sticky-cta">
        <div className="flex items-center justify-between gap-2 p-3">
          {/* Save/Favorite Button */}
          {isStudent ? (
            <Button
              variant={isFavorited ? "destructive" : "outline"}
              onClick={handleFavoriteToggle}
              disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
              className={`flex-1 ${!isFavorited ? "text-destructive border-destructive" : ""}`}
              data-testid="mobile-button-favorite"
            >
              <Heart className={`h-4 w-4 mr-1.5 ${isFavorited ? "fill-current" : ""}`} />
              {isFavorited ? "Saved" : "Save"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => window.location.href = "/auth"}
              className="flex-1 text-destructive border-destructive"
              data-testid="mobile-button-save-login"
            >
              <Heart className="h-4 w-4 mr-1.5" />
              Save
            </Button>
          )}

          {/* Main CTA - Apply */}
          {isStudent && existingApplication ? (
            <Button
              className="flex-[2]"
              asChild
              data-testid="mobile-button-view-application"
            >
              <Link href={`/student/applications/${existingApplication.application.id}`}>
                <FileText className="h-4 w-4 mr-1.5" />
                View Application
              </Link>
            </Button>
          ) : user ? (
            <Button
              className="flex-[2]"
              asChild
              data-testid="mobile-button-apply"
              onClick={() => trackInitiateApplication(course.title, String(course.id), course.fees ? Number(course.fees) : undefined, course.currency || "AUD")}
            >
              <Link href={`/student/applications/new?courseId=${courseId}`}>
                <ArrowUpRight className="h-4 w-4 mr-1.5" />
                Apply Now
              </Link>
            </Button>
          ) : (
            <Button
              className="flex-[2]"
              asChild
              data-testid="mobile-button-login-apply"
            >
              <a href="/auth">
                <LogIn className="h-4 w-4 mr-1.5" />
                Login to Apply
              </a>
            </Button>
          )}

          {/* More Actions Button - Request Info */}
          {course?.university && courseId && (
            <>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setMobileLeadFormOpen(true)}
                aria-label="Request more information"
                data-testid="mobile-button-more"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <LeadFormDialog
                courseId={course.id}
                universityId={course.universityId}
                courseName={course.title}
                universityName={course.university.name}
                trigger={false}
                open={mobileLeadFormOpen}
                onOpenChange={setMobileLeadFormOpen}
                courseValue={course.fees ? Number(course.fees) : undefined}
                courseCurrency={course.currency || "AUD"}
              />
            </>
          )}
        </div>
      </div>

      {/* Bottom padding spacer for mobile sticky bars (section nav + CTA) - accounts for safe area */}
      <div className="md:hidden h-36 pb-safe" aria-hidden="true" />
    </div>
  );
}
