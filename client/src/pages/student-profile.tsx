import { useState, useEffect, useMemo } from "react";
import { useRegion } from "@/context/RegionContext";
import { useQueryParams } from "@/hooks/useQueryParams";
import { cn } from "@/lib/utils";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, User, GraduationCap, Languages, Plus, Pencil, Trash2, Heart, MapPin, Eye, Briefcase, Mail, Phone, FileText, Wallet, Upload, Globe, Contact } from "lucide-react";
import { insertStudentProfileSchema, insertStudentEducationSchema, insertStudentLanguageScoreSchema, insertStudentEmploymentSchema, type StudentProfile, type StudentEducation, type StudentLanguageScore, type StudentEmployment, type University, type Course } from "@shared/schema";
import { z } from "zod";
import { StudentLayout } from "@/components/student-layout";
import { COUNTRIES, NATIONALITIES_SORTED, getFlagUrl, getCountryByName, getCountryByNationality } from "@/lib/countries";
import { PhoneInput } from "@/components/ui/phone-input";
import { AddressAutocomplete, AddressComponents } from "@/components/ui/address-autocomplete";
import { Switch } from "@/components/ui/switch";
import { FormDescription } from "@/components/ui/form";
import { Target } from "lucide-react";
import { SectionDocumentUpload } from "@/components/section-document-upload";

const personalDetailsSchema = insertStudentProfileSchema.pick({
  firstName: true,
  lastName: true,
  preferredName: true,
  gender: true,
  phone: true,
  whatsapp: true,
  country: true,
  profileImageUrl: true,
  unitNo: true,
  street: true,
  suburb: true,
  city: true,
  state: true,
  postcode: true,
}).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredName: z.string().optional().nullable(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().nullable(),
  phone: z.string().min(1, "Phone number is required"),
  whatsapp: z.string().optional().nullable(),
  country: z.string().min(1, "Country is required"),
  unitNo: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  suburb: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  isInAustralia: z.boolean().optional().default(false),
  australianVisaType: z.string().optional().nullable(),
  visaExpiryDate: z.string().optional().nullable(),
});

const passportFormSchema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(1, "Nationality is required"),
  passportNumber: z.string().optional().nullable(),
  passportCountry: z.string().optional().nullable(),
  passportIssuedDate: z.string().optional().nullable(),
  passportExpiryDate: z.string().optional().nullable(),
  passportIssuingAuthority: z.string().optional().nullable(),
});

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

const emergencyContactSchema = z.object({
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactMobile: z.string().optional().nullable(),
  emergencyContactRelationship: z.string().optional().nullable(),
  emergencyContactAddress: z.string().optional().nullable(),
});

const maritalSchema = z.object({
  maritalStatus: z.enum(["single", "married", "de_facto", "divorced", "widowed", "separated", "prefer_not_to_say"]).optional().nullable(),
  spouseFirstName: z.string().optional().nullable(),
  spouseLastName: z.string().optional().nullable(),
  spouseDateOfBirth: z.string().optional().nullable(),
  spouseNationality: z.string().optional().nullable(),
  spouseCountryOfBirth: z.string().optional().nullable(),
  spousePassportNumber: z.string().optional().nullable(),
  spouseIsAccompanying: z.boolean().optional(),
});

const fundingSchema = z.object({
  fundingSource: z.string().optional().nullable(),
  sponsorName: z.string().optional().nullable(),
  sponsorRelationship: z.string().optional().nullable(),
  sponsorOccupation: z.string().optional().nullable(),
  sponsorPhone: z.string().optional().nullable(),
  sponsorEmail: z.string().optional().nullable(),
  sponsorAddress: z.string().optional().nullable(),
});


const FUNDING_SOURCES = [
  { value: "self", label: "Self-Funded" },
  { value: "family", label: "Family Sponsored" },
  { value: "scholarship", label: "Scholarship/Grant" },
  { value: "employer", label: "Employer Sponsored" },
  { value: "loan", label: "Education Loan" },
  { value: "government", label: "Government Funding" },
  { value: "mixed", label: "Mixed/Multiple Sources" },
];

const SPONSOR_RELATIONSHIPS = [
  "Parent",
  "Spouse",
  "Sibling",
  "Grandparent",
  "Uncle/Aunt",
  "Employer",
  "Other Relative",
  "Guardian",
  "Other",
];

// Countries for education dropdown (common source countries)
const EDUCATION_COUNTRIES = [
  'Australia',
  'Bangladesh',
  'India',
  'Nepal',
  'Sri Lanka',
  'Pakistan',
  'China',
  'Vietnam',
  'Philippines',
  'Malaysia',
  'Indonesia',
  'Thailand',
  'United Kingdom',
  'Canada',
  'New Zealand',
  'United States',
  'Other',
];

// Disciplines for field of study dropdown
const EDUCATION_DISCIPLINES = [
  'Accounting, Business & Finance',
  'Agriculture & Forestry',
  'Applied Sciences & Professions',
  'Arts, Design & Architecture',
  'Computer Science & IT',
  'Education & Training',
  'Engineering & Technology',
  'Environmental Studies & Earth Sciences',
  'Hospitality, Leisure & Sports',
  'Humanities',
  'Journalism & Media',
  'Law',
  'Medicine & Health',
  'Trade',
  'Other',
];

// Year range for completion dropdown
const EDUCATION_YEARS = Array.from({ length: 31 }, (_, i) => 2030 - i); // 2030 down to 2000

const educationFormSchema = z.object({
  country: z.string().min(1, "Country is required"),
  qualificationTypeId: z.string().optional(),
  level: z.string().optional(), // Legacy field, kept for backward compatibility
  yearCompleted: z.string().optional(),
  institution: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  gradeResult: z.string().optional(),
  gpa: z.string().optional().refine(
    (val) => {
      if (!val || val === "") return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "GPA must be a valid number" }
  ),
  gradeScale: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrentlyStudying: z.boolean().default(false),
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

const employmentFormSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  employmentType: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrentlyWorking: z.boolean().default(false),
  responsibilities: z.string().optional(),
  achievements: z.string().optional(),
});

interface ProfileCompletionResult {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
  completedSections: {
    personalInfo: boolean;
    passport: boolean;
    education: boolean;
    languageTest: boolean;
    preferences: boolean;
    employment: boolean;
    funding: boolean;
    emergency: boolean;
    sop: boolean;
    bio: boolean;
    marital?: boolean;
  };
  partialSections: {
    personalInfo: boolean;
    passport: boolean;
    education: boolean;
    languageTest: boolean;
    preferences: boolean;
    employment: boolean;
    funding: boolean;
    emergency: boolean;
    sop: boolean;
    bio: boolean;
    marital?: boolean;
  };
}

function CompletionBadge({ 
  isComplete, 
  isPartial = false,
  isOptional = false,
  isRecommended = false 
}: { 
  isComplete: boolean; 
  isPartial?: boolean;
  isOptional?: boolean;
  isRecommended?: boolean;
}) {
  if (isComplete) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid="badge-complete">
        Complete
      </Badge>
    );
  }
  if (isPartial) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200" data-testid="badge-partial">
        Partially Complete
      </Badge>
    );
  }
  if (isOptional) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200" data-testid="badge-optional">
        Optional
      </Badge>
    );
  }
  if (isRecommended) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200" data-testid="badge-recommended">
        Recommended
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200" data-testid="badge-incomplete">
      Incomplete
    </Badge>
  );
}

type VerificationStatus = 'unverified' | 'pending_verification' | 'verified' | 'needs_reverification';

interface SectionVerification {
  section: string;
  status: VerificationStatus;
  verifiedAt: string | null;
  verifierName: string | null;
  verifierProfileImage: string | null;
  verifierNotes: string | null;
  lastUpdatedAt: string | null;
}

interface VerificationBadgeProps {
  status?: VerificationStatus;
  verifierName?: string | null;
  verifierProfileImage?: string | null;
}

function VerificationBadge({ status, verifierName, verifierProfileImage }: VerificationBadgeProps) {
  if (!status || status === 'unverified') {
    return null;
  }
  
  if (status === 'verified') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200" data-testid="badge-verified">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
        {verifierName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>by</span>
            <Avatar className="h-5 w-5">
              <AvatarImage src={verifierProfileImage || undefined} alt={verifierName} />
              <AvatarFallback className="text-[10px]">
                {verifierName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{verifierName}</span>
          </div>
        )}
      </div>
    );
  }
  
  if (status === 'pending_verification') {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200" data-testid="badge-pending">
        Pending Review
      </Badge>
    );
  }
  
  if (status === 'needs_reverification') {
    return (
      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200" data-testid="badge-needs-reverification">
        <AlertCircle className="h-3 w-3 mr-1" />
        Needs Re-verification
      </Badge>
    );
  }
  
  return null;
}

const VALID_SECTIONS = ["personal", "marital", "passport", "education", "language", "employment", "funding", "emergency"];

function StudentProfileContent() {
  const { toast } = useToast();
  const { params, setParams } = useQueryParams();

  // URL-based accordion section deep linking
  const initialSection = useMemo(() => {
    const s = params.get("section");
    return s && VALID_SECTIONS.includes(s) ? s : "personal";
  }, []);
  const [openSections, setOpenSections] = useState<string[]>([initialSection]);
  const { regionCode } = useRegion();
  const isAURegion = regionCode?.toUpperCase() === 'AU';

  const handleAccordionChange = (vals: string[]) => {
    setOpenSections(vals);
    const last = vals[vals.length - 1];
    setParams({ section: last || null });
  };

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [educationDialogOpen, setEducationDialogOpen] = useState(false);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<StudentEducation | null>(null);
  const [editingLanguageScore, setEditingLanguageScore] = useState<StudentLanguageScore | null>(null);
  const [employmentDialogOpen, setEmploymentDialogOpen] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState<StudentEmployment | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
  });

  const { data: userData } = useQuery<{ email?: string }>({
    queryKey: ["/api/admin/profile"],
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

  const { data: employments = [] } = useQuery<StudentEmployment[]>({
    queryKey: ["/api/student/employments"],
  });

  const { data: verificationStatus = [] } = useQuery<SectionVerification[]>({
    queryKey: ["/api/student/profile/verification"],
  });
  
  const getVerification = (sectionName: string): SectionVerification | undefined => {
    return verificationStatus.find(v => v.section === sectionName);
  };

  const personalForm = useForm<z.infer<typeof personalDetailsSchema>>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      preferredName: "",
      gender: undefined,
      phone: "",
      whatsapp: "",
      country: "",
      profileImageUrl: "",
      unitNo: "",
      street: "",
      suburb: "",
      city: "",
      state: "",
      postcode: "",
      isInAustralia: false,
      australianVisaType: "",
      visaExpiryDate: "",
    },
  });

  const passportForm = useForm<z.infer<typeof passportFormSchema>>({
    resolver: zodResolver(passportFormSchema),
    defaultValues: {
      dateOfBirth: "",
      nationality: "",
      passportNumber: "",
      passportCountry: "",
      passportIssuedDate: "",
      passportExpiryDate: "",
      passportIssuingAuthority: "",
    },
  });

  const maritalForm = useForm<z.infer<typeof maritalSchema>>({
    resolver: zodResolver(maritalSchema),
    defaultValues: {
      maritalStatus: undefined,
      spouseFirstName: "",
      spouseLastName: "",
      spouseDateOfBirth: "",
      spouseNationality: "",
      spouseCountryOfBirth: "",
      spousePassportNumber: "",
      spouseIsAccompanying: false,
    },
  });

  const emergencyForm = useForm<z.infer<typeof emergencyContactSchema>>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: {
      emergencyContactName: "",
      emergencyContactMobile: "",
      emergencyContactRelationship: "",
      emergencyContactAddress: "",
    },
  });

  const fundingForm = useForm<z.infer<typeof fundingSchema>>({
    resolver: zodResolver(fundingSchema),
    defaultValues: {
      fundingSource: "",
      sponsorName: "",
      sponsorRelationship: "",
      sponsorOccupation: "",
      sponsorPhone: "",
      sponsorEmail: "",
      sponsorAddress: "",
    },
  });


  const educationForm = useForm<z.infer<typeof educationFormSchema>>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: {
      country: "",
      qualificationTypeId: "",
      level: "",
      yearCompleted: "",
      institution: "",
      fieldOfStudy: "",
      gradeResult: "",
      gpa: "",
      gradeScale: "",
      startDate: "",
      endDate: "",
      isCurrentlyStudying: false,
    },
  });
  
  // Watch country selection for cascading qualification type dropdown
  const selectedEducationCountry = educationForm.watch("country");
  const selectedQualificationTypeId = educationForm.watch("qualificationTypeId");
  const isCurrentlyStudying = educationForm.watch("isCurrentlyStudying");

  // Fetch qualification types for the selected country (for cascading dropdown)
  const { data: qualificationTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/academic-qualifications", { country: selectedEducationCountry }],
    enabled: !!selectedEducationCountry && selectedEducationCountry !== "Other",
  });
  
  // Find the selected qualification type for dynamic grade options
  const selectedQualificationType = qualificationTypes.find(
    (q: any) => q.id === selectedQualificationTypeId
  );

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

  const employmentForm = useForm<z.infer<typeof employmentFormSchema>>({
    resolver: zodResolver(employmentFormSchema),
    defaultValues: {
      jobTitle: "",
      company: "",
      industry: "",
      employmentType: "",
      country: "",
      city: "",
      startDate: "",
      endDate: "",
      isCurrentlyWorking: false,
      responsibilities: "",
      achievements: "",
    },
  });

  const [hasPassport, setHasPassport] = useState<boolean | null>(null);
  const [hasEnglishTest, setHasEnglishTest] = useState<boolean | null>(null);
  const [hasWorkExperience, setHasWorkExperience] = useState<boolean | null>(null);

  const isInAustralia = personalForm.watch("isInAustralia");

  // Clear visa fields when user toggles isInAustralia OFF to avoid stale data
  useEffect(() => {
    if (isInAustralia === false) {
      personalForm.setValue("australianVisaType", "");
      personalForm.setValue("visaExpiryDate", "");
    }
  }, [isInAustralia, personalForm]);

  useEffect(() => {
    if (profile) {
      personalForm.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        preferredName: profile.preferredName || "",
        gender: profile.gender || undefined,
        phone: profile.phone || "",
        whatsapp: profile.whatsapp || "",
        country: profile.country || "",
        profileImageUrl: profile.profileImageUrl || "",
        unitNo: profile.unitNo || "",
        street: profile.street || "",
        suburb: profile.suburb || "",
        city: profile.city || "",
        state: profile.state || "",
        postcode: profile.postcode || "",
        isInAustralia: profile.isInAustralia || false,
        australianVisaType: profile.australianVisaType || "",
        visaExpiryDate: profile.visaExpiryDate || "",
      });
      emergencyForm.reset({
        emergencyContactName: profile.emergencyContactName || "",
        emergencyContactMobile: profile.emergencyContactMobile || "",
        emergencyContactRelationship: profile.emergencyContactRelationship || "",
        emergencyContactAddress: profile.emergencyContactAddress || "",
      });
      passportForm.reset({
        dateOfBirth: profile.dateOfBirth || "",
        nationality: profile.nationality || "",
        passportNumber: profile.passportNumber || "",
        passportCountry: profile.passportCountry || "",
        passportIssuedDate: profile.passportIssuedDate || "",
        passportExpiryDate: profile.passportExpiryDate || "",
        passportIssuingAuthority: profile.passportIssuingAuthority || "",
      });
      fundingForm.reset({
        fundingSource: profile.fundingSource || "",
        sponsorName: profile.sponsorName || "",
        sponsorRelationship: profile.sponsorRelationship || "",
        sponsorOccupation: profile.sponsorOccupation || "",
        sponsorPhone: profile.sponsorPhone || "",
        sponsorEmail: profile.sponsorEmail || "",
        sponsorAddress: profile.sponsorAddress || "",
      });
      maritalForm.reset({
        maritalStatus: (profile.maritalStatus as z.infer<typeof maritalSchema>["maritalStatus"]) || undefined,
        spouseFirstName: profile.spouseFirstName || "",
        spouseLastName: profile.spouseLastName || "",
        spouseDateOfBirth: profile.spouseDateOfBirth || "",
        spouseNationality: profile.spouseNationality || "",
        spouseCountryOfBirth: profile.spouseCountryOfBirth || "",
        spousePassportNumber: profile.spousePassportNumber || "",
        spouseIsAccompanying: profile.spouseIsAccompanying ?? false,
      });
      setHasPassport(profile.hasPassport ?? null);
      setHasEnglishTest(profile.hasEnglishTest ?? null);
      setHasWorkExperience(profile.hasWorkExperience ?? null);
    }
  }, [profile]);

  // Helper type for form data that uses strings for enum fields
  // The form uses string values from selects, which match the enum values at runtime
  type ProfileFormData = Omit<Partial<StudentProfile>, 'australianVisaType' | 'preferredDiscipline' | 'preferredCourseLevel' | 'preferredStudyMode'> & {
    australianVisaType?: string | null;
    preferredDiscipline?: string | null;
    preferredCourseLevel?: string | null;
    preferredStudyMode?: string | null;
  };

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Check if profile exists AND has an id (backend returns fallback object with id: null for new profiles)
      if (profile && profile.id) {
        return await apiRequest("PUT", "/api/student/profile", data);
      } else {
        // Check for referral code in localStorage (from referral link)
        const referredByCode = localStorage.getItem('referralCode');
        const payload = {
          ...data,
          bio: data.bio || "",
          careerGoals: data.careerGoals || "",
          educationLevel: data.educationLevel || "",
          fieldOfStudy: data.fieldOfStudy || "",
          previousEducation: data.previousEducation || "",
          referredByCode: referredByCode || undefined,
        };
        const result = await apiRequest("POST", "/api/student/profile", payload);
        // Clear referral code after successful profile creation
        if (referredByCode) {
          localStorage.removeItem('referralCode');
        }
        return result;
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

  // Helper function to normalize date to YYYY-MM-DD format for HTML date inputs
  const normalizeDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  // Passport extraction mutation
  const extractPassportMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("POST", "/api/student/documents/extract-passport", { documentId });
      return response.json();
    },
    onSuccess: (result: { success: boolean; data: any; message: string }) => {
      if (result.success && result.data) {
        const data = result.data;
        const fieldsExtracted: string[] = [];
        
        // Auto-fill the passport form with extracted data
        if (data.passportNumber) {
          passportForm.setValue("passportNumber", data.passportNumber);
          fieldsExtracted.push("passport number");
        }
        if (data.passportCountry) {
          passportForm.setValue("passportCountry", data.passportCountry);
          fieldsExtracted.push("country of issue");
        }
        
        const normalizedIssuedDate = normalizeDate(data.passportIssuedDate);
        if (normalizedIssuedDate) {
          passportForm.setValue("passportIssuedDate", normalizedIssuedDate);
          fieldsExtracted.push("issue date");
        }
        
        const normalizedExpiryDate = normalizeDate(data.passportExpiryDate);
        if (normalizedExpiryDate) {
          passportForm.setValue("passportExpiryDate", normalizedExpiryDate);
          fieldsExtracted.push("expiry date");
        }
        
        // Extract date of birth
        const normalizedDob = normalizeDate(data.dateOfBirth);
        if (normalizedDob) {
          passportForm.setValue("dateOfBirth", normalizedDob);
          fieldsExtracted.push("date of birth");
        }
        
        // Extract nationality
        if (data.nationality) {
          passportForm.setValue("nationality", data.nationality);
          fieldsExtracted.push("nationality");
        }
        
        // Extract issuing authority
        if (data.issuingAuthority) {
          passportForm.setValue("passportIssuingAuthority", data.issuingAuthority);
          fieldsExtracted.push("issuing authority");
        }
        
        if (fieldsExtracted.length > 0) {
          const confidence = data.confidence || 0;
          const needsReview = confidence < 0.7;
          
          toast({
            title: needsReview ? "Review Required" : "Data Extracted Successfully",
            description: `Extracted: ${fieldsExtracted.join(", ")}. ${needsReview ? "Some fields may be inaccurate - please verify before saving." : "Please review and save."}`,
          });
        } else {
          toast({
            title: "No Data Extracted",
            description: data.errors?.length > 0 
              ? data.errors.join(". ") 
              : "Could not read passport details. Please ensure the image is clear and try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Extraction Failed",
          description: result.data?.errors?.join(". ") || result.message || "Could not extract passport data",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Extraction Failed",
        description: error.message || "An error occurred while extracting passport data",
        variant: "destructive",
      });
    },
  });

  // Fetch all student documents
  const { data: allDocuments } = useQuery<{ id: string; name: string; mimeType: string; type: string; createdAt: string }[]>({
    queryKey: ["/api/student/documents"],
    enabled: !!profile?.id,
  });

  // Filter to get passport documents that are images or PDFs (sorted by creation date, newest first)
  const passportDocuments = allDocuments
    ?.filter((d) => d.type === "passport" && (d.mimeType?.startsWith("image/") || d.mimeType === "application/pdf"))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) || [];

  const handleExtractPassport = () => {
    if (passportDocuments.length === 0) {
      toast({
        title: "No Passport Document Found",
        description: "Please upload a passport image (JPEG, PNG, WebP) or PDF in the Documents section first.",
        variant: "destructive",
      });
      return;
    }
    // Use the most recently uploaded passport document
    const latestDoc = passportDocuments[0];
    extractPassportMutation.mutate(latestDoc.id);
  };

  const createEducationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof educationFormSchema>) => {
      // Transform form data to match backend schema
      const payload = {
        level: data.level || undefined,
        institution: data.institution || undefined,
        fieldOfStudy: data.fieldOfStudy || undefined,
        country: data.country || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        isCurrentlyStudying: data.isCurrentlyStudying,
        gpa: data.gpa && data.gpa !== "" ? data.gpa : undefined,
        gradeScale: data.gradeScale || undefined,
        // New smart matching fields
        qualificationTypeId: data.qualificationTypeId || undefined,
        yearCompleted: data.yearCompleted ? parseInt(data.yearCompleted, 10) : undefined,
        gradeResult: data.gradeResult || undefined,
      };
      
      if (editingEducation) {
        return await apiRequest("PUT", `/api/student/educations/${editingEducation.id}`, payload);
      }
      return await apiRequest("POST", "/api/student/educations", payload);
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
      // Transform form data to match backend schema - keep scores as strings for decimal fields
      const payload = {
        testType: data.testType.toLowerCase(),
        overallScore: data.overallScore,
        listeningScore: data.listeningScore && data.listeningScore !== "" ? data.listeningScore : undefined,
        readingScore: data.readingScore && data.readingScore !== "" ? data.readingScore : undefined,
        writingScore: data.writingScore && data.writingScore !== "" ? data.writingScore : undefined,
        speakingScore: data.speakingScore && data.speakingScore !== "" ? data.speakingScore : undefined,
        testDate: data.testDate || undefined,
        expiryDate: data.expiryDate || undefined,
      };
      
      if (editingLanguageScore) {
        return await apiRequest("PUT", `/api/student/language-scores/${editingLanguageScore.id}`, payload);
      }
      return await apiRequest("POST", "/api/student/language-scores", payload);
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

  // Employment mutations
  const createEmploymentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof employmentFormSchema>) => {
      const method = editingEmployment ? "PUT" : "POST";
      const url = editingEmployment 
        ? `/api/student/employments/${editingEmployment.id}`
        : "/api/student/employments";
      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/employments"] });
      setEmploymentDialogOpen(false);
      setEditingEmployment(null);
      employmentForm.reset();
      toast({
        title: "Success",
        description: editingEmployment ? "Employment updated" : "Employment added",
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

  const deleteEmploymentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/student/employments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/employments"] });
      toast({
        title: "Success",
        description: "Employment deleted",
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
      
      // Use apiRequest which handles CSRF tokens and auth headers automatically
      const response = await apiRequest('POST', '/api/student/upload-profile-photo', formData);
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


  const handleEducationSubmit = educationForm.handleSubmit((data) => {
    createEducationMutation.mutate(data);
  });

  const handleEditEducation = (education: StudentEducation) => {
    setEditingEducation(education);
    educationForm.reset({
      country: education.country || "",
      qualificationTypeId: (education as any).qualificationTypeId || "",
      level: education.level || "",
      yearCompleted: (education as any).yearCompleted ? String((education as any).yearCompleted) : "",
      institution: education.institution || "",
      fieldOfStudy: education.fieldOfStudy || "",
      gradeResult: (education as any).gradeResult || "",
      gpa: education.gpa != null ? String(education.gpa) : "",
      gradeScale: education.gradeScale || "",
      startDate: education.startDate || "",
      endDate: education.endDate || "",
      isCurrentlyStudying: education.isCurrentlyStudying || false,
    });
    setEducationDialogOpen(true);
  };

  const handleAddEducation = () => {
    setEditingEducation(null);
    educationForm.reset({
      country: "",
      qualificationTypeId: "",
      level: "",
      yearCompleted: "",
      institution: "",
      fieldOfStudy: "",
      gradeResult: "",
      gpa: "",
      gradeScale: "",
      startDate: "",
      endDate: "",
      isCurrentlyStudying: false,
    });
    setEducationDialogOpen(true);
  };

  const handleLanguageScoreSubmit = languageScoreForm.handleSubmit((data) => {
    createLanguageScoreMutation.mutate(data);
  });

  const handleEditLanguageScore = (score: StudentLanguageScore) => {
    setEditingLanguageScore(score);
    languageScoreForm.reset({
      testType: score.testType || "",
      overallScore: score.overallScore != null ? String(score.overallScore) : "",
      listeningScore: score.listeningScore != null ? String(score.listeningScore) : "",
      readingScore: score.readingScore != null ? String(score.readingScore) : "",
      writingScore: score.writingScore != null ? String(score.writingScore) : "",
      speakingScore: score.speakingScore != null ? String(score.speakingScore) : "",
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

  const handleEmploymentSubmit = employmentForm.handleSubmit((data) => {
    createEmploymentMutation.mutate(data);
  });

  const handleEditEmployment = (employment: StudentEmployment) => {
    setEditingEmployment(employment);
    employmentForm.reset({
      jobTitle: employment.jobTitle || "",
      company: employment.company || "",
      industry: employment.industry || "",
      employmentType: employment.employmentType || "",
      country: employment.country || "",
      city: employment.city || "",
      startDate: employment.startDate || "",
      endDate: employment.endDate || "",
      isCurrentlyWorking: employment.isCurrentlyWorking || false,
      responsibilities: employment.responsibilities || "",
      achievements: employment.achievements || "",
    });
    setEmploymentDialogOpen(true);
  };

  const handleAddEmployment = () => {
    setEditingEmployment(null);
    employmentForm.reset();
    setEmploymentDialogOpen(true);
  };

  const handlePersonalSubmit = personalForm.handleSubmit(
    async (data) => {
      let photoPath = data.profileImageUrl;
      
      // Check if profile exists AND has an id (backend returns fallback object with id: null for new profiles)
      const profileExists = profile && profile.id;
      
      // Only upload photo if profile exists and a new photo was selected
      if (photoFile && profileExists) {
        const uploadedPath = await uploadPhoto();
        if (uploadedPath) {
          photoPath = uploadedPath;
        } else {
          // Photo upload failed, don't proceed
          return;
        }
      }
      
      // If no profile exists yet and photo was selected, save data first then upload photo
      if (photoFile && !profileExists) {
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

  const handleEmergencySubmit = emergencyForm.handleSubmit((data) => {
    createOrUpdateMutation.mutate(data);
  });

  const handlePassportSubmit = passportForm.handleSubmit((data) => {
    createOrUpdateMutation.mutate(data);
  });


  const handleFundingSubmit = fundingForm.handleSubmit((data) => {
    createOrUpdateMutation.mutate(data);
  });

  const handleMaritalSubmit = maritalForm.handleSubmit((data) => {
    createOrUpdateMutation.mutate(data);
  });

  // Watch marital status to conditionally show spouse fields
  const watchedMaritalStatus = maritalForm.watch("maritalStatus");
  const showSpouseFields = watchedMaritalStatus === "married" || watchedMaritalStatus === "de_facto";

  // Watch funding source to conditionally show sponsor fields
  const watchedFundingSource = fundingForm.watch("fundingSource");
  const showSponsorFields = watchedFundingSource && watchedFundingSource !== "self" && watchedFundingSource !== "loan";

  const isLoading = profileLoading || completionLoading;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-profile">
            {completion?.isComplete ? "Your Profile" : "Complete Your Profile"}
          </h1>
          <p className={cn(
            completion?.isComplete ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          )}>
            {completion?.isComplete 
              ? "Congratulations! Your profile is 100% complete. You're ready to apply for courses."
              : "You must complete 100% of your profile before applying to courses"}
          </p>
        </div>
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


      <Accordion type="multiple" value={openSections} onValueChange={handleAccordionChange} className="space-y-4">
        {/* Section 1: Personal Information */}
        <AccordionItem value="personal" className="border rounded-lg px-4" data-testid="accordion-personal">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-trigger-personal">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <span className="font-semibold">Personal Information</span>
              <CompletionBadge isComplete={completion?.completedSections?.personalInfo || false} isPartial={completion?.partialSections?.personalInfo || false} />
              <VerificationBadge status={getVerification('personal')?.status} verifierName={getVerification('personal')?.verifierName} verifierProfileImage={getVerification('personal')?.verifierProfileImage} />
            </div>
          </AccordionTrigger>
          <AccordionContent>
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
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input 
                          value={userData?.email || ""} 
                          disabled 
                          className="bg-muted cursor-not-allowed" 
                          data-testid="input-email" 
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Email is linked to your account and cannot be changed here</p>
                    </FormItem>

                    <FormField
                      control={personalForm.control}
                      name="preferredName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Nick name or preferred name" data-testid="input-preferred-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={personalForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
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

                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={personalForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <PhoneInput 
                              value={field.value || ""} 
                              onChange={field.onChange}
                              placeholder="Phone number" 
                              data-testid="input-phone" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={personalForm.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp Number</FormLabel>
                          <FormControl>
                            <PhoneInput 
                              value={field.value || ""} 
                              onChange={field.onChange}
                              placeholder="WhatsApp number" 
                              data-testid="input-whatsapp" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={personalForm.control}
                      name="country"
                      render={({ field }) => {
                        const selectedCountry = getCountryByName(field.value || "");
                        return (
                          <FormItem>
                            <FormLabel>Country of Residence *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={selectedCountry?.name || field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-country">
                                  <SelectValue placeholder="Select country">
                                    {selectedCountry ? (
                                      <span className="flex items-center gap-2">
                                        <img 
                                          src={getFlagUrl(selectedCountry.code)} 
                                          alt={selectedCountry.name} 
                                          className="w-5 h-auto"
                                        />
                                        {selectedCountry.name}
                                      </span>
                                    ) : field.value ? (
                                      <span>{field.value}</span>
                                    ) : null}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={`country-${country.code}`} value={country.name}>
                                    <span className="flex items-center gap-2">
                                      <img 
                                        src={getFlagUrl(country.code)} 
                                        alt={country.name}
                                        className="w-5 h-auto"
                                      />
                                      {country.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  {/* Visa Status Section — only shown for AU region */}
                  {isAURegion && <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Visa Status
                    </h4>
                    
                    <FormField
                      control={personalForm.control}
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
                      <div className="space-y-4 mt-4 p-4 bg-muted/50 rounded-lg">
                        <FormField
                          control={personalForm.control}
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
                          control={personalForm.control}
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
                  </div>}

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address Details (Optional)
                    </h4>
                    
                    <div className="mb-4">
                      <AddressAutocomplete
                        onAddressSelect={(address: AddressComponents) => {
                          const opts = { shouldDirty: true, shouldTouch: true, shouldValidate: true };
                          if (address.unitNo) personalForm.setValue("unitNo", address.unitNo, opts);
                          if (address.street) personalForm.setValue("street", address.street, opts);
                          if (address.suburb) personalForm.setValue("suburb", address.suburb, opts);
                          if (address.city) personalForm.setValue("city", address.city, opts);
                          if (address.state) personalForm.setValue("state", address.state, opts);
                          if (address.postcode) personalForm.setValue("postcode", address.postcode, opts);
                          if (address.country) personalForm.setValue("country", address.country, opts);
                        }}
                        placeholder="Start typing your address to search..."
                        data-testid="input-address-search"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={personalForm.control}
                        name="unitNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit/Apt No.</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="e.g., Unit 5" data-testid="input-unit-no" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalForm.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="e.g., 123 Main Street" data-testid="input-street" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                      <FormField
                        control={personalForm.control}
                        name="suburb"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Suburb</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="e.g., Sydney CBD" data-testid="input-suburb" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="e.g., Sydney" data-testid="input-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                      <FormField
                        control={personalForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="e.g., NSW" data-testid="input-state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalForm.control}
                        name="postcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postcode</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="e.g., 2000" data-testid="input-postcode" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Passport & Visa */}
        <AccordionItem value="passport" className="border rounded-lg px-4" data-testid="accordion-passport">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-trigger-passport">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold">Passport & Visa Details</span>
              <CompletionBadge isComplete={completion?.completedSections?.passport || false} isPartial={completion?.partialSections?.passport || false} />
              <VerificationBadge status={getVerification('passport')?.status} verifierName={getVerification('passport')?.verifierName} verifierProfileImage={getVerification('passport')?.verifierProfileImage} />
            </div>
          </AccordionTrigger>
          <AccordionContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium mb-3">Do you currently have a passport?</p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={hasPassport === true ? "default" : "outline"}
                  onClick={() => {
                    setHasPassport(true);
                    createOrUpdateMutation.mutate({ hasPassport: true });
                  }}
                  data-testid="button-has-passport-yes"
                >
                  Yes, I do
                </Button>
                <Button
                  type="button"
                  variant={hasPassport === false ? "default" : "outline"}
                  onClick={() => {
                    setHasPassport(false);
                    createOrUpdateMutation.mutate({ hasPassport: false });
                  }}
                  data-testid="button-has-passport-no"
                >
                  Not yet
                </Button>
              </div>
              {hasPassport === false && (
                <p className="mt-3 text-sm text-muted-foreground">
                  No problem — you can add your passport details here once you have it. Our consultants can help you get started.
                </p>
              )}
            </div>

            {hasPassport === true && (
          <Form {...passportForm}>
            <form onSubmit={handlePassportSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Passport Details
                      </CardTitle>
                      <CardDescription className="mt-1">Enter your passport information for visa and application purposes</CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExtractPassport}
                      disabled={extractPassportMutation.isPending}
                      data-testid="button-extract-passport"
                    >
                      {extractPassportMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Extract from Passport
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={passportForm.control}
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

                    <FormField
                      control={passportForm.control}
                      name="nationality"
                      render={({ field }) => {
                        const selectedCountry = getCountryByNationality(field.value || "");
                        return (
                          <FormItem>
                            <FormLabel>Nationality *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={selectedCountry?.nationality || field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-nationality">
                                  <SelectValue placeholder="Select nationality">
                                    {selectedCountry ? (
                                      <span className="flex items-center gap-2">
                                        <img 
                                          src={getFlagUrl(selectedCountry.code)} 
                                          alt={selectedCountry.name} 
                                          className="w-5 h-auto"
                                        />
                                        {selectedCountry.nationality}
                                      </span>
                                    ) : field.value ? (
                                      <span>{field.value}</span>
                                    ) : null}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {NATIONALITIES_SORTED.map((country) => (
                                  <SelectItem key={`nat-${country.code}`} value={country.nationality}>
                                    <span className="flex items-center gap-2">
                                      <img 
                                        src={getFlagUrl(country.code)} 
                                        alt={country.name}
                                        className="w-5 h-auto"
                                      />
                                      {country.nationality}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={passportForm.control}
                      name="passportNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport Number</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="e.g., AB1234567" data-testid="input-passport-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passportForm.control}
                      name="passportCountry"
                      render={({ field }) => {
                        const selectedCountry = getCountryByName(field.value || "");
                        return (
                          <FormItem>
                            <FormLabel>Country of Issue</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={selectedCountry?.name || field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-passport-country">
                                  <SelectValue placeholder="Select country">
                                    {selectedCountry ? (
                                      <span className="flex items-center gap-2">
                                        <img 
                                          src={getFlagUrl(selectedCountry.code)} 
                                          alt={selectedCountry.name} 
                                          className="w-5 h-auto"
                                        />
                                        {selectedCountry.name}
                                      </span>
                                    ) : field.value ? (
                                      <span>{field.value}</span>
                                    ) : null}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={`passport-${country.code}`} value={country.name}>
                                    <span className="flex items-center gap-2">
                                      <img 
                                        src={getFlagUrl(country.code)} 
                                        alt={country.name}
                                        className="w-5 h-auto"
                                      />
                                      {country.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={passportForm.control}
                      name="passportIssuedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} data-testid="input-passport-issued-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passportForm.control}
                      name="passportExpiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} data-testid="input-passport-expiry-date" />
                          </FormControl>
                          <FormDescription>
                            Ensure your passport is valid for at least 6 months beyond your intended travel dates
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={passportForm.control}
                      name="passportIssuingAuthority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issuing Authority</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="e.g., Department of Immigration" data-testid="input-passport-issuing-authority" />
                          </FormControl>
                          <FormDescription>
                            The government body or agency that issued your passport
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4">
                <SectionDocumentUpload section="passport_visa" compact />
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={createOrUpdateMutation.isPending}
                  data-testid="button-save-passport"
                >
                  {createOrUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Passport Details"
                  )}
                </Button>
              </div>
            </form>
          </Form>
            )}
          </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Education History */}
        <AccordionItem value="education" className="border rounded-lg px-4" data-testid="accordion-education">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-trigger-education">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-semibold">Education History</span>
              <CompletionBadge isComplete={completion?.completedSections?.education || false} isPartial={completion?.partialSections?.education || false} />
              <VerificationBadge status={getVerification('education')?.status} verifierName={getVerification('education')?.verifierName} verifierProfileImage={getVerification('education')?.verifierProfileImage} />
            </div>
          </AccordionTrigger>
          <AccordionContent>
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
                      {/* Country Dropdown (Required - triggers cascading qualification dropdown) */}
                      <FormField
                        control={educationForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country of Study *</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Reset qualification type when country changes
                                educationForm.setValue("qualificationTypeId", "");
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-education-country">
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {EDUCATION_COUNTRIES.map((country) => (
                                  <SelectItem key={country} value={country}>{country}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Qualification Type Dropdown (Cascading based on country) */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={educationForm.control}
                          name="qualificationTypeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qualification Type</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={!selectedEducationCountry || selectedEducationCountry === "Other"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-qualification-type">
                                    <SelectValue placeholder={
                                      !selectedEducationCountry 
                                        ? "Select country first" 
                                        : selectedEducationCountry === "Other"
                                        ? "Use legacy level below"
                                        : qualificationTypes.length === 0 
                                        ? "No qualifications found" 
                                        : "Select qualification"
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {qualificationTypes.map((qual: any) => (
                                    <SelectItem key={qual.id} value={qual.id}>
                                      {qual.name} {qual.fullName && qual.fullName !== qual.name ? `(${qual.fullName})` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                {selectedEducationCountry === "Other" 
                                  ? "For 'Other' countries, use the legacy education level field" 
                                  : "Select your qualification type for smart course matching"}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Legacy Level Dropdown (shown when qualification types unavailable) */}
                        {(selectedEducationCountry === "Other" || qualificationTypes.length === 0) && (
                          <FormField
                            control={educationForm.control}
                            name="level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Education Level</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-education-level">
                                      <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="primary">Primary School</SelectItem>
                                    <SelectItem value="secondary">Secondary School</SelectItem>
                                    <SelectItem value="high_school">High School</SelectItem>
                                    <SelectItem value="certificate">Certificate</SelectItem>
                                    <SelectItem value="diploma">Diploma</SelectItem>
                                    <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                                    <SelectItem value="master">Master's Degree</SelectItem>
                                    <SelectItem value="phd">PhD/Doctorate</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      
                      {/* Field of Study */}
                      <FormField
                        control={educationForm.control}
                        name="fieldOfStudy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Field of Study</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-field-of-study">
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {EDUCATION_DISCIPLINES.map((discipline) => (
                                  <SelectItem key={discipline} value={discipline}>{discipline}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Year Completed - hidden when currently studying */}
                      {!isCurrentlyStudying && (
                        <FormField
                          control={educationForm.control}
                          name="yearCompleted"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Year Completed</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-year-completed">
                                    <SelectValue placeholder="Select year" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {EDUCATION_YEARS.map((year) => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Currently Studying Checkbox - placed below Year Completed */}
                      <FormField
                        control={educationForm.control}
                        name="isCurrentlyStudying"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  if (checked) {
                                    educationForm.setValue("yearCompleted", "");
                                  }
                                }}
                                data-testid="checkbox-currently-studying"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>I am currently studying here</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {/* Institution Name */}
                      <FormField
                        control={educationForm.control}
                        name="institution"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Institution Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="e.g., Dhaka University, Sydney University" data-testid="input-education-institution" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Grade/Result (dynamic based on qualification grading type) */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={educationForm.control}
                          name="gradeResult"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Grade/Result</FormLabel>
                              {selectedQualificationType?.gradingType === "division" ? (
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-grade-result">
                                      <SelectValue placeholder="Select grade" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="First Division">First Division</SelectItem>
                                    <SelectItem value="Second Division">Second Division</SelectItem>
                                    <SelectItem value="Third Division">Third Division</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : selectedQualificationType?.gradingType === "letter" ? (
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-grade-result">
                                      <SelectValue placeholder="Select grade" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="A+">A+</SelectItem>
                                    <SelectItem value="A">A</SelectItem>
                                    <SelectItem value="A-">A-</SelectItem>
                                    <SelectItem value="B+">B+</SelectItem>
                                    <SelectItem value="B">B</SelectItem>
                                    <SelectItem value="B-">B-</SelectItem>
                                    <SelectItem value="C+">C+</SelectItem>
                                    <SelectItem value="C">C</SelectItem>
                                    <SelectItem value="C-">C-</SelectItem>
                                    <SelectItem value="D">D</SelectItem>
                                    <SelectItem value="F">F</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    value={field.value || ""} 
                                    placeholder={
                                      selectedQualificationType?.gradingType === "percentage" 
                                        ? "e.g., 85%" 
                                        : selectedQualificationType?.gradingType === "gpa" 
                                        ? `e.g., 3.5 out of ${selectedQualificationType?.gradingScale || "4.0"}` 
                                        : "e.g., 85%, 3.5 GPA, First Class"
                                    } 
                                    data-testid="input-grade-result" 
                                  />
                                </FormControl>
                              )}
                              <FormDescription>
                                {selectedQualificationType 
                                  ? `Grading: ${selectedQualificationType.gradingType || "Standard"} (${selectedQualificationType.gradingScale || "varies"})`
                                  : "Enter your grade or result"}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={educationForm.control}
                          name="gpa"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GPA (if applicable)</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., 3.8" data-testid="input-education-gpa" />
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
                      <TableHead>Qualification</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Field of Study</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {educations.map((edu: StudentEducation) => {
                      const qualName = (edu as any).qualificationType?.name || edu.level;
                      const displayLevel = qualName === "high_school" ? "High School" 
                        : qualName === "bachelor" ? "Bachelor's" 
                        : qualName === "master" ? "Master's" 
                        : qualName === "phd" ? "PhD" 
                        : qualName === "diploma" ? "Diploma" 
                        : qualName === "certificate" ? "Certificate"
                        : qualName || "N/A";
                      
                      return (
                      <TableRow key={edu.id} data-testid={`row-education-${edu.id}`}>
                        <TableCell data-testid={`text-education-level-${edu.id}`}>
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary">{displayLevel}</Badge>
                            {edu.country && <span className="text-xs text-muted-foreground">{edu.country}</span>}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-education-institution-${edu.id}`}>{edu.institution || "-"}</TableCell>
                        <TableCell data-testid={`text-education-field-${edu.id}`}>{edu.fieldOfStudy || "-"}</TableCell>
                        <TableCell data-testid={`text-education-dates-${edu.id}`}>
                          {(edu as any).yearCompleted 
                            ? `${(edu as any).yearCompleted}` 
                            : edu.startDate 
                            ? `${edu.startDate} - ${edu.isCurrentlyStudying ? "Present" : edu.endDate || "N/A"}`
                            : "-"}
                        </TableCell>
                        <TableCell data-testid={`text-education-gpa-${edu.id}`}>
                          {(edu as any).gradeResult || (edu.gpa ? `${edu.gpa}${edu.gradeScale ? `/${edu.gradeScale}` : ""}` : "-")}
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
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="mt-4">
            <SectionDocumentUpload section="education" compact />
          </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: English Proficiency */}
        <AccordionItem value="language" className="border rounded-lg px-4" data-testid="accordion-language">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-trigger-language">
            <div className="flex items-center gap-3">
              <Languages className="h-5 w-5 text-primary" />
              <span className="font-semibold">English Proficiency</span>
              <CompletionBadge isComplete={completion?.completedSections?.languageTest || false} isPartial={completion?.partialSections?.languageTest || false} />
              <VerificationBadge status={getVerification('language')?.status} verifierName={getVerification('language')?.verifierName} verifierProfileImage={getVerification('language')?.verifierProfileImage} />
            </div>
          </AccordionTrigger>
          <AccordionContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium mb-3">Have you completed an English language test?</p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={hasEnglishTest === true ? "default" : "outline"}
                  onClick={() => {
                    setHasEnglishTest(true);
                    createOrUpdateMutation.mutate({ hasEnglishTest: true });
                  }}
                  data-testid="button-has-english-yes"
                >
                  Yes, I have
                </Button>
                <Button
                  type="button"
                  variant={hasEnglishTest === false ? "default" : "outline"}
                  onClick={() => {
                    setHasEnglishTest(false);
                    createOrUpdateMutation.mutate({ hasEnglishTest: false });
                  }}
                  data-testid="button-has-english-no"
                >
                  Not yet
                </Button>
              </div>
              {hasEnglishTest === false && (
                <p className="mt-3 text-sm text-muted-foreground">
                  No problem — you can add your test scores once you have completed an English language test.
                </p>
              )}
            </div>

            {hasEnglishTest === true && (<>
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
                      {(() => {
                        const selectedTestType = languageScoreForm.watch("testType");
                        const listeningScore = languageScoreForm.watch("listeningScore");
                        const readingScore = languageScoreForm.watch("readingScore");
                        const writingScore = languageScoreForm.watch("writingScore");
                        const speakingScore = languageScoreForm.watch("speakingScore");
                        const currentOverallScore = languageScoreForm.watch("overallScore");
                        
                        const scoreConfig: Record<string, { range: string; overall: string; section: string; sectionRange: string; step: string; supportsAutoCalc: boolean }> = {
                          ielts: { range: "0-9", overall: "e.g., 7.5", section: "e.g., 7.0", sectionRange: "0-9", step: "0.5", supportsAutoCalc: true },
                          toefl: { range: "0-120", overall: "e.g., 100", section: "e.g., 25", sectionRange: "0-30", step: "1", supportsAutoCalc: true },
                          pte: { range: "10-90", overall: "e.g., 75", section: "e.g., 70", sectionRange: "10-90", step: "1", supportsAutoCalc: false },
                          duolingo: { range: "10-160", overall: "e.g., 120", section: "e.g., 115", sectionRange: "10-160", step: "5", supportsAutoCalc: false },
                        };
                        const config = scoreConfig[selectedTestType] || scoreConfig.ielts;
                        
                        // Calculate IELTS overall score using official rounding rules:
                        // - Fractions ending in .25 round UP to next .5 band (e.g., 6.25 → 6.5)
                        // - Fractions ending in .75 round UP to next whole band (e.g., 6.75 → 7.0)
                        // - Other fractions round to nearest .5 normally
                        const calculateIeltsOverall = (l: number, r: number, w: number, s: number): string => {
                          const avg = (l + r + w + s) / 4;
                          const decimal = avg - Math.floor(avg);
                          let rounded: number;
                          
                          if (decimal >= 0.75) {
                            // .75 and above rounds up to next whole band
                            rounded = Math.ceil(avg);
                          } else if (decimal >= 0.25) {
                            // .25 to .74 rounds to .5
                            rounded = Math.floor(avg) + 0.5;
                          } else {
                            // Below .25 rounds down to whole band
                            rounded = Math.floor(avg);
                          }
                          
                          return rounded.toFixed(1);
                        };
                        
                        // Calculate TOEFL overall score (sum of all sections)
                        const calculateToeflOverall = (l: number, r: number, w: number, s: number): string => {
                          const total = l + r + w + s;
                          return total.toString();
                        };
                        
                        // Check if all band scores are filled
                        const hasAllBandScores = listeningScore && readingScore && writingScore && speakingScore;
                        
                        // Calculate auto score if applicable
                        let autoCalculatedScore: string | null = null;
                        let isAutoCalculated = false;
                        
                        if (hasAllBandScores && config.supportsAutoCalc) {
                          const l = parseFloat(listeningScore);
                          const r = parseFloat(readingScore);
                          const w = parseFloat(writingScore);
                          const s = parseFloat(speakingScore);
                          
                          if (!isNaN(l) && !isNaN(r) && !isNaN(w) && !isNaN(s)) {
                            if (selectedTestType === "ielts") {
                              autoCalculatedScore = calculateIeltsOverall(l, r, w, s);
                            } else if (selectedTestType === "toefl") {
                              autoCalculatedScore = calculateToeflOverall(l, r, w, s);
                            }
                            
                            // Auto-update the overall score field if it matches calculated or is empty
                            if (autoCalculatedScore && (currentOverallScore === autoCalculatedScore || !currentOverallScore)) {
                              isAutoCalculated = true;
                              // Set the value if not already set
                              if (currentOverallScore !== autoCalculatedScore) {
                                languageScoreForm.setValue("overallScore", autoCalculatedScore);
                              }
                            }
                          }
                        }
                        
                        return (
                          <>
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
                            
                            {selectedTestType && (
                              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md space-y-1">
                                <p>Score range for {selectedTestType.toUpperCase()}: <strong>{config.range}</strong></p>
                                {config.supportsAutoCalc ? (
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    Overall score will be auto-calculated when you enter all band scores
                                  </p>
                                ) : (
                                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                    {selectedTestType === "pte" ? "PTE uses a proprietary algorithm - enter your official overall score" : 
                                     "Duolingo uses a proprietary algorithm - enter your official overall score"}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                control={languageScoreForm.control}
                                name="listeningScore"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Listening {selectedTestType && `(${config.sectionRange})`}</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value || ""} placeholder={config.section} data-testid="input-language-listening" />
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
                                    <FormLabel>Reading {selectedTestType && `(${config.sectionRange})`}</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value || ""} placeholder={config.section} data-testid="input-language-reading" />
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
                                    <FormLabel>Writing {selectedTestType && `(${config.sectionRange})`}</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value || ""} placeholder={config.section} data-testid="input-language-writing" />
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
                                    <FormLabel>Speaking {selectedTestType && `(${config.sectionRange})`}</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value || ""} placeholder={config.section} data-testid="input-language-speaking" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <FormField
                              control={languageScoreForm.control}
                              name="overallScore"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Overall Score * {selectedTestType && `(${config.range})`}</FormLabel>
                                    {isAutoCalculated && autoCalculatedScore && (
                                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" data-testid="badge-auto-calculated">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Auto-calculated
                                      </Badge>
                                    )}
                                  </div>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder={config.overall} 
                                      data-testid="input-language-overall-score"
                                      className={isAutoCalculated ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : ""}
                                    />
                                  </FormControl>
                                  {config.supportsAutoCalc && autoCalculatedScore && currentOverallScore !== autoCalculatedScore && currentOverallScore && (
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                      Calculated score: {autoCalculatedScore} (you entered a different value - this is allowed if your official score differs)
                                    </p>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        );
                      })()}
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

          <div className="mt-4">
            <SectionDocumentUpload section="english_proficiency" compact />
          </div>
          </>)}
          </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 6: Work Experience */}
        <AccordionItem value="employment" className="border rounded-lg px-4" data-testid="accordion-employment">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-trigger-employment">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="font-semibold">Work Experience</span>
              <CompletionBadge isComplete={completion?.completedSections?.employment || false} isPartial={completion?.partialSections?.employment || false} isOptional />
              <VerificationBadge status={getVerification('employment')?.status} verifierName={getVerification('employment')?.verifierName} verifierProfileImage={getVerification('employment')?.verifierProfileImage} />
            </div>
          </AccordionTrigger>
          <AccordionContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium mb-3">Do you have work experience?</p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={hasWorkExperience === true ? "default" : "outline"}
                  onClick={() => {
                    setHasWorkExperience(true);
                    createOrUpdateMutation.mutate({ hasWorkExperience: true });
                  }}
                  data-testid="button-has-work-yes"
                >
                  Yes, I do
                </Button>
                <Button
                  type="button"
                  variant={hasWorkExperience === false ? "default" : "outline"}
                  onClick={() => {
                    setHasWorkExperience(false);
                    createOrUpdateMutation.mutate({ hasWorkExperience: false });
                  }}
                  data-testid="button-has-work-no"
                >
                  No, I don&apos;t
                </Button>
              </div>
              {hasWorkExperience === false && (
                <p className="mt-3 text-sm text-muted-foreground">
                  No problem — you can update this section whenever you gain work experience in the future.
                </p>
              )}
            </div>

            {hasWorkExperience === true && (<>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Employment History</CardTitle>
                <CardDescription>Add your work experience (optional but improves AI-generated content)</CardDescription>
              </div>
              <Dialog open={employmentDialogOpen} onOpenChange={setEmploymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddEmployment} data-testid="button-add-employment">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Employment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingEmployment ? "Edit Employment" : "Add Employment"}</DialogTitle>
                    <DialogDescription>
                      {editingEmployment ? "Update your employment details" : "Add a new employment record"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...employmentForm}>
                    <form onSubmit={handleEmploymentSubmit} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={employmentForm.control}
                          name="jobTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Title *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Software Developer" data-testid="input-employment-job-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={employmentForm.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Company name" data-testid="input-employment-company" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={employmentForm.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., Technology" data-testid="input-employment-industry" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={employmentForm.control}
                          name="employmentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employment Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-employment-type">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="full-time">Full-time</SelectItem>
                                  <SelectItem value="part-time">Part-time</SelectItem>
                                  <SelectItem value="contract">Contract</SelectItem>
                                  <SelectItem value="internship">Internship</SelectItem>
                                  <SelectItem value="freelance">Freelance</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={employmentForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., Australia" data-testid="input-employment-country" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={employmentForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="e.g., Melbourne" data-testid="input-employment-city" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={employmentForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} type="date" data-testid="input-employment-start-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={employmentForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value || ""} 
                                  type="date" 
                                  disabled={employmentForm.watch("isCurrentlyWorking")}
                                  data-testid="input-employment-end-date" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={employmentForm.control}
                        name="isCurrentlyWorking"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-currently-working"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">I am currently working here</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={employmentForm.control}
                        name="responsibilities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Key Responsibilities</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""} 
                                placeholder="Describe your main responsibilities and duties..."
                                className="min-h-[80px]"
                                data-testid="textarea-employment-responsibilities" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={employmentForm.control}
                        name="achievements"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Key Achievements</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""} 
                                placeholder="Highlight any notable achievements or accomplishments..."
                                className="min-h-[80px]"
                                data-testid="textarea-employment-achievements" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEmploymentDialogOpen(false)}
                          data-testid="button-cancel-employment"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createEmploymentMutation.isPending}
                          data-testid="button-save-employment"
                        >
                          {createEmploymentMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Employment"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {employments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No employment history yet</p>
                  <p className="text-sm mb-4">Adding work experience helps generate more personalized AI content</p>
                  <Button onClick={handleAddEmployment} data-testid="button-add-employment-empty">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Job
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employments.map((emp: StudentEmployment) => (
                      <TableRow key={emp.id} data-testid={`row-employment-${emp.id}`}>
                        <TableCell data-testid={`text-employment-title-${emp.id}`}>
                          <div className="font-medium">{emp.jobTitle}</div>
                          {emp.employmentType && (
                            <Badge variant="secondary" className="mt-1">
                              {emp.employmentType.replace('-', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-employment-company-${emp.id}`}>
                          <div>{emp.company}</div>
                          {emp.industry && <span className="text-sm text-muted-foreground">{emp.industry}</span>}
                        </TableCell>
                        <TableCell data-testid={`text-employment-duration-${emp.id}`}>
                          <div className="text-sm">
                            {emp.startDate || "N/A"} - {emp.isCurrentlyWorking ? "Present" : emp.endDate || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-employment-location-${emp.id}`}>
                          {[emp.city, emp.country].filter(Boolean).join(", ") || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEmployment(emp)}
                              data-testid={`button-edit-employment-${emp.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this employment record?")) {
                                  deleteEmploymentMutation.mutate(emp.id);
                                }
                              }}
                              disabled={deleteEmploymentMutation.isPending}
                              data-testid={`button-delete-employment-${emp.id}`}
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

          <div className="mt-4">
            <SectionDocumentUpload section="work_experience" compact />
          </div>
            </>)}
          </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 7: Financial/Sponsor Information */}
        <AccordionItem value="funding" className="border rounded-lg px-4" data-testid="accordion-funding">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-trigger-funding">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold">Financial / Sponsor Information</span>
              <CompletionBadge isComplete={completion?.completedSections?.funding || false} isPartial={completion?.partialSections?.funding || false} />
              <VerificationBadge status={getVerification('funding')?.status} verifierName={getVerification('funding')?.verifierName} verifierProfileImage={getVerification('funding')?.verifierProfileImage} />
            </div>
          </AccordionTrigger>
          <AccordionContent>
          <Form {...fundingForm}>
            <form onSubmit={handleFundingSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Funding Details</CardTitle>
                  <CardDescription>How will you fund your studies?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={fundingForm.control}
                    name="fundingSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funding Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-funding-source">
                              <SelectValue placeholder="Select funding source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FUNDING_SOURCES.map((source) => (
                              <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showSponsorFields && (
                    <>
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-4">Sponsor Details</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={fundingForm.control}
                            name="sponsorName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sponsor Name</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} placeholder="Full name of sponsor" data-testid="input-sponsor-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={fundingForm.control}
                            name="sponsorRelationship"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Relationship</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-sponsor-relationship">
                                      <SelectValue placeholder="Select relationship" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {SPONSOR_RELATIONSHIPS.map((rel) => (
                                      <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={fundingForm.control}
                            name="sponsorOccupation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Occupation</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} placeholder="Sponsor's occupation" data-testid="input-sponsor-occupation" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={fundingForm.control}
                            name="sponsorPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} placeholder="Sponsor's phone" data-testid="input-sponsor-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={fundingForm.control}
                            name="sponsorEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} type="email" placeholder="Sponsor's email" data-testid="input-sponsor-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={fundingForm.control}
                          name="sponsorAddress"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value || ""} placeholder="Sponsor's full address" data-testid="input-sponsor-address" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="mt-4">
                <SectionDocumentUpload section="financial" compact />
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={createOrUpdateMutation.isPending}
                  data-testid="button-save-funding"
                >
                  {createOrUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
          </AccordionContent>
        </AccordionItem>

        {/* Section 8: Emergency Contact */}
        <AccordionItem value="emergency" className="border rounded-lg px-4" data-testid="accordion-emergency">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-trigger-emergency">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <span className="font-semibold">Emergency Contact</span>
              <CompletionBadge isComplete={completion?.completedSections?.emergency || false} isPartial={completion?.partialSections?.emergency || false} />
              <VerificationBadge status={getVerification('emergency')?.status} verifierName={getVerification('emergency')?.verifierName} verifierProfileImage={getVerification('emergency')?.verifierProfileImage} />
            </div>
          </AccordionTrigger>
          <AccordionContent>
          <Form {...emergencyForm}>
            <form onSubmit={handleEmergencySubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-accent" />
                    Emergency Contact
                  </CardTitle>
                  <CardDescription>
                    Provide details of someone we can contact in case of an emergency
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={emergencyForm.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., John Smith"
                              data-testid="input-emergency-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={emergencyForm.control}
                      name="emergencyContactMobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Mobile</FormLabel>
                          <FormControl>
                            <PhoneInput
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="e.g., +61 400 000 000"
                              data-testid="input-emergency-mobile"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={emergencyForm.control}
                      name="emergencyContactRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-emergency-relationship">
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="spouse">Spouse</SelectItem>
                              <SelectItem value="sibling">Sibling</SelectItem>
                              <SelectItem value="relative">Other Relative</SelectItem>
                              <SelectItem value="friend">Friend</SelectItem>
                              <SelectItem value="guardian">Legal Guardian</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={emergencyForm.control}
                      name="emergencyContactAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., 123 Main St, Sydney NSW 2000"
                              data-testid="input-emergency-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button
                  type="submit"
                  disabled={createOrUpdateMutation.isPending}
                  data-testid="button-save-emergency"
                >
                  {createOrUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Emergency Contact"
                  )}
                </Button>
              </div>
            </form>
          </Form>
          </AccordionContent>
        </AccordionItem>

        {/* Section 9: Marital Status */}
        <AccordionItem value="marital" className="border rounded-lg px-4" data-testid="accordion-marital">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-trigger-marital">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-primary" />
              <span className="font-semibold">Marital Status</span>
              <CompletionBadge isComplete={completion?.completedSections?.marital || false} isPartial={completion?.partialSections?.marital || false} isOptional />
            </div>
          </AccordionTrigger>
          <AccordionContent>
          <Form {...maritalForm}>
            <form onSubmit={handleMaritalSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Marital Status</CardTitle>
                  <CardDescription>Your current relationship status as it appears on official documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={maritalForm.control}
                    name="maritalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-marital-status">
                              <SelectValue placeholder="Select marital status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="de_facto">De Facto</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                            <SelectItem value="separated">Separated</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {showSpouseFields && (
                <Card>
                  <CardHeader>
                    <CardTitle>Partner / Spouse Details</CardTitle>
                    <CardDescription>Details about your partner as they appear on official documents</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={maritalForm.control}
                        name="spouseFirstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="Partner's first name" data-testid="input-spouse-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={maritalForm.control}
                        name="spouseLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="Partner's last name" data-testid="input-spouse-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={maritalForm.control}
                        name="spouseDateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} type="date" data-testid="input-spouse-dob" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={maritalForm.control}
                        name="spouseNationality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nationality</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-spouse-nationality">
                                  <SelectValue placeholder="Select nationality" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {NATIONALITIES_SORTED.map((nat) => (
                                  <SelectItem key={String(nat)} value={String(nat)}>{String(nat)}</SelectItem>
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
                        control={maritalForm.control}
                        name="spouseCountryOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country of Birth</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-spouse-country-of-birth">
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {COUNTRIES.map((c) => (
                                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={maritalForm.control}
                        name="spousePassportNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passport Number <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="e.g. AB1234567" data-testid="input-spouse-passport" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="font-medium mb-3">Will your partner be accompanying you to Australia?</p>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={maritalForm.watch("spouseIsAccompanying") === true ? "default" : "outline"}
                          onClick={() => maritalForm.setValue("spouseIsAccompanying", true)}
                          data-testid="button-spouse-accompanying-yes"
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant={maritalForm.watch("spouseIsAccompanying") === false ? "default" : "outline"}
                          onClick={() => maritalForm.setValue("spouseIsAccompanying", false)}
                          data-testid="button-spouse-accompanying-no"
                        >
                          No
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={createOrUpdateMutation.isPending}
                  data-testid="button-save-marital"
                >
                  {createOrUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <StudentLayout breadcrumbTitle="My Profile">
      <StudentProfileContent />
    </StudentLayout>
  );
}
