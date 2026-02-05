import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MapPin,
  DollarSign,
  Clock,
  Calendar,
  ArrowLeft,
  AlertCircle,
  Building2,
  BookOpen,
  GraduationCap,
  Briefcase,
  Globe,
  Award,
  Target,
  TrendingUp,
  CheckCircle,
  FileText,
  Plane,
  MonitorPlay,
  Sparkles,
  Heart,
  Send,
  Home,
} from "lucide-react";
import { insertApplicationSchema, type Course, type University, type Application, type Favorite, type EnglishRequirementsStructured, type StudentProfile } from "@shared/schema";
import { z } from "zod";

type CourseWithUniversity = Course & { university?: University };

const applicationFormSchema = insertApplicationSchema.pick({
  personalStatement: true,
  additionalInfo: true,
}).extend({
  personalStatement: z.string().min(50, "Personal statement must be at least 50 characters"),
});

export default function CourseDetail() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/student/courses/:id");
  const courseId = params?.id;
  const { user, isStudent } = useAuth();
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const { data: course, isLoading, isError, error } = useQuery<CourseWithUniversity>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: profile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
    enabled: isStudent,
  });

  const { data: applicationsData } = useQuery<{ applications: Array<{ application: Application }> }>({
    queryKey: ["/api/student/applications"],
    enabled: isStudent,
  });

  const { data: favorites } = useQuery<Favorite[]>({
    queryKey: ["/api/favorites"],
    enabled: isStudent,
  });

  const applications = applicationsData?.applications || [];
  const existingApplication = applications.find(app => app.application.courseId === courseId);
  const isFavorited = favorites?.some(fav => fav.itemType === "course" && fav.itemId === courseId);

  const form = useForm<z.infer<typeof applicationFormSchema>>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      personalStatement: "",
      additionalInfo: "",
    },
  });

  const applicationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof applicationFormSchema>) => {
      if (!profile?.id) {
        throw new Error("Student profile not found");
      }
      return await apiRequest("POST", "/api/applications", {
        courseId: courseId!,
        studentId: profile.id,
        personalStatement: data.personalStatement,
        additionalInfo: data.additionalInfo,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/applications"] });
      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully!",
      });
      setShowApplicationForm(false);
      form.reset();
    },
    onError: (error: any) => {
      // Extract completion payload from 403 errors to guide students
      const completionData = error?.response?.data?.completion;
      const errorMessage = error?.response?.data?.message || error.message;
      
      let description = errorMessage;
      if (completionData && !completionData.isComplete) {
        description = `${errorMessage}\n\nMissing: ${completionData.missingFields.join(", ")}`;
      }
      
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        const favorite = favorites?.find(fav => fav.itemType === "course" && fav.itemId === courseId);
        if (!favorite?.id) {
          throw new Error("Favorite not found");
        }
        return await apiRequest("DELETE", `/api/favorites/${favorite.id}`, {});
      } else {
        return await apiRequest("POST", "/api/favorites", { itemType: "course", itemId: courseId! });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        description: isFavorited ? "Course removed from your favorites" : "Course saved to your favorites!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading course details...</div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Course</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Course not found"}
            </AlertDescription>
          </Alert>
          <Button asChild data-testid="button-back-courses">
            <Link href="/student/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const englishReqs = course.englishRequirementsStructured as EnglishRequirementsStructured | null;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "accepted": return "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20";
      case "rejected": return "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20";
      case "reviewing": return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
      default: return "bg-muted";
    }
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Hero Section - No Duplicates */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-8 relative">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-2 text-sm mb-6" data-testid="breadcrumb">
            <Link href="/student/dashboard" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="breadcrumb-dashboard">
              <Home className="h-4 w-4" />
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/student/courses" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="breadcrumb-courses">
              Courses
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium truncate max-w-md" data-testid="breadcrumb-current">{course.title}</span>
          </nav>

          {/* Course Title and Key Info */}
          <div className="max-w-4xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2" data-testid="text-course-title">
              {course.title}
            </h1>
            {course.courseCode && (
              <p className="text-muted-foreground mb-4" data-testid="text-course-code">
                Course Code: {course.courseCode}
              </p>
            )}

            {/* Feature Badges - Compact Row */}
            <div className="flex flex-wrap gap-2 mb-6">
              {course.duration && (
                <Badge variant="secondary" className="px-3 py-1" data-testid="badge-duration">
                  <Clock className="h-3 w-3 mr-1" />
                  {course.duration}
                </Badge>
              )}
              {course.deliveryMode && (
                <Badge variant="secondary" className="px-3 py-1" data-testid="badge-delivery-mode">
                  <MonitorPlay className="h-3 w-3 mr-1" />
                  {course.deliveryMode === "online" ? "Online" : course.deliveryMode === "on-campus" ? "On-Campus" : "Hybrid"}
                </Badge>
              )}
              {course.university && ((course.university.scholarshipPercentageMin !== null && course.university.scholarshipPercentageMin !== undefined) || 
                (course.university.scholarshipPercentageMax !== null && course.university.scholarshipPercentageMax !== undefined)) && (
                <Badge className="bg-green-600 border-0 text-white px-3 py-1" data-testid="badge-scholarship">
                  <Award className="h-3 w-3 mr-1" />
                  {course.university.scholarshipPercentageMax !== null && course.university.scholarshipPercentageMax !== undefined
                    ? `Up to ${course.university.scholarshipPercentageMax}%`
                    : `${course.university.scholarshipPercentageMin}%`} Scholarship
                </Badge>
              )}
              {course.prPathway && (
                <Badge className="bg-primary border-0 text-white px-3 py-1" data-testid="badge-pr-pathway">
                  <Plane className="h-3 w-3 mr-1" />
                  PR Pathway
                </Badge>
              )}
              {course.internshipAvailable && (
                <Badge variant="secondary" className="px-3 py-1" data-testid="badge-internship">
                  <Briefcase className="h-3 w-3 mr-1" />
                  Internship
                </Badge>
              )}
            </div>

            {/* Hero Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {existingApplication ? (
                <>
                  <div className={`p-3 rounded-lg border flex items-center gap-2 ${getStatusColor(existingApplication.application.status)}`} data-testid="alert-application-status-hero">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium text-sm" data-testid="text-application-status-hero">
                      Application: {getStatusLabel(existingApplication.application.status)}
                    </span>
                  </div>
                  <Button asChild variant="outline" data-testid="button-view-application-hero">
                    <Link href="/student/applications">
                      View Application
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  {user ? (
                    <Button 
                      size="lg"
                      onClick={() => setShowApplicationForm(true)}
                      data-testid="button-apply-now-hero"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Apply Now
                    </Button>
                  ) : (
                    <Button asChild size="lg" data-testid="button-login-to-apply-hero">
                      <Link href="/login">
                        <Send className="h-4 w-4 mr-2" />
                        Login to Apply
                      </Link>
                    </Button>
                  )}
                </>
              )}
              {isStudent && (
                <Button
                  variant={isFavorited ? "default" : "outline"}
                  onClick={() => toggleFavoriteMutation.mutate()}
                  disabled={toggleFavoriteMutation.isPending}
                  data-testid="button-toggle-favorite-hero"
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
                  {isFavorited ? "Saved" : "Save"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Application Form Modal */}
      {showApplicationForm && (
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Submit Your Application</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => applicationMutation.mutate(data))} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="personalStatement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personal Statement *</FormLabel>
                        <FormDescription>
                          Explain why you're interested in this course and how it aligns with your goals
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="I am applying to this course because..."
                            className="min-h-[200px]"
                            data-testid="textarea-personal-statement"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Information</FormLabel>
                        <FormDescription>
                          Any other details you'd like to share (optional)
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Additional qualifications, experience, or information..."
                            className="min-h-[120px]"
                            data-testid="textarea-additional-info"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowApplicationForm(false)}
                      disabled={applicationMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={applicationMutation.isPending}
                      className="flex-1"
                      data-testid="button-submit-application"
                    >
                      {applicationMutation.isPending ? "Submitting..." : "Submit Application"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}

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


            {/* Eligibility Requirements */}
            {course.eligibilityRequirements && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300">
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

            {/* Academic Requirements */}
            {course.minimumAge && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Academic Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Minimum Age</p>
                    <p className="text-lg font-semibold" data-testid="text-minimum-age">{course.minimumAge} years old</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* English Language Requirements */}
            {(englishReqs || course.englishRequirements) && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    English Language Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {englishReqs && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-semibold">Skill</th>
                            {englishReqs.IELTS && (
                              <th className="p-3 text-center font-semibold">IELTS</th>
                            )}
                            {englishReqs.TOEFL && (
                              <th className="p-3 text-center font-semibold">TOEFL</th>
                            )}
                            {englishReqs.PTE && (
                              <th className="p-3 text-center font-semibold">PTE</th>
                            )}
                            {englishReqs.Duolingo && (
                              <th className="p-3 text-center font-semibold">Duolingo</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-3 font-medium">Overall</td>
                            {englishReqs.IELTS && (
                              <td className="p-3 text-center" data-testid="text-ielts-overall">
                                {englishReqs.IELTS.overall || "—"}
                              </td>
                            )}
                            {englishReqs.TOEFL && (
                              <td className="p-3 text-center" data-testid="text-toefl-overall">
                                {englishReqs.TOEFL.overall || "—"}
                              </td>
                            )}
                            {englishReqs.PTE && (
                              <td className="p-3 text-center" data-testid="text-pte-overall">
                                {englishReqs.PTE.overall || "—"}
                              </td>
                            )}
                            {englishReqs.Duolingo && (
                              <td className="p-3 text-center" data-testid="text-duolingo-overall">
                                {englishReqs.Duolingo.overall || "—"}
                              </td>
                            )}
                          </tr>
                          {(englishReqs.IELTS?.min_each_band || 
                            englishReqs.PTE?.listening ||
                            englishReqs.PTE?.reading ||
                            englishReqs.PTE?.writing ||
                            englishReqs.PTE?.speaking) && (
                            <>
                              {englishReqs.IELTS?.min_each_band && (
                                <tr className="border-b bg-muted/20">
                                  <td className="p-3 font-medium">Min Each Band</td>
                                  <td className="p-3 text-center" data-testid="text-ielts-min-band">
                                    {englishReqs.IELTS.min_each_band}
                                  </td>
                                  {englishReqs.TOEFL && <td className="p-3 text-center">—</td>}
                                  {englishReqs.PTE && <td className="p-3 text-center">—</td>}
                                  {englishReqs.Duolingo && <td className="p-3 text-center">—</td>}
                                </tr>
                              )}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {course.englishRequirements && (
                    <div className="space-y-2">
                      {englishReqs && (
                        <p className="text-sm font-semibold text-muted-foreground">Additional Information:</p>
                      )}
                      <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-english-requirements">
                        {course.englishRequirements}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Career Outcomes & Career Path */}
            {((course.careerOutcomes && course.careerOutcomes.length > 0) || course.careerPath) && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300" data-testid="card-career-pathways">
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
                        {course.careerOutcomes.map((career, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1.5" data-testid={`badge-career-${index}`}>
                            <Briefcase className="h-3 w-3 mr-1" />
                            {career}
                          </Badge>
                        ))}
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

            {/* Course Details */}
            {(course.intakes?.length || course.studyAreas?.length || course.campusLocations?.length || course.deliveryMode) && (
              <Card className="border-primary/10 hover-elevate transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Course Details & Logistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  {course.intakes && course.intakes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Available Intakes</h4>
                      <div className="flex flex-wrap gap-2">
                        {course.intakes.map((intake, index) => (
                          <Badge key={index} variant="outline" className="px-3 py-1" data-testid={`badge-intake-${index}`}>
                            <Calendar className="h-3 w-3 mr-1" />
                            {intake}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {course.studyAreas && course.studyAreas.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Study Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {course.studyAreas.map((area, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1" data-testid={`badge-study-area-${index}`}>
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {course.campusLocations && course.campusLocations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Campus Locations</h4>
                      <div className="space-y-2">
                        {course.campusLocations.map((location, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm" data-testid={`text-campus-${index}`}>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{location}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {course.pathways && course.pathways.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Pathway Options</h4>
                      <ul className="space-y-2">
                        {course.pathways.map((pathway, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm" data-testid={`text-pathway-${index}`}>
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{pathway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Unified Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Key Facts & Apply Card */}
              <Card className="border-primary/20">
                <CardContent className="pt-6 space-y-5">
                  {/* Tuition - Primary Info */}
                  {course.fees && (
                    <div className="text-center pb-4 border-b">
                      <p className="text-sm text-muted-foreground mb-1">Annual Tuition</p>
                      <p className="text-2xl font-bold text-primary" data-testid="text-annual-tuition">
                        {course.currency} {Number(course.fees).toLocaleString()}
                      </p>
                      {course.applicationFees !== null && course.applicationFees !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Application Fee: {Number(course.applicationFees) > 0 
                            ? `${course.currency} ${Number(course.applicationFees).toLocaleString()}`
                            : "Waived"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {course.duration && (
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-semibold" data-testid="text-duration">{course.duration}</p>
                      </div>
                    )}
                    {course.startDate && (
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Next Intake</p>
                        <p className="text-sm font-semibold" data-testid="text-next-intake">{course.startDate}</p>
                      </div>
                    )}
                    {course.location && (
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <MapPin className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm font-semibold" data-testid="text-location">{course.location}</p>
                      </div>
                    )}
                    {course.subject && (
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <BookOpen className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Discipline</p>
                        <p className="text-sm font-semibold truncate" data-testid="text-discipline">{course.subject}</p>
                      </div>
                    )}
                  </div>

                  {/* Application Status or Apply Button */}
                  {existingApplication ? (
                    <div className={`p-3 rounded-lg border ${getStatusColor(existingApplication.application.status)}`} data-testid="alert-application-status">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-semibold" data-testid="text-application-status">
                            Status: {getStatusLabel(existingApplication.application.status)}
                          </p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="w-full mt-2" data-testid="button-view-application">
                        <Link href="/student/applications">
                          View Application
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {user ? (
                        <Button 
                          size="lg" 
                          className="w-full"
                          onClick={() => setShowApplicationForm(true)}
                          data-testid="button-apply-now"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Apply Now
                        </Button>
                      ) : (
                        <Button asChild size="lg" className="w-full" data-testid="button-login-to-apply">
                          <Link href="/login">
                            <Send className="h-4 w-4 mr-2" />
                            Login to Apply
                          </Link>
                        </Button>
                      )}
                      {isStudent && (
                        <Button
                          size="sm"
                          variant={isFavorited ? "default" : "outline"}
                          onClick={() => toggleFavoriteMutation.mutate()}
                          disabled={toggleFavoriteMutation.isPending}
                          className="w-full"
                          data-testid="button-toggle-favorite"
                        >
                          <Heart className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
                          {isFavorited ? "Saved to Favorites" : "Save Course"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Institution Card */}
              {course.university && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">OFFERED BY</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-3">
                      {course.university.logo && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted p-1.5 flex items-center justify-center">
                          <img
                            src={course.university.logo}
                            alt={course.university.name}
                            className="w-full h-full object-contain"
                            data-testid="img-university-logo"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm" data-testid="text-university-name">{course.university.name}</p>
                        {course.university.country && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {course.university.country}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Institution Quick Stats */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between py-1.5 border-b">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" /> Type
                        </span>
                        <Badge variant="secondary" className="text-xs">Institution</Badge>
                      </div>
                      {course.university.establishedYear && (
                        <div className="flex items-center justify-between py-1.5 border-b">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" /> Established
                          </span>
                          <span className="font-medium">{course.university.establishedYear}</span>
                        </div>
                      )}
                    </div>

                    <Button variant="outline" size="sm" asChild className="w-full" data-testid="button-view-institution">
                      <Link href={`/institutions/${course.university.id}`}>
                        <Building2 className="mr-2 h-4 w-4" />
                        View Institution Profile
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
