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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, DollarSign, Clock, Calendar, ArrowLeft, CheckCircle, AlertCircle, Building2, BookOpen, GraduationCap } from "lucide-react";
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
        studentId: "", // Will be set by backend from auth
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="max-w-5xl mx-auto">
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/student/courses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
          <p className="text-muted-foreground mt-1">{course.university?.name || "Institution"}</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">{course.level}</Badge>
          <Badge variant="outline">{course.subject}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {course.description || "No description available"}
                </p>
              </div>

              {course.prerequisites && (
                <div>
                  <h3 className="font-semibold mb-2">Prerequisites</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{course.prerequisites}</p>
                </div>
              )}
            </CardContent>
          </Card>

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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.fees && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tuition Fees</p>
                    <p className="text-lg font-bold text-primary">
                      {course.currency} {Number(course.fees).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {course.duration && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">{course.duration}</p>
                  </div>
                </div>
              )}

              {course.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {course.location}
                      {course.country && `, ${course.country}`}
                    </p>
                  </div>
                </div>
              )}

              {course.startDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-sm text-muted-foreground">{course.startDate}</p>
                  </div>
                </div>
              )}

              {course.applicationDeadline && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Application Deadline</p>
                    <p className="text-sm text-muted-foreground">{course.applicationDeadline}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {course.university && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  About the University
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
                {course.university.website && (
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a href={course.university.website} target="_blank" rel="noopener noreferrer">
                      Visit Website
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
