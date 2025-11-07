import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MapPin, Globe, Mail, Phone, Building2, Calendar, Award, GraduationCap, ArrowLeft, ExternalLink, Home } from "lucide-react";
import type { University } from "@shared/schema";

export default function PublicInstitutionDetail() {
  const [, params] = useRoute("/institutions/:id");
  const institutionId = params?.id;

  const { data: institution, isLoading } = useQuery<University>({
    queryKey: [`/api/institutions/${institutionId}`],
    enabled: !!institutionId,
  });

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

  return (
    <div className="min-h-screen bg-background">
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
            {institution.logo && (
              <img
                src={`/${institution.logo}`}
                alt={institution.name}
                className="w-32 h-32 object-contain rounded"
                data-testid="img-logo"
              />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                {institution.providerType && (
                  <Badge variant="secondary" data-testid="badge-provider-type">
                    {institution.providerType}
                  </Badge>
                )}
                {institution.scholarshipPercentage && (
                  <Badge className="bg-accent text-accent-foreground" data-testid="badge-scholarship">
                    <Award className="h-3 w-3 mr-1" />
                    {institution.scholarshipPercentage}% Scholarship Available
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2" data-testid="text-name">
                {institution.name}
              </h1>
              {institution.location && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  <span data-testid="text-location">
                    {institution.location}, {institution.country}
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
            {/* Institution Gallery */}
            {institution.institutionGallery && institution.institutionGallery.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Campus Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {institution.institutionGallery.map((image, index) => (
                      <div key={index} className="aspect-[3/2] rounded-md overflow-hidden border">
                        <img
                          src={image}
                          alt={`${institution.name} campus ${index + 1}`}
                          className="w-full h-full object-cover"
                          data-testid={`img-gallery-${index}`}
                        />
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

            {/* About (Full Description or Legacy Description) */}
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

            {/* Featured Courses */}
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

            <Card>
              <CardHeader>
                <CardTitle>View All Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Explore all the courses offered by {institution.name}
                </p>
                <Button asChild className="w-full" data-testid="button-view-courses">
                  <Link href={`/courses?university=${institution.id}`}>
                    View All Courses
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
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
          </div>
        </div>
      </div>
    </div>
  );
}
