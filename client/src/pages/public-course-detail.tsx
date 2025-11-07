import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Clock, DollarSign, Calendar, GraduationCap, ArrowLeft, 
  Download, LogIn, Award, Globe, BookOpen
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
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-0 h-auto p-0">
              <TabsTrigger 
                value="info" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                data-testid="tab-info"
              >
                INFO
              </TabsTrigger>
              <TabsTrigger 
                value="fees" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                data-testid="tab-fees"
              >
                FEES
              </TabsTrigger>
              <TabsTrigger 
                value="eligibility" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                data-testid="tab-eligibility"
              >
                ELIGIBILITY
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
                              {course.applicationFees > 0 
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
            {/* Quick Facts Card */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.courseCode && (
                  <div>
                    <p className="text-sm font-medium mb-1">Code</p>
                    <p className="text-sm text-muted-foreground">{course.courseCode}</p>
                  </div>
                )}
                {course.duration && (
                  <div>
                    <p className="text-sm font-medium mb-1">Duration</p>
                    <p className="text-sm text-muted-foreground">{course.duration}</p>
                  </div>
                )}
                {course.fees && (
                  <div>
                    <p className="text-sm font-medium mb-1">Fees</p>
                    <p className="text-sm text-muted-foreground">
                      {course.currency} {Number(course.fees).toLocaleString()}
                    </p>
                  </div>
                )}
                {course.location && (
                  <div>
                    <p className="text-sm font-medium mb-1">Location</p>
                    <p className="text-sm text-muted-foreground">{course.location}, {course.country}</p>
                  </div>
                )}
                {course.subject && (
                  <div>
                    <p className="text-sm font-medium mb-1">Discipline</p>
                    <p className="text-sm text-muted-foreground">{course.subject}</p>
                  </div>
                )}
                {course.startDate && (
                  <div>
                    <p className="text-sm font-medium mb-1">Intake</p>
                    <p className="text-sm text-muted-foreground">{course.startDate}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t">
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
                </div>
              </CardContent>
            </Card>

            {/* University Info Card */}
            {course.university && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About Institution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.university.logo && (
                    <img
                      src={`/${course.university.logo}`}
                      alt={course.university.name}
                      className="w-full h-auto object-contain max-h-24"
                    />
                  )}
                  <h3 className="font-semibold">{course.university.name}</h3>
                  {course.university.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {course.university.location}, {course.university.country}
                    </p>
                  )}
                  <Button asChild variant="outline" className="w-full mt-4">
                    <Link href={`/institutions/${course.university.id}`}>
                      View Institution
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
