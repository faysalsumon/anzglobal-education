import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Loader2 } from "lucide-react";
import { insertStudentProfileSchema, type InsertStudentProfile, type StudentProfile } from "@shared/schema";
import { z } from "zod";

const formSchema = insertStudentProfileSchema;

export default function StudentProfilePage() {
  const { toast } = useToast();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiField, setAiField] = useState<"bio" | "careerGoals" | null>(null);

  const { data: profile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      bio: profile?.bio || "",
      educationLevel: profile?.educationLevel || "",
      fieldOfStudy: profile?.fieldOfStudy || "",
      country: profile?.country || "",
      careerGoals: profile?.careerGoals || "",
      previousEducation: profile?.previousEducation || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest("POST", "/api/student/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile"] });
      toast({
        title: "Profile updated",
        description: "Your student profile has been saved successfully.",
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

  const generateContent = async (field: "bio" | "careerGoals") => {
    const educationLevel = form.getValues("educationLevel");
    const fieldOfStudy = form.getValues("fieldOfStudy");

    if (!educationLevel && !fieldOfStudy) {
      toast({
        title: "Missing information",
        description: "Please enter your education level or field of study first.",
        variant: "destructive",
      });
      return;
    }

    setAiField(field);
    setAiLoading(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-student-content", {
        field,
        educationLevel,
        fieldOfStudy,
      });
      form.setValue(field, response.content);
      toast({
        title: "Content generated",
        description: `AI has created ${field === "bio" ? "a bio" : "career goals"} for you.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
      setAiField(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Student Profile</h1>
        <p className="text-muted-foreground">Build a compelling profile to stand out to universities</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Education Background</CardTitle>
              <CardDescription>Tell us about your educational journey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Education Level</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="High School / Bachelor's / etc." data-testid="input-education-level" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fieldOfStudy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field of Study</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Computer Science, Business, etc." data-testid="input-field-of-study" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Your current country" data-testid="input-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="previousEducation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previous Education</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Brief description of your previous education..." className="min-h-[100px]" data-testid="textarea-previous-education" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Personal Bio
                  </CardTitle>
                  <CardDescription>Introduce yourself to universities</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateContent("bio")}
                  disabled={aiLoading}
                  data-testid="button-generate-bio"
                >
                  {aiLoading && aiField === "bio" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Write a brief introduction about yourself, your interests, and what drives you..."
                        className="min-h-[150px]"
                        data-testid="textarea-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Career Goals
                  </CardTitle>
                  <CardDescription>Share your aspirations and objectives</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateContent("careerGoals")}
                  disabled={aiLoading}
                  data-testid="button-generate-career-goals"
                >
                  {aiLoading && aiField === "careerGoals" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="careerGoals"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe your career aspirations, what you hope to achieve, and how this education will help..."
                        className="min-h-[150px]"
                        data-testid="textarea-career-goals"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-profile">
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
