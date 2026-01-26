import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  User, 
  MapPin, 
  GraduationCap, 
  Languages, 
  Target, 
  Briefcase,
  Loader2,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { z } from "zod";
import { COUNTRIES, NATIONALITIES_SORTED, getFlagUrl } from "@/lib/countries";
import type { StudentProfile, AcademicQualificationType } from "@shared/schema";

const WIZARD_STEPS = [
  { id: 1, title: "Personal", icon: User, description: "Basic information" },
  { id: 2, title: "Location", icon: MapPin, description: "Current location & visa" },
  { id: 3, title: "Education", icon: GraduationCap, description: "Academic background" },
  { id: 4, title: "English", icon: Languages, description: "Language proficiency" },
  { id: 5, title: "Preferences", icon: Target, description: "Study goals" },
  { id: 6, title: "Experience", icon: Briefcase, description: "Work & review" },
];

const VISA_TYPES = [
  { value: "student_500", label: "Student Visa (Subclass 500)" },
  { value: "graduate_485", label: "Temporary Graduate (Subclass 485)" },
  { value: "skilled_482", label: "Temporary Skill Shortage (Subclass 482)" },
  { value: "working_holiday_417", label: "Working Holiday (Subclass 417)" },
  { value: "working_holiday_462", label: "Work and Holiday (Subclass 462)" },
  { value: "bridging_visa", label: "Bridging Visa" },
  { value: "visitor_600", label: "Visitor Visa (Subclass 600)" },
  { value: "partner_820_801", label: "Partner Visa" },
  { value: "permanent_resident", label: "Permanent Resident" },
  { value: "citizen", label: "Australian Citizen" },
  { value: "other", label: "Other" },
];

const ENGLISH_TEST_TYPES = [
  { value: "ielts_academic", label: "IELTS Academic" },
  { value: "ielts_general", label: "IELTS General" },
  { value: "pte_academic", label: "PTE Academic" },
  { value: "toefl_ibt", label: "TOEFL iBT" },
  { value: "duolingo", label: "Duolingo English Test" },
  { value: "cambridge", label: "Cambridge English" },
  { value: "oet", label: "OET (Occupational English Test)" },
];

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

const WORK_EXPERIENCE_YEARS = [
  { value: "0", label: "No experience" },
  { value: "1", label: "Less than 1 year" },
  { value: "2", label: "1-2 years" },
  { value: "3", label: "3-5 years" },
  { value: "5", label: "5-10 years" },
  { value: "10", label: "10+ years" },
];

const INDUSTRIES = [
  "Accounting & Finance",
  "Agriculture",
  "Arts & Entertainment",
  "Construction",
  "Education",
  "Engineering",
  "Healthcare",
  "Hospitality & Tourism",
  "Information Technology",
  "Legal",
  "Manufacturing",
  "Marketing & Advertising",
  "Media & Communications",
  "Mining & Resources",
  "Non-profit",
  "Real Estate",
  "Retail",
  "Science & Research",
  "Transport & Logistics",
  "Other",
];

const currentYear = new Date().getFullYear();
const GRADUATION_YEARS = Array.from({ length: 25 }, (_, i) => currentYear - i);

const wizardFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  nationality: z.string().min(1, "Nationality is required"),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  currentCountry: z.string().optional().nullable(),
  isInAustralia: z.boolean().default(false),
  australianVisaType: z.string().optional().nullable(),
  visaExpiryDate: z.string().optional().nullable(),
  destinationCountry: z.string().optional().nullable(),
  highestQualificationTypeId: z.string().optional().nullable(),
  qualificationGrade: z.string().optional().nullable(),
  qualificationGradingType: z.string().optional().nullable(),
  graduationYear: z.number().optional().nullable(),
  qualificationInstitution: z.string().optional().nullable(),
  qualificationCountry: z.string().optional().nullable(),
  fieldOfStudy: z.string().optional().nullable(),
  englishProficiencyStatus: z.enum(["have_score", "native_speaker", "planning_test", "not_required"]).optional().nullable(),
  englishTestScores: z.object({
    testType: z.string().optional(),
    testDate: z.string().optional(),
    expiryDate: z.string().optional(),
    ieltsOverall: z.number().optional(),
    ieltsListening: z.number().optional(),
    ieltsReading: z.number().optional(),
    ieltsWriting: z.number().optional(),
    ieltsSpeaking: z.number().optional(),
    pteOverall: z.number().optional(),
    pteListening: z.number().optional(),
    pteReading: z.number().optional(),
    pteWriting: z.number().optional(),
    pteSpeaking: z.number().optional(),
    toeflOverall: z.number().optional(),
    duolingoOverall: z.number().optional(),
  }).optional().nullable(),
  preferredDiscipline: z.string().optional().nullable(),
  preferredCourseLevel: z.string().optional().nullable(),
  preferredStudyMode: z.string().optional().nullable(),
  preferredIntakes: z.array(z.string()).optional().nullable(),
  budgetMin: z.number().optional().nullable(),
  budgetMax: z.number().optional().nullable(),
  budgetCurrency: z.string().default("AUD"),
  prPathwayInterest: z.boolean().default(false),
  hasWorkExperience: z.boolean().default(false),
  workExperienceYears: z.number().optional().nullable(),
  workExperienceIndustry: z.string().optional().nullable(),
  careerGoals: z.string().optional().nullable(),
});

type WizardFormData = z.infer<typeof wizardFormSchema>;

interface ProfileWizardProps {
  profile: StudentProfile | null;
  onComplete?: () => void;
  onClose?: () => void;
}

export function ProfileWizard({ profile, onComplete, onClose }: ProfileWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(profile?.profileWizardStep || 1);
  const [budgetRange, setBudgetRange] = useState<[number, number]>([
    Number(profile?.budgetMin) || 10000,
    Number(profile?.budgetMax) || 50000
  ]);

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      gender: profile?.gender || null,
      dateOfBirth: profile?.dateOfBirth || null,
      nationality: profile?.nationality || "",
      phone: profile?.phone || "",
      whatsapp: profile?.whatsapp || "",
      currentCountry: profile?.currentCountry || "",
      isInAustralia: profile?.isInAustralia || false,
      australianVisaType: profile?.australianVisaType || null,
      visaExpiryDate: profile?.visaExpiryDate || null,
      destinationCountry: profile?.destinationCountry || "Australia",
      highestQualificationTypeId: profile?.highestQualificationTypeId || null,
      qualificationGrade: profile?.qualificationGrade || "",
      qualificationGradingType: profile?.qualificationGradingType || "",
      graduationYear: profile?.graduationYear || null,
      qualificationInstitution: profile?.qualificationInstitution || "",
      qualificationCountry: profile?.qualificationCountry || "",
      fieldOfStudy: profile?.fieldOfStudy || "",
      englishProficiencyStatus: profile?.englishProficiencyStatus || null,
      englishTestScores: profile?.englishTestScores || null,
      preferredDiscipline: profile?.preferredDiscipline || null,
      preferredCourseLevel: profile?.preferredCourseLevel || null,
      preferredStudyMode: profile?.preferredStudyMode || null,
      preferredIntakes: profile?.preferredIntakes || [],
      budgetMin: Number(profile?.budgetMin) || 10000,
      budgetMax: Number(profile?.budgetMax) || 50000,
      budgetCurrency: profile?.budgetCurrency || "AUD",
      prPathwayInterest: profile?.prPathwayInterest || false,
      hasWorkExperience: profile?.hasWorkExperience || false,
      workExperienceYears: profile?.workExperienceYears || null,
      workExperienceIndustry: profile?.workExperienceIndustry || "",
      careerGoals: profile?.careerGoals || "",
    },
  });

  const isInAustralia = form.watch("isInAustralia");
  const englishStatus = form.watch("englishProficiencyStatus");
  const englishTestScores = form.watch("englishTestScores");
  const hasWorkExperience = form.watch("hasWorkExperience");
  const selectedIntakes = form.watch("preferredIntakes") || [];
  const nationality = form.watch("nationality");

  const { data: qualificationTypes = [] } = useQuery<AcademicQualificationType[]>({
    queryKey: ["/api/qualification-types", nationality],
    enabled: !!nationality,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<WizardFormData> & { profileWizardStep?: number; profileCompletionPercentage?: number }) => {
      return apiRequest("PUT", "/api/student/profile/wizard", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving progress",
        description: error.message || "Failed to save your profile",
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    const currentData = form.getValues();
    
    await saveMutation.mutateAsync({
      ...currentData,
      budgetMin: budgetRange[0],
      budgetMax: budgetRange[1],
      profileWizardStep: currentStep + 1,
    });

    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    const currentData = form.getValues();
    
    await saveMutation.mutateAsync({
      ...currentData,
      budgetMin: budgetRange[0],
      budgetMax: budgetRange[1],
      profileWizardStep: WIZARD_STEPS.length,
      profileCompletionPercentage: calculateCompletionPercentage(currentData),
    });

    toast({
      title: "Profile Complete",
      description: "Your smart profile has been saved. You can now get course recommendations!",
    });

    onComplete?.();
  };

  const calculateCompletionPercentage = (data: WizardFormData): number => {
    const fields = [
      data.firstName,
      data.lastName,
      data.nationality,
      data.currentCountry,
      data.destinationCountry,
      data.qualificationGrade,
      data.graduationYear,
      data.englishProficiencyStatus,
      data.preferredDiscipline,
      data.preferredCourseLevel,
      data.budgetMin,
      data.budgetMax,
    ];
    const filled = fields.filter(f => f !== null && f !== undefined && f !== "").length;
    return Math.round((filled / fields.length) * 100);
  };

  const toggleIntake = (month: string) => {
    const current = selectedIntakes || [];
    const updated = current.includes(month)
      ? current.filter((m) => m !== month)
      : [...current, month];
    form.setValue("preferredIntakes", updated);
  };

  const progressPercentage = ((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Complete Your Profile</h2>
          <Badge variant="secondary" className="text-sm">
            Step {currentStep} of {WIZARD_STEPS.length}
          </Badge>
        </div>
        
        <Progress value={progressPercentage} className="h-2 mb-4" />
        
        <div className="hidden md:flex justify-between">
          {WIZARD_STEPS.map((step) => {
            const StepIcon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-1 cursor-pointer transition-colors",
                  isActive && "text-primary",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
                onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2",
                    isActive && "border-primary bg-primary/10",
                    isCompleted && "border-green-600 bg-green-50",
                    !isActive && !isCompleted && "border-muted"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs font-medium">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const StepIcon = WIZARD_STEPS[currentStep - 1].icon;
                  return <StepIcon className="w-5 h-5" />;
                })()}
                {WIZARD_STEPS[currentStep - 1].title}
              </CardTitle>
              <CardDescription>
                {WIZARD_STEPS[currentStep - 1].description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStep === 1 && (
                <Step1Personal form={form} />
              )}
              {currentStep === 2 && (
                <Step2Location 
                  form={form} 
                  isInAustralia={isInAustralia}
                />
              )}
              {currentStep === 3 && (
                <Step3Education 
                  form={form} 
                  qualificationTypes={qualificationTypes}
                  nationality={nationality}
                />
              )}
              {currentStep === 4 && (
                <Step4English 
                  form={form} 
                  englishStatus={englishStatus}
                  englishTestScores={englishTestScores}
                />
              )}
              {currentStep === 5 && (
                <Step5Preferences 
                  form={form}
                  budgetRange={budgetRange}
                  setBudgetRange={setBudgetRange}
                  selectedIntakes={selectedIntakes}
                  toggleIntake={toggleIntake}
                />
              )}
              {currentStep === 6 && (
                <Step6Experience 
                  form={form}
                  hasWorkExperience={hasWorkExperience}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? onClose : handlePrevious}
              disabled={saveMutation.isPending}
              data-testid="wizard-button-back"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? "Cancel" : "Previous"}
            </Button>

            {currentStep < WIZARD_STEPS.length ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={saveMutation.isPending}
                data-testid="wizard-button-next"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleComplete}
                disabled={saveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="wizard-button-complete"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Complete Profile
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

function Step1Personal({ form }: { form: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First Name *</FormLabel>
            <FormControl>
              <Input placeholder="Enter your first name" {...field} data-testid="wizard-input-first-name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Last Name *</FormLabel>
            <FormControl>
              <Input placeholder="Enter your last name" {...field} data-testid="wizard-input-last-name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gender</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="dateOfBirth"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of Birth</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value || ""} data-testid="input-dob" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="nationality"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Nationality *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-nationality">
                  <SelectValue placeholder="Select your nationality" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <ScrollArea className="h-[300px]">
                  {NATIONALITIES_SORTED.map((country) => (
                    <SelectItem key={country.code} value={country.nationality}>
                      <span className="flex items-center gap-2">
                        <img 
                          src={getFlagUrl(country.code)} 
                          alt={country.code} 
                          className="w-4 h-3 object-cover rounded-sm"
                        />
                        {country.nationality}
                      </span>
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl>
              <Input placeholder="+61 xxx xxx xxx" {...field} value={field.value || ""} data-testid="input-phone" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="whatsapp"
        render={({ field }) => (
          <FormItem>
            <FormLabel>WhatsApp Number</FormLabel>
            <FormControl>
              <Input placeholder="+61 xxx xxx xxx" {...field} value={field.value || ""} data-testid="input-whatsapp" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function Step2Location({ form, isInAustralia }: { form: any; isInAustralia: boolean }) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="currentCountry"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Where are you currently located?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-current-country">
                  <SelectValue placeholder="Select your current country" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <ScrollArea className="h-[300px]">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      <span className="flex items-center gap-2">
                        <img 
                          src={getFlagUrl(country.code)} 
                          alt={country.code} 
                          className="w-4 h-3 object-cover rounded-sm"
                        />
                        {country.name}
                      </span>
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isInAustralia"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Are you currently in Australia?</FormLabel>
              <FormDescription>
                This helps us understand your visa requirements
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                data-testid="switch-in-australia"
              />
            </FormControl>
          </FormItem>
        )}
      />

      {isInAustralia && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <FormField
            control={form.control}
            name="australianVisaType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What visa are you currently on?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-visa-type">
                      <SelectValue placeholder="Select your visa type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VISA_TYPES.map((visa) => (
                      <SelectItem key={visa.value} value={visa.value}>
                        {visa.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visaExpiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visa Expiry Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} data-testid="input-visa-expiry" />
                </FormControl>
                <FormDescription>
                  Helps us recommend courses that fit your timeline
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <FormField
        control={form.control}
        name="destinationCountry"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Where do you want to study?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || "Australia"}>
              <FormControl>
                <SelectTrigger data-testid="select-destination">
                  <SelectValue placeholder="Select destination country" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Australia">
                  <span className="flex items-center gap-2">
                    <img src={getFlagUrl("AU")} alt="AU" className="w-4 h-3 object-cover rounded-sm" />
                    Australia
                  </span>
                </SelectItem>
                <SelectItem value="United Kingdom">
                  <span className="flex items-center gap-2">
                    <img src={getFlagUrl("GB")} alt="GB" className="w-4 h-3 object-cover rounded-sm" />
                    United Kingdom
                  </span>
                </SelectItem>
                <SelectItem value="United States">
                  <span className="flex items-center gap-2">
                    <img src={getFlagUrl("US")} alt="US" className="w-4 h-3 object-cover rounded-sm" />
                    United States
                  </span>
                </SelectItem>
                <SelectItem value="Canada">
                  <span className="flex items-center gap-2">
                    <img src={getFlagUrl("CA")} alt="CA" className="w-4 h-3 object-cover rounded-sm" />
                    Canada
                  </span>
                </SelectItem>
                <SelectItem value="New Zealand">
                  <span className="flex items-center gap-2">
                    <img src={getFlagUrl("NZ")} alt="NZ" className="w-4 h-3 object-cover rounded-sm" />
                    New Zealand
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function Step3Education({ 
  form, 
  qualificationTypes,
  nationality 
}: { 
  form: any; 
  qualificationTypes: AcademicQualificationType[];
  nationality: string;
}) {
  const filteredQualifications = qualificationTypes.filter(
    (q) => q.isActive
  );

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="qualificationCountry"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country of Education</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-qual-country">
                  <SelectValue placeholder="Where did you complete your highest qualification?" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <ScrollArea className="h-[300px]">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      <span className="flex items-center gap-2">
                        <img 
                          src={getFlagUrl(country.code)} 
                          alt={country.code} 
                          className="w-4 h-3 object-cover rounded-sm"
                        />
                        {country.name}
                      </span>
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {filteredQualifications.length > 0 && (
        <FormField
          control={form.control}
          name="highestQualificationTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Highest Qualification</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger data-testid="select-qualification">
                    <SelectValue placeholder="Select your highest qualification" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredQualifications.map((qual) => (
                    <SelectItem key={qual.id} value={qual.id}>
                      {qual.name} {qual.fullName && `(${qual.fullName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Based on your nationality, we show relevant qualification types
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="qualificationGrade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade / GPA / Score</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., 3.5, 75%, A" 
                  {...field} 
                  value={field.value || ""} 
                  data-testid="input-grade"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="graduationYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year of Graduation</FormLabel>
              <Select 
                onValueChange={(v) => field.onChange(parseInt(v))} 
                value={field.value?.toString() || undefined}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-grad-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GRADUATION_YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="qualificationInstitution"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Institution Name</FormLabel>
            <FormControl>
              <Input 
                placeholder="Name of your school/university" 
                {...field} 
                value={field.value || ""} 
                data-testid="input-institution"
              />
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
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-field-study">
                  <SelectValue placeholder="Select your field of study" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DISCIPLINES.map((disc) => (
                  <SelectItem key={disc} value={disc}>
                    {disc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function Step4English({ 
  form, 
  englishStatus,
  englishTestScores 
}: { 
  form: any; 
  englishStatus: string | null | undefined;
  englishTestScores: any;
}) {
  const testType = englishTestScores?.testType;

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="englishProficiencyStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>English Proficiency Status</FormLabel>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value || undefined}
              className="grid gap-3"
            >
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="have_score" data-testid="radio-have-score" />
                </FormControl>
                <FormLabel className="font-normal">
                  I have taken an English test and have scores
                </FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="native_speaker" data-testid="radio-native" />
                </FormControl>
                <FormLabel className="font-normal">
                  I am a native English speaker
                </FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="planning_test" data-testid="radio-planning" />
                </FormControl>
                <FormLabel className="font-normal">
                  I am planning to take a test
                </FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="not_required" data-testid="radio-not-required" />
                </FormControl>
                <FormLabel className="font-normal">
                  English test may not be required for my course
                </FormLabel>
              </FormItem>
            </RadioGroup>
            <FormMessage />
          </FormItem>
        )}
      />

      {englishStatus === "have_score" && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <FormField
            control={form.control}
            name="englishTestScores.testType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Test Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-test-type">
                      <SelectValue placeholder="Select your test" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ENGLISH_TEST_TYPES.map((test) => (
                      <SelectItem key={test.value} value={test.value}>
                        {test.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {(testType === "ielts_academic" || testType === "ielts_general") && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <FormField
                control={form.control}
                name="englishTestScores.ieltsOverall"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.5" 
                        min="0" 
                        max="9"
                        placeholder="0-9"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        data-testid="input-ielts-overall"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="englishTestScores.ieltsListening"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listening</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.5" 
                        min="0" 
                        max="9"
                        placeholder="0-9"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        data-testid="input-ielts-listening"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="englishTestScores.ieltsReading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reading</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.5" 
                        min="0" 
                        max="9"
                        placeholder="0-9"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        data-testid="input-ielts-reading"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="englishTestScores.ieltsWriting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Writing</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.5" 
                        min="0" 
                        max="9"
                        placeholder="0-9"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        data-testid="input-ielts-writing"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="englishTestScores.ieltsSpeaking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speaking</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.5" 
                        min="0" 
                        max="9"
                        placeholder="0-9"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        data-testid="input-ielts-speaking"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {testType === "pte_academic" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <FormField
                control={form.control}
                name="englishTestScores.pteOverall"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="10" 
                        max="90"
                        placeholder="10-90"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        data-testid="input-pte-overall"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="englishTestScores.pteListening"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listening</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="10" 
                        max="90"
                        placeholder="10-90"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        data-testid="input-pte-listening"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="englishTestScores.pteReading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reading</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="10" 
                        max="90"
                        placeholder="10-90"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        data-testid="input-pte-reading"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="englishTestScores.pteWriting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Writing</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="10" 
                        max="90"
                        placeholder="10-90"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        data-testid="input-pte-writing"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="englishTestScores.pteSpeaking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speaking</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="10" 
                        max="90"
                        placeholder="10-90"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        data-testid="input-pte-speaking"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {testType === "toefl_ibt" && (
            <FormField
              control={form.control}
              name="englishTestScores.toeflOverall"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Score</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="120"
                      placeholder="0-120"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      data-testid="input-toefl-overall"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {testType === "duolingo" && (
            <FormField
              control={form.control}
              name="englishTestScores.duolingoOverall"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Score</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="10" 
                      max="160"
                      placeholder="10-160"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      data-testid="input-duolingo-overall"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="englishTestScores.testDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} data-testid="input-test-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="englishTestScores.expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} data-testid="input-expiry-date" />
                  </FormControl>
                  <FormDescription>
                    Most tests are valid for 2 years
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}

      {englishStatus === "planning_test" && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">No worries!</p>
            <p className="text-blue-700 dark:text-blue-300">
              We can still recommend courses based on your other preferences. You can update your English scores later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Step5Preferences({ 
  form, 
  budgetRange,
  setBudgetRange,
  selectedIntakes,
  toggleIntake
}: { 
  form: any; 
  budgetRange: [number, number];
  setBudgetRange: (range: [number, number]) => void;
  selectedIntakes: string[];
  toggleIntake: (month: string) => void;
}) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
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
                  <SelectItem key={disc} value={disc}>
                    {disc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preferredCourseLevel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Preferred Course Level</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-pref-level">
                  <SelectValue placeholder="What level of study?" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {COURSE_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preferredStudyMode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Preferred Study Mode</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-study-mode">
                  <SelectValue placeholder="How do you want to study?" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {STUDY_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div>
        <FormLabel className="mb-3 block">Preferred Intake Months</FormLabel>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {INTAKE_MONTHS.map((month) => (
            <Button
              key={month}
              type="button"
              variant={selectedIntakes.includes(month) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleIntake(month)}
              className="w-full"
              data-testid={`btn-intake-${month.toLowerCase()}`}
            >
              {month.substring(0, 3)}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Select all months you can start
        </p>
      </div>

      <div>
        <FormLabel className="mb-3 block">
          Annual Tuition Budget: ${budgetRange[0].toLocaleString()} - ${budgetRange[1].toLocaleString()} AUD
        </FormLabel>
        <Slider
          value={budgetRange}
          onValueChange={(value) => setBudgetRange(value as [number, number])}
          min={5000}
          max={100000}
          step={1000}
          className="w-full"
          data-testid="slider-budget"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>$5,000</span>
          <span>$100,000</span>
        </div>
      </div>

      <FormField
        control={form.control}
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
    </div>
  );
}

function Step6Experience({ 
  form, 
  hasWorkExperience 
}: { 
  form: any; 
  hasWorkExperience: boolean;
}) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="hasWorkExperience"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Do you have work experience?</FormLabel>
              <FormDescription>
                Some courses value professional experience
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                data-testid="switch-work-exp"
              />
            </FormControl>
          </FormItem>
        )}
      />

      {hasWorkExperience && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <FormField
            control={form.control}
            name="workExperienceYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Years of Experience</FormLabel>
                <Select 
                  onValueChange={(v) => field.onChange(parseInt(v))} 
                  value={field.value?.toString() || undefined}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-exp-years">
                      <SelectValue placeholder="How many years?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORK_EXPERIENCE_YEARS.map((exp) => (
                      <SelectItem key={exp.value} value={exp.value}>
                        {exp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="workExperienceIndustry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-industry">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <FormField
        control={form.control}
        name="careerGoals"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Career Goals</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Tell us about your career aspirations and what you hope to achieve through your studies..."
                className="min-h-[120px]"
                {...field}
                value={field.value || ""}
                data-testid="textarea-career-goals"
              />
            </FormControl>
            <FormDescription>
              This helps us recommend courses aligned with your goals
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
        <h4 className="font-medium text-green-900 dark:text-green-100 flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" />
          Almost Done!
        </h4>
        <p className="text-sm text-green-700 dark:text-green-300">
          Click "Complete Profile" to save your information and unlock personalized course recommendations.
        </p>
      </div>
    </div>
  );
}
