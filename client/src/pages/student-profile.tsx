import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Sparkles, Loader2, CheckCircle2, AlertCircle, User, GraduationCap, Languages, Plus, Pencil, Trash2, Home, Heart, MapPin, Eye } from "lucide-react";
import { insertStudentProfileSchema, insertStudentEducationSchema, insertStudentLanguageScoreSchema, type StudentProfile, type StudentEducation, type StudentLanguageScore, type Favorite, type University, type Course } from "@shared/schema";
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
  fieldOfStudy: z.string().optional(),
  country: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrentlyStudying: z.boolean().default(false),
  gpa: z.string().optional(),
  gradeScale: z.string().optional(),
});

const languageScoreFormSchema = z.object({
  testType: z.string().min(1, "Test type is required"),
  overallScore: z.string().min(1, "Overall score is required").refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Overall score must be a valid number" }
  ),
  listeningScore: z.string().optional().refine(
    (val) => {
      if (!val || val === "") return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Listening score must be a valid number" }
  ),
  readingScore: z.string().optional().refine(
    (val) => {
      if (!val || val === "") return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Reading score must be a valid number" }
  ),
  writingScore: z.string().optional().refine(
    (val) => {
      if (!val || val === "") return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Writing score must be a valid number" }
  ),
  speakingScore: z.string().optional().refine(
    (val) => {
      if (!val || val === "") return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Speaking score must be a valid number" }
  ),
  testDate: z.string().optional(),
  expiryDate: z.string().optional(),
}).superRefine((data, ctx) => {
  const testType = data.testType.toLowerCase();
  const overallScore = parseFloat(data.overallScore);
  
  // Validate score ranges based on test type
  if (testType === "ielts") {
    if (overallScore < 0 || overallScore > 9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IELTS overall score must be between 0 and 9",
        path: ["overallScore"],
      });
    }
    const validateIELTSScore = (score: string | undefined, field: string) => {
      if (score && score !== "") {
        const num = parseFloat(score);
        if (num < 0 || num > 9) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `IELTS ${field} score must be between 0 and 9`,
            path: [field],
          });
        }
      }
    };
    validateIELTSScore(data.listeningScore, "listeningScore");
    validateIELTSScore(data.readingScore, "readingScore");
    validateIELTSScore(data.writingScore, "writingScore");
    validateIELTSScore(data.speakingScore, "speakingScore");
  } else if (testType === "toefl") {
    if (overallScore < 0 || overallScore > 120) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "TOEFL overall score must be between 0 and 120",
        path: ["overallScore"],
      });
    }
    const validateTOEFLScore = (score: string | undefined, field: string) => {
      if (score && score !== "") {
        const num = parseFloat(score);
        if (num < 0 || num > 30) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `TOEFL ${field} score must be between 0 and 30`,
            path: [field],
          });
        }
      }
    };
    validateTOEFLScore(data.listeningScore, "listeningScore");
    validateTOEFLScore(data.readingScore, "readingScore");
    validateTOEFLScore(data.writingScore, "writingScore");
    validateTOEFLScore(data.speakingScore, "speakingScore");
  } else if (testType === "pte") {
    if (overallScore < 10 || overallScore > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PTE overall score must be between 10 and 90",
        path: ["overallScore"],
      });
    }
    const validatePTEScore = (score: string | undefined, field: string) => {
      if (score && score !== "") {
        const num = parseFloat(score);
        if (num < 10 || num > 90) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `PTE ${field} score must be between 10 and 90`,
            path: [field],
          });
        }
      }
    };
    validatePTEScore(data.listeningScore, "listeningScore");
    validatePTEScore(data.readingScore, "readingScore");
    validatePTEScore(data.writingScore, "writingScore");
    validatePTEScore(data.speakingScore, "speakingScore");
  } else if (testType === "duolingo") {
    if (overallScore < 10 || overallScore > 160) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duolingo overall score must be between 10 and 160",
        path: ["overallScore"],
      });
    }
    const validateDuolingoScore = (score: string | undefined, field: string) => {
      if (score && score !== "") {
        const num = parseFloat(score);
        if (num < 10 || num > 160) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duolingo ${field} score must be between 10 and 160`,
            path: [field],
          });
        }
      }
    };
    validateDuolingoScore(data.listeningScore, "listeningScore");
    validateDuolingoScore(data.readingScore, "readingScore");
    validateDuolingoScore(data.writingScore, "writingScore");
    validateDuolingoScore(data.speakingScore, "speakingScore");
  }
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
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || "personal";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiField, setAiField] = useState<"bio" | "careerGoals" | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [educationDialogOpen, setEducationDialogOpen] = useState(false);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<StudentEducation | null>(null);
  const [editingLanguageScore, setEditingLanguageScore] = useState<StudentLanguageScore | null>(null);

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

  const { data: favorites = [] } = useQuery<Favorite[]>({
    queryKey: ["/api/student/favorites"],
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      return await apiRequest("DELETE", `/api/student/favorites/${favoriteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/favorites"] });
      toast({
        title: "Success",
        description: "Removed from favorites",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    },
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

  const educationForm = useForm<z.infer<typeof educationFormSchema>>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: {
      level: "",
      institution: "",
      fieldOfStudy: "",
      country: "",
      startDate: "",
      endDate: "",
      isCurrentlyStudying: false,
      gpa: "",
      gradeScale: "",
    },
  });

  const languageScoreForm = useForm<z.infer<typeof languageScoreFormSchema>>({
    resolver: zodResolver(languageScoreFormSchema),
    defaultValues: {
      testType: "",
      overallScore: "",
      listeningScore: "",
      readingScore: "",
      writingScore: "",
      speakingScore: "",
      testDate: "",
      expiryDate: "",
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

  const createEducationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof educationFormSchema>) => {
      if (editingEducation) {
        return await apiRequest("PUT", `/api/student/educations/${editingEducation.id}`, data);
      }
      return await apiRequest("POST", "/api/student/educations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/educations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile/completion"] });
      setEducationDialogOpen(false);
      setEditingEducation(null);
      educationForm.reset();
      toast({
        title: "Success",
        description: editingEducation ? "Education updated" : "Education added",
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

  const deleteEducationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/student/educations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/educations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile/completion"] });
      toast({
        title: "Success",
        description: "Education deleted",
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

  const createLanguageScoreMutation = useMutation({
    mutationFn: async (data: z.infer<typeof languageScoreFormSchema>) => {
      if (editingLanguageScore) {
        return await apiRequest("PUT", `/api/student/language-scores/${editingLanguageScore.id}`, data);
      }
      return await apiRequest("POST", "/api/student/language-scores", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/language-scores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile/completion"] });
      setLanguageDialogOpen(false);
      setEditingLanguageScore(null);
      languageScoreForm.reset();
      toast({
        title: "Success",
        description: editingLanguageScore ? "Language score updated" : "Language score added",
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

  const deleteLanguageScoreMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/student/language-scores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/language-scores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile/completion"] });
      toast({
        title: "Success",
        description: "Language score deleted",
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

  const handleEducationSubmit = educationForm.handleSubmit((data) => {
    createEducationMutation.mutate(data);
  });

  const handleEditEducation = (education: StudentEducation) => {
    setEditingEducation(education);
    educationForm.reset({
      level: education.level || "",
      institution: education.institution || "",
      fieldOfStudy: education.fieldOfStudy || "",
      country: education.country || "",
      startDate: education.startDate || "",
      endDate: education.endDate || "",
      isCurrentlyStudying: education.isCurrentlyStudying || false,
      gpa: education.gpa || "",
      gradeScale: education.gradeScale || "",
    });
    setEducationDialogOpen(true);
  };

  const handleAddEducation = () => {
    setEditingEducation(null);
    educationForm.reset();
    setEducationDialogOpen(true);
  };

  const handleLanguageScoreSubmit = languageScoreForm.handleSubmit((data) => {
    createLanguageScoreMutation.mutate(data);
  });

  const handleEditLanguageScore = (score: StudentLanguageScore) => {
    setEditingLanguageScore(score);
    languageScoreForm.reset({
      testType: score.testType || "",
      overallScore: score.overallScore || "",
      listeningScore: score.listeningScore || "",
      readingScore: score.readingScore || "",
      writingScore: score.writingScore || "",
      speakingScore: score.speakingScore || "",
      testDate: score.testDate || "",
      expiryDate: score.expiryDate || "",
    });
    setLanguageDialogOpen(true);
  };

  const handleAddLanguageScore = () => {
    setEditingLanguageScore(null);
    languageScoreForm.reset();
    setLanguageDialogOpen(true);
  };

  const handlePersonalSubmit = personalForm.handleSubmit(
    async (data) => {
      let photoPath = data.profileImageUrl;
      
      // Only upload photo if profile exists and a new photo was selected
      if (photoFile && profile) {
        const uploadedPath = await uploadPhoto();
        if (uploadedPath) {
          photoPath = uploadedPath;
        } else {
          // Photo upload failed, don't proceed
          return;
        }
      }
      
      // If no profile exists yet and photo was selected, save data first then upload photo
      if (photoFile && !profile) {
        // Save profile data first
        try {
          await createOrUpdateMutation.mutateAsync(data);
          // Profile created, now upload photo
          const uploadedPath = await uploadPhoto();
          if (uploadedPath) {
            // Update profile with photo
            await createOrUpdateMutation.mutateAsync({ profileImageUrl: uploadedPath });
          }
          setPhotoFile(null);
          setPhotoPreview(null);
          return;
        } catch (error) {
          // Error already handled by mutation
          return;
        }
      }
      
      // Normal save (no photo or photo already uploaded)
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
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-profile-sections">
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
          <TabsTrigger value="favorites" data-testid="tab-favorites" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Favorites</span>
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
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Education History</CardTitle>
                <CardDescription>Add your educational qualifications</CardDescription>
              </div>
              <Dialog open={educationDialogOpen} onOpenChange={setEducationDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddEducation} data-testid="button-add-education">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Education
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingEducation ? "Edit Education" : "Add Education"}</DialogTitle>
                    <DialogDescription>
                      {editingEducation ? "Update your education details" : "Add a new education qualification"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...educationForm}>
                    <form onSubmit={handleEducationSubmit} className="space-y-4">
                      <FormField
                        control={educationForm.control}
                        name="level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Education Level *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-education-level">
                                  <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="high_school">High School</SelectItem>
                                <SelectItem value="diploma">Diploma</SelectItem>
                                <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                                <SelectItem value="master">Master's Degree</SelectItem>
                                <SelectItem value="phd">PhD</SelectItem>
                                <SelectItem value="certificate">Certificate</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={educationForm.control}
                        name="institution"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Institution *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="University/School name" data-testid="input-education-institution" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={educationForm.control}
                          name="fieldOfStudy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field of Study</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., Computer Science" data-testid="input-education-field" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={educationForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., Australia" data-testid="input-education-country" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={educationForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} type="date" data-testid="input-education-start-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={educationForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} type="date" data-testid="input-education-end-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={educationForm.control}
                        name="isCurrentlyStudying"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-currently-studying"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>I am currently studying here</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={educationForm.control}
                          name="gpa"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GPA/Grade</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., 3.8" data-testid="input-education-gpa" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={educationForm.control}
                          name="gradeScale"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Grade Scale</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., 4.0, 100" data-testid="input-education-grade-scale" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEducationDialogOpen(false)}
                          data-testid="button-cancel-education"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createEducationMutation.isPending}
                          data-testid="button-save-education"
                        >
                          {createEducationMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Education"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {educations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <GraduationCap className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No education records yet</p>
                  <p className="text-sm mb-4">Add your educational qualifications to complete your profile</p>
                  <Button onClick={handleAddEducation} data-testid="button-add-education-empty">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Education
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Field of Study</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {educations.map((edu: StudentEducation) => (
                      <TableRow key={edu.id} data-testid={`row-education-${edu.id}`}>
                        <TableCell data-testid={`text-education-level-${edu.id}`}>
                          <Badge variant="secondary">
                            {edu.level === "high_school" ? "High School" : edu.level === "bachelor" ? "Bachelor's" : edu.level === "master" ? "Master's" : edu.level === "phd" ? "PhD" : edu.level === "diploma" ? "Diploma" : "Certificate"}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-education-institution-${edu.id}`}>{edu.institution}</TableCell>
                        <TableCell data-testid={`text-education-field-${edu.id}`}>{edu.fieldOfStudy || "-"}</TableCell>
                        <TableCell data-testid={`text-education-dates-${edu.id}`}>
                          {edu.startDate || "N/A"} - {edu.isCurrentlyStudying ? "Present" : edu.endDate || "N/A"}
                        </TableCell>
                        <TableCell data-testid={`text-education-gpa-${edu.id}`}>
                          {edu.gpa ? `${edu.gpa}${edu.gradeScale ? `/${edu.gradeScale}` : ""}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEducation(edu)}
                              data-testid={`button-edit-education-${edu.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this education record?")) {
                                  deleteEducationMutation.mutate(edu.id);
                                }
                              }}
                              disabled={deleteEducationMutation.isPending}
                              data-testid={`button-delete-education-${edu.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Language Test Scores</CardTitle>
                <CardDescription>Add IELTS, TOEFL, PTE, or Duolingo scores</CardDescription>
              </div>
              <Dialog open={languageDialogOpen} onOpenChange={setLanguageDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddLanguageScore} data-testid="button-add-language-score">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Score
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingLanguageScore ? "Edit Language Score" : "Add Language Score"}</DialogTitle>
                    <DialogDescription>
                      {editingLanguageScore ? "Update your test score details" : "Add a new language test score"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...languageScoreForm}>
                    <form onSubmit={handleLanguageScoreSubmit} className="space-y-4">
                      <FormField
                        control={languageScoreForm.control}
                        name="testType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-language-test-type">
                                  <SelectValue placeholder="Select test type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ielts">IELTS (0-9)</SelectItem>
                                <SelectItem value="toefl">TOEFL (0-120)</SelectItem>
                                <SelectItem value="pte">PTE Academic (10-90)</SelectItem>
                                <SelectItem value="duolingo">Duolingo English Test (10-160)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={languageScoreForm.control}
                        name="overallScore"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Overall Score *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 7.5" data-testid="input-language-overall-score" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={languageScoreForm.control}
                          name="listeningScore"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Listening Score</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., 8.0" data-testid="input-language-listening" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={languageScoreForm.control}
                          name="readingScore"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reading Score</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., 7.5" data-testid="input-language-reading" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={languageScoreForm.control}
                          name="writingScore"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Writing Score</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., 7.0" data-testid="input-language-writing" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={languageScoreForm.control}
                          name="speakingScore"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Speaking Score</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., 7.5" data-testid="input-language-speaking" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={languageScoreForm.control}
                          name="testDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Date</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} type="date" data-testid="input-language-test-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={languageScoreForm.control}
                          name="expiryDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Date</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} type="date" data-testid="input-language-expiry-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setLanguageDialogOpen(false)}
                          data-testid="button-cancel-language"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createLanguageScoreMutation.isPending}
                          data-testid="button-save-language"
                        >
                          {createLanguageScoreMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Score"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {languageScores.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Languages className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No language test scores yet</p>
                  <p className="text-sm mb-4">Add your IELTS, TOEFL, PTE, or Duolingo scores</p>
                  <Button onClick={handleAddLanguageScore} data-testid="button-add-language-empty">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Score
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Type</TableHead>
                      <TableHead>Overall</TableHead>
                      <TableHead>Section Scores</TableHead>
                      <TableHead>Test Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {languageScores.map((score: StudentLanguageScore) => (
                      <TableRow key={score.id} data-testid={`row-language-${score.id}`}>
                        <TableCell data-testid={`text-language-type-${score.id}`}>
                          <Badge variant="secondary">
                            {score.testType.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-language-overall-${score.id}`}>
                          <span className="font-semibold">{score.overallScore}</span>
                        </TableCell>
                        <TableCell data-testid={`text-language-sections-${score.id}`}>
                          <div className="text-sm">
                            {score.listeningScore && `L: ${score.listeningScore} `}
                            {score.readingScore && `R: ${score.readingScore} `}
                            {score.writingScore && `W: ${score.writingScore} `}
                            {score.speakingScore && `S: ${score.speakingScore}`}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-language-date-${score.id}`}>
                          {score.testDate || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditLanguageScore(score)}
                              data-testid={`button-edit-language-${score.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this language score?")) {
                                  deleteLanguageScoreMutation.mutate(score.id);
                                }
                              }}
                              disabled={deleteLanguageScoreMutation.isPending}
                              data-testid={`button-delete-language-${score.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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

        <TabsContent value="favorites">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Favorites</CardTitle>
                <CardDescription>Institutions and courses you've saved</CardDescription>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-lg font-medium mb-2">No favorites yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start exploring institutions and courses to add them to your favorites
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button asChild variant="outline">
                        <Link href="/institutions">Browse Institutions</Link>
                      </Button>
                      <Button asChild>
                        <Link href="/courses">Browse Courses</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {favorites.some((f) => f.itemType === "university") && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <GraduationCap className="h-5 w-5" />
                          Favorite Institutions ({favorites.filter((f) => f.itemType === "university").length})
                        </h3>
                        <div className="grid gap-4">
                          {favorites
                            .filter((f) => f.itemType === "university")
                            .map((favorite) => (
                              <Card key={favorite.id} className="hover-elevate">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <p className="font-semibold mb-1" data-testid={`favorite-institution-${favorite.itemId}`}>
                                        Institution ID: {favorite.itemId}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Saved on {new Date(favorite.createdAt!).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                      >
                                        <Link href={`/institutions/${favorite.itemId}`}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View
                                        </Link>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFavoriteMutation.mutate(favorite.id)}
                                        data-testid={`button-remove-favorite-${favorite.id}`}
                                      >
                                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    )}

                    {favorites.some((f) => f.itemType === "course") && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <GraduationCap className="h-5 w-5" />
                          Favorite Courses ({favorites.filter((f) => f.itemType === "course").length})
                        </h3>
                        <div className="grid gap-4">
                          {favorites
                            .filter((f) => f.itemType === "course")
                            .map((favorite) => (
                              <Card key={favorite.id} className="hover-elevate">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <p className="font-semibold mb-1" data-testid={`favorite-course-${favorite.itemId}`}>
                                        Course ID: {favorite.itemId}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Saved on {new Date(favorite.createdAt!).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                      >
                                        <Link href={`/courses/${favorite.itemId}`}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View
                                        </Link>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFavoriteMutation.mutate(favorite.id)}
                                        data-testid={`button-remove-favorite-${favorite.id}`}
                                      >
                                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
