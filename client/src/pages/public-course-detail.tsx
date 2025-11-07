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
import { 
  MapPin, Clock, DollarSign, Calendar, GraduationCap, ArrowLeft, 
  Download, LogIn, Award, Globe, BookOpen, Home
} from "lucide-react";
import type { Course, University } from "@shared/schema";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

type CourseWithUniversity = Course & { university?: University };

export default function PublicCourseDetail() {
  const [, params] = useRoute("/courses/:id");
  const courseId = params?.id;

  const { data: course, isLoading } = useQuery<CourseWithUniversity>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
  });

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/" className="flex items-center gap-2 md:gap-3">
              <img src={logoUrl} alt="ANZ Global Education" className="h-8 sm:h-10 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <Button variant="outline" asChild size="sm" data-testid="button-back-courses">
              <Link href="/courses">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Courses</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumb data-testid="breadcrumb">
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
                <Link href="/courses" data-testid="breadcrumb-courses">
                  Courses
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="breadcrumb-current">{course.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {course.university?.logo && (
              <div className="bg-white p-4 rounded-lg">
                <img
                  src={`/${course.university.logo}`}
                  alt={course.university.name}
                  className="w-20 h-20 object-contain"
                  data-testid="img-university-logo"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                {course.scholarshipPercentage && (
                  <Badge className="bg-white/20 text-white hover:bg-white/30" data-testid="badge-scholarship">
                    {course.scholarshipPercentage}% Scholarship
                  </Badge>
                )}
                {course.prPathway && (
                  <Badge className="bg-white/20 text-white hover:bg-white/30" data-testid="badge-pr-pathway">
                    PR Pathway
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-course-title">
                {course.title}
              </h1>
              {course.courseCode && (
                <p className="text-sm opacity-90 mb-2" data-testid="text-course-code">
                  Code: {course.courseCode}
                </p>
              )}
              {course.university && (
                <p className="text-lg opacity-95 mb-4" data-testid="text-university-name">
                  {course.university.name}
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-sm">
                {course.fees && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Fees: {course.currency} {Number(course.fees).toLocaleString()}</span>
                  </div>
                )}
                {course.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Duration: {course.duration}</span>
                  </div>
                )}
                {course.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>Location: {course.location}</span>
                  </div>
                )}
                {course.subject && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>Discipline: {course.subject}</span>
                  </div>
                )}
                {course.startDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Intake: {course.startDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b bg-card sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex gap-0">
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent hover:border-primary/50 transition-colors"
              data-testid="tab-info"
            >
              INFO
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('fees');
                if (element) {
                  const offset = 140; // Account for sticky headers (64px header + 76px tabs)
                  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                  window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
                }
              }}
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent hover:border-primary/50 transition-colors"
              data-testid="tab-fees"
            >
              FEES
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('eligibility');
                if (element) {
                  const offset = 140; // Account for sticky headers
                  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                  window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
                }
              }}
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent hover:border-primary/50 transition-colors"
              data-testid="tab-eligibility"
            >
              ELIGIBILITY
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Course Section */}
            <Card>
              <CardHeader>
                <CardTitle>About Course</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line" data-testid="text-description">
                  {course.description || "No description available"}
                </p>
              </CardContent>
            </Card>

            {/* Course Fees Table */}
            {(course.fees || course.costOfLiving || course.applicationFees) && (
              <Card id="fees">
                <CardHeader>
                  <CardTitle>Course Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <tbody>
                        {course.fees && (
                          <tr className="border-b">
                            <td className="p-3 font-medium">Course Fees (Yearly)</td>
                            <td className="p-3 text-right">{course.currency} {Number(course.fees).toLocaleString()}</td>
                          </tr>
                        )}
                        {course.costOfLiving && (
                          <tr className="border-b">
                            <td className="p-3 font-medium">Cost of Living (Yearly)</td>
                            <td className="p-3 text-right">{course.currency} {Number(course.costOfLiving).toLocaleString()}</td>
                          </tr>
                        )}
                        {course.applicationFees !== null && course.applicationFees !== undefined && (
                          <tr className="border-b">
                            <td className="p-3 font-medium">Application Fees</td>
                            <td className="p-3 text-right">
                              {Number(course.applicationFees) > 0 
                                ? `${course.currency} ${Number(course.applicationFees).toLocaleString()}`
                                : "N/A"}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="p-3 font-medium">ANZ Charges</td>
                          <td className="p-3 text-right text-primary font-semibold">Free</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Eligibility Requirements */}
            {course.eligibilityRequirements && (
              <Card id="eligibility">
                <CardHeader>
                  <CardTitle>Course Eligibility</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line" data-testid="text-eligibility">
                    {course.eligibilityRequirements}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* English Requirements */}
            {course.englishRequirements && (
              <Card>
                <CardHeader>
                  <CardTitle>English Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line" data-testid="text-english-requirements">
                    {course.englishRequirements}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons Card */}
            <Card className="lg:sticky lg:top-24 lg:z-50">
              <CardContent className="pt-6 space-y-3">
                {course.curriculumUrl && (
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-full" 
                    data-testid="button-download-curriculum"
                  >
                    <a href={course.curriculumUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Curriculum
                    </a>
                  </Button>
                )}
                <Button 
                  asChild 
                  className="w-full" 
                  data-testid="button-login-apply"
                >
                  <a href={`/api/login?type=student&redirect=/student/courses/${course.id}`}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Login to Apply
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* University Info Card */}
            {course.university && (
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1 w-8 bg-primary rounded-full"></div>
                    <CardTitle className="text-sm uppercase tracking-wider text-primary">Offered By</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Institution Logo and Name */}
                  <div className="flex items-center gap-3 pb-3 border-b">
                    {course.university.logo && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg border bg-white p-2 flex items-center justify-center">
                        <img
                          src={`/${course.university.logo}`}
                          alt={course.university.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-tight" data-testid="text-institution-name">
                        {course.university.name}
                      </h3>
                      {course.university.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{course.university.location}, {course.university.country}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Institution Details */}
                  <div className="space-y-2">
                    {course.university.providerType && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant="secondary" className="font-normal" data-testid="badge-institution-type">
                          {course.university.providerType}
                        </Badge>
                      </div>
                    )}
                    {course.university.establishedYear && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Established</span>
                        <span className="font-medium" data-testid="text-institution-established">{course.university.establishedYear}</span>
                      </div>
                    )}
                    {course.university.numberOfCampuses && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Campuses</span>
                        <span className="font-medium" data-testid="text-institution-campuses">{course.university.numberOfCampuses}</span>
                      </div>
                    )}
                    {course.university.scholarshipPercentage && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Scholarship</span>
                        <Badge variant="default" className="font-semibold" data-testid="badge-institution-scholarship">
                          <Award className="h-3 w-3 mr-1" />
                          {course.university.scholarshipPercentage}%
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* View Institution Button */}
                  <Button asChild className="w-full" data-testid="button-view-institution">
                    <Link href={`/institutions/${course.university.id}`}>
                      <Globe className="h-4 w-4 mr-2" />
                      View Full Institution Profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ANZ Global Education. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
