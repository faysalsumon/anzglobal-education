import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Users,
  Languages,
  Laptop,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";
import { insertApplicationSchema, type Course, type University } from "@shared/schema";
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

  const getInstitutionLabel = (providerType?: string | null) => {
    if (!providerType) return "Institution";
    const type = providerType.toLowerCase();
    if (type.includes("university")) return "University";
    return "Institution";
  };

  const { data: course, isLoading, isError, error } = useQuery<CourseWithUniversity>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
  });

  const form = useForm<z.infer<typeof applicationFormSchema>>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      personalStatement: "",
      additionalInfo: "",
    },
  });

  const applicationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof applicationFormSchema>) => {
      return await apiRequest("POST", "/api/applications", {
        courseId: courseId!,
        studentId: "",
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
      navigate("/student/applications");
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="max-w-7xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Course</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Course not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const englishReqs = course.englishRequirementsStructured as {
    ielts?: { overall?: number; listening?: number; reading?: number; writing?: number; speaking?: number };
    toefl?: { overall?: number; listening?: number; reading?: number; writing?: number; speaking?: number };
    pte?: { overall?: number; listening?: number; reading?: number; writing?: number; speaking?: number };
    duolingo?: { overall?: number };
  } | null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/student/courses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="text-course-title">
            {course.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-lg text-muted-foreground" data-testid="text-university-name">
              {course.university?.name || "Institution"}
            </p>
            {course.location && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{course.location}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20" data-testid="badge-level">
              {course.level}
            </Badge>
            <Badge variant="outline" data-testid="badge-subject">{course.subject}</Badge>
            {course.deliveryMode && (
              <Badge variant="outline" data-testid="badge-delivery-mode">
                <Laptop className="h-3 w-3 mr-1" />
                {course.deliveryMode.charAt(0).toUpperCase() + course.deliveryMode.slice(1)}
              </Badge>
            )}
            {course.workRights && (
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300" data-testid="badge-work-rights">
                <Briefcase className="h-3 w-3 mr-1" />
                Work Rights Available
              </Badge>
            )}
            {course.internshipAvailable && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300" data-testid="badge-internship">
                <Award className="h-3 w-3 mr-1" />
                Internship Available
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-list">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="requirements" data-testid="tab-requirements">Requirements</TabsTrigger>
          <TabsTrigger value="outcomes" data-testid="tab-outcomes">Career & Pathways</TabsTrigger>
          <TabsTrigger value="apply" data-testid="tab-apply">Apply</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Course Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-description">
                      {course.description || "No description available"}
                    </p>
                  </div>

                  {course.prerequisites && (
                    <div>
                      <h3 className="font-semibold mb-2">Prerequisites</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-prerequisites">
                        {course.prerequisites}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Study Areas */}
              {course.studyAreas && course.studyAreas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Study Areas
                    </CardTitle>
                    <CardDescription>Topics and subjects covered in this course</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {course.studyAreas.map((area, idx) => (
                        <Badge key={idx} variant="outline" data-testid={`badge-study-area-${idx}`}>
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Internship Details */}
              {course.internshipAvailable && course.internshipDetails && (
                <Card className="bg-blue-500/5 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Award className="h-5 w-5" />
                      Internship Program
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-internship-details">
                      {course.internshipDetails}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Key Details */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.fees && (
                    <>
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Tuition Fees</p>
                          <p className="text-lg font-bold text-primary" data-testid="text-fees">
                            {course.currency} {Number(course.fees).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {course.durationWeeks && (
                    <>
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Duration</p>
                          <p className="text-sm text-muted-foreground" data-testid="text-duration-weeks">
                            {course.durationWeeks} weeks
                            {course.duration && ` (${course.duration})`}
                          </p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {course.intakes && course.intakes.length > 0 && (
                    <>
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-2">Available Intakes</p>
                          <div className="flex flex-wrap gap-1">
                            {course.intakes.map((intake, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs" data-testid={`badge-intake-${idx}`}>
                                {intake}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {course.campusLocations && course.campusLocations.length > 0 && (
                    <>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-2">Campus Locations</p>
                          <div className="space-y-1">
                            {course.campusLocations.map((location, idx) => (
                              <p key={idx} className="text-sm text-muted-foreground" data-testid={`text-campus-${idx}`}>
                                • {location}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {course.minimumAge && (
                    <>
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Minimum Age</p>
                          <p className="text-sm text-muted-foreground" data-testid="text-minimum-age">
                            {course.minimumAge} years
                          </p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {course.startDate && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Start Date</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-start-date">
                          {course.startDate}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Institution Card */}
              {course.university && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      About the {getInstitutionLabel(course.university.providerType)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-semibold">{course.university.name}</p>
                      {course.university.location && (
                        <p className="text-sm text-muted-foreground">
                          {course.university.location}, {course.university.country}
                        </p>
                      )}
                    </div>
                    {course.university.description && (
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        {course.university.description}
                      </p>
                    )}
                    <Button variant="outline" size="sm" asChild className="w-full" data-testid="button-view-institution">
                      <Link href={`/institutions/${course.university.id}`}>
                        <Building2 className="mr-2 h-4 w-4" />
                        View {getInstitutionLabel(course.university.providerType)}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Academic Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {course.academicRequirements ? (
                  <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-academic-requirements">
                    {course.academicRequirements}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No specific academic requirements listed. Please contact the institution for details.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* English Language Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  English Language Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.englishRequirements && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground" data-testid="text-english-requirements">
                      {course.englishRequirements}
                    </p>
                  </div>
                )}

                {englishReqs && (
                  <div className="space-y-3">
                    {englishReqs.ielts && (
                      <div className="border rounded-md p-3">
                        <p className="font-semibold text-sm mb-2">IELTS</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {englishReqs.ielts.overall && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Overall:</span>
                              <span className="font-medium" data-testid="text-ielts-overall">{englishReqs.ielts.overall}</span>
                            </div>
                          )}
                          {englishReqs.ielts.listening && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Listening:</span>
                              <span className="font-medium">{englishReqs.ielts.listening}</span>
                            </div>
                          )}
                          {englishReqs.ielts.reading && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reading:</span>
                              <span className="font-medium">{englishReqs.ielts.reading}</span>
                            </div>
                          )}
                          {englishReqs.ielts.writing && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Writing:</span>
                              <span className="font-medium">{englishReqs.ielts.writing}</span>
                            </div>
                          )}
                          {englishReqs.ielts.speaking && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Speaking:</span>
                              <span className="font-medium">{englishReqs.ielts.speaking}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {englishReqs.toefl && (
                      <div className="border rounded-md p-3">
                        <p className="font-semibold text-sm mb-2">TOEFL</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {englishReqs.toefl.overall && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Overall:</span>
                              <span className="font-medium" data-testid="text-toefl-overall">{englishReqs.toefl.overall}</span>
                            </div>
                          )}
                          {englishReqs.toefl.listening && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Listening:</span>
                              <span className="font-medium">{englishReqs.toefl.listening}</span>
                            </div>
                          )}
                          {englishReqs.toefl.reading && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reading:</span>
                              <span className="font-medium">{englishReqs.toefl.reading}</span>
                            </div>
                          )}
                          {englishReqs.toefl.writing && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Writing:</span>
                              <span className="font-medium">{englishReqs.toefl.writing}</span>
                            </div>
                          )}
                          {englishReqs.toefl.speaking && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Speaking:</span>
                              <span className="font-medium">{englishReqs.toefl.speaking}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {englishReqs.pte && (
                      <div className="border rounded-md p-3">
                        <p className="font-semibold text-sm mb-2">PTE Academic</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {englishReqs.pte.overall && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Overall:</span>
                              <span className="font-medium" data-testid="text-pte-overall">{englishReqs.pte.overall}</span>
                            </div>
                          )}
                          {englishReqs.pte.listening && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Listening:</span>
                              <span className="font-medium">{englishReqs.pte.listening}</span>
                            </div>
                          )}
                          {englishReqs.pte.reading && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reading:</span>
                              <span className="font-medium">{englishReqs.pte.reading}</span>
                            </div>
                          )}
                          {englishReqs.pte.writing && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Writing:</span>
                              <span className="font-medium">{englishReqs.pte.writing}</span>
                            </div>
                          )}
                          {englishReqs.pte.speaking && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Speaking:</span>
                              <span className="font-medium">{englishReqs.pte.speaking}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {englishReqs.duolingo && englishReqs.duolingo.overall && (
                      <div className="border rounded-md p-3">
                        <p className="font-semibold text-sm mb-2">Duolingo English Test</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Overall:</span>
                          <span className="font-medium" data-testid="text-duolingo-overall">{englishReqs.duolingo.overall}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!course.englishRequirements && !englishReqs && (
                  <p className="text-sm text-muted-foreground">
                    No specific English requirements listed. Please contact the institution for details.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Career & Pathways Tab */}
        <TabsContent value="outcomes" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Career Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Career Outcomes
                </CardTitle>
                <CardDescription>
                  Potential career paths after completing this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                {course.careerOutcomes && course.careerOutcomes.length > 0 ? (
                  <ul className="space-y-2">
                    {course.careerOutcomes.map((outcome, idx) => (
                      <li key={idx} className="flex items-start gap-2" data-testid={`text-career-outcome-${idx}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Career outcomes information not available. Please contact the institution for details.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Pathways */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Pathway Options
                </CardTitle>
                <CardDescription>
                  Continue your education journey with these pathways
                </CardDescription>
              </CardHeader>
              <CardContent>
                {course.pathways && course.pathways.length > 0 ? (
                  <ul className="space-y-2">
                    {course.pathways.map((pathway, idx) => (
                      <li key={idx} className="flex items-start gap-2" data-testid={`text-pathway-${idx}`}>
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{pathway}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Pathway information not available. Please contact the institution for details.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Apply Tab */}
        <TabsContent value="apply" className="space-y-6">
          {!isStudent && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Student Login Required</AlertTitle>
              <AlertDescription>
                You need to be logged in as a student to apply to this course.
              </AlertDescription>
            </Alert>
          )}

          {isStudent && !showApplicationForm && (
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Ready to Apply?
                </CardTitle>
                <CardDescription>
                  Take the next step in your educational journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setShowApplicationForm(true)}
                  data-testid="button-apply"
                >
                  Apply to This Course
                </Button>
              </CardContent>
            </Card>
          )}

          {isStudent && showApplicationForm && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Your Application</CardTitle>
                <CardDescription>
                  Complete the form below to apply to this course
                </CardDescription>
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
