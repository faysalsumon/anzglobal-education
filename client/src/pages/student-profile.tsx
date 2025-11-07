import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, User, GraduationCap, Languages, Plus, Pencil, Trash2, Home } from "lucide-react";
import { insertStudentProfileSchema, insertStudentEducationSchema, type StudentProfile, type StudentEducation } from "@shared/schema";
import { z } from "zod";

const personalDetailsSchema = insertStudentProfileSchema.pick({
  firstName: true,
  lastName: true,
  phone: true,
  dateOfBirth: true,
  nationality: true,
  country: true,
  profileImageUrl: true,
}).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(1, "Nationality is required"),
  country: z.string().min(1, "Country is required"),
});

const bioSchema = z.object({
  bio: z.string().optional(),
  careerGoals: z.string().optional(),
  educationLevel: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  previousEducation: z.string().optional(),
});

const educationFormSchema = z.object({
  level: z.string().min(1, "Education level is required"),
  institution: z.string().min(1, "Institution is required"),
  fieldOfStudy: z.string().min(1, "Field of study is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  documentsUrl: z.string().optional(),
});

interface ProfileCompletionResult {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
  completedSections: {
    personalInfo: boolean;
    education: boolean;
    languageTest: boolean;
  };
}

export default function StudentProfilePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("personal");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiField, setAiField] = useState<"bio" | "careerGoals" | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
  });

  const { data: completion, isLoading: completionLoading } = useQuery<ProfileCompletionResult>({
    queryKey: ["/api/student/profile/completion"],
  });

  const { data: educations = [] } = useQuery<any[]>({
    queryKey: ["/api/student/educations"],
  });

  const { data: languageScores = [] } = useQuery<any[]>({
    queryKey: ["/api/student/language-scores"],
  });

  const personalForm = useForm<z.infer<typeof personalDetailsSchema>>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      dateOfBirth: "",
      nationality: "",
      country: "",
      profileImageUrl: "",
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
      personalForm.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        nationality: profile.nationality || "",
        country: profile.country || "",
        profileImageUrl: profile.profileImageUrl || "",
      });
      bioForm.reset({
        bio: profile.bio || "",
        careerGoals: profile.careerGoals || "",
        educationLevel: profile.educationLevel || "",
        fieldOfStudy: profile.fieldOfStudy || "",
        previousEducation: profile.previousEducation || "",
      });
    }
  }, [profile]);

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: Partial<StudentProfile>) => {
      if (profile) {
        return await apiRequest("PUT", "/api/student/profile", data);
      } else {
        const payload = {
          ...data,
          bio: data.bio || "",
          careerGoals: data.careerGoals || "",
          educationLevel: data.educationLevel || "",
          fieldOfStudy: data.fieldOfStudy || "",
          previousEducation: data.previousEducation || "",
        };
        return await apiRequest("POST", "/api/student/profile", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile/completion"] });
      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully.",
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setPhotoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return null;
    
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const response = await fetch('/api/student/upload-profile-photo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }
      
      const data = await response.json();
      return data.photoPath;
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile photo. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const generateContent = async (field: "bio" | "careerGoals") => {
    const educationLevel = bioForm.getValues("educationLevel");
    const fieldOfStudy = bioForm.getValues("fieldOfStudy");

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
      const response: any = await apiRequest("POST", "/api/ai/generate-student-content", {
        field,
        educationLevel,
        fieldOfStudy,
      });
      bioForm.setValue(field, response.content);
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

  const handlePersonalSubmit = personalForm.handleSubmit(
    async (data) => {
      let photoPath = data.profileImageUrl;
      
      // Upload photo if a new one was selected
      if (photoFile) {
        const uploadedPath = await uploadPhoto();
        if (uploadedPath) {
          photoPath = uploadedPath;
        } else {
          // Photo upload failed, don't proceed
          return;
        }
      }
      
      createOrUpdateMutation.mutate({
        ...data,
        profileImageUrl: photoPath,
      });
      
      // Clear photo selection after successful save
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    (errors) => {
      console.error("Validation errors:", errors);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
    }
  );

  const handleBioSubmit = bioForm.handleSubmit((data) => {
    createOrUpdateMutation.mutate(data);
  });

  const isLoading = profileLoading || completionLoading;

  return (
    <div className="max-w-4xl space-y-6">
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
            <BreadcrumbPage data-testid="breadcrumb-current">Profile</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-profile">
          Complete Your Profile
        </h1>
        <p className="text-muted-foreground">
          You must complete 100% of your profile before applying to courses
        </p>
      </div>

      {!isLoading && completion && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Profile Completion</CardTitle>
              <Badge variant={completion.isComplete ? "default" : "secondary"} data-testid="badge-completion-status">
                {completion.percentage}% Complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completion.percentage} className="h-2" data-testid="progress-completion" />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-2">
                {completion.completedSections.personalInfo ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-personal-complete" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" data-testid="icon-personal-incomplete" />
                )}
                <span className="text-sm">Personal Info</span>
              </div>
              <div className="flex items-center gap-2">
                {completion.completedSections.education ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-education-complete" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" data-testid="icon-education-incomplete" />
                )}
                <span className="text-sm">Education History</span>
              </div>
              <div className="flex items-center gap-2">
                {completion.completedSections.languageTest ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-language-complete" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" data-testid="icon-language-incomplete" />
                )}
                <span className="text-sm">Language Test</span>
              </div>
            </div>
            {completion.missingFields.length > 0 && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                  Missing Requirements:
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 list-disc list-inside space-y-1">
                  {completion.missingFields.map((field, index) => (
                    <li key={index} data-testid={`missing-field-${index}`}>{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-profile-sections">
          <TabsTrigger value="personal" data-testid="tab-personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="education" data-testid="tab-education" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Education</span>
          </TabsTrigger>
          <TabsTrigger value="language" data-testid="tab-language" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            <span className="hidden sm:inline">Language</span>
          </TabsTrigger>
          <TabsTrigger value="bio" data-testid="tab-bio" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Bio</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Form {...personalForm}>
            <form onSubmit={handlePersonalSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Details</CardTitle>
                  <CardDescription>Required information for your student profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={personalForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="John" data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={personalForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Doe" data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={personalForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} type="tel" placeholder="+1 234 567 8900" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={personalForm.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} type="date" data-testid="input-date-of-birth" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={personalForm.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationality *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="e.g., Australian" data-testid="input-nationality" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={personalForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country of Residence *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="e.g., Australia" data-testid="input-country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Profile Photo (Optional)</FormLabel>
                    <div className="flex items-start gap-4">
                      {(photoPreview || profile?.profileImageUrl) && (
                        <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
                          <img
                            src={photoPreview || profile?.profileImageUrl || ''}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          disabled={uploadingPhoto || createOrUpdateMutation.isPending}
                          data-testid="input-profile-photo"
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload a photo (max 5MB). Recommended: square image, at least 200x200px
                        </p>
                        {uploadingPhoto && (
                          <p className="text-xs text-primary flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading photo...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button
                  type="submit"
                  disabled={createOrUpdateMutation.isPending}
                  data-testid="button-save-personal"
                >
                  {createOrUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Personal Details"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle>Education History</CardTitle>
              <CardDescription>Add your educational qualifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">Education management coming soon (Task 12)</p>
                <p className="text-sm">
                  {educations.length > 0
                    ? `You have ${educations.length} education record(s)`
                    : "No education records yet"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle>Language Test Scores</CardTitle>
              <CardDescription>Add IELTS, TOEFL, or PTE scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">Language score management coming soon (Task 13)</p>
                <p className="text-sm">
                  {languageScores.length > 0
                    ? `You have ${languageScores.length} language test score(s)`
                    : "No language test scores yet"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bio">
          <Form {...bioForm}>
            <form onSubmit={handleBioSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Education Background</CardTitle>
                  <CardDescription>Optional information about your studies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={bioForm.control}
                      name="educationLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Education Level</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="High School / Bachelor's / etc." data-testid="input-education-level" />
                          </FormControl>
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
                            <Input {...field} value={field.value || ""} placeholder="Computer Science, Business, etc." data-testid="input-field-of-study" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={bioForm.control}
                    name="previousEducation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous Education</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} placeholder="Brief description of your previous education..." className="min-h-[100px]" data-testid="textarea-previous-education" />
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
                    control={bioForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
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

              <div className="flex justify-end gap-3">
                <Button
                  type="submit"
                  disabled={createOrUpdateMutation.isPending}
                  data-testid="button-save-bio"
                >
                  {createOrUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
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
