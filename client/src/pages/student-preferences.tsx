import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { StudentLayout } from "@/components/student-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Sparkles, Target, BookOpen } from "lucide-react";
import { COUNTRIES, getFlagUrl } from "@/lib/countries";
import { insertStudentProfileSchema, type StudentProfile, type StudentEducation, type StudentLanguageScore, type StudentEmployment } from "@shared/schema";

const DISCIPLINES = [
  "Accounting, Business & Finance",
  "Agriculture & Forestry",
  "Applied Sciences & Professions",
  "Arts, Design & Architecture",
  "Computer Science & IT",
  "Education & Training",
  "Engineering & Technology",
  "Environmental Studies & Earth Sciences",
  "Hospitality, Leisure & Sports",
  "Humanities",
  "Journalism & Media",
  "Law",
  "Medicine & Health",
  "Short Courses",
  "Trade",
];

const COURSE_LEVELS = [
  "Certificate I",
  "Certificate II",
  "Certificate III",
  "Certificate IV",
  "Diploma",
  "Advanced Diploma",
  "Associate Degree",
  "Bachelor Degree",
  "Bachelor Honours Degree",
  "Graduate Certificate",
  "Graduate Diploma",
  "Master Degree (Coursework)",
  "Master Degree (Research)",
  "Doctoral Degree",
];

const STUDY_MODES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "online", label: "Online" },
  { value: "weekday", label: "Weekday Classes" },
  { value: "weekend", label: "Weekend Classes" },
  { value: "evening", label: "Evening Classes" },
];

const INTAKE_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const EDUCATION_LEVELS = [
  "Secondary School (High School)",
  "Certificate / Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctoral Degree (PhD)",
  "Professional Qualification",
];

const preferencesSchema = z.object({
  preferredDiscipline: z.string().optional().nullable(),
  preferredCourseLevel: z.string().optional().nullable(),
  preferredStudyMode: z.string().optional().nullable(),
  preferredIntakes: z.array(z.string()).optional().default([]),
  budgetMin: z.number().optional().nullable(),
  budgetMax: z.number().optional().nullable(),
  prPathwayInterest: z.boolean().optional().default(false),
  destinationCountry: z.string().optional().nullable(),
});

const bioSchema = z.object({
  bio: z.string().optional(),
  careerGoals: z.string().optional(),
  educationLevel: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  previousEducation: z.string().optional(),
});

type ProfileFormData = Partial<StudentProfile>;

function StudentPreferencesContent() {
  const { toast } = useToast();
  const [budgetRange, setBudgetRange] = useState<[number, number]>([5000, 50000]);
  const [selectedIntakes, setSelectedIntakes] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiField, setAiField] = useState<"bio" | "careerGoals" | null>(null);

  const { data: profile } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
  });

  const { data: educations = [] } = useQuery<StudentEducation[]>({
    queryKey: ["/api/student/educations"],
  });

  const { data: languageScores = [] } = useQuery<StudentLanguageScore[]>({
    queryKey: ["/api/student/language-scores"],
  });

  const { data: employments = [] } = useQuery<StudentEmployment[]>({
    queryKey: ["/api/student/employments"],
  });

  const preferencesForm = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferredDiscipline: "",
      preferredCourseLevel: "",
      preferredStudyMode: "",
      preferredIntakes: [],
      budgetMin: 5000,
      budgetMax: 50000,
      prPathwayInterest: false,
      destinationCountry: "Australia",
    },
  });

  const bioForm = useForm<z.infer<typeof bioSchema>>({
    resolver: zodResolver(bioSchema),
    defaultValues: {
      bio: "",
      careerGoals: "",
      educationLevel: "",
      fieldOfStudy: "",
      previousEducation: "",
    },
  });

  useEffect(() => {
    if (profile) {
      preferencesForm.reset({
        preferredDiscipline: profile.preferredDiscipline || "",
        preferredCourseLevel: profile.preferredCourseLevel || "",
        preferredStudyMode: profile.preferredStudyMode || "",
        preferredIntakes: profile.preferredIntakes || [],
        budgetMin: profile.budgetMin ? parseFloat(profile.budgetMin) : 5000,
        budgetMax: profile.budgetMax ? parseFloat(profile.budgetMax) : 50000,
        prPathwayInterest: profile.prPathwayInterest || false,
        destinationCountry: profile.destinationCountry || "Australia",
      });
      setBudgetRange([
        profile.budgetMin ? parseFloat(profile.budgetMin) : 5000,
        profile.budgetMax ? parseFloat(profile.budgetMax) : 50000,
      ]);
      setSelectedIntakes(profile.preferredIntakes || []);

      bioForm.reset({
        bio: profile.bio || "",
        careerGoals: profile.careerGoals || "",
        educationLevel: profile.educationLevel || "",
        fieldOfStudy: profile.fieldOfStudy || "",
        previousEducation: profile.previousEducation || "",
      });
    }
  }, [profile]);

  const savePreferencesMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (profile && profile.id) {
        return await apiRequest("PUT", "/api/student/profile", data);
      } else {
        return await apiRequest("POST", "/api/student/profile", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile/completion"] });
      toast({ title: "Saved", description: "Your preferences have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleIntake = (month: string) => {
    setSelectedIntakes(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const handlePreferencesSubmit = preferencesForm.handleSubmit((data) => {
    savePreferencesMutation.mutate({
      ...data,
      preferredIntakes: selectedIntakes,
      budgetMin: budgetRange[0].toString(),
      budgetMax: budgetRange[1].toString(),
    } as any);
  });

  const handleBioSubmit = bioForm.handleSubmit((data) => {
    savePreferencesMutation.mutate(data);
  });

  const generateContent = async (field: "bio" | "careerGoals") => {
    const personalInfo = {
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      nationality: profile?.nationality,
      preferredStudyDestination: profile?.destinationCountry,
    };
    const educationHistory = educations.map(edu => ({
      level: edu.level,
      institution: edu.institution,
      fieldOfStudy: edu.fieldOfStudy,
      country: edu.country,
      gpa: edu.gpa,
    }));
    const languageTests = languageScores.map(score => ({
      testType: score.testType,
      overallScore: score.overallScore,
    }));
    const employmentHistory = employments.map(emp => ({
      jobTitle: emp.jobTitle,
      company: emp.company,
      industry: emp.industry,
    }));
    const bioFormData = {
      educationLevel: bioForm.getValues("educationLevel"),
      fieldOfStudy: bioForm.getValues("fieldOfStudy"),
      previousEducation: bioForm.getValues("previousEducation"),
    };

    setAiField(field);
    setAiLoading(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-student-content", {
        field,
        personalInfo,
        educationHistory,
        languageTests,
        employmentHistory,
        bioFormData,
      });
      const data = await response.json();
      bioForm.setValue(field, data.content, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      toast({
        title: "Content generated",
        description: `AI has created ${field === "bio" ? "a personalized bio" : "career goals"} based on your profile.`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
      setAiField(null);
    }
  };

  const destinationCountry = preferencesForm.watch("destinationCountry");
  const destinationFlag = destinationCountry
    ? getFlagUrl(COUNTRIES.find(c => c.name === destinationCountry)?.code || "")
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">About Me &amp; Preferences</h1>
        <p className="text-muted-foreground mt-1">
          Help us recommend the right courses and opportunities for you.
        </p>
      </div>

      <Tabs defaultValue="preferences">
        <TabsList className="mb-4">
          <TabsTrigger value="preferences" data-testid="tab-preferences">
            <Target className="h-4 w-4 mr-2" />
            Study Preferences
          </TabsTrigger>
          <TabsTrigger value="bio" data-testid="tab-bio">
            <BookOpen className="h-4 w-4 mr-2" />
            Bio &amp; Career Goals
          </TabsTrigger>
        </TabsList>

        {/* ── Study Preferences Tab ── */}
        <TabsContent value="preferences">
          <Form {...preferencesForm}>
            <form onSubmit={handlePreferencesSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Matching Preferences</CardTitle>
                  <CardDescription>We use these to match you with the best courses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={preferencesForm.control}
                      name="preferredDiscipline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Field of Study</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-pref-discipline">
                                <SelectValue placeholder="What do you want to study?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DISCIPLINES.map((disc) => (
                                <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={preferencesForm.control}
                      name="preferredCourseLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Course Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-pref-course-level">
                                <SelectValue placeholder="Select course level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COURSE_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={preferencesForm.control}
                      name="preferredStudyMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Study Mode</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-pref-study-mode">
                                <SelectValue placeholder="How do you prefer to study?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STUDY_MODES.map((mode) => (
                                <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={preferencesForm.control}
                      name="destinationCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Study Destination</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-pref-destination">
                                <SelectValue>
                                  {field.value ? (
                                    <span className="flex items-center gap-2">
                                      {destinationFlag && (
                                        <img src={destinationFlag} alt="" className="h-4 w-5 object-cover rounded-sm" />
                                      )}
                                      {field.value}
                                    </span>
                                  ) : (
                                    "Where do you want to study?"
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.name}>
                                  <span className="flex items-center gap-2">
                                    <img src={getFlagUrl(country.code)} alt="" className="h-4 w-5 object-cover rounded-sm" />
                                    {country.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormLabel>Preferred Intake Months</FormLabel>
                    <p className="text-sm text-muted-foreground mb-3">When are you planning to start?</p>
                    <div className="flex flex-wrap gap-2">
                      {INTAKE_MONTHS.map((month) => (
                        <Button
                          key={month}
                          type="button"
                          variant={selectedIntakes.includes(month) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleIntake(month)}
                          data-testid={`btn-intake-${month.toLowerCase()}`}
                        >
                          {month}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FormLabel>Budget Range (AUD per year)</FormLabel>
                    <p className="text-sm text-muted-foreground mb-4">
                      ${budgetRange[0].toLocaleString()} — ${budgetRange[1].toLocaleString()} AUD/year
                    </p>
                    <Slider
                      min={0}
                      max={100000}
                      step={1000}
                      value={budgetRange}
                      onValueChange={(val) => {
                        const range: [number, number] = [val[0], val[1]];
                        setBudgetRange(range);
                        preferencesForm.setValue("budgetMin", range[0]);
                        preferencesForm.setValue("budgetMax", range[1]);
                      }}
                      className="w-full"
                      data-testid="slider-budget"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>$0</span>
                      <span>$100,000+</span>
                    </div>
                  </div>

                  <FormField
                    control={preferencesForm.control}
                    name="prPathwayInterest"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Interested in PR Pathway?</FormLabel>
                          <FormDescription>
                            Show courses that may lead to permanent residency
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-pr-interest"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={savePreferencesMutation.isPending} data-testid="button-save-preferences">
                  {savePreferencesMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* ── Bio & Career Goals Tab ── */}
        <TabsContent value="bio">
          <Form {...bioForm}>
            <form onSubmit={handleBioSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
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
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="mr-2 h-4 w-4" />Generate with AI</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={bioForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Write a short introduction about yourself — your background, interests, and why you want to study abroad..."
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
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent" />
                        Career Goals
                      </CardTitle>
                      <CardDescription>What do you want to achieve with this education?</CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generateContent("careerGoals")}
                      disabled={aiLoading}
                      data-testid="button-generate-career-goals"
                    >
                      {aiLoading && aiField === "careerGoals" ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="mr-2 h-4 w-4" />Generate with AI</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={bioForm.control}
                    name="careerGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
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

              <Card>
                <CardHeader>
                  <CardTitle>Background Information</CardTitle>
                  <CardDescription>Helps our AI generate more personalised content for you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={bioForm.control}
                    name="educationLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Highest Education Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-education-level">
                              <SelectValue placeholder="Select your highest qualification" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EDUCATION_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={bioForm.control}
                    name="fieldOfStudy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field of Study</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Computer Science, Business, Medicine"
                            data-testid="input-field-of-study"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={bioForm.control}
                    name="previousEducation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous Education Details</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Briefly describe your previous education..."
                            className="min-h-[100px]"
                            data-testid="textarea-previous-education"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={savePreferencesMutation.isPending} data-testid="button-save-bio">
                  {savePreferencesMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    "Save Bio & Career Goals"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StudentPreferences() {
  return (
    <StudentLayout breadcrumbTitle="About Me & Preferences">
      <StudentPreferencesContent />
    </StudentLayout>
  );
}
