import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, Clock, DollarSign, Calendar, GraduationCap, ArrowLeft, 
  Download, LogIn, Award, Globe, BookOpen, Home, Sparkles,
  Users, TrendingUp, CheckCircle, Building2, Briefcase
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

      {/* Modern AI-Style Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-12 relative">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-2 text-sm mb-6" data-testid="breadcrumb">
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
                      <p className="text-sm text-muted-foreground">Offered by</p>
                      <p className="font-semibold" data-testid="text-university-name">{course.university.name}</p>
                    </div>
                  </div>
                )}

                {/* Course Title with Gradient */}
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent mb-3" data-testid="text-course-title">
                    {course.title}
                  </h1>
                  {course.courseCode && (
                    <p className="text-lg text-muted-foreground" data-testid="text-course-code">
                      Course Code: {course.courseCode}
                    </p>
                  )}
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap gap-2">
                  {course.scholarshipPercentage && (
                    <Badge className="bg-gradient-to-r from-secondary to-secondary/80 border-0 text-white px-4 py-1.5" data-testid="badge-scholarship">
                      <Award className="h-3 w-3 mr-1" />
                      {course.scholarshipPercentage}% Scholarship Available
                    </Badge>
                  )}
                  {course.prPathway && (
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 border-0 text-white px-4 py-1.5" data-testid="badge-pr-pathway">
                      <Sparkles className="h-3 w-3 mr-1" />
                      PR Pathway
                    </Badge>
                  )}
                  {course.internshipAvailable && (
                    <Badge className="bg-gradient-to-r from-accent to-accent/80 border-0 text-white px-4 py-1.5">
                      <Briefcase className="h-3 w-3 mr-1" />
                      Internship Available
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="lg:col-span-1">
              <Card className="bg-background/60 backdrop-blur-sm border-primary/20 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Quick Facts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.fees && (
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Annual Tuition</p>
                        <p className="text-lg font-bold" data-testid="text-annual-tuition">{course.currency} {Number(course.fees).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {course.duration && (
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <Clock className="h-4 w-4 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-semibold" data-testid="text-duration">{course.duration}</p>
                      </div>
                    </div>
                  )}
                  {course.location && (
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="p-2 bg-accent/10 rounded-lg">
                        <MapPin className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-semibold" data-testid="text-location">{course.location}</p>
                      </div>
                    </div>
                  )}
                  {course.subject && (
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Discipline</p>
                        <p className="font-semibold" data-testid="text-discipline">{course.subject}</p>
                      </div>
                    </div>
                  )}
                  {course.startDate && (
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <Calendar className="h-4 w-4 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Next Intake</p>
                        <p className="font-semibold" data-testid="text-next-intake">{course.startDate}</p>
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
            <Card className="border-primary/10 hover-elevate transition-all duration-300">
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
                    Investment Overview
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

            {/* Eligibility Requirements */}
            {course.eligibilityRequirements && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300" id="eligibility">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Eligibility Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-eligibility">
                    {course.eligibilityRequirements}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* English Requirements */}
            {course.englishRequirements && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    English Language Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-english-requirements">
                    {course.englishRequirements}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Career Outcomes */}
            {course.careerOutcomes && course.careerOutcomes.length > 0 && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Career Pathways
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {course.careerOutcomes.map((career, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {career}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons Card */}
            <Card className="lg:sticky lg:top-24 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="pt-6 space-y-3">
                <Button 
                  asChild 
                  className="w-full shadow-lg shadow-primary/20" 
                  size="lg"
                  data-testid="button-login-apply"
                >
                  <a href={`/api/login?type=student&redirect=/student/courses/${course.id}`}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Login to Apply
                  </a>
                </Button>
                {course.curriculumUrl && (
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-full" 
                    size="lg"
                    data-testid="button-download-curriculum"
                  >
                    <a href={course.curriculumUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Curriculum
                    </a>
                  </Button>
                )}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
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
                      {course.university.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{course.university.location}, {course.university.country}</span>
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
                    {course.university.scholarshipPercentage && (
                      <div className="flex items-center justify-between text-sm p-3 bg-gradient-to-r from-secondary/10 to-transparent rounded-lg border border-secondary/20">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Award className="h-4 w-4 text-secondary" />
                          Scholarship
                        </span>
                        <Badge className="bg-secondary text-white font-semibold border-0" data-testid="badge-institution-scholarship">
                          {course.university.scholarshipPercentage}%
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

      {/* Modern Footer */}
      <footer className="border-t bg-gradient-to-r from-background to-primary/5 py-12 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <img src={logoUrl} alt="ANZ Global Education" className="h-10 w-auto opacity-80" />
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ANZ Global Education. Empowering students worldwide with AI-powered course discovery.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
