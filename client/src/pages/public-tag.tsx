import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { GraduationCap, Building2, Clock, MapPin, ArrowRight, Tag as TagIcon, Home } from "lucide-react";
import type { Tag, CourseWithDetails, University } from "@shared/schema";
import { InstitutionLogo } from "@/components/institution-logo";

function formatTagCategory(category: string): string {
  const categoryLabels: Record<string, string> = {
    feature: "Course Features",
    delivery: "Delivery Modes",
    career: "Career Outcomes",
    skill: "Skills",
    industry: "Industry Sectors",
    audience: "Target Audience",
    type: "Institution Types",
    specialization: "Specializations",
    experience: "Student Experience",
    location: "Location Features",
    financial: "Financial Options",
    accreditation: "Accreditations",
    services: "Student Services",
  };
  return categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function formatTagDescription(tag: Tag): string {
  const descriptions: Record<string, Record<string, string>> = {
    feature: {
      default: `Explore courses with ${tag.name}. Find programs that offer this distinctive feature to enhance your learning experience.`
    },
    delivery: {
      default: `Browse ${tag.name} courses available in Australia. Choose study modes that fit your lifestyle and learning preferences.`
    },
    career: {
      default: `Discover courses leading to ${tag.name} career outcomes. These programs are designed to prepare you for in-demand roles.`
    },
    industry: {
      default: `Find courses in the ${tag.name} sector. Industry-aligned programs to launch your career in this growing field.`
    },
    audience: {
      default: `Programs designed for ${tag.name}. Courses tailored to meet your specific educational needs and goals.`
    },
  };
  
  return tag.description || 
    descriptions[tag.category]?.default || 
    `Explore courses and institutions tagged with ${tag.name}. Find the perfect match for your educational journey in Australia.`;
}

export default function PublicTagPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: allTags, isLoading: tagLoading, error: tagError } = useQuery<Tag[]>({
    queryKey: ["/api/public/tags"],
    enabled: !!slug,
  });

  const tag = allTags?.find((t: Tag) => t.slug === slug) || null;

  const { data: taggedCoursesData, isLoading: coursesLoading } = useQuery<{ courses: CourseWithDetails[]; total: number }>({
    queryKey: [`/api/public/courses?tagId=${tag?.id}&limit=12`],
    enabled: !!tag?.id && (tag.appliesTo === 'courses' || tag.appliesTo === 'both'),
  });

  const taggedCourses = taggedCoursesData?.courses || [];

  const { data: taggedInstitutionsData, isLoading: institutionsLoading } = useQuery<{ institutions: University[] }>({
    queryKey: [`/api/public/institutions?tagId=${tag?.id}&limit=12`],
    enabled: !!tag?.id && (tag.appliesTo === 'institutions' || tag.appliesTo === 'both'),
  });

  const taggedInstitutions = taggedInstitutionsData?.institutions || [];

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const pageUrl = `${siteUrl}/browse/${slug}`;

  const metaTitle = tag ? `${tag.name} Courses & Programs | ANZ Global Education` : "Browse by Tag";
  const metaDescription = tag ? formatTagDescription(tag) : "Browse courses and institutions by category.";

  const structuredData = tag ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${tag.name} Courses and Programs`,
    "description": metaDescription,
    "url": pageUrl,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": (taggedCourses || []).slice(0, 10).map((course, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Course",
          "name": course.title,
          "provider": {
            "@type": "EducationalOrganization",
            "name": course.university?.name || "Unknown Provider"
          }
        }
      }))
    }
  } : null;

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
      { "@type": "ListItem", "position": 2, "name": "Browse", "item": `${siteUrl}/browse` },
      ...(tag ? [{ "@type": "ListItem", "position": 3, "name": tag.name, "item": pageUrl }] : [])
    ]
  };

  if (tagLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-1/3 mb-4" />
          <Skeleton className="h-6 w-2/3 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (tagError || !tag) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <TagIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Tag Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The tag you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/courses">
            <Button data-testid="button-browse-courses">Browse All Courses</Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const showCourses = tag.appliesTo === 'courses' || tag.appliesTo === 'both';
  const showInstitutions = tag.appliesTo === 'institutions' || tag.appliesTo === 'both';

  return (
    <PublicLayout>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="title" content={metaTitle} />
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:site_name" content="ANZ Global Education" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />

        {structuredData && (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )}
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
      </Helmet>

      <div className="min-h-screen">
        <section 
          className="py-12"
          style={{ backgroundColor: tag.color || '#3455A5' }}
        >
          <div className="container mx-auto px-4">
            <Breadcrumb className="mb-6" data-testid="breadcrumb">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/" className="text-white/80 hover:text-white">
                      <Home className="h-4 w-4" />
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-white/60" />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/browse" className="text-white/80 hover:text-white">Browse</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-white/60" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-white font-medium">{tag.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary" className="text-sm" data-testid="badge-category">
                {formatTagCategory(tag.category)}
              </Badge>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" data-testid="text-tag-title">
              {tag.name}
            </h1>
            <p className="text-lg text-white/90 max-w-3xl" data-testid="text-tag-description">
              {formatTagDescription(tag)}
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          {showCourses && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-courses-heading">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  Courses with {tag.name}
                </h2>
                <Link href={`/courses?tag=${tag.slug}`}>
                  <Button variant="outline" size="sm" data-testid="button-view-all-courses">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>

              {coursesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : taggedCourses && taggedCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {taggedCourses.slice(0, 6).map(course => (
                    <Link key={course.id} href={`/courses/${course.slug || course.id}`}>
                      <Card className="h-full hover-elevate cursor-pointer" data-testid={`card-course-${course.id}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            {course.university && (
                              <InstitutionLogo
                                src={course.university.logo}
                                alt={course.university.name}
                                size="sm"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base line-clamp-2">
                                {course.title}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {course.university?.name || "Unknown Provider"}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {course.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {course.duration}
                              </span>
                            )}
                            {course.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {course.location}
                              </span>
                            )}
                          </div>
                          {course.fees && (
                            <p className="text-primary font-medium mt-3">
                              {course.currency || "AUD"} {course.fees.toLocaleString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No courses found with this tag yet.</p>
                </Card>
              )}
            </div>
          )}

          {showInstitutions && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-institutions-heading">
                  <Building2 className="h-6 w-6 text-primary" />
                  Institutions with {tag.name}
                </h2>
                <Link href={`/institutions?tag=${tag.slug}`}>
                  <Button variant="outline" size="sm" data-testid="button-view-all-institutions">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>

              {institutionsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              ) : taggedInstitutions && taggedInstitutions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {taggedInstitutions.slice(0, 6).map(institution => (
                    <Link key={institution.id} href={`/institutions/${institution.id}`}>
                      <Card className="h-full hover-elevate cursor-pointer" data-testid={`card-institution-${institution.id}`}>
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <InstitutionLogo
                              src={institution.logo}
                              alt={institution.name}
                              size="md"
                            />
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base line-clamp-2">
                                {institution.name}
                              </CardTitle>
                              {institution.country && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {institution.country}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No institutions found with this tag yet.</p>
                </Card>
              )}
            </div>
          )}
        </section>

        <section className="bg-muted py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-semibold mb-4" data-testid="text-faq-heading">
              Frequently Asked Questions about {tag.name}
            </h2>
            <div className="space-y-4 max-w-3xl">
              <div className="bg-background rounded-lg p-4" data-testid="faq-item-1">
                <h3 className="font-medium mb-2">What is {tag.name}?</h3>
                <p className="text-muted-foreground text-sm">
                  {tag.description || `${tag.name} refers to a category of educational programs that share common characteristics, helping students find courses that match their preferences.`}
                </p>
              </div>
              <div className="bg-background rounded-lg p-4" data-testid="faq-item-2">
                <h3 className="font-medium mb-2">How many courses offer {tag.name}?</h3>
                <p className="text-muted-foreground text-sm">
                  We have {taggedCourses?.length || 0}+ courses tagged with {tag.name} from various institutions across Australia.
                </p>
              </div>
              <div className="bg-background rounded-lg p-4" data-testid="faq-item-3">
                <h3 className="font-medium mb-2">Can international students access {tag.name} courses?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes, most courses with {tag.name} are available to international students. Check individual course requirements for visa and eligibility details.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
