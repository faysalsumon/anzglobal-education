import { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, FileText, Globe, Tag, X, Plus, Trash2, Star, Edit, CalendarIcon, Sparkles, Monitor, Briefcase, Target, Factory, Users, ChevronDown, Check, GraduationCap, DollarSign, FileCheck, ExternalLink, Building2, BookOpen, HelpCircle, AlertCircle, Info, Languages, Save, Image, Lock } from "lucide-react";
import { 
  FRAMEWORK_CONFIGS, 
  ALL_FRAMEWORKS, 
  getFrameworksForCountry, 
  getDefaultFramework,
  type QualificationFramework 
} from "@shared/qualification-frameworks";
import { 
  detectDisciplineRules, 
  type DisciplineRule 
} from "@shared/discipline-rules";
import {
  type IntakeTemplate as BaseIntakeTemplate,
  MONTH_NAMES,
  getCountryIntakeRecommendations,
  computeIntakesFromTemplates,
} from "@shared/intake-utils";
import type { CourseIntakeDate } from "@shared/schema";

// Local simplified type for intake template state (without required nullable fields for new templates)
interface LocalIntakeTemplate {
  id: string;
  courseId: string;
  month: number;
  startDay: number;
  deadlineWeeksBefore: number;
  openMonthsBefore: number;
  intakeName?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// English language test types configuration
const TEST_TYPE_CONFIG: Record<string, { 
  label: string; 
  maxOverall: number; 
  maxBand: number;
  range: string;
  sectionRange: string;
  overallPlaceholder: string;
  sectionPlaceholder: string;
  step: string;
  supportsAutoCalc: boolean;
}> = {
  ielts: { 
    label: "IELTS", 
    maxOverall: 9, 
    maxBand: 9,
    range: "0-9",
    sectionRange: "0-9",
    overallPlaceholder: "e.g., 6.5",
    sectionPlaceholder: "e.g., 6.0",
    step: "0.5",
    supportsAutoCalc: true,
  },
  toefl: { 
    label: "TOEFL iBT", 
    maxOverall: 120, 
    maxBand: 30,
    range: "0-120",
    sectionRange: "0-30",
    overallPlaceholder: "e.g., 80",
    sectionPlaceholder: "e.g., 20",
    step: "1",
    supportsAutoCalc: true,
  },
  pte: { 
    label: "PTE Academic", 
    maxOverall: 90, 
    maxBand: 90,
    range: "10-90",
    sectionRange: "10-90",
    overallPlaceholder: "e.g., 65",
    sectionPlaceholder: "e.g., 60",
    step: "1",
    supportsAutoCalc: false,
  },
  duolingo: { 
    label: "Duolingo", 
    maxOverall: 160, 
    maxBand: 160,
    range: "10-160",
    sectionRange: "10-160",
    overallPlaceholder: "e.g., 110",
    sectionPlaceholder: "e.g., 105",
    step: "5",
    supportsAutoCalc: false,
  },
};

// English test score equivalency table with ranges (based on official conversion charts)
// Using IELTS as the base reference since it's the most commonly used
// Ranges are [min, max) - min is inclusive, max is exclusive
const SCORE_EQUIVALENCY_TABLE: { 
  ielts: number; 
  toefl: { min: number; max: number; section: number }; 
  pte: { min: number; max: number; section: number }; 
  duolingo: { min: number; max: number; section: number };
}[] = [
  { ielts: 4.0, toefl: { min: 0, max: 35, section: 8 }, pte: { min: 10, max: 36, section: 30 }, duolingo: { min: 10, max: 75, section: 65 } },
  { ielts: 4.5, toefl: { min: 35, max: 46, section: 9 }, pte: { min: 36, max: 42, section: 36 }, duolingo: { min: 75, max: 85, section: 75 } },
  { ielts: 5.0, toefl: { min: 46, max: 60, section: 12 }, pte: { min: 42, max: 50, section: 42 }, duolingo: { min: 85, max: 95, section: 85 } },
  { ielts: 5.5, toefl: { min: 60, max: 78, section: 15 }, pte: { min: 50, max: 58, section: 50 }, duolingo: { min: 95, max: 105, section: 95 } },
  { ielts: 6.0, toefl: { min: 78, max: 88, section: 20 }, pte: { min: 58, max: 65, section: 58 }, duolingo: { min: 105, max: 115, section: 105 } },
  { ielts: 6.5, toefl: { min: 88, max: 98, section: 22 }, pte: { min: 65, max: 73, section: 65 }, duolingo: { min: 115, max: 125, section: 115 } },
  { ielts: 7.0, toefl: { min: 98, max: 107, section: 25 }, pte: { min: 73, max: 79, section: 73 }, duolingo: { min: 125, max: 135, section: 125 } },
  { ielts: 7.5, toefl: { min: 107, max: 113, section: 27 }, pte: { min: 79, max: 85, section: 79 }, duolingo: { min: 135, max: 145, section: 135 } },
  { ielts: 8.0, toefl: { min: 113, max: 117, section: 28 }, pte: { min: 85, max: 88, section: 85 }, duolingo: { min: 145, max: 155, section: 145 } },
  { ielts: 8.5, toefl: { min: 117, max: 120, section: 29 }, pte: { min: 88, max: 90, section: 88 }, duolingo: { min: 155, max: 160, section: 155 } },
  { ielts: 9.0, toefl: { min: 120, max: 121, section: 30 }, pte: { min: 90, max: 91, section: 90 }, duolingo: { min: 160, max: 161, section: 160 } },
];

// Find the equivalent IELTS band for a given overall score using range-based lookup
const findEquivalentIeltsBand = (testType: string, overallScore: number): number | null => {
  if (testType === 'ielts') {
    // Round to nearest 0.5 for IELTS
    const rounded = Math.round(overallScore * 2) / 2;
    return Math.max(4.0, Math.min(9.0, rounded));
  }
  
  // Find the range that contains this score
  for (const row of SCORE_EQUIVALENCY_TABLE) {
    const range = row[testType as keyof typeof row];
    if (typeof range === 'object' && 'min' in range && 'max' in range) {
      if (overallScore >= range.min && overallScore < range.max) {
        return row.ielts;
      }
    }
  }
  
  // If score is above max, return highest band
  const lastRow = SCORE_EQUIVALENCY_TABLE[SCORE_EQUIVALENCY_TABLE.length - 1];
  const lastRange = lastRow[testType as keyof typeof lastRow];
  if (typeof lastRange === 'object' && 'min' in lastRange && overallScore >= lastRange.min) {
    return lastRow.ielts;
  }
  
  // If score is below min, return lowest band
  return SCORE_EQUIVALENCY_TABLE[0].ielts;
};

// Convert a score from one test type to another using range-based equivalency
const convertScore = (fromType: string, toType: string, overallScore: number, bandScore?: number): { overall: number; section: number } | null => {
  // First, find equivalent IELTS band using ranges
  const ieltsBand = findEquivalentIeltsBand(fromType, overallScore);
  if (ieltsBand === null) return null;
  
  // Find the exact matching row for this IELTS band
  const row = SCORE_EQUIVALENCY_TABLE.find(r => r.ielts === ieltsBand);
  if (!row) {
    // Find closest row if exact match not found
    const closest = SCORE_EQUIVALENCY_TABLE.reduce((prev, curr) => 
      Math.abs(curr.ielts - ieltsBand) < Math.abs(prev.ielts - ieltsBand) ? curr : prev
    );
    if (!closest) return null;
    
    if (toType === 'ielts') {
      return { overall: closest.ielts, section: bandScore || closest.ielts };
    }
    const targetScores = closest[toType as keyof typeof closest];
    if (typeof targetScores === 'object' && 'min' in targetScores) {
      return { overall: targetScores.min, section: targetScores.section };
    }
    return null;
  }
  
  if (toType === 'ielts') {
    return { overall: row.ielts, section: bandScore || row.ielts };
  }
  
  const targetScores = row[toType as keyof typeof row];
  if (typeof targetScores === 'object' && 'min' in targetScores) {
    // Return the minimum of the range as the equivalent score
    return { overall: targetScores.min, section: targetScores.section };
  }
  return null;
};

// Generate all equivalent test requirements from a base test
const generateEquivalentRequirements = (
  baseTestType: string,
  overallScore: number,
  bandScores?: { listening?: number; reading?: number; writing?: number; speaking?: number }
): Array<{
  testType: string;
  minOverallScore: string;
  minListeningScore?: string;
  minReadingScore?: string;
  minWritingScore?: string;
  minSpeakingScore?: string;
}> => {
  const results: Array<{
    testType: string;
    minOverallScore: string;
    minListeningScore?: string;
    minReadingScore?: string;
    minWritingScore?: string;
    minSpeakingScore?: string;
  }> = [];
  
  const testTypes = Object.keys(TEST_TYPE_CONFIG);
  
  for (const testType of testTypes) {
    if (testType === baseTestType) {
      // Include original test with its exact scores
      results.push({
        testType,
        minOverallScore: overallScore.toString(),
        minListeningScore: bandScores?.listening?.toString(),
        minReadingScore: bandScores?.reading?.toString(),
        minWritingScore: bandScores?.writing?.toString(),
        minSpeakingScore: bandScores?.speaking?.toString(),
      });
    } else {
      const converted = convertScore(baseTestType, testType, overallScore, bandScores?.listening);
      if (converted) {
        const result: typeof results[0] = {
          testType,
          minOverallScore: converted.overall.toString(),
        };
        // Include section scores for all test types that have them
        if (converted.section) {
          result.minListeningScore = converted.section.toString();
          result.minReadingScore = converted.section.toString();
          result.minWritingScore = converted.section.toString();
          result.minSpeakingScore = converted.section.toString();
        }
        results.push(result);
      }
    }
  }
  
  return results;
};

// Calculate IELTS overall score using official rounding rules
const calculateIeltsOverall = (l: number, r: number, w: number, s: number): string => {
  const avg = (l + r + w + s) / 4;
  const decimal = avg - Math.floor(avg);
  let rounded: number;
  
  if (decimal >= 0.75) {
    rounded = Math.ceil(avg);
  } else if (decimal >= 0.25) {
    rounded = Math.floor(avg) + 0.5;
  } else {
    rounded = Math.floor(avg);
  }
  
  return rounded.toFixed(1);
};

// Calculate TOEFL overall score (sum of all sections)
const calculateToeflOverall = (l: number, r: number, w: number, s: number): string => {
  return (l + r + w + s).toString();
};

// Helper to compute auto-calculated overall score and determine if it should be auto-set
const computeAutoOverallScore = (
  testType: string,
  listening: string,
  reading: string,
  writing: string,
  speaking: string,
  currentOverall: string
): { autoScore: string | null; shouldAutoSet: boolean } => {
  const config = TEST_TYPE_CONFIG[testType];
  if (!config?.supportsAutoCalc) {
    return { autoScore: null, shouldAutoSet: false };
  }
  
  const l = parseFloat(listening);
  const r = parseFloat(reading);
  const w = parseFloat(writing);
  const s = parseFloat(speaking);
  
  // All band scores must be valid numbers
  if (isNaN(l) || isNaN(r) || isNaN(w) || isNaN(s)) {
    return { autoScore: null, shouldAutoSet: false };
  }
  
  let autoScore: string;
  if (testType === "ielts") {
    autoScore = calculateIeltsOverall(l, r, w, s);
  } else if (testType === "toefl") {
    autoScore = calculateToeflOverall(l, r, w, s);
  } else {
    return { autoScore: null, shouldAutoSet: false };
  }
  
  // Only auto-set if current overall is empty or matches the calculated value
  const shouldAutoSet = !currentOverall || currentOverall === autoScore;
  
  return { autoScore, shouldAutoSet };
};

interface EnglishRequirement {
  id: string;
  courseId: string;
  testType: string;
  minOverallScore: string;
  minListeningScore: string | null;
  minReadingScore: string | null;
  minWritingScore: string | null;
  minSpeakingScore: string | null;
  notes: string | null;
  isPreferred: boolean;
}

const optionalPositiveInt = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().positive().optional()
);

const optionalPositiveNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().positive().optional()
);

const optionalNonNegativeNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().nonnegative().optional()
);

const optionalIntPercentage = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().min(0).max(100).optional()
);

const optionalUrl = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().url().optional()
);

const courseSchema = z.object({
  universityId: z.string().min(1, "Institution is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subject: z.string().optional(),
  qualificationFramework: z.string().optional(),
  level: z.string().optional(),
  customLevel: z.string().optional(),
  discipline: z.string().optional(),
  subDisciplineId: z.string().optional(),
  specialization: z.string().optional(),
  duration: z.string().optional(),
  durationMonths: optionalPositiveInt,
  durationWeeks: optionalPositiveInt,
  fees: optionalPositiveNumber,
  applicationFees: optionalNonNegativeNumber,
  currency: z.string().optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  startDate: z.string().optional(),
  applicationDeadline: z.string().optional(),
  intakes: z.string().optional(),
  prerequisites: z.string().optional(),
  eligibilityRequirements: z.string().optional(),
  englishRequirements: z.string().optional(),
  courseCode: z.string().optional(),
  cricosCode: z.string().optional(),
  isCricosRegistered: z.boolean().optional(),
  admissionFee: optionalNonNegativeNumber,
  sourceUrl: z.string().url().optional().or(z.literal("")),
  pathways: z.string().optional(),
  studyAreas: z.string().optional(),
  careerOutcomes: z.string().optional(),
  careerPath: z.string().optional(),
  deliveryMode: z.string().optional(),
  internshipAvailable: z.boolean().optional(),
  internshipDetails: z.string().optional(),
  minimumAge: optionalPositiveInt,
  prPathway: z.boolean().optional(),
});

interface Institution {
  id: string;
  name: string;
  logo?: string | null;
  campusAddresses?: Array<{
    name?: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  }> | null;
}

interface Course {
  id: string;
  universityId: string;
  title: string;
  description: string | null;
  duration: string | null;
  fees: number | null;
  qualificationFramework: string | null;
  level: string | null;
  customLevel: string | null;
  subject: string;
  discipline?: string | null;
  subDisciplineId?: string | null;
  specialization?: string | null;
  durationMonths?: number | null;
  durationWeeks?: number | null;
  applicationFees?: number | null;
  currency?: string | null;
  location?: string | null;
  country?: string | null;
  startDate?: string | null;
  applicationDeadline?: string | null;
  intakes?: string[] | null;
  prerequisites?: string | null;
  eligibilityRequirements?: string | null;
  englishRequirements?: string | null;
  courseCode?: string | null;
  cricosCode?: string | null;
  isCricosRegistered?: boolean | null;
  admissionFee?: number | null;
  sourceUrl?: string | null;
  pathways?: string[] | null;
  studyAreas?: string[] | null;
  careerOutcomes?: string[] | null;
  careerPath?: string | null;
  deliveryMode?: string | null;
  internshipAvailable?: boolean | null;
  internshipDetails?: string | null;
  minimumAge?: number | null;
  prPathway?: boolean | null;
  campusLocations?: string[] | null;
  thumbnailUrl?: string | null;
  thumbnailStatus?: string | null;
  thumbnailGeneratedAt?: string | null;
  availableMarkets?: string[] | null;
  featuredMarkets?: string[] | null;
  isActive: boolean;
  approvalStatus: string;
  publishStatus?: string | null;
}

interface TagType {
  id: string;
  name: string;
  slug: string;
  category: 'feature' | 'delivery' | 'career' | 'skill' | 'industry' | 'audience';
  description: string | null;
  color: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface ScholarshipType {
  id: string;
  institutionId: string;
  name: string;
  description: string | null;
  valueType: 'percentage' | 'fixed';
  value: number;
  currency: string | null;
  status: 'open' | 'not_open_yet' | 'closed';
  startDate: string | null;
  endDate: string | null;
  eligibility: string | null;
  applicationUrl: string | null;
}

const SCHOLARSHIP_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  not_open_yet: 'Not Open Yet',
  closed: 'Closed',
};

const TAG_CATEGORY_LABELS: Record<string, { label: string; description: string; icon: typeof Sparkles }> = {
  feature: { label: 'Features', description: 'Course features', icon: Sparkles },
  delivery: { label: 'Delivery', description: 'How the course is delivered', icon: Monitor },
  career: { label: 'Career', description: 'Career outcomes', icon: Briefcase },
  skill: { label: 'Skills', description: 'Skills and learning approaches', icon: Target },
  industry: { label: 'Industry', description: 'Industry sectors', icon: Factory },
  audience: { label: 'Audience', description: 'Target students', icon: Users },
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'australia': 'AUD',
  'new zealand': 'NZD',
  'united kingdom': 'GBP',
  'uk': 'GBP',
  'england': 'GBP',
  'scotland': 'GBP',
  'wales': 'GBP',
  'united states': 'USD',
  'united states of america': 'USD',
  'usa': 'USD',
  'us': 'USD',
  'canada': 'CAD',
};

function getCurrencyForCountry(country: string): string {
  if (!country) return 'AUD';
  return COUNTRY_CURRENCY_MAP[country.toLowerCase().trim()] || 'AUD';
}

interface CourseEditorProps {
  course?: Course | null;
  institutions: Institution[];
  onBack: () => void;
  userId?: string;
}

export function CourseEditor({ course, institutions, onBack, userId }: CourseEditorProps) {
  const { toast } = useToast();
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(course?.universityId || "");
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>(course?.campusLocations || []);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedScholarshipIds, setSelectedScholarshipIds] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(course?.availableMarkets || ['AU', 'BD']);
  const [selectedFeaturedMarkets, setSelectedFeaturedMarkets] = useState<string[]>(course?.featuredMarkets || []);
  
  // Entry requirements state
  const [selectedEntryRequirements, setSelectedEntryRequirements] = useState<Array<{
    qualificationTypeId: string;
    minGrade: string;
    customNotes?: string;
  }>>([]);
  
  // English requirements state
  const [englishReqDialogOpen, setEnglishReqDialogOpen] = useState(false);
  const [editingEnglishReq, setEditingEnglishReq] = useState<EnglishRequirement | null>(null);
  const [englishReqForm, setEnglishReqForm] = useState({
    testType: "",
    minOverallScore: "",
    minListeningScore: "",
    minReadingScore: "",
    minWritingScore: "",
    minSpeakingScore: "",
    notes: "",
    isPreferred: false,
  });
  
  // Generate all tests dialog state
  const [generateTestsDialogOpen, setGenerateTestsDialogOpen] = useState(false);
  
  // AI Entry Requirements dialog state
  const [aiEntryReqDialogOpen, setAiEntryReqDialogOpen] = useState(false);
  const [aiGeneratedRequirements, setAiGeneratedRequirements] = useState<Array<{
    qualificationName: string;
    qualificationCountry: string;
    minGrade: string;
    isSelected: boolean;
  }>>([]);
  const [isGeneratingAiReqs, setIsGeneratingAiReqs] = useState(false);
  
  // Country filter for entry requirements
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>("all");
  
  // Platform recommendations state
  const [platformRecommendations, setPlatformRecommendations] = useState<{
    entryRequirements: Array<{
      qualificationTypeId: string;
      qualification: { id: string; name: string; country: string; };
      suggestedMinGrade: string | null;
      confidence: number;
      usedInCourses: number;
      totalSimilarCourses: number;
    }>;
    englishRequirements: Array<{
      testType: string;
      suggestedOverallScore: string | null;
      suggestedListening: string | null;
      suggestedReading: string | null;
      suggestedWriting: string | null;
      suggestedSpeaking: string | null;
      confidence: number;
      usedInCourses: number;
      totalSimilarCourses: number;
    }>;
  } | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsMessage, setRecommendationsMessage] = useState<string>("");
  
  // AI Equivalencies are now automatically generated when entry requirements are saved
  // No manual dialog needed - fully automatic
  const [generateTestsForm, setGenerateTestsForm] = useState({
    baseTestType: "ielts",
    minOverallScore: "",
    minListeningScore: "",
    minReadingScore: "",
    minWritingScore: "",
    minSpeakingScore: "",
    notes: "",
  });
  const [generatedPreview, setGeneratedPreview] = useState<Array<{
    testType: string;
    minOverallScore: string;
    minListeningScore?: string;
    minReadingScore?: string;
    minWritingScore?: string;
    minSpeakingScore?: string;
  }>>([]);

  // AI Course Data Extraction state
  const [aiExtractDialogOpen, setAiExtractDialogOpen] = useState(false);
  const [isExtractingCourseData, setIsExtractingCourseData] = useState(false);
  const [extractedCourseData, setExtractedCourseData] = useState<{
    title?: string;
    description?: string;
    courseCode?: string;
    qualificationFramework?: string;
    level?: string;
    discipline?: string;
    specialization?: string;
    duration?: string;
    durationMonths?: number;
    durationWeeks?: number;
    fees?: number;
    currency?: string;
    applicationFees?: number;
    intakes?: string[];
    startDate?: string;
    applicationDeadline?: string;
    prerequisites?: string;
    eligibilityRequirements?: string;
    englishRequirements?: string;
    structuredEnglishRequirements?: {
      testType: string;
      minOverallScore?: string;
      minListeningScore?: string;
      minReadingScore?: string;
      minWritingScore?: string;
      minSpeakingScore?: string;
      notes?: string;
    }[];
    careerOutcomes?: string[];
    careerPath?: string;
    studyAreas?: string[];
    studyModes?: string[];
    deliveryMode?: string;
  } | null>(null);

  // AI Description generation state
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  
  // Thumbnail state
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [thumbnailStatus, setThumbnailStatus] = useState<string>(course?.thumbnailStatus || "none");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(course?.thumbnailUrl || null);

  // Intake Templates state
  const [intakeTemplates, setIntakeTemplates] = useState<LocalIntakeTemplate[]>([]);
  const [showAddIntakeMonth, setShowAddIntakeMonth] = useState(false);
  const [newIntakeMonth, setNewIntakeMonth] = useState<number>(1);
  const [newIntakeStartDay, setNewIntakeStartDay] = useState<number>(1);
  const [newIntakeDeadlineWeeks, setNewIntakeDeadlineWeeks] = useState<number>(8);
  const [isSavingIntakes, setIsSavingIntakes] = useState(false);

  // Specific Intake Dates state
  const [specificDates, setSpecificDates] = useState<CourseIntakeDate[]>([]);
  const [newSpecificDate, setNewSpecificDate] = useState("");
  const [newSpecificLabel, setNewSpecificLabel] = useState("");
  const [isSavingSpecificDates, setIsSavingSpecificDates] = useState(false);

  // Pricing configuration state
  const [pricingConfig, setPricingConfig] = useState<{
    pricingModel: 'fixed' | 'dynamic';
    feePeriod: 'annual' | 'per_semester' | 'per_trimester' | 'per_term' | 'total';
    enablePaymentOptions: boolean;
    enableStudyModes: boolean;
    enableLocationPricing: boolean;
    installmentCount: number;
    firstPaymentAmount: string;
    installmentFee: string;
    admissionFeeIncluded: string;
  }>({
    pricingModel: 'fixed',
    feePeriod: 'annual',
    enablePaymentOptions: false,
    enableStudyModes: false,
    enableLocationPricing: false,
    installmentCount: 6,
    firstPaymentAmount: '',
    installmentFee: '0',
    admissionFeeIncluded: '0',
  });

  // Pricing tiers state
  const [pricingTiers, setPricingTiers] = useState<Array<{
    id?: string;
    paymentOption: 'upfront' | 'installment';
    studyMode: 'all' | 'weekday' | 'weekend' | 'online' | 'evening' | 'full_time' | 'part_time';
    locationType: 'all' | 'onshore' | 'offshore' | 'country';
    country?: string;
    isDefaultPrice: boolean;
    amount: string;
    currency: string;
    label?: string;
    description?: string;
  }>>([]);

  const { data: selectedInstitution, isLoading: institutionDetailsLoading } = useQuery<Institution>({
    queryKey: ["/api/super-admin/institutions", selectedInstitutionId],
    enabled: !!selectedInstitutionId,
  });

  // When institution data loads, filter out any stale campus IDs (e.g. old bare city names)
  // that don't match the current institution's campus address format
  useEffect(() => {
    if (selectedInstitution?.campusAddresses && selectedInstitution.campusAddresses.length > 0) {
      const validKeys = selectedInstitution.campusAddresses.map(
        campus => `${campus.address}, ${campus.city}, ${campus.state} ${campus.postcode}`
      );
      setSelectedCampusIds(prev => prev.filter(id => validKeys.includes(id)));
    }
  }, [selectedInstitution?.id]);

  const { data: groupedTags } = useQuery<Record<string, TagType[]>>({
    queryKey: ["/api/admin/tags/grouped"],
  });

  const { data: courseTags } = useQuery<TagType[]>({
    queryKey: ["/api/courses", course?.id, "tags"],
    enabled: !!course?.id,
  });

  // Institution scholarships query (available scholarships for the selected institution)
  const { data: institutionScholarships = [] } = useQuery<ScholarshipType[]>({
    queryKey: ["/api/institutions", selectedInstitutionId, "scholarships"],
    enabled: !!selectedInstitutionId,
  });

  // Course scholarships query (scholarships linked to this course)
  const { data: courseScholarships = [] } = useQuery<ScholarshipType[]>({
    queryKey: ["/api/courses", course?.id, "scholarships"],
    enabled: !!course?.id,
  });

  // English requirements query
  const { data: englishRequirements = [], isLoading: englishReqLoading } = useQuery<EnglishRequirement[]>({
    queryKey: ["/api/courses", course?.id, "english-requirements"],
    enabled: !!course?.id,
  });

  // Intake templates query
  const { data: fetchedIntakeTemplates = [] } = useQuery<LocalIntakeTemplate[]>({
    queryKey: ["/api/courses", course?.id, "intake-templates"],
    enabled: !!course?.id,
  });

  // Update local intake templates state when data is fetched
  useEffect(() => {
    if (fetchedIntakeTemplates && fetchedIntakeTemplates.length > 0) {
      setIntakeTemplates(fetchedIntakeTemplates);
    }
  }, [fetchedIntakeTemplates]);

  // Specific intake dates query
  const { data: fetchedSpecificDates = [] } = useQuery<CourseIntakeDate[]>({
    queryKey: ["/api/courses", course?.id, "intake-dates"],
    enabled: !!course?.id,
  });

  useEffect(() => {
    if (fetchedSpecificDates) {
      setSpecificDates(fetchedSpecificDates);
    }
  }, [fetchedSpecificDates]);

  // Pricing config query
  const { data: fetchedPricingConfig } = useQuery<{
    pricingModel: 'fixed' | 'dynamic';
    feePeriod: 'annual' | 'per_semester' | 'per_trimester' | 'per_term' | 'total';
    enablePaymentOptions: boolean;
    enableStudyModes: boolean;
    enableLocationPricing: boolean;
    installmentCount: number;
    firstPaymentAmount: string | null;
    installmentFee: string;
    admissionFeeIncluded: string;
  } | null>({
    queryKey: ["/api/courses", course?.id, "pricing-config"],
    enabled: !!course?.id,
  });

  // Pricing tiers query
  const { data: fetchedPricingTiers = [] } = useQuery<Array<{
    id: string;
    paymentOption: 'upfront' | 'installment';
    studyMode: 'all' | 'weekday' | 'weekend' | 'online' | 'evening' | 'full_time' | 'part_time';
    locationType: 'all' | 'onshore' | 'offshore' | 'country';
    country: string | null;
    isDefaultPrice: boolean;
    amount: string;
    currency: string;
    label: string | null;
    description: string | null;
  }>>({
    queryKey: ["/api/courses", course?.id, "pricing-tiers"],
    enabled: !!course?.id,
  });

  // Update local pricing state when data is fetched
  useEffect(() => {
    if (fetchedPricingConfig) {
      setPricingConfig({
        pricingModel: fetchedPricingConfig.pricingModel || 'fixed',
        feePeriod: fetchedPricingConfig.feePeriod || 'annual',
        enablePaymentOptions: fetchedPricingConfig.enablePaymentOptions || false,
        enableStudyModes: fetchedPricingConfig.enableStudyModes || false,
        enableLocationPricing: fetchedPricingConfig.enableLocationPricing || false,
        installmentCount: fetchedPricingConfig.installmentCount || 6,
        firstPaymentAmount: fetchedPricingConfig.firstPaymentAmount || '',
        installmentFee: fetchedPricingConfig.installmentFee || '0',
        admissionFeeIncluded: fetchedPricingConfig.admissionFeeIncluded || '0',
      });
    }
  }, [fetchedPricingConfig]);

  useEffect(() => {
    if (fetchedPricingTiers && fetchedPricingTiers.length > 0) {
      setPricingTiers(fetchedPricingTiers.map(tier => ({
        id: tier.id,
        paymentOption: tier.paymentOption,
        studyMode: tier.studyMode,
        locationType: tier.locationType,
        country: tier.country || undefined,
        isDefaultPrice: tier.isDefaultPrice,
        amount: tier.amount,
        currency: tier.currency,
        label: tier.label || undefined,
        description: tier.description || undefined,
      })));
    }
  }, [fetchedPricingTiers]);

  // Pricing config mutation
  const savePricingConfigMutation = useMutation({
    mutationFn: async (data: { courseId: string; config: typeof pricingConfig; tiers: typeof pricingTiers }) => {
      // Save config
      await apiRequest("PUT", `/api/courses/${data.courseId}/pricing-config`, data.config);
      // Save tiers
      await apiRequest("POST", `/api/courses/${data.courseId}/pricing-tiers`, { tiers: data.tiers });
    },
    onSuccess: () => {
      if (course?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/courses", course.id, "pricing-config"] });
        queryClient.invalidateQueries({ queryKey: ["/api/courses", course.id, "pricing-tiers"] });
      }
    },
  });

  // English requirements mutations
  const createEnglishReqMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/courses/${course?.id}/english-requirements`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", course?.id, "english-requirements"] });
      setEnglishReqDialogOpen(false);
      resetEnglishReqForm();
      toast({ title: "English requirement added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add requirement", description: error.message, variant: "destructive" });
    },
  });

  const updateEnglishReqMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PUT", `/api/courses/${course?.id}/english-requirements/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", course?.id, "english-requirements"] });
      setEnglishReqDialogOpen(false);
      setEditingEnglishReq(null);
      resetEnglishReqForm();
      toast({ title: "English requirement updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update requirement", description: error.message, variant: "destructive" });
    },
  });

  const deleteEnglishReqMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/courses/${course?.id}/english-requirements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", course?.id, "english-requirements"] });
      toast({ title: "English requirement deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete requirement", description: error.message, variant: "destructive" });
    },
  });

  // Batch insert mutation for generating all test types
  const batchCreateEnglishReqMutation = useMutation({
    mutationFn: async (requirements: Array<{
      testType: string;
      minOverallScore: string;
      minListeningScore?: string;
      minReadingScore?: string;
      minWritingScore?: string;
      minSpeakingScore?: string;
      notes?: string;
    }>) => {
      const response = await apiRequest("POST", `/api/courses/${course?.id}/english-requirements/batch`, { requirements });
      return response.json();
    },
    onSuccess: (data: { created: any[]; skipped: string[]; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", course?.id, "english-requirements"] });
      setGenerateTestsDialogOpen(false);
      resetGenerateTestsForm();
      
      if (data.skipped && data.skipped.length > 0) {
        toast({ 
          title: `Created ${data.created.length} requirements`, 
          description: `Skipped ${data.skipped.length} (already exist: ${data.skipped.map(t => TEST_TYPE_CONFIG[t]?.label || t).join(', ')})`,
          variant: "default"
        });
      } else {
        toast({ 
          title: "All English requirements generated successfully", 
          description: `Added ${data.created.length} test types with equivalent scores.` 
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to generate requirements", description: error.message, variant: "destructive" });
    },
  });

  const resetGenerateTestsForm = () => {
    setGenerateTestsForm({
      baseTestType: "ielts",
      minOverallScore: "",
      minListeningScore: "",
      minReadingScore: "",
      minWritingScore: "",
      minSpeakingScore: "",
      notes: "",
    });
    setGeneratedPreview([]);
  };

  const handleGeneratePreview = () => {
    const overall = parseFloat(generateTestsForm.minOverallScore);
    if (isNaN(overall)) return;
    
    const bandScores = {
      listening: generateTestsForm.minListeningScore ? parseFloat(generateTestsForm.minListeningScore) : undefined,
      reading: generateTestsForm.minReadingScore ? parseFloat(generateTestsForm.minReadingScore) : undefined,
      writing: generateTestsForm.minWritingScore ? parseFloat(generateTestsForm.minWritingScore) : undefined,
      speaking: generateTestsForm.minSpeakingScore ? parseFloat(generateTestsForm.minSpeakingScore) : undefined,
    };
    
    const generated = generateEquivalentRequirements(
      generateTestsForm.baseTestType,
      overall,
      bandScores
    );
    setGeneratedPreview(generated);
  };

  const handleConfirmGenerateAll = () => {
    if (generatedPreview.length === 0) return;
    
    const requirementsWithNotes = generatedPreview.map(req => ({
      ...req,
      notes: generateTestsForm.notes || undefined,
    }));
    
    batchCreateEnglishReqMutation.mutate(requirementsWithNotes);
  };

  const resetEnglishReqForm = () => {
    setEnglishReqForm({
      testType: "",
      minOverallScore: "",
      minListeningScore: "",
      minReadingScore: "",
      minWritingScore: "",
      minSpeakingScore: "",
      notes: "",
      isPreferred: false,
    });
  };

  const handleAddEnglishReq = () => {
    setEditingEnglishReq(null);
    resetEnglishReqForm();
    setEnglishReqDialogOpen(true);
  };

  const handleEditEnglishReq = (req: EnglishRequirement) => {
    setEditingEnglishReq(req);
    setEnglishReqForm({
      testType: req.testType,
      minOverallScore: req.minOverallScore,
      minListeningScore: req.minListeningScore || "",
      minReadingScore: req.minReadingScore || "",
      minWritingScore: req.minWritingScore || "",
      minSpeakingScore: req.minSpeakingScore || "",
      notes: req.notes || "",
      isPreferred: req.isPreferred,
    });
    setEnglishReqDialogOpen(true);
  };

  const handleSaveEnglishReq = () => {
    if (!englishReqForm.testType || !englishReqForm.minOverallScore) {
      toast({ title: "Please select test type and enter minimum overall score", variant: "destructive" });
      return;
    }

    const data = {
      testType: englishReqForm.testType,
      minOverallScore: englishReqForm.minOverallScore,
      minListeningScore: englishReqForm.minListeningScore || null,
      minReadingScore: englishReqForm.minReadingScore || null,
      minWritingScore: englishReqForm.minWritingScore || null,
      minSpeakingScore: englishReqForm.minSpeakingScore || null,
      notes: englishReqForm.notes || null,
      isPreferred: englishReqForm.isPreferred,
    };

    if (editingEnglishReq) {
      updateEnglishReqMutation.mutate({ id: editingEnglishReq.id, data });
    } else {
      createEnglishReqMutation.mutate(data);
    }
  };

  useEffect(() => {
    if (courseTags) {
      setSelectedTagIds(courseTags.map(t => String(t.id)));
    }
  }, [courseTags]);

  // Sync selected scholarship IDs when course scholarships load
  useEffect(() => {
    if (courseScholarships) {
      setSelectedScholarshipIds(courseScholarships.map(s => s.id));
    }
  }, [courseScholarships]);

  // Get institution country for default framework selection
  const courseInstitution = institutions.find(i => i.id === course?.universityId);
  const initialInstitutionCountry = courseInstitution?.campusAddresses?.[0]?.country || "";
  
  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      universityId: course?.universityId || "",
      title: course?.title || "",
      description: course?.description || "",
      subject: course?.subject || "",
      qualificationFramework: course?.qualificationFramework || (initialInstitutionCountry ? getDefaultFramework(initialInstitutionCountry) : "AQF"),
      level: course?.level || "",
      customLevel: course?.customLevel || "",
      discipline: course?.discipline || "",
      subDisciplineId: course?.subDisciplineId || "",
      specialization: course?.specialization || "",
      duration: course?.duration || "",
      durationMonths: course?.durationMonths || ("" as any),
      durationWeeks: course?.durationWeeks || ("" as any),
      fees: course?.fees || ("" as any),
      applicationFees: course?.applicationFees || ("" as any),
      currency: course?.currency || getCurrencyForCountry(initialInstitutionCountry),
      location: course?.location || "",
      country: course?.country || "",
      startDate: course?.startDate || "",
      applicationDeadline: course?.applicationDeadline || "",
      intakes: Array.isArray(course?.intakes) ? course.intakes.join(", ") : "",
      prerequisites: course?.prerequisites || "",
      eligibilityRequirements: course?.eligibilityRequirements || "",
      englishRequirements: course?.englishRequirements || "",
      courseCode: course?.courseCode || "",
      cricosCode: course?.cricosCode || "",
      isCricosRegistered: course?.isCricosRegistered ?? false,
      admissionFee: course?.admissionFee || ("" as any),
      sourceUrl: course?.sourceUrl || "",
      pathways: Array.isArray(course?.pathways) ? course.pathways.join(", ") : "",
      studyAreas: Array.isArray(course?.studyAreas) ? course.studyAreas.join(", ") : "",
      careerOutcomes: Array.isArray(course?.careerOutcomes) ? course.careerOutcomes.join(", ") : "",
      careerPath: course?.careerPath || "",
      deliveryMode: course?.deliveryMode || "",
      internshipAvailable: course?.internshipAvailable ?? false,
      internshipDetails: course?.internshipDetails || "",
      minimumAge: course?.minimumAge || ("" as any),
      prPathway: course?.prPathway ?? false,
    },
  });

  // Get current course level to determine entry requirement templates (must be after form definition)
  const currentCourseLevel = form.watch("level");
  const isCricosRegistered = form.watch("isCricosRegistered");

  // Entry requirement templates query (based on course level and institution country)
  // Get country from first campus address - normalize by trimming whitespace
  const rawInstitutionCountry = selectedInstitution?.campusAddresses?.[0]?.country;
  const institutionCountry = rawInstitutionCountry?.trim() || undefined;
  
  // Track last auto-applied institution+country combo to detect actual changes
  const lastAutoAppliedRef = useRef<{ institutionId?: string; country?: string }>({});
  // Track if user has manually changed the framework
  const [frameworkManuallySet, setFrameworkManuallySet] = useState(false);
  // Track if user has manually changed the currency
  const [currencyManuallySet, setCurrencyManuallySet] = useState(false);

  // Auto-update framework when institution or its country changes (only for new courses)
  useEffect(() => {
    const currentInstitutionId = selectedInstitution?.id;
    
    // Only auto-update framework for new courses (not editing existing ones)
    if (course?.id) return;
    
    // Check if institution has changed since last auto-apply
    const hasInstitutionChanged = currentInstitutionId !== lastAutoAppliedRef.current.institutionId;
    const hasCountryChanged = institutionCountry !== lastAutoAppliedRef.current.country;
    
    // Reset frameworkManuallySet when institution changes (allow new auto-selection)
    if (hasInstitutionChanged && currentInstitutionId) {
      setFrameworkManuallySet(false);
    }
    
    // Skip auto-update if user has manually changed the framework for current institution
    if (frameworkManuallySet) return;
    
    // Apply auto-update if we have a country and something has changed
    if (institutionCountry && (hasInstitutionChanged || hasCountryChanged)) {
      const defaultFramework = getDefaultFramework(institutionCountry);
      form.setValue("qualificationFramework", defaultFramework);
      // Reset level when framework changes
      form.setValue("level", "");
      
      // Update tracking ref
      lastAutoAppliedRef.current = { institutionId: currentInstitutionId, country: institutionCountry };
    }
  }, [selectedInstitution?.id, institutionCountry, course?.id, frameworkManuallySet, form]);

  // Auto-update currency when institution changes (for both new and existing courses when switching institution)
  useEffect(() => {
    const currentInstitutionId = selectedInstitution?.id;
    if (!currentInstitutionId || !institutionCountry) return;

    const hasInstitutionChanged = currentInstitutionId !== lastAutoAppliedRef.current.institutionId;

    // Reset currencyManuallySet when institution changes so new institution gets correct currency
    if (hasInstitutionChanged) {
      setCurrencyManuallySet(false);
    }

    // Don't override if user has manually picked a currency for this institution
    if (currencyManuallySet) return;

    // Auto-set currency based on institution's country
    if (hasInstitutionChanged || !form.getValues('currency')) {
      form.setValue("currency", getCurrencyForCountry(institutionCountry));
    }
  }, [selectedInstitution?.id, institutionCountry, currencyManuallySet, form]);
  const templateQueryUrl = currentCourseLevel && institutionCountry 
    ? `/api/course-level-requirements?courseLevel=${encodeURIComponent(currentCourseLevel)}&institutionCountry=${encodeURIComponent(institutionCountry)}`
    : null;

  // Detect discipline-specific regulatory requirements
  const watchedTitle = form.watch("title");
  const watchedDiscipline = form.watch("discipline");
  const detectedDisciplineRules = useMemo(() => {
    return detectDisciplineRules(watchedTitle || "", watchedDiscipline, institutionCountry);
  }, [watchedTitle, watchedDiscipline, institutionCountry]);

  const { data: entryRequirementTemplates = [], isLoading: templatesLoading } = useQuery<Array<{
    id: string;
    courseLevel: string;
    institutionCountry: string;
    qualificationTypeId: string;
    minGrade: string | null;
    displayLabel: string | null;
    displayOrder: number;
    isDefault: boolean;
    qualification: {
      id: string;
      country: string;
      name: string;
      fullName: string | null;
      levelCategory: string;
      gradingScale: string | null;
    };
  }>>({
    queryKey: [templateQueryUrl],
    enabled: !!templateQueryUrl,
  });

  // Course entry requirements query (existing requirements for this course)
  const { data: courseEntryRequirements = [], isLoading: entryReqLoading } = useQuery<Array<{
    id: string;
    courseId: string;
    qualificationTypeId: string;
    minGrade: string | null;
    customNotes: string | null;
    displayOrder: number;
    qualification: {
      id: string;
      country: string;
      name: string;
      fullName: string | null;
      levelCategory: string;
    };
  }>>({
    queryKey: ["/api/courses", course?.id, "entry-requirements"],
    enabled: !!course?.id,
  });

  // Sync entry requirements when course entry requirements load (must be after query definition)
  useEffect(() => {
    if (courseEntryRequirements && courseEntryRequirements.length > 0) {
      setSelectedEntryRequirements(courseEntryRequirements.map(r => ({
        qualificationTypeId: r.qualificationTypeId,
        minGrade: r.minGrade || "",
        customNotes: r.customNotes || undefined,
      })));
    }
  }, [courseEntryRequirements]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "universityId" && value.universityId) {
        setSelectedInstitutionId(value.universityId);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Watch discipline selection to fetch sub-disciplines
  const selectedDiscipline = form.watch("discipline");
  const selectedSubDisciplineId = form.watch("subDisciplineId");

  // Fetch sub-disciplines based on selected discipline (Tier 2)
  const { data: subDisciplines = [] } = useQuery<{ id: string; name: string; discipline: string; slug: string }[]>({
    queryKey: ["/api/sub-disciplines", { discipline: selectedDiscipline }],
    enabled: !!selectedDiscipline,
  });

  // Fetch specializations based on selected sub-discipline (Tier 3)
  const { data: specializations = [] } = useQuery<{ id: string; name: string; subDisciplineId: string; slug: string }[]>({
    queryKey: ["/api/sub-disciplines", selectedSubDisciplineId, "specializations"],
    enabled: !!selectedSubDisciplineId,
  });

  // Reset sub-discipline and specialization when discipline changes
  useEffect(() => {
    if (!selectedDiscipline) {
      form.setValue("subDisciplineId", "");
      form.setValue("specialization", "");
    }
  }, [selectedDiscipline, form]);

  // Reset specialization when sub-discipline changes
  useEffect(() => {
    if (!selectedSubDisciplineId) {
      form.setValue("specialization", "");
    }
  }, [selectedSubDisciplineId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/super-admin/courses", data);
      return response.json();
    },
    onSuccess: async (newCourse: any) => {
      if (newCourse?.id) {
        // Save tags if any selected
        if (selectedTagIds.length > 0) {
          await saveTagsMutation.mutateAsync({ courseId: newCourse.id, tagIds: selectedTagIds });
        }
        // Always save scholarships (including empty array to clear all)
        await saveScholarshipsMutation.mutateAsync({ courseId: newCourse.id, scholarshipIds: selectedScholarshipIds });
        // Save entry requirements
        await saveEntryRequirementsMutation.mutateAsync({ courseId: newCourse.id, requirements: selectedEntryRequirements });
        // Save pricing configuration (continue even on failure, but show warning)
        try {
          await savePricingConfigMutation.mutateAsync({ 
            courseId: newCourse.id, 
            config: pricingConfig, 
            tiers: pricingTiers 
          });
        } catch (pricingError: any) {
          console.error("Pricing save error:", pricingError);
          toast({ title: "Warning", description: "Course saved but pricing configuration failed. Please edit the course to retry.", variant: "destructive" });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      toast({ title: "Success", description: "Course created successfully" });
      onBack();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/super-admin/courses/${id}`, data);
      return { ...(await response.json()), id };
    },
    onSuccess: async (result: any) => {
      if (result?.id) {
        // Always save tags and scholarships (including empty arrays to clear all)
        await saveTagsMutation.mutateAsync({ courseId: result.id, tagIds: selectedTagIds });
        await saveScholarshipsMutation.mutateAsync({ courseId: result.id, scholarshipIds: selectedScholarshipIds });
        await saveEntryRequirementsMutation.mutateAsync({ courseId: result.id, requirements: selectedEntryRequirements });
        // Save pricing configuration (continue even on failure, but show warning)
        try {
          await savePricingConfigMutation.mutateAsync({ 
            courseId: result.id, 
            config: pricingConfig, 
            tiers: pricingTiers 
          });
        } catch (pricingError: any) {
          console.error("Pricing save error:", pricingError);
          toast({ title: "Warning", description: "Course saved but pricing configuration failed. Please edit the course to retry.", variant: "destructive" });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/courses", result.id, "tags"] });
        queryClient.invalidateQueries({ queryKey: ["/api/courses", result.id, "scholarships"] });
        queryClient.invalidateQueries({ queryKey: ["/api/courses", result.id, "entry-requirements"] });
        queryClient.invalidateQueries({ queryKey: ["/api/courses", result.id, "pricing-config"] });
        queryClient.invalidateQueries({ queryKey: ["/api/courses", result.id, "pricing-tiers"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      toast({ title: "Success", description: "Course updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveTagsMutation = useMutation({
    mutationFn: async ({ courseId, tagIds }: { courseId: string; tagIds: string[] }) => {
      return apiRequest("PUT", `/api/admin/courses/${courseId}/tags`, { tagIds });
    },
    onError: (error: any) => {
      console.error("Failed to save course tags:", error);
    },
  });

  // Save scholarships mutation
  const saveScholarshipsMutation = useMutation({
    mutationFn: async ({ courseId, scholarshipIds }: { courseId: string; scholarshipIds: string[] }) => {
      return apiRequest("PUT", `/api/admin/courses/${courseId}/scholarships`, { scholarshipIds });
    },
    onError: (error: any) => {
      console.error("Failed to save course scholarships:", error);
    },
  });

  // Save entry requirements mutation
  const saveEntryRequirementsMutation = useMutation({
    mutationFn: async ({ courseId, requirements }: { 
      courseId: string; 
      requirements: Array<{ qualificationTypeId: string; minGrade: string; customNotes?: string }> 
    }) => {
      return apiRequest("PUT", `/api/admin/courses/${courseId}/entry-requirements`, { requirements });
    },
    onSuccess: () => {
      if (course?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/courses", course.id, "entry-requirements"] });
      }
    },
    onError: (error: any) => {
      console.error("Failed to save entry requirements:", error);
    },
  });

  // Thumbnail generation mutation
  const generateThumbnailMutation = useMutation({
    mutationFn: async () => {
      if (!course?.id) throw new Error("Course ID required");
      const response = await apiRequest("POST", `/api/courses/${course.id}/generate-thumbnail`);
      return response.json();
    },
    onMutate: () => {
      setIsGeneratingThumbnail(true);
      setThumbnailStatus("generating");
    },
    onSuccess: (data: any) => {
      if (data.thumbnailUrl) {
        setThumbnailUrl(data.thumbnailUrl);
        setThumbnailStatus("completed");
      } else if (data.mode === "async") {
        setThumbnailStatus("pending");
        toast({ title: "Thumbnail generation queued", description: "Your thumbnail is being generated in the background." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/courses", course?.id] });
    },
    onError: (error: any) => {
      setThumbnailStatus("failed");
      toast({ title: "Error", description: error.message || "Failed to generate thumbnail", variant: "destructive" });
    },
    onSettled: () => {
      setIsGeneratingThumbnail(false);
    },
  });

  // AI Course Data Extraction mutation
  const extractCourseDataMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/ai/extract-course-from-url", { url });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.data) {
        setExtractedCourseData(data.data);
        setAiExtractDialogOpen(true);
      } else {
        toast({
          title: "No data found",
          description: "Could not extract course information from this URL.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Failed to extract course data:", error);
      toast({
        title: "Extraction failed",
        description: error.message || "Could not extract course data from the URL.",
        variant: "destructive",
      });
    },
  });

  // Handle AI extraction from URL
  const handleExtractFromUrl = async () => {
    const url = form.getValues("sourceUrl");
    if (!url) {
      toast({
        title: "URL required",
        description: "Please enter a course page URL first.",
        variant: "destructive",
      });
      return;
    }
    setIsExtractingCourseData(true);
    try {
      await extractCourseDataMutation.mutateAsync(url);
    } finally {
      setIsExtractingCourseData(false);
    }
  };

  // Apply extracted data to form
  const handleApplyExtractedData = () => {
    if (!extractedCourseData) return;
    
    const data = extractedCourseData;
    
    // Apply each field if it has a value
    if (data.title) form.setValue("title", data.title);
    if (data.description) form.setValue("description", data.description);
    if (data.courseCode) form.setValue("courseCode", data.courseCode);
    
    // Apply qualification framework if extracted (normalize case)
    if (data.qualificationFramework) {
      const normalizedFramework = data.qualificationFramework.trim().toUpperCase();
      const frameworkMap: Record<string, string> = {
        "AQF": "AQF",
        "NZQF": "NZQF",
        "EQF": "EQF",
        "RQF": "RQF",
        "NQF_BD": "NQF_BD",
        "NSQF": "NSQF",
        "MQA": "MQA",
        "OTHER": "Other",
      };
      const matchedFramework = frameworkMap[normalizedFramework];
      if (matchedFramework) {
        form.setValue("qualificationFramework", matchedFramework);
        setFrameworkManuallySet(true);
      }
    }
    
    if (data.level) form.setValue("level", data.level);
    if (data.discipline) form.setValue("discipline", data.discipline);
    if (data.specialization) form.setValue("specialization", data.specialization);
    if (data.duration) form.setValue("duration", data.duration);
    if (data.durationMonths) form.setValue("durationMonths", data.durationMonths);
    if (data.durationWeeks) form.setValue("durationWeeks", data.durationWeeks);
    if (data.fees) form.setValue("fees", data.fees);
    if (data.currency) form.setValue("currency", data.currency);
    if (data.applicationFees !== undefined) form.setValue("applicationFees", data.applicationFees);
    if (data.intakes && data.intakes.length > 0) form.setValue("intakes", data.intakes.join(", "));
    if (data.startDate) form.setValue("startDate", data.startDate);
    if (data.applicationDeadline) form.setValue("applicationDeadline", data.applicationDeadline);
    if (data.prerequisites) form.setValue("prerequisites", data.prerequisites);
    if (data.eligibilityRequirements) form.setValue("eligibilityRequirements", data.eligibilityRequirements);
    if (data.englishRequirements) form.setValue("englishRequirements", data.englishRequirements);
    if (data.careerOutcomes && data.careerOutcomes.length > 0) form.setValue("careerOutcomes", data.careerOutcomes.join(", "));
    if (data.careerPath) form.setValue("careerPath", data.careerPath);
    if (data.deliveryMode) form.setValue("deliveryMode", data.deliveryMode);
    if (data.internshipDetails) form.setValue("internshipDetails", data.internshipDetails);
    if (data.minimumAge) form.setValue("minimumAge", data.minimumAge);
    if (data.studyAreas && data.studyAreas.length > 0) form.setValue("studyAreas", data.studyAreas.join(", "));
    
    // Apply structured English requirements if available
    if (data.structuredEnglishRequirements && data.structuredEnglishRequirements.length > 0 && course?.id) {
      const mappedReqs = data.structuredEnglishRequirements.map(req => {
        // Normalize test type (handle various AI output formats)
        const normalizedTestType = (req.testType || "").trim().toLowerCase();
        const testTypeMap: Record<string, string> = {
          "ielts academic": "ielts",
          "ielts": "ielts",
          "pte academic": "pte",
          "pte": "pte",
          "toefl ibt": "toefl",
          "toefl": "toefl",
          "cambridge": "cambridge",
          "oet": "oet",
          "duolingo": "duolingo",
        };
        return {
          testType: testTypeMap[normalizedTestType] || "ielts",
          minOverallScore: req.minOverallScore?.toString().trim() || "",
          minListeningScore: req.minListeningScore?.toString().trim() || "",
          minReadingScore: req.minReadingScore?.toString().trim() || "",
          minWritingScore: req.minWritingScore?.toString().trim() || "",
          minSpeakingScore: req.minSpeakingScore?.toString().trim() || "",
          notes: req.notes?.trim() || "",
        };
      });
      
      // Check for duplicates before adding (skip if same test type already exists)
      const uniqueReqs = mappedReqs.filter(nr => 
        !englishRequirements.some(er => er.testType === nr.testType)
      );
      
      if (uniqueReqs.length > 0) {
        batchCreateEnglishReqMutation.mutate(uniqueReqs);
      }
    }
    
    setAiExtractDialogOpen(false);
    setExtractedCourseData(null);
    
    toast({
      title: "Data applied",
      description: "Extracted course data has been applied to the form. Remember to Save the course.",
    });
  };

  // Handle adding/toggling an entry requirement from a template
  const handleEntryRequirementToggle = (template: {
    qualificationTypeId: string;
    minGrade: string | null;
    displayLabel: string | null;
    qualification: { id: string; name: string };
  }) => {
    const exists = selectedEntryRequirements.find(r => r.qualificationTypeId === template.qualificationTypeId);
    if (exists) {
      // Remove it
      setSelectedEntryRequirements(prev => prev.filter(r => r.qualificationTypeId !== template.qualificationTypeId));
    } else {
      // Add it
      setSelectedEntryRequirements(prev => [...prev, {
        qualificationTypeId: template.qualificationTypeId,
        minGrade: template.minGrade || "",
      }]);
    }
  };

  // Remove an entry requirement
  const handleRemoveEntryRequirement = (qualificationTypeId: string) => {
    setSelectedEntryRequirements(prev => prev.filter(r => r.qualificationTypeId !== qualificationTypeId));
  };

  // Update min grade for an entry requirement
  const handleUpdateEntryRequirementGrade = (qualificationTypeId: string, minGrade: string) => {
    setSelectedEntryRequirements(prev => prev.map(r => 
      r.qualificationTypeId === qualificationTypeId ? { ...r, minGrade } : r
    ));
  };

  const handleScholarshipToggle = (scholarshipId: string) => {
    setSelectedScholarshipIds(prev =>
      prev.includes(scholarshipId) ? prev.filter(id => id !== scholarshipId) : [...prev, scholarshipId]
    );
  };

  const getSelectedScholarships = (): ScholarshipType[] => {
    return institutionScholarships.filter(s => selectedScholarshipIds.includes(s.id));
  };

  const formatScholarshipValue = (scholarship: ScholarshipType) => {
    if (scholarship.valueType === 'percentage') {
      return `${scholarship.value}%`;
    }
    return `${scholarship.currency || 'AUD'} ${scholarship.value.toLocaleString()}`;
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  };

  const getSelectedTags = (): TagType[] => {
    if (!groupedTags) return [];
    // Exclude "featured" slug — homepage featuring is controlled by the "Featured On" card instead
    const allTags = Object.values(groupedTags).flat().filter((tag: TagType) => tag.slug !== 'featured');
    return allTags.filter(tag => selectedTagIds.includes(String(tag.id)));
  };

  const handleSubmit = async (data: z.infer<typeof courseSchema>, publishStatus: 'draft' | 'published' = 'draft', visibility: 'public' | 'private' = 'public') => {
    const transformedData: any = {
      ...data,
      thumbnailUrl,
      campusLocations: selectedCampusIds,
      availableMarkets: selectedMarkets.length > 0 ? selectedMarkets : ['AU', 'BD'],
      featuredMarkets: selectedFeaturedMarkets,
      intakes: data.intakes ? data.intakes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      pathways: data.pathways ? data.pathways.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      studyAreas: data.studyAreas ? data.studyAreas.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      careerOutcomes: data.careerOutcomes ? data.careerOutcomes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      publishStatus,
      visibility,
      ...(publishStatus === 'published' && {
        publishedAt: new Date().toISOString(),
        publishedByUserId: userId,
      }),
    };

    if (course?.id) {
      updateMutation.mutate({ id: course.id, data: transformedData });
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              data-testid="button-back-to-courses"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Back to Courses</span>
            </Button>
            <div className="hidden sm:block h-6 w-px bg-border" />
            <h1 className="text-base sm:text-lg font-semibold">
              {course?.id ? "Edit Course" : "Create Course"}
            </h1>
            {course?.publishStatus && (
              <Badge 
                variant={course.publishStatus === 'published' ? 'default' : 'outline'}
                className={course.publishStatus === 'published' && (course as any).visibility === 'private' ? 'bg-amber-500' : ''}
              >
                {course.publishStatus === 'published' 
                  ? ((course as any).visibility === 'private' ? 'Private' : 'Published')
                  : 'Draft'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBack}
              disabled={isSubmitting}
              data-testid="button-course-discard"
            >
              Discard
            </Button>
            {course?.id && (
              <Button 
                variant="default"
                size="sm"
                disabled={isSubmitting}
                onClick={async () => {
                  const formData = form.getValues();
                  const isValid = await form.trigger();
                  if (isValid) {
                    const currentStatus = course.publishStatus || 'draft';
                    const currentVisibility = (course as any).visibility || 'public';
                    handleSubmit(formData, currentStatus as 'draft' | 'published', currentVisibility as 'public' | 'private');
                  } else {
                    const errors = form.formState.errors;
                    const errorFields = Object.keys(errors).join(', ');
                    toast({
                      title: "Validation Error",
                      description: `Please fix the following fields: ${errorFields}`,
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="button-course-update"
              >
                <Save className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{isSubmitting ? "Updating..." : "Update"}</span>
                <span className="sm:hidden">{isSubmitting ? "..." : "Update"}</span>
              </Button>
            )}
            <Button 
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={async () => {
                const formData = form.getValues();
                const isValid = await form.trigger();
                if (isValid) {
                  const currentVisibility = course ? ((course as any).visibility || 'public') : 'public';
                  handleSubmit(formData, 'draft', currentVisibility as 'public' | 'private');
                } else {
                  const errors = form.formState.errors;
                  const errorFields = Object.keys(errors).join(', ');
                  toast({
                    title: "Validation Error",
                    description: `Please fix the following fields: ${errorFields}`,
                    variant: "destructive",
                  });
                }
              }}
              data-testid="button-course-save-draft"
            >
              <FileText className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{isSubmitting ? "Saving..." : "Save Draft"}</span>
              <span className="sm:hidden">{isSubmitting ? "..." : "Save"}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  disabled={isSubmitting}
                  data-testid="button-course-publish-dropdown"
                >
                  <Globe className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{isSubmitting ? "Publishing..." : "Publish"}</span>
                  <span className="sm:hidden">{isSubmitting ? "..." : "Publish"}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    const formData = form.getValues();
                    const isValid = await form.trigger();
                    if (isValid) {
                      handleSubmit(formData, 'published', 'public');
                    } else {
                      const errors = form.formState.errors;
                      const errorFields = Object.keys(errors).join(', ');
                      toast({
                        title: "Validation Error",
                        description: `Please fix the following fields: ${errorFields}`,
                        variant: "destructive",
                      });
                    }
                  }}
                  data-testid="button-course-publish-public"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Publish Publicly
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const formData = form.getValues();
                    const isValid = await form.trigger();
                    if (isValid) {
                      handleSubmit(formData, 'published', 'private');
                    } else {
                      const errors = form.formState.errors;
                      const errorFields = Object.keys(errors).join(', ');
                      toast({
                        title: "Validation Error",
                        description: `Please fix the following fields: ${errorFields}`,
                        variant: "destructive",
                      });
                    }
                  }}
                  data-testid="button-course-publish-private"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Publish Privately
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Form {...form}>
          <form className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Essential details about the course</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="universityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Institution *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-course-institution">
                                <SelectValue placeholder="Select institution" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper" className="max-h-[280px] overflow-y-auto">
                              {institutions?.map((institution) => (
                                <SelectItem key={institution.id} value={institution.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={institution.logo || undefined} alt={institution.name} />
                                      <AvatarFallback className="text-xs bg-muted">
                                        <Building2 className="h-3 w-3" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate">{institution.name}</span>
                                  </div>
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
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Title *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Bachelor of Computer Science" data-testid="input-course-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <FormLabel>Description</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isGeneratingDescription || !form.watch("title")}
                              onClick={async () => {
                                const title = form.watch("title");
                                if (!title) {
                                  toast({
                                    title: "Course title required",
                                    description: "Please enter the course title first",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                setIsGeneratingDescription(true);
                                try {
                                  // Parse careerOutcomes string into array (comma-separated)
                                  const careerOutcomesStr = form.watch("careerOutcomes") || "";
                                  const careerOutcomesArr = careerOutcomesStr ? careerOutcomesStr.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                                  
                                  // Parse intakes string into array
                                  const intakesStr = form.watch("intakes") || "";
                                  const intakesArr = intakesStr ? intakesStr.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                                  
                                  const response = await apiRequest("POST", "/api/ai/generate-course-description", {
                                    title,
                                    discipline: form.watch("discipline"),
                                    level: form.watch("level"),
                                    institutionName: selectedInstitution?.name,
                                    duration: form.watch("duration"),
                                    careerOutcomes: careerOutcomesArr,
                                    fees: form.watch("fees"),
                                    currency: form.watch("currency"),
                                    intakes: intakesArr,
                                    prerequisites: form.watch("prerequisites"),
                                    existingDescription: field.value, // Use existing description as context
                                  });
                                  const data = await response.json();
                                  if (data.description) {
                                    form.setValue("description", data.description);
                                    toast({
                                      title: "Description generated",
                                      description: "AI has created a marketing-quality course description",
                                    });
                                  }
                                } catch (error: any) {
                                  const errorMessage = error.message || "Failed to generate description";
                                  toast({
                                    title: "Generation failed",
                                    description: errorMessage,
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsGeneratingDescription(false);
                                }
                              }}
                              data-testid="button-ai-generate-description"
                            >
                              {isGeneratingDescription ? (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  AI Generate
                                </>
                              )}
                            </Button>
                          </div>
                          <FormControl>
                            <Textarea {...field} placeholder="Course description..." rows={6} data-testid="input-course-description" />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Click "AI Generate" to create a marketing-quality description based on course details
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Course Thumbnail Section */}
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          <span className="font-medium text-sm">Course Thumbnail</span>
                        </div>
                        <Badge variant={
                          thumbnailStatus === "completed" ? "default" :
                          thumbnailStatus === "generating" || thumbnailStatus === "pending" ? "secondary" :
                          thumbnailStatus === "failed" ? "destructive" : "outline"
                        }>
                          {thumbnailStatus === "completed" ? "Ready" :
                           thumbnailStatus === "generating" ? "Generating..." :
                           thumbnailStatus === "pending" ? "Queued" :
                           thumbnailStatus === "failed" ? "Failed" : "No thumbnail"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-32 h-20 rounded-md border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt="Course thumbnail" className="w-full h-full object-cover" />
                          ) : (
                            <Image className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            AI-generated thumbnail based on course title and discipline. Click generate to create a new one.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => generateThumbnailMutation.mutate()}
                              disabled={isGeneratingThumbnail || !course?.id}
                              data-testid="button-generate-thumbnail"
                            >
                              {isGeneratingThumbnail ? (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  {thumbnailUrl ? "Regenerate" : "Generate with AI"}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="sourceUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Course Page URL
                          </FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                {...field} 
                                type="url"
                                placeholder="https://institution.edu/courses/course-name" 
                                data-testid="input-course-source-url" 
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="default"
                              size="default"
                              onClick={handleExtractFromUrl}
                              disabled={isExtractingCourseData || !field.value}
                              data-testid="button-ai-extract-course"
                            >
                              {isExtractingCourseData ? (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                                  Extracting...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  AI Extract
                                </>
                              )}
                            </Button>
                          </div>
                          <FormDescription>Direct link to this course on the institution's website. Click "AI Extract" to auto-fill course details.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        {/* CRICOS toggle switch */}
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={!!isCricosRegistered}
                            onCheckedChange={(checked) => form.setValue('isCricosRegistered', checked)}
                            data-testid="switch-cricos-registered"
                          />
                          <div>
                            <p className="text-sm font-medium leading-none">CRICOS Registered Course</p>
                            <p className="text-xs text-muted-foreground mt-1">This course appears on the CRICOS register (AU)</p>
                          </div>
                        </div>
                        {!isCricosRegistered ? (
                          <FormField
                            control={form.control}
                            name="courseCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm text-muted-foreground">Course Code / RTO Code</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g. BSB51415" data-testid="input-course-code" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name="cricosCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm text-muted-foreground">CRICOS Code</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g. 116694A" data-testid="input-course-cricos-code" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      <FormField
                        control={form.control}
                        name="qualificationFramework"
                        render={({ field }) => {
                          // Get available frameworks based on institution country
                          const availableFrameworks = getFrameworksForCountry(institutionCountry);
                          const filteredFrameworks = ALL_FRAMEWORKS.filter(f => 
                            availableFrameworks.includes(f.value) || f.value === 'Other'
                          );
                          
                          return (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                Framework
                              </FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Reset level when framework changes
                                  form.setValue("level", "");
                                  form.setValue("customLevel", "");
                                  // Mark framework as manually set to prevent auto-updates
                                  setFrameworkManuallySet(true);
                                }} 
                                value={field.value || "AQF"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-qualification-framework">
                                    <SelectValue placeholder="Select framework" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent position="popper" className="max-h-[250px] overflow-y-auto">
                                  {filteredFrameworks.map(f => (
                                    <SelectItem key={f.value} value={f.value}>
                                      <span className="font-medium">{f.label}</span>
                                      <span className="text-xs text-muted-foreground ml-1.5">({f.fullName})</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="level"
                        render={({ field }) => {
                          const currentFramework = (form.watch("qualificationFramework") || "AQF") as QualificationFramework;
                          const frameworkConfig = FRAMEWORK_CONFIGS[currentFramework];
                          const levels = frameworkConfig?.levels || [];
                          const isOtherFramework = currentFramework === "Other";
                          
                          return (
                            <FormItem>
                              <FormLabel>Level</FormLabel>
                              {isOtherFramework ? (
                                <FormControl>
                                  <Input 
                                    {...field}
                                    placeholder="Enter custom qualification level"
                                    data-testid="input-custom-level"
                                    onChange={(e) => {
                                      field.onChange("Other");
                                      form.setValue("customLevel", e.target.value);
                                    }}
                                    value={form.watch("customLevel") || ""}
                                  />
                                </FormControl>
                              ) : (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-course-level">
                                      <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent position="popper" className="max-h-[280px] overflow-y-auto">
                                    {levels.map(level => (
                                      <SelectItem key={level.value} value={level.value}>
                                        <div className="flex flex-col">
                                          <span>{level.label}</span>
                                          {level.description && (
                                            <span className="text-xs text-muted-foreground">{level.description}</span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="discipline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discipline</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-course-discipline">
                                  <SelectValue placeholder="Select discipline" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                                <SelectItem value="Accounting, Business & Finance">Accounting, Business & Finance</SelectItem>
                                <SelectItem value="Agriculture & Forestry">Agriculture & Forestry</SelectItem>
                                <SelectItem value="Applied Sciences & Professions">Applied Sciences & Professions</SelectItem>
                                <SelectItem value="Arts, Design & Architecture">Arts, Design & Architecture</SelectItem>
                                <SelectItem value="Computer Science & IT">Computer Science & IT</SelectItem>
                                <SelectItem value="Education & Training">Education & Training</SelectItem>
                                <SelectItem value="Engineering & Technology">Engineering & Technology</SelectItem>
                                <SelectItem value="Environmental Studies & Earth Sciences">Environmental Studies & Earth Sciences</SelectItem>
                                <SelectItem value="Hospitality, Leisure & Sports">Hospitality, Leisure & Sports</SelectItem>
                                <SelectItem value="Humanities">Humanities</SelectItem>
                                <SelectItem value="Journalism & Media">Journalism & Media</SelectItem>
                                <SelectItem value="Law">Law</SelectItem>
                                <SelectItem value="Medicine & Health">Medicine & Health</SelectItem>
                                <SelectItem value="Short Courses">Short Courses</SelectItem>
                                <SelectItem value="Trade">Trade</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="subDisciplineId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sub-Discipline</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={!selectedDiscipline}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-course-sub-discipline">
                                  <SelectValue placeholder={selectedDiscipline ? "Select sub-discipline" : "Select discipline first"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                                {subDisciplines.map((sd) => (
                                  <SelectItem key={sd.id} value={sd.id}>
                                    {sd.name}
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
                        name="specialization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specialization</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                value={field.value || ""}
                                placeholder={selectedSubDisciplineId ? "Enter specialization (free text)" : "Select sub-discipline first"}
                                disabled={!selectedSubDisciplineId}
                                list="specialization-suggestions"
                                data-testid="input-course-specialization"
                              />
                            </FormControl>
                            {specializations.length > 0 && (
                              <datalist id="specialization-suggestions">
                                {specializations.map((spec) => (
                                  <option key={spec.id} value={spec.name} />
                                ))}
                              </datalist>
                            )}
                            <FormDescription>Free text with autocomplete from existing entries</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Duration</CardTitle>
                    <CardDescription>Course time commitment and study period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (Text)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="3 years" data-testid="input-course-duration" />
                            </FormControl>
                            <FormDescription>e.g., "2 years"</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="durationMonths"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (Months)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="24" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} data-testid="input-course-durationMonths" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="durationWeeks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (Weeks)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="104" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} data-testid="input-course-durationWeeks" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Fees & Pricing</CardTitle>
                    <CardDescription>Course costs and pricing configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Fee Period Selector - At top since it applies to all fees */}
                    <div className="flex items-center justify-between py-2 border-b pb-4">
                      <div>
                        <span className="text-sm font-medium">Fee Period</span>
                        <p className="text-xs text-muted-foreground">How all tuition fees are quoted</p>
                      </div>
                      <Select
                        value={pricingConfig.feePeriod}
                        onValueChange={(value: 'annual' | 'per_semester' | 'per_trimester' | 'per_term' | 'total') => {
                          setPricingConfig(prev => ({ ...prev, feePeriod: value }));
                        }}
                      >
                        <SelectTrigger className="w-[180px]" data-testid="select-fee-period">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">Annual (Per Year)</SelectItem>
                          <SelectItem value="per_semester">Per Semester</SelectItem>
                          <SelectItem value="per_trimester">Per Trimester</SelectItem>
                          <SelectItem value="per_term">Per Term</SelectItem>
                          <SelectItem value="total">Total Course Fee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fees"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Tuition Fee</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="30000" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} data-testid="input-course-fees" />
                            </FormControl>
                            <FormDescription>Default/base price for the course</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                setCurrencyManuallySet(true);
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-course-currency">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="AUD">AUD — A$ Australian Dollar</SelectItem>
                                <SelectItem value="NZD">NZD — NZ$ New Zealand Dollar</SelectItem>
                                <SelectItem value="GBP">GBP — £ British Pound</SelectItem>
                                <SelectItem value="USD">USD — $ US Dollar</SelectItem>
                                <SelectItem value="CAD">CAD — C$ Canadian Dollar</SelectItem>
                                <SelectItem value="EUR">EUR — € Euro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="applicationFees"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Application Fee</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="100" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} data-testid="input-course-applicationFees" />
                            </FormControl>
                            <FormDescription>Fee charged when submitting the application</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="admissionFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admission / Enrolment Fee</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="250" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} data-testid="input-course-admissionFee" />
                            </FormControl>
                            <FormDescription>One-time fee paid on enrolment / offer acceptance</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Pricing Model Configuration */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-medium">Advanced Pricing</h4>
                          <p className="text-xs text-muted-foreground">Enable dynamic pricing with multiple options</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{pricingConfig.pricingModel === 'fixed' ? 'Fixed' : 'Dynamic'}</span>
                          <Switch
                            data-testid="switch-pricing-model"
                            checked={pricingConfig.pricingModel === 'dynamic'}
                            onCheckedChange={(checked) => {
                              setPricingConfig(prev => ({
                                ...prev,
                                pricingModel: checked ? 'dynamic' : 'fixed'
                              }));
                            }}
                          />
                        </div>
                      </div>

                      {pricingConfig.pricingModel === 'dynamic' && (
                        <div className="space-y-4 pl-4 border-l-2 border-muted">
                          {/* Pricing Dimension Toggles */}
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium">Pricing Dimensions</h5>
                            <p className="text-xs text-muted-foreground mb-2">Select which dimensions affect pricing</p>

                            <div className="flex items-center justify-between py-2">
                              <div>
                                <span className="text-sm">Payment Options</span>
                                <p className="text-xs text-muted-foreground">Upfront vs Installment pricing</p>
                              </div>
                              <Switch
                                data-testid="switch-enable-payment-options"
                                checked={pricingConfig.enablePaymentOptions}
                                onCheckedChange={(checked) => {
                                  setPricingConfig(prev => ({
                                    ...prev,
                                    enablePaymentOptions: checked
                                  }));
                                }}
                              />
                            </div>

                            <div className="flex items-center justify-between py-2">
                              <div>
                                <span className="text-sm">Study Modes</span>
                                <p className="text-xs text-muted-foreground">Weekday, Weekend, Online, etc.</p>
                              </div>
                              <Switch
                                data-testid="switch-enable-study-modes"
                                checked={pricingConfig.enableStudyModes}
                                onCheckedChange={(checked) => {
                                  setPricingConfig(prev => ({
                                    ...prev,
                                    enableStudyModes: checked
                                  }));
                                }}
                              />
                            </div>

                            <div className="flex items-center justify-between py-2">
                              <div>
                                <span className="text-sm">Location-Based Pricing</span>
                                <p className="text-xs text-muted-foreground">Onshore, Offshore, or Country-specific</p>
                              </div>
                              <Switch
                                data-testid="switch-enable-location-pricing"
                                checked={pricingConfig.enableLocationPricing}
                                onCheckedChange={(checked) => {
                                  setPricingConfig(prev => ({
                                    ...prev,
                                    enableLocationPricing: checked
                                  }));
                                }}
                              />
                            </div>
                          </div>

                          {/* Installment Configuration (shown when payment options enabled) */}
                          {pricingConfig.enablePaymentOptions && (
                            <div className="space-y-3 pt-3 border-t">
                              <h5 className="text-sm font-medium">Installment Configuration</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Number of Installments</label>
                                  <Input
                                    type="number"
                                    value={pricingConfig.installmentCount}
                                    onChange={(e) => setPricingConfig(prev => ({
                                      ...prev,
                                      installmentCount: parseInt(e.target.value) || 6
                                    }))}
                                    placeholder="6"
                                    data-testid="input-installment-count"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">First Payment Amount</label>
                                  <Input
                                    type="number"
                                    value={pricingConfig.firstPaymentAmount}
                                    onChange={(e) => setPricingConfig(prev => ({
                                      ...prev,
                                      firstPaymentAmount: e.target.value
                                    }))}
                                    placeholder="e.g., 2000"
                                    data-testid="input-first-payment"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Per-Installment Fee</label>
                                  <Input
                                    type="number"
                                    value={pricingConfig.installmentFee}
                                    onChange={(e) => setPricingConfig(prev => ({
                                      ...prev,
                                      installmentFee: e.target.value
                                    }))}
                                    placeholder="e.g., 50"
                                    data-testid="input-installment-fee"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">Admin fee per installment</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Admission Fee (in First Payment)</label>
                                  <Input
                                    type="number"
                                    value={pricingConfig.admissionFeeIncluded}
                                    onChange={(e) => setPricingConfig(prev => ({
                                      ...prev,
                                      admissionFeeIncluded: e.target.value
                                    }))}
                                    placeholder="e.g., 500"
                                    data-testid="input-admission-fee"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">One-time fee included in first payment</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Pricing Tiers Table */}
                          <div className="space-y-3 pt-3 border-t">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-sm font-medium">Pricing Tiers</h5>
                                <p className="text-xs text-muted-foreground">Configure prices for each combination</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newTier = {
                                    paymentOption: 'upfront' as const,
                                    studyMode: 'all' as const,
                                    locationType: 'all' as const,
                                    isDefaultPrice: pricingTiers.length === 0,
                                    amount: '',
                                    currency: form.getValues('currency') || 'AUD',
                                  };
                                  setPricingTiers(prev => [...prev, newTier]);
                                }}
                                data-testid="button-add-pricing-tier"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Tier
                              </Button>
                            </div>

                            {pricingTiers.length === 0 ? (
                              <div className="p-4 border rounded-md bg-muted/30 text-center">
                                <p className="text-sm text-muted-foreground">No pricing tiers configured</p>
                                <p className="text-xs text-muted-foreground mt-1">Add tiers to define different prices based on your enabled dimensions</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {pricingTiers.map((tier, index) => (
                                  <div key={index} className="p-3 border rounded-md space-y-3 bg-background">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {tier.isDefaultPrice && (
                                          <Badge variant="secondary" className="text-xs">Default</Badge>
                                        )}
                                        <span className="text-sm font-medium">Tier {index + 1}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setPricingTiers(prev => prev.map((t, i) => ({
                                              ...t,
                                              isDefaultPrice: i === index
                                            })));
                                          }}
                                          data-testid={`button-set-default-tier-${index}`}
                                        >
                                          <Star className={`h-4 w-4 ${tier.isDefaultPrice ? 'fill-primary text-primary' : ''}`} />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setPricingTiers(prev => prev.filter((_, i) => i !== index));
                                          }}
                                          data-testid={`button-delete-tier-${index}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                      {pricingConfig.enablePaymentOptions && (
                                        <div>
                                          <label className="text-xs text-muted-foreground">Payment</label>
                                          <Select
                                            value={tier.paymentOption}
                                            onValueChange={(value: 'upfront' | 'installment') => {
                                              setPricingTiers(prev => prev.map((t, i) => i === index ? { ...t, paymentOption: value } : t));
                                            }}
                                          >
                                            <SelectTrigger className="h-8" data-testid={`select-tier-payment-${index}`}>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="upfront">Upfront</SelectItem>
                                              <SelectItem value="installment">Installment</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}

                                      {pricingConfig.enableStudyModes && (
                                        <div>
                                          <label className="text-xs text-muted-foreground">Study Mode</label>
                                          <Select
                                            value={tier.studyMode}
                                            onValueChange={(value: typeof tier.studyMode) => {
                                              setPricingTiers(prev => prev.map((t, i) => i === index ? { ...t, studyMode: value } : t));
                                            }}
                                          >
                                            <SelectTrigger className="h-8" data-testid={`select-tier-study-mode-${index}`}>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="all">All Modes</SelectItem>
                                              <SelectItem value="weekday">Weekday</SelectItem>
                                              <SelectItem value="weekend">Weekend</SelectItem>
                                              <SelectItem value="online">Online</SelectItem>
                                              <SelectItem value="evening">Evening</SelectItem>
                                              <SelectItem value="full_time">Full-Time</SelectItem>
                                              <SelectItem value="part_time">Part-Time</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}

                                      {pricingConfig.enableLocationPricing && (
                                        <div>
                                          <label className="text-xs text-muted-foreground">Location</label>
                                          <Select
                                            value={tier.locationType}
                                            onValueChange={(value: typeof tier.locationType) => {
                                              setPricingTiers(prev => prev.map((t, i) => i === index ? { ...t, locationType: value } : t));
                                            }}
                                          >
                                            <SelectTrigger className="h-8" data-testid={`select-tier-location-${index}`}>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="all">All Locations</SelectItem>
                                              <SelectItem value="onshore">Onshore</SelectItem>
                                              <SelectItem value="offshore">Offshore</SelectItem>
                                              <SelectItem value="country">Specific Country</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}

                                      <div>
                                        <label className="text-xs text-muted-foreground">Amount ({tier.currency})</label>
                                        <Input
                                          type="number"
                                          className="h-8"
                                          value={tier.amount}
                                          onChange={(e) => {
                                            setPricingTiers(prev => prev.map((t, i) => i === index ? { ...t, amount: e.target.value } : t));
                                          }}
                                          placeholder="Price"
                                          data-testid={`input-tier-amount-${index}`}
                                        />
                                      </div>
                                    </div>

                                    {tier.locationType === 'country' && pricingConfig.enableLocationPricing && (
                                      <div className="pt-2">
                                        <label className="text-xs text-muted-foreground">Country</label>
                                        <Input
                                          className="h-8"
                                          value={tier.country || ''}
                                          onChange={(e) => {
                                            setPricingTiers(prev => prev.map((t, i) => i === index ? { ...t, country: e.target.value } : t));
                                          }}
                                          placeholder="e.g., Bangladesh, India"
                                          data-testid={`input-tier-country-${index}`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Location & Dates</CardTitle>
                    <CardDescription>Where and when the course is offered</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <FormLabel>Campuses Offering This Course</FormLabel>
                        <FormDescription className="text-xs">
                          Select all campuses where this course is available
                        </FormDescription>
                      </div>
                      {!selectedInstitutionId ? (
                        <p className="text-sm text-muted-foreground">Please select an institution first</p>
                      ) : institutionDetailsLoading ? (
                        <p className="text-sm text-muted-foreground">Loading institution details...</p>
                      ) : !selectedInstitution?.campusAddresses || selectedInstitution.campusAddresses.length === 0 ? (
                        <div className="p-4 border rounded-md bg-muted/30">
                          <p className="text-sm text-muted-foreground">No campuses configured for this institution</p>
                          <p className="text-xs text-muted-foreground mt-1">Edit the institution to add campus addresses</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-md">
                          {selectedInstitution.campusAddresses.map((campus, index) => {
                            const campusKey = `${campus.address}, ${campus.city}, ${campus.state} ${campus.postcode}`;
                            return (
                              <div key={index} className="flex items-start space-x-2">
                                <Checkbox
                                  id={`campus-${index}`}
                                  checked={selectedCampusIds.includes(campusKey)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedCampusIds([...selectedCampusIds, campusKey]);
                                    } else {
                                      setSelectedCampusIds(selectedCampusIds.filter(id => id !== campusKey));
                                    }
                                  }}
                                  data-testid={`checkbox-course-campus-${index}`}
                                />
                                <label
                                  htmlFor={`campus-${index}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {campus.name && (
                                    <div className="font-semibold">{campus.name}</div>
                                  )}
                                  <div className={campus.name ? "text-xs text-muted-foreground" : ""}>{campus.address}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {campus.city}, {campus.state} {campus.postcode}
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Delivery Mode */}
                    <FormField
                      control={form.control}
                      name="deliveryMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Mode</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-course-deliveryMode">
                                <SelectValue placeholder="Select delivery mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="on-campus">On Campus</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                              <SelectItem value="blended">Blended</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Intake Templates Manager */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium">Intake Schedule</h4>
                          <p className="text-xs text-muted-foreground">
                            Define recurring intake months. Dates auto-calculate each year.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setShowAddIntakeMonth(!showAddIntakeMonth)}
                          data-testid="button-add-intake-template"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Intake
                        </Button>
                      </div>

                      {/* Country-based recommendations */}
                      {institutionCountry && intakeTemplates.length === 0 && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          <div className="font-medium mb-2">Recommended intakes for {institutionCountry}:</div>
                          <div className="flex flex-wrap gap-2">
                            {getCountryIntakeRecommendations(institutionCountry).map((rec) => (
                              <Button
                                key={rec.month}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newTemplate: LocalIntakeTemplate = {
                                    id: `temp-${Date.now()}-${rec.month}`,
                                    courseId: course?.id || "",
                                    month: rec.month,
                                    startDay: rec.startDay,
                                    deadlineWeeksBefore: rec.deadlineWeeksBefore,
                                    openMonthsBefore: 6,
                                    isActive: true,
                                  };
                                  setIntakeTemplates([...intakeTemplates, newTemplate]);
                                }}
                                data-testid={`button-add-recommended-intake-${rec.month}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {MONTH_NAMES[rec.month - 1]}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add intake form */}
                      {showAddIntakeMonth && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-sm font-medium">Month</label>
                              <Select
                                value={String(newIntakeMonth)}
                                onValueChange={(v) => setNewIntakeMonth(parseInt(v))}
                              >
                                <SelectTrigger data-testid="select-intake-month">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MONTH_NAMES.map((name, idx) => (
                                    <SelectItem key={idx + 1} value={String(idx + 1)}>
                                      {name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Start Day</label>
                              <Select
                                value={String(newIntakeStartDay)}
                                onValueChange={(v) => setNewIntakeStartDay(parseInt(v))}
                              >
                                <SelectTrigger data-testid="select-intake-start-day">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 5, 10, 15, 20, 25].map((day) => (
                                    <SelectItem key={day} value={String(day)}>
                                      {day}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Deadline (weeks before)</label>
                              <Select
                                value={String(newIntakeDeadlineWeeks)}
                                onValueChange={(v) => setNewIntakeDeadlineWeeks(parseInt(v))}
                              >
                                <SelectTrigger data-testid="select-intake-deadline-weeks">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[4, 6, 8, 10, 12, 16].map((weeks) => (
                                    <SelectItem key={weeks} value={String(weeks)}>
                                      {weeks} weeks
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAddIntakeMonth(false)}
                              data-testid="button-cancel-add-intake"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                // Check if this month already exists
                                if (intakeTemplates.some(t => t.month === newIntakeMonth)) {
                                  toast({
                                    title: "Month already exists",
                                    description: `${MONTH_NAMES[newIntakeMonth - 1]} intake is already configured.`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                const newTemplate: LocalIntakeTemplate = {
                                  id: `temp-${Date.now()}`,
                                  courseId: course?.id || "",
                                  month: newIntakeMonth,
                                  startDay: newIntakeStartDay,
                                  deadlineWeeksBefore: newIntakeDeadlineWeeks,
                                  openMonthsBefore: 6,
                                  isActive: true,
                                };
                                setIntakeTemplates([...intakeTemplates, newTemplate]);
                                setShowAddIntakeMonth(false);
                                setNewIntakeMonth(1);
                                setNewIntakeStartDay(1);
                                setNewIntakeDeadlineWeeks(8);
                              }}
                              data-testid="button-confirm-add-intake"
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Current intake templates */}
                      {intakeTemplates.length > 0 && (
                        <div className="space-y-2">
                          {intakeTemplates
                            .sort((a, b) => a.month - b.month)
                            .map((template) => {
                              const computed = computeIntakesFromTemplates([{
                                ...template,
                                isActive: template.isActive ?? true,
                                createdAt: template.createdAt ?? null,
                                updatedAt: template.updatedAt ?? null,
                                intakeName: template.intakeName ?? null,
                              }], new Date())[0];
                              return (
                                <div
                                  key={template.id}
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                                >
                                  <div className="flex items-center gap-3">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium">
                                        {MONTH_NAMES[template.month - 1]} Intake
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Starts day {template.startDay} • Deadline {template.deadlineWeeksBefore} weeks before
                                      </div>
                                      {computed && (
                                        <div className="text-xs mt-1">
                                          <Badge variant={computed.status === "open" ? "default" : computed.status === "upcoming" ? "secondary" : "outline"} className="mr-2">
                                            {computed.status}
                                          </Badge>
                                          Next: {format(computed.startDate, "MMM d, yyyy")}
                                          {computed.status === "open" && computed.applicationDeadline && (
                                            <span className="text-muted-foreground"> • Apply by {format(computed.applicationDeadline, "MMM d, yyyy")}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setIntakeTemplates(intakeTemplates.filter(t => t.id !== template.id));
                                    }}
                                    data-testid={`button-remove-intake-${template.month}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          
                          {/* Save intake templates button */}
                          {course?.id && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              disabled={isSavingIntakes}
                              onClick={async () => {
                                setIsSavingIntakes(true);
                                try {
                                  await apiRequest("PUT", `/api/admin/courses/${course.id}/intake-templates`, {
                                    templates: intakeTemplates.map(t => ({
                                      month: t.month,
                                      startDay: t.startDay,
                                      deadlineWeeksBefore: t.deadlineWeeksBefore,
                                      openMonthsBefore: t.openMonthsBefore || 6,
                                      isActive: t.isActive !== false,
                                    }))
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["/api/courses", course.id, "intake-templates"] });
                                  toast({
                                    title: "Intake templates saved",
                                    description: `${intakeTemplates.length} intake(s) configured for this course.`,
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Failed to save intakes",
                                    description: "Please try again.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsSavingIntakes(false);
                                }
                              }}
                              data-testid="button-save-intake-templates"
                            >
                              {isSavingIntakes ? "Saving..." : "Save Intake Schedule"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ——— Specific Intake Dates ——— */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Specific Intake Dates</span>
                        <span className="text-xs text-muted-foreground">(exact calendar dates, e.g. 19 Jan 2026)</span>
                      </div>

                      {/* Add new specific date */}
                      {course?.id && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Input
                            type="date"
                            value={newSpecificDate}
                            onChange={(e) => setNewSpecificDate(e.target.value)}
                            className="w-40"
                            data-testid="input-specific-intake-date"
                          />
                          <Input
                            placeholder="Label (optional)"
                            value={newSpecificLabel}
                            onChange={(e) => setNewSpecificLabel(e.target.value)}
                            className="w-44"
                            data-testid="input-specific-intake-label"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!newSpecificDate}
                            onClick={async () => {
                              if (!newSpecificDate) return;
                              try {
                                const resp = await apiRequest("POST", `/api/admin/courses/${course.id}/intake-dates`, {
                                  intakeDate: newSpecificDate,
                                  label: newSpecificLabel || null,
                                });
                                const added: CourseIntakeDate = await resp.json();
                                setSpecificDates(prev => [...prev, added].sort((a, b) => (a.intakeDate ?? '').localeCompare(b.intakeDate ?? '')));
                                setNewSpecificDate("");
                                setNewSpecificLabel("");
                                queryClient.invalidateQueries({ queryKey: ["/api/courses", course.id, "intake-dates"] });
                                toast({ title: "Intake date added" });
                              } catch {
                                toast({ title: "Failed to add intake date", variant: "destructive" });
                              }
                            }}
                            data-testid="button-add-specific-intake-date"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Date
                          </Button>
                        </div>
                      )}

                      {/* List of specific dates */}
                      {specificDates.length > 0 ? (
                        <div className="space-y-1">
                          {specificDates
                            .slice()
                            .sort((a, b) => (a.intakeDate ?? '').localeCompare(b.intakeDate ?? ''))
                            .map((d) => {
                              const parsed = new Date(`${d.intakeDate}T00:00:00`);
                              const formatted = parsed.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
                              return (
                                <div
                                  key={d.id}
                                  className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md border"
                                  data-testid={`item-specific-date-${d.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">{formatted}</span>
                                    {d.label && (
                                      <span className="text-xs text-muted-foreground">— {d.label}</span>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => {
                                      try {
                                        await apiRequest("DELETE", `/api/admin/courses/${course?.id}/intake-dates/${d.id}`);
                                        setSpecificDates(prev => prev.filter(x => x.id !== d.id));
                                        queryClient.invalidateQueries({ queryKey: ["/api/courses", course?.id, "intake-dates"] });
                                        toast({ title: "Intake date removed" });
                                      } catch {
                                        toast({ title: "Failed to remove date", variant: "destructive" });
                                      }
                                    }}
                                    data-testid={`button-remove-specific-date-${d.id}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No specific intake dates added yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Requirements
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-sm">
                              <div className="space-y-2 text-sm">
                                <p className="font-semibold">Entry Requirements Guide</p>
                                <p>This section defines who can apply for this course. It's critical for international students to understand their eligibility.</p>
                                <ul className="list-disc pl-4 space-y-1">
                                  <li><strong>Prerequisites:</strong> Subject/skill requirements before enrollment</li>
                                  <li><strong>Entry Requirements:</strong> Academic qualifications accepted (e.g., HSC, A-Levels)</li>
                                  <li><strong>English Requirements:</strong> Language test scores (IELTS, PTE, etc.)</li>
                                </ul>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </CardTitle>
                        <CardDescription>Entry and eligibility requirements for this course</CardDescription>
                      </div>
                      {/* Requirements Completeness Indicator */}
                      {(() => {
                        const hasPrerequisites = !!form.watch("prerequisites");
                        const hasEntryReqs = selectedEntryRequirements.length > 0;
                        const hasEnglishReqs = englishRequirements.length > 0;
                        const completedCount = [hasPrerequisites, hasEntryReqs, hasEnglishReqs].filter(Boolean).length;
                        const isComplete = completedCount >= 2;
                        
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                              {completedCount}/3 sections
                            </Badge>
                            {!isComplete && (
                              <span className="text-xs text-muted-foreground">
                                {!hasEntryReqs && !hasEnglishReqs ? "Add entry & English requirements" : 
                                 !hasEntryReqs ? "Add entry requirements" : 
                                 !hasEnglishReqs ? "Add English requirements" : "Add prerequisites"}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Help Banner for Requirements Section */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm space-y-2">
                          <p className="font-medium text-blue-900 dark:text-blue-200">Why Entry Requirements Matter</p>
                          <p className="text-blue-800 dark:text-blue-300">
                            Entry requirements help international students determine if they qualify for this course. 
                            Similar courses (e.g., all Nursing programs) typically share similar requirements across institutions.
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="outline" className="text-xs bg-white dark:bg-transparent">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              Academic qualifications
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-white dark:bg-transparent">
                              <Globe className="h-3 w-3 mr-1" />
                              English proficiency
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-white dark:bg-transparent">
                              <FileText className="h-3 w-3 mr-1" />
                              Prerequisites
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="prerequisites"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Prerequisites
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">
                                  List any subjects, skills, or prior knowledge students need before enrolling. 
                                  Examples: "Biology and Chemistry at Year 12 level", "Portfolio of creative work"
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="e.g., High school diploma with Biology and Chemistry at Year 12 level, or equivalent foundation studies..." 
                              rows={3} 
                              data-testid="input-course-prerequisites" 
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Describe subject requirements, prior study, or other prerequisites for enrollment
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="eligibilityRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Eligibility Requirements
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">
                                  General eligibility criteria such as minimum age, work experience, or other conditions not covered by academic qualifications.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="e.g., Applicants must be at least 18 years old with a minimum of 2 years of relevant work experience..."
                              rows={4}
                              data-testid="input-course-eligibilityRequirements"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            General eligibility criteria (age, work experience, residency status, etc.)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Discipline-Specific Regulatory Warnings */}
                    {detectedDisciplineRules.length > 0 && (
                      <div className="space-y-3">
                        {detectedDisciplineRules.map((rule) => (
                          <div 
                            key={rule.id}
                            className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                          >
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 space-y-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-amber-900 dark:text-amber-100">
                                      {rule.regulatoryBodyAbbr} Regulated Course
                                    </span>
                                    <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700">
                                      {rule.name}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                                    {rule.description}
                                  </p>
                                </div>

                                {rule.warnings.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Important:</p>
                                    <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-0.5 list-disc list-inside">
                                      {rule.warnings.map((warning, idx) => (
                                        <li key={idx}>{warning}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {rule.qualificationRequirements && rule.qualificationRequirements.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Qualification Requirements:</p>
                                    <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                                      {rule.qualificationRequirements.map((qr, idx) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-amber-600 dark:text-amber-400">•</span>
                                          <span>
                                            {qr.description}
                                            {qr.link && (
                                              <a
                                                href={qr.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-1 text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-0.5"
                                              >
                                                <ExternalLink className="h-2.5 w-2.5" />
                                              </a>
                                            )}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {rule.englishRequirements && rule.englishRequirements.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                                      {rule.regulatoryBodyAbbr} English Requirements:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {rule.englishRequirements.slice(0, 3).map((req, idx) => {
                                        const allSame = req.minListening === req.minReading && 
                                                       req.minReading === req.minWriting && 
                                                       req.minWriting === req.minSpeaking;
                                        return (
                                          <Badge 
                                            key={idx} 
                                            variant="secondary" 
                                            className="text-xs bg-amber-100 dark:bg-amber-900/50"
                                          >
                                            {req.testType}: {req.minOverall} overall
                                            {allSame 
                                              ? ` (min ${req.minListening} per band)` 
                                              : ` (L${req.minListening}/R${req.minReading}/W${req.minWriting}/S${req.minSpeaking})`
                                            }
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="mt-1"
                                      onClick={() => {
                                        const newReqs = rule.englishRequirements?.map(req => ({
                                          testType: req.testType.includes("IELTS") ? "ielts" : 
                                                   req.testType.includes("PTE") ? "pte" :
                                                   req.testType.includes("TOEFL") ? "toefl" :
                                                   req.testType.includes("OET") ? "oet" : "ielts",
                                          minOverallScore: req.minOverall,
                                          minListeningScore: req.minListening,
                                          minReadingScore: req.minReading,
                                          minWritingScore: req.minWriting,
                                          minSpeakingScore: req.minSpeaking,
                                          notes: req.notes,
                                        })) || [];
                                        
                                        const uniqueReqs = newReqs.filter(nr => 
                                          !englishRequirements.some(er => er.testType === nr.testType)
                                        );
                                        
                                        if (uniqueReqs.length > 0) {
                                          batchCreateEnglishReqMutation.mutate(uniqueReqs);
                                        } else {
                                          toast({
                                            title: "Already Added",
                                            description: "These English requirements are already configured.",
                                          });
                                        }
                                      }}
                                      data-testid={`apply-regulatory-english-${rule.id}`}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Apply {rule.regulatoryBodyAbbr} English Requirements
                                    </Button>
                                  </div>
                                )}

                                {rule.links.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {rule.links.map((link, idx) => (
                                      <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {link.label}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Entry Requirements Section - Academic Qualifications */}
                    {selectedInstitutionId && currentCourseLevel && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <FormLabel className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4" />
                            Academic Entry Requirements
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div className="space-y-2 text-sm">
                                  <p className="font-semibold">Country-Specific Qualifications</p>
                                  <p>Select the academic qualifications accepted for entry. Students will see requirements for their country.</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <div className="flex items-center gap-2">
                            {selectedEntryRequirements.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {selectedEntryRequirements.length} qualifications
                              </Badge>
                            )}
                            {course?.id && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    setIsLoadingRecommendations(true);
                                    setPlatformRecommendations(null);
                                    try {
                                      const response = await apiRequest("POST", "/api/ai/recommend-entry-requirements", {
                                        courseLevel: currentCourseLevel,
                                        institutionCountry: institutionCountry,
                                        courseName: form.getValues("title"),
                                        discipline: form.getValues("discipline"),
                                        excludeCourseId: course?.id,
                                      });
                                      if (response.ok) {
                                        const data = await response.json();
                                        setPlatformRecommendations(data.recommendations);
                                        setRecommendationsMessage(data.message || "");
                                        if (data.similarCoursesCount === 0) {
                                          toast({
                                            title: "No Similar Courses Found",
                                            description: "Use AI Generate to create new requirements.",
                                          });
                                        }
                                      }
                                    } catch (error) {
                                      console.error("Error fetching recommendations:", error);
                                    } finally {
                                      setIsLoadingRecommendations(false);
                                    }
                                  }}
                                  disabled={isLoadingRecommendations}
                                  data-testid="button-get-recommendations"
                                >
                                  {isLoadingRecommendations ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1" />
                                  ) : (
                                    <Target className="h-4 w-4 mr-1" />
                                  )}
                                  Recommendations
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="default"
                                  onClick={() => setAiEntryReqDialogOpen(true)}
                                  disabled={isGeneratingAiReqs}
                                  data-testid="button-ai-generate-entry-reqs"
                                >
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  AI Generate
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Loading state */}
                        {(templatesLoading || entryReqLoading) && (
                          <p className="text-sm text-muted-foreground py-2">Loading qualifications...</p>
                        )}

                        {/* Country Filter Tabs */}
                        {!templatesLoading && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <label className="text-xs font-medium text-muted-foreground">Filter by country:</label>
                              <div className="flex gap-1 flex-wrap">
                                <Badge
                                  variant={selectedCountryFilter === "all" ? "default" : "outline"}
                                  className="cursor-pointer text-xs"
                                  onClick={() => setSelectedCountryFilter("all")}
                                  data-testid="country-filter-all"
                                >
                                  All Countries
                                </Badge>
                                {(() => {
                                  const countries = Array.from(new Set(entryRequirementTemplates.map(t => t.qualification.country))).sort((a, b) => {
                                    if (a === 'Australia') return -1;
                                    if (b === 'Australia') return 1;
                                    if (a === 'Bangladesh') return -1;
                                    if (b === 'Bangladesh') return 1;
                                    return a.localeCompare(b);
                                  });
                                  return countries.map(country => {
                                    const countInCountry = entryRequirementTemplates.filter(t => t.qualification.country === country).length;
                                    const selectedInCountry = selectedEntryRequirements.filter(r => {
                                      const template = entryRequirementTemplates.find(t => t.qualificationTypeId === r.qualificationTypeId);
                                      return template?.qualification?.country === country;
                                    }).length;
                                    return (
                                      <Badge
                                        key={country}
                                        variant={selectedCountryFilter === country ? "default" : "outline"}
                                        className="cursor-pointer text-xs"
                                        onClick={() => setSelectedCountryFilter(country)}
                                        data-testid={`country-filter-${country.toLowerCase().replace(/\s+/g, '-')}`}
                                      >
                                        {country}
                                        {selectedInCountry > 0 && (
                                          <span className="ml-1 bg-primary-foreground/20 px-1 rounded">{selectedInCountry}/{countInCountry}</span>
                                        )}
                                      </Badge>
                                    );
                                  });
                                })()}
                              </div>
                            </div>

                            {/* Qualifications for Selected Country */}
                            {entryRequirementTemplates.length > 0 && (
                              <div className="rounded-md border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead className="w-10"></TableHead>
                                      <TableHead>Qualification</TableHead>
                                      <TableHead>Country</TableHead>
                                      <TableHead className="w-32">Min Grade</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {entryRequirementTemplates
                                      .filter(template => selectedCountryFilter === "all" || template.qualification.country === selectedCountryFilter)
                                      .map((template) => {
                                        const isSelected = selectedEntryRequirements.some(
                                          r => r.qualificationTypeId === template.qualificationTypeId
                                        );
                                        const selectedReq = selectedEntryRequirements.find(
                                          r => r.qualificationTypeId === template.qualificationTypeId
                                        );
                                        return (
                                          <TableRow 
                                            key={template.id}
                                            className={isSelected ? "bg-primary/5" : ""}
                                            data-testid={`entry-req-row-${template.qualificationTypeId}`}
                                          >
                                            <TableCell className="text-center">
                                              <div
                                                onClick={() => handleEntryRequirementToggle(template)}
                                                className={`h-5 w-5 rounded border cursor-pointer flex items-center justify-center transition-colors mx-auto ${
                                                  isSelected 
                                                    ? 'bg-primary border-primary' 
                                                    : 'border-muted-foreground/30 hover:border-primary/50'
                                                }`}
                                                data-testid={`entry-req-checkbox-${template.qualificationTypeId}`}
                                              >
                                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <span className="font-medium text-sm">{template.qualification.name}</span>
                                              {template.displayLabel && template.displayLabel !== template.qualification.name && (
                                                <p className="text-xs text-muted-foreground">{template.displayLabel}</p>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant="outline" className="text-xs">{template.qualification.country}</Badge>
                                            </TableCell>
                                            <TableCell>
                                              {isSelected ? (
                                                <Input
                                                  type="text"
                                                  placeholder={template.minGrade || "Min grade"}
                                                  value={selectedReq?.minGrade || ""}
                                                  onChange={(e) => handleUpdateEntryRequirementGrade(template.qualificationTypeId, e.target.value)}
                                                  className="h-8 text-sm"
                                                  disabled={saveEntryRequirementsMutation.isPending}
                                                  data-testid={`entry-req-grade-${template.qualificationTypeId}`}
                                                />
                                              ) : (
                                                <span className="text-xs text-muted-foreground">
                                                  {template.minGrade || "-"}
                                                </span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}

                            {entryRequirementTemplates.length === 0 && institutionCountry && (
                              <p className="text-sm text-muted-foreground py-2">
                                No qualification templates configured for {currentCourseLevel} courses in {institutionCountry}.
                              </p>
                            )}

                            {/* Platform Recommendations Panel */}
                            {platformRecommendations && platformRecommendations.entryRequirements && platformRecommendations.entryRequirements.length > 0 && (
                              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                      Based on Similar Courses
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setPlatformRecommendations(null)}
                                    className="h-6 w-6 p-0"
                                    data-testid="button-close-recommendations"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                {recommendationsMessage && (
                                  <p className="text-xs text-green-700 dark:text-green-300 mb-2">{recommendationsMessage}</p>
                                )}
                                <div className="flex flex-wrap gap-1">
                                  {platformRecommendations.entryRequirements.map((rec) => {
                                    const isAlreadySelected = selectedEntryRequirements.some(
                                      r => r.qualificationTypeId === rec.qualificationTypeId
                                    );
                                    return (
                                      <Badge
                                        key={rec.qualificationTypeId}
                                        variant={isAlreadySelected ? "secondary" : "outline"}
                                        className={`cursor-pointer text-xs ${isAlreadySelected ? 'bg-green-100 dark:bg-green-900' : ''}`}
                                        onClick={() => {
                                          if (!isAlreadySelected) {
                                            setSelectedEntryRequirements(prev => [
                                              ...prev,
                                              {
                                                qualificationTypeId: rec.qualificationTypeId,
                                                minGrade: rec.suggestedMinGrade || "",
                                              }
                                            ]);
                                          }
                                        }}
                                        data-testid={`add-recommendation-${rec.qualificationTypeId}`}
                                      >
                                        {rec.qualification.name} ({rec.qualification.country})
                                        {rec.suggestedMinGrade && `: ${rec.suggestedMinGrade}`}
                                        {isAlreadySelected ? (
                                          <Check className="h-3 w-3 ml-1" />
                                        ) : (
                                          <Plus className="h-3 w-3 ml-1" />
                                        )}
                                      </Badge>
                                    );
                                  })}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-2 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                                  onClick={() => {
                                    const newReqs = platformRecommendations.entryRequirements
                                      .filter(rec => !selectedEntryRequirements.some(r => r.qualificationTypeId === rec.qualificationTypeId))
                                      .map(rec => ({
                                        qualificationTypeId: rec.qualificationTypeId,
                                        minGrade: rec.suggestedMinGrade || "",
                                      }));
                                    setSelectedEntryRequirements(prev => [...prev, ...newReqs]);
                                    toast({
                                      title: "Recommendations Applied",
                                      description: `Added ${newReqs.length} qualifications.`,
                                    });
                                  }}
                                  data-testid="button-apply-all-entry-recommendations"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Apply All ({platformRecommendations.entryRequirements.filter(
                                    rec => !selectedEntryRequirements.some(r => r.qualificationTypeId === rec.qualificationTypeId)
                                  ).length} remaining)
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Summary of Selected Requirements */}
                        {selectedEntryRequirements.length > 0 && (
                          <div className="pt-3 border-t">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                Selected: {selectedEntryRequirements.length} qualifications from {
                                  Array.from(new Set(selectedEntryRequirements.map(r => {
                                    const template = entryRequirementTemplates.find(t => t.qualificationTypeId === r.qualificationTypeId);
                                    const existingReq = courseEntryRequirements.find(er => er.qualificationTypeId === r.qualificationTypeId);
                                    return template?.qualification?.country || existingReq?.qualification?.country || 'Unknown';
                                  }))).filter(c => c !== 'Unknown').length || 1
                                } countries
                              </label>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedEntryRequirements([])}
                                className="text-xs h-6"
                                data-testid="button-clear-all-entry-reqs"
                              >
                                Clear All
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedEntryRequirements.map((req) => {
                                const template = entryRequirementTemplates.find(t => t.qualificationTypeId === req.qualificationTypeId);
                                const existingReq = courseEntryRequirements.find(r => r.qualificationTypeId === req.qualificationTypeId);
                                const qualName = template?.qualification?.name || existingReq?.qualification?.name || 'Unknown';
                                const qualCountry = template?.qualification?.country || existingReq?.qualification?.country || '';
                                return (
                                  <Badge
                                    key={req.qualificationTypeId}
                                    variant="secondary"
                                    className="text-xs pr-1"
                                    data-testid={`selected-entry-badge-${req.qualificationTypeId}`}
                                  >
                                    {qualName} ({qualCountry})
                                    {req.minGrade && `: ${req.minGrade}`}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEntryRequirement(req.qualificationTypeId)}
                                      className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message when institution/level not selected */}
                    {(!selectedInstitutionId || !currentCourseLevel) && (
                      <div className="space-y-2">
                        <FormLabel className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4" />
                          Entry Requirements
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Select an institution and course level to configure entry requirements.
                        </p>
                      </div>
                    )}

                    {/* Structured English Requirements Section */}
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          English Language Requirements
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <div className="space-y-2 text-sm">
                                <p className="font-semibold">English Proficiency Tests</p>
                                <p>Define the minimum scores required for each test type. Include band scores (Listening, Reading, Writing, Speaking) where applicable.</p>
                                <div className="text-xs text-muted-foreground space-y-1 pt-1">
                                  <p><strong>Common requirements:</strong></p>
                                  <p>• Nursing: IELTS 7.0 (NMBA regulated)</p>
                                  <p>• Engineering: IELTS 6.0-6.5</p>
                                  <p>• Masters: IELTS 6.5 typically</p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        {course?.id && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              onClick={() => {
                                resetGenerateTestsForm();
                                setGenerateTestsDialogOpen(true);
                              }}
                              data-testid="button-generate-all-tests"
                            >
                              <Sparkles className="h-4 w-4 mr-1" />
                              Generate All Tests
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleAddEnglishReq}
                              data-testid="button-add-english-requirement"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Test
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {!course?.id && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <p className="text-sm text-amber-800 dark:text-amber-300">
                            Save the course first to add English language requirements.
                          </p>
                        </div>
                      )}
                      
                      {course?.id && englishRequirements.length === 0 && (
                        <div className="p-4 border-2 border-dashed rounded-lg text-center">
                          <Globe className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">No English requirements added yet</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                            Click "Generate All Tests" to automatically add IELTS, PTE, TOEFL, and Duolingo with equivalent scores based on your course level, or "Add Test" to add individual tests manually.
                          </p>
                        </div>
                      )}
                      
                      {course?.id && englishRequirements.length > 0 && (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Test Type</TableHead>
                                <TableHead>Min Overall</TableHead>
                                <TableHead>Band Scores (L/R/W/S)</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {englishRequirements.map((req) => (
                                <TableRow key={req.id} data-testid={`row-english-req-${req.id}`}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {TEST_TYPE_CONFIG[req.testType]?.label || req.testType.toUpperCase()}
                                      {req.isPreferred && (
                                        <Badge variant="secondary" className="text-xs">
                                          <Star className="h-3 w-3 mr-1" />
                                          Preferred
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium">{req.minOverallScore}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {[req.minListeningScore, req.minReadingScore, req.minWritingScore, req.minSpeakingScore]
                                      .filter(Boolean)
                                      .length > 0 ? (
                                      <>
                                        {req.minListeningScore && `L:${req.minListeningScore}`}
                                        {req.minReadingScore && ` R:${req.minReadingScore}`}
                                        {req.minWritingScore && ` W:${req.minWritingScore}`}
                                        {req.minSpeakingScore && ` S:${req.minSpeakingScore}`}
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">{req.notes || "-"}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleEditEnglishReq(req)}
                                        data-testid={`button-edit-english-req-${req.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        onClick={() => {
                                          if (confirm("Are you sure you want to delete this requirement?")) {
                                            deleteEnglishReqMutation.mutate(req.id);
                                          }
                                        }}
                                        data-testid={`button-delete-english-req-${req.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Career & Outcomes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Career &amp; Outcomes
                    </CardTitle>
                    <CardDescription>Career paths, outcomes, and internship opportunities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="careerOutcomes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Career Outcomes
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">Enter job titles graduates can pursue, separated by commas.</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="e.g., Civil Engineer, Project Manager, Construction Manager, Structural Designer"
                              rows={3}
                              data-testid="input-course-careerOutcomes"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Comma-separated list of roles graduates typically pursue
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="careerPath"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Career Path Description</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Describe the typical career progression and opportunities for graduates..."
                              rows={3}
                              data-testid="input-course-careerPath"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minimumAge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Age</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="18"
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                                data-testid="input-course-minimumAge"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="prPathway"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>PR Pathway</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                This course can lead to permanent residency
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                                data-testid="switch-course-prPathway"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="internshipAvailable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Internship Available</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              This course includes an internship or work placement component
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              data-testid="switch-course-internshipAvailable"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("internshipAvailable") && (
                      <FormField
                        control={form.control}
                        name="internshipDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Internship Details</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Describe the internship: duration, industry, placement process, host organisations..."
                                rows={3}
                                data-testid="input-course-internshipDetails"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Markets</CardTitle>
                    <CardDescription>Which regional domains should display this course</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { code: 'AU', label: 'Australia (AU)' },
                      { code: 'BD', label: 'Bangladesh (BD)' },
                    ].map((market) => (
                      <label
                        key={market.code}
                        className="flex items-center gap-3 cursor-pointer"
                        data-testid={`label-course-market-${market.code.toLowerCase()}`}
                      >
                        <Checkbox
                          checked={selectedMarkets.includes(market.code)}
                          onCheckedChange={(checked) => {
                            setSelectedMarkets(prev =>
                              checked
                                ? [...prev, market.code]
                                : prev.filter(m => m !== market.code)
                            );
                          }}
                          data-testid={`checkbox-course-market-${market.code.toLowerCase()}`}
                        />
                        <span className="text-sm">{market.label}</span>
                      </label>
                    ))}
                    {selectedMarkets.length === 0 && (
                      <p className="text-xs text-destructive">At least one market must be selected. Defaults to both if none selected on save.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Featured On</CardTitle>
                    <CardDescription>Which regional homepages should feature this course</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { code: 'AU', label: 'Australia (AU)' },
                      { code: 'BD', label: 'Bangladesh (BD)' },
                    ].map((market) => (
                      <label
                        key={market.code}
                        className="flex items-center gap-3 cursor-pointer"
                        data-testid={`label-course-featured-${market.code.toLowerCase()}`}
                      >
                        <Checkbox
                          checked={selectedFeaturedMarkets.includes(market.code)}
                          onCheckedChange={(checked) => {
                            setSelectedFeaturedMarkets(prev =>
                              checked
                                ? [...prev, market.code]
                                : prev.filter(m => m !== market.code)
                            );
                          }}
                          data-testid={`checkbox-course-featured-${market.code.toLowerCase()}`}
                        />
                        <span className="text-sm">{market.label}</span>
                      </label>
                    ))}
                    {selectedFeaturedMarkets.length === 0 && (
                      <p className="text-xs text-muted-foreground">Not featured on any homepage.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Course Tags
                      </CardTitle>
                      {selectedTagIds.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedTagIds.length} selected
                        </Badge>
                      )}
                    </div>
                    <CardDescription>Select tags to help students find this course</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {groupedTags && Object.entries(groupedTags).map(([category, categoryTags]) => {
                      const categoryConfig = TAG_CATEGORY_LABELS[category];
                      const CategoryIcon = categoryConfig?.icon || Tag;
                      const filteredCategoryTags = categoryTags.filter((tag: TagType) => tag.slug !== 'featured');
                      const selectedInCategory = filteredCategoryTags.filter((tag: TagType) => 
                        selectedTagIds.includes(String(tag.id))
                      ).length;
                      
                      return (
                        <Collapsible key={category} defaultOpen={selectedInCategory > 0}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 rounded-md hover:bg-muted/50 transition-colors group">
                            <div className="flex items-center gap-2">
                              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{categoryConfig?.label || category}</span>
                              {selectedInCategory > 0 && (
                                <Badge variant="default" className="text-xs h-5 px-1.5">
                                  {selectedInCategory}
                                </Badge>
                              )}
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-1 pb-2">
                            <div className="space-y-0.5 pl-6">
                              {filteredCategoryTags.map((tag: TagType) => {
                                const isSelected = selectedTagIds.includes(String(tag.id));
                                return (
                                  <div
                                    key={tag.id}
                                    onClick={() => handleTagToggle(String(tag.id))}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                                      isSelected 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'hover:bg-muted/50'
                                    }`}
                                    data-testid={`tag-option-${tag.slug}`}
                                  >
                                    <div 
                                      className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                        isSelected 
                                          ? 'bg-primary border-primary' 
                                          : 'border-muted-foreground/30'
                                      }`}
                                      style={isSelected ? { backgroundColor: tag.color || undefined } : {}}
                                    >
                                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                    </div>
                                    <span className="text-sm flex-1">{tag.name}</span>
                                    {tag.description && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                            {tag.description}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{tag.description}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                    
                    {!groupedTags && (
                      <div className="flex items-center justify-center py-4">
                        <p className="text-sm text-muted-foreground">Loading tags...</p>
                      </div>
                    )}

                    {selectedTagIds.length > 0 && (
                      <div className="pt-3 border-t mt-3">
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">
                          Selected Tags
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {getSelectedTags().map((tag) => (
                            <Badge
                              key={tag.id}
                              style={{ backgroundColor: tag.color || '#3B82F6' }}
                              className="cursor-pointer pr-1"
                              data-testid={`selected-tag-${tag.slug}`}
                            >
                              {tag.name}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(String(tag.id))}
                                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scholarships Section - only show if institution has scholarships */}
                {selectedInstitutionId && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5" />
                          Scholarships
                        </CardTitle>
                        {selectedScholarshipIds.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedScholarshipIds.length} selected
                          </Badge>
                        )}
                      </div>
                      <CardDescription>Select scholarships available for this course</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {institutionScholarships.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2" data-testid="text-no-scholarships">
                          No scholarships available for this institution. Add scholarships in the institution editor first.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {institutionScholarships.map((scholarship) => {
                            const isSelected = selectedScholarshipIds.includes(scholarship.id);
                            return (
                              <div
                                key={scholarship.id}
                                onClick={() => handleScholarshipToggle(scholarship.id)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors border ${
                                  isSelected 
                                    ? 'bg-primary/10 border-primary/30' 
                                    : 'hover:bg-muted/50 border-transparent'
                                }`}
                                data-testid={`scholarship-option-${scholarship.id}`}
                              >
                                <div 
                                  className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isSelected 
                                      ? 'bg-primary border-primary' 
                                      : 'border-muted-foreground/30'
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{scholarship.name}</span>
                                    <Badge 
                                      variant={scholarship.status === 'open' ? 'default' : scholarship.status === 'closed' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {SCHOLARSHIP_STATUS_LABELS[scholarship.status]}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      {formatScholarshipValue(scholarship)}
                                    </span>
                                    {scholarship.description && (
                                      <span className="truncate max-w-[200px]">
                                        {scholarship.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedScholarshipIds.length > 0 && (
                        <div className="pt-3 border-t mt-3">
                          <label className="text-xs font-medium text-muted-foreground mb-2 block">
                            Selected Scholarships
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {getSelectedScholarships().map((scholarship) => (
                              <Badge
                                key={scholarship.id}
                                variant="default"
                                className="cursor-pointer pr-1"
                                data-testid={`selected-scholarship-${scholarship.id}`}
                              >
                                {scholarship.name} ({formatScholarshipValue(scholarship)})
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleScholarshipToggle(scholarship.id);
                                  }}
                                  className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {course && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Approval Status</span>
                        <Badge variant={course.approvalStatus === 'approved' ? 'default' : 'outline'}>
                          {course.approvalStatus || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active</span>
                        <Badge variant={course.isActive ? 'default' : 'secondary'}>
                          {course.isActive ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* English Requirement Add/Edit Dialog */}
      <Dialog open={englishReqDialogOpen} onOpenChange={setEnglishReqDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEnglishReq ? "Edit English Requirement" : "Add English Requirement"}</DialogTitle>
            <DialogDescription>
              Enter the minimum test scores required for admission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Type</label>
              <Select
                value={englishReqForm.testType}
                onValueChange={(value) => {
                  setEnglishReqForm(prev => ({ 
                    ...prev, 
                    testType: value,
                    minOverallScore: "",
                    minListeningScore: "",
                    minReadingScore: "",
                    minWritingScore: "",
                    minSpeakingScore: "",
                  }));
                }}
              >
                <SelectTrigger data-testid="select-english-test-type">
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEST_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label} ({config.range})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {englishReqForm.testType && (
              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md space-y-1">
                <p>Score range for {TEST_TYPE_CONFIG[englishReqForm.testType]?.label}: <strong>{TEST_TYPE_CONFIG[englishReqForm.testType]?.range}</strong></p>
                {TEST_TYPE_CONFIG[englishReqForm.testType]?.supportsAutoCalc ? (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Overall score will be auto-calculated when you enter all band scores
                  </p>
                ) : (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    {englishReqForm.testType === "pte" ? "PTE uses a proprietary algorithm - enter the required overall score" : 
                     "Duolingo uses a proprietary algorithm - enter the required overall score"}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Min Listening {englishReqForm.testType && `(${TEST_TYPE_CONFIG[englishReqForm.testType]?.sectionRange})`}
                </label>
                <Input
                  type="number"
                  step={TEST_TYPE_CONFIG[englishReqForm.testType]?.step || "0.5"}
                  value={englishReqForm.minListeningScore}
                  onChange={(e) => {
                    const newListening = e.target.value;
                    setEnglishReqForm(prev => {
                      const updated = { ...prev, minListeningScore: newListening };
                      const { autoScore, shouldAutoSet } = computeAutoOverallScore(
                        prev.testType,
                        newListening,
                        prev.minReadingScore,
                        prev.minWritingScore,
                        prev.minSpeakingScore,
                        prev.minOverallScore
                      );
                      if (autoScore && shouldAutoSet) {
                        updated.minOverallScore = autoScore;
                      }
                      return updated;
                    });
                  }}
                  placeholder={TEST_TYPE_CONFIG[englishReqForm.testType]?.sectionPlaceholder || "Optional"}
                  data-testid="input-english-min-listening"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Min Reading {englishReqForm.testType && `(${TEST_TYPE_CONFIG[englishReqForm.testType]?.sectionRange})`}
                </label>
                <Input
                  type="number"
                  step={TEST_TYPE_CONFIG[englishReqForm.testType]?.step || "0.5"}
                  value={englishReqForm.minReadingScore}
                  onChange={(e) => {
                    const newReading = e.target.value;
                    setEnglishReqForm(prev => {
                      const updated = { ...prev, minReadingScore: newReading };
                      const { autoScore, shouldAutoSet } = computeAutoOverallScore(
                        prev.testType,
                        prev.minListeningScore,
                        newReading,
                        prev.minWritingScore,
                        prev.minSpeakingScore,
                        prev.minOverallScore
                      );
                      if (autoScore && shouldAutoSet) {
                        updated.minOverallScore = autoScore;
                      }
                      return updated;
                    });
                  }}
                  placeholder={TEST_TYPE_CONFIG[englishReqForm.testType]?.sectionPlaceholder || "Optional"}
                  data-testid="input-english-min-reading"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Min Writing {englishReqForm.testType && `(${TEST_TYPE_CONFIG[englishReqForm.testType]?.sectionRange})`}
                </label>
                <Input
                  type="number"
                  step={TEST_TYPE_CONFIG[englishReqForm.testType]?.step || "0.5"}
                  value={englishReqForm.minWritingScore}
                  onChange={(e) => {
                    const newWriting = e.target.value;
                    setEnglishReqForm(prev => {
                      const updated = { ...prev, minWritingScore: newWriting };
                      const { autoScore, shouldAutoSet } = computeAutoOverallScore(
                        prev.testType,
                        prev.minListeningScore,
                        prev.minReadingScore,
                        newWriting,
                        prev.minSpeakingScore,
                        prev.minOverallScore
                      );
                      if (autoScore && shouldAutoSet) {
                        updated.minOverallScore = autoScore;
                      }
                      return updated;
                    });
                  }}
                  placeholder={TEST_TYPE_CONFIG[englishReqForm.testType]?.sectionPlaceholder || "Optional"}
                  data-testid="input-english-min-writing"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Min Speaking {englishReqForm.testType && `(${TEST_TYPE_CONFIG[englishReqForm.testType]?.sectionRange})`}
                </label>
                <Input
                  type="number"
                  step={TEST_TYPE_CONFIG[englishReqForm.testType]?.step || "0.5"}
                  value={englishReqForm.minSpeakingScore}
                  onChange={(e) => {
                    const newSpeaking = e.target.value;
                    setEnglishReqForm(prev => {
                      const updated = { ...prev, minSpeakingScore: newSpeaking };
                      const { autoScore, shouldAutoSet } = computeAutoOverallScore(
                        prev.testType,
                        prev.minListeningScore,
                        prev.minReadingScore,
                        prev.minWritingScore,
                        newSpeaking,
                        prev.minOverallScore
                      );
                      if (autoScore && shouldAutoSet) {
                        updated.minOverallScore = autoScore;
                      }
                      return updated;
                    });
                  }}
                  placeholder={TEST_TYPE_CONFIG[englishReqForm.testType]?.sectionPlaceholder || "Optional"}
                  data-testid="input-english-min-speaking"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Minimum Overall Score
                {englishReqForm.testType && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({TEST_TYPE_CONFIG[englishReqForm.testType]?.range})
                  </span>
                )}
                {(() => {
                  const { autoScore, shouldAutoSet } = computeAutoOverallScore(
                    englishReqForm.testType,
                    englishReqForm.minListeningScore,
                    englishReqForm.minReadingScore,
                    englishReqForm.minWritingScore,
                    englishReqForm.minSpeakingScore,
                    englishReqForm.minOverallScore
                  );
                  if (autoScore && englishReqForm.minOverallScore === autoScore) {
                    return <span className="text-green-600 dark:text-green-400 font-normal ml-2">(auto-calculated)</span>;
                  }
                  return null;
                })()}
              </label>
              <Input
                type="number"
                step={TEST_TYPE_CONFIG[englishReqForm.testType]?.step || "0.5"}
                value={englishReqForm.minOverallScore}
                onChange={(e) => setEnglishReqForm(prev => ({ ...prev, minOverallScore: e.target.value }))}
                placeholder={TEST_TYPE_CONFIG[englishReqForm.testType]?.overallPlaceholder || "e.g., 6.5"}
                data-testid="input-english-min-overall"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes</label>
              <Input
                value={englishReqForm.notes}
                onChange={(e) => setEnglishReqForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g., No band less than 6.0"
                data-testid="input-english-notes"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isPreferred"
                checked={englishReqForm.isPreferred}
                onCheckedChange={(checked) => setEnglishReqForm(prev => ({ ...prev, isPreferred: Boolean(checked) }))}
                data-testid="checkbox-english-preferred"
              />
              <label htmlFor="isPreferred" className="text-sm font-medium cursor-pointer">
                Mark as preferred test type
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEnglishReqDialogOpen(false);
                setEditingEnglishReq(null);
                resetEnglishReqForm();
              }}
              data-testid="button-cancel-english-req"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEnglishReq}
              disabled={createEnglishReqMutation.isPending || updateEnglishReqMutation.isPending}
              data-testid="button-save-english-req"
            >
              {createEnglishReqMutation.isPending || updateEnglishReqMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate All Test Types Dialog */}
      <Dialog open={generateTestsDialogOpen} onOpenChange={setGenerateTestsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate All English Test Requirements
            </DialogTitle>
            <DialogDescription>
              Enter scores for one test type and the system will automatically generate equivalent scores for all other test types.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">Base Test Type</label>
              <Select
                value={generateTestsForm.baseTestType}
                onValueChange={(value) => {
                  setGenerateTestsForm(prev => ({ 
                    ...prev, 
                    baseTestType: value,
                    minOverallScore: "",
                    minListeningScore: "",
                    minReadingScore: "",
                    minWritingScore: "",
                    minSpeakingScore: "",
                  }));
                  setGeneratedPreview([]);
                }}
              >
                <SelectTrigger data-testid="select-base-test-type">
                  <SelectValue placeholder="Select base test type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEST_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                We recommend using IELTS as the base since it's the most widely recognized standard.
              </p>
            </div>

            {generateTestsForm.baseTestType && (
              <>
                <div className="bg-muted/50 px-3 py-2 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Score range for {TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.label}: <strong>{TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.range}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Min Listening {`(${TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.sectionRange})`}
                    </label>
                    <Input
                      type="number"
                      step={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.step || "0.5"}
                      value={generateTestsForm.minListeningScore}
                      onChange={(e) => {
                        setGenerateTestsForm(prev => ({ ...prev, minListeningScore: e.target.value }));
                        setGeneratedPreview([]);
                      }}
                      placeholder={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.sectionPlaceholder}
                      data-testid="input-generate-listening"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Min Reading {`(${TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.sectionRange})`}
                    </label>
                    <Input
                      type="number"
                      step={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.step || "0.5"}
                      value={generateTestsForm.minReadingScore}
                      onChange={(e) => {
                        setGenerateTestsForm(prev => ({ ...prev, minReadingScore: e.target.value }));
                        setGeneratedPreview([]);
                      }}
                      placeholder={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.sectionPlaceholder}
                      data-testid="input-generate-reading"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Min Writing {`(${TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.sectionRange})`}
                    </label>
                    <Input
                      type="number"
                      step={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.step || "0.5"}
                      value={generateTestsForm.minWritingScore}
                      onChange={(e) => {
                        setGenerateTestsForm(prev => ({ ...prev, minWritingScore: e.target.value }));
                        setGeneratedPreview([]);
                      }}
                      placeholder={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.sectionPlaceholder}
                      data-testid="input-generate-writing"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Min Speaking {`(${TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.sectionRange})`}
                    </label>
                    <Input
                      type="number"
                      step={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.step || "0.5"}
                      value={generateTestsForm.minSpeakingScore}
                      onChange={(e) => {
                        setGenerateTestsForm(prev => ({ ...prev, minSpeakingScore: e.target.value }));
                        setGeneratedPreview([]);
                      }}
                      placeholder={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.sectionPlaceholder}
                      data-testid="input-generate-speaking"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Minimum Overall Score <span className="text-red-500">*</span>
                    <span className="text-muted-foreground font-normal ml-1">
                      ({TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.range})
                    </span>
                  </label>
                  <Input
                    type="number"
                    step={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.step || "0.5"}
                    value={generateTestsForm.minOverallScore}
                    onChange={(e) => {
                      setGenerateTestsForm(prev => ({ ...prev, minOverallScore: e.target.value }));
                      setGeneratedPreview([]);
                    }}
                    placeholder={TEST_TYPE_CONFIG[generateTestsForm.baseTestType]?.overallPlaceholder}
                    data-testid="input-generate-overall"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Input
                    value={generateTestsForm.notes}
                    onChange={(e) => setGenerateTestsForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g., No band less than 6.0"
                    data-testid="input-generate-notes"
                  />
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleGeneratePreview}
                  disabled={!generateTestsForm.minOverallScore}
                  className="w-full"
                  data-testid="button-preview-equivalents"
                >
                  Preview Equivalent Scores
                </Button>

                {generatedPreview.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Preview - Equivalent Requirements</label>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Test Type</TableHead>
                            <TableHead>Min Overall</TableHead>
                            <TableHead>Band Scores (L/R/W/S)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {generatedPreview.map((req) => (
                            <TableRow 
                              key={req.testType} 
                              className={req.testType === generateTestsForm.baseTestType ? "bg-primary/5" : ""}
                              data-testid={`preview-row-${req.testType}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {TEST_TYPE_CONFIG[req.testType]?.label}
                                  {req.testType === generateTestsForm.baseTestType && (
                                    <Badge variant="secondary" className="text-xs">Base</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{req.minOverallScore}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {[req.minListeningScore, req.minReadingScore, req.minWritingScore, req.minSpeakingScore]
                                  .filter(Boolean)
                                  .length > 0 ? (
                                  <>
                                    {req.minListeningScore && `L:${req.minListeningScore}`}
                                    {req.minReadingScore && ` R:${req.minReadingScore}`}
                                    {req.minWritingScore && ` W:${req.minWritingScore}`}
                                    {req.minSpeakingScore && ` S:${req.minSpeakingScore}`}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Score conversions are based on official equivalency tables. You can edit individual requirements after generation if needed.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGenerateTestsDialogOpen(false);
                resetGenerateTestsForm();
              }}
              data-testid="button-cancel-generate"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmGenerateAll}
              disabled={generatedPreview.length === 0 || batchCreateEnglishReqMutation.isPending}
              data-testid="button-confirm-generate"
            >
              {batchCreateEnglishReqMutation.isPending ? "Generating..." : `Generate ${generatedPreview.length} Requirements`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Entry Requirements Dialog */}
      <Dialog open={aiEntryReqDialogOpen} onOpenChange={setAiEntryReqDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Generate Entry Requirements
            </DialogTitle>
            <DialogDescription>
              AI will suggest appropriate entry requirements based on course level and institution country
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {isGeneratingAiReqs ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Generating requirements...</p>
              </div>
            ) : aiGeneratedRequirements.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Click "Generate" to get AI-suggested entry requirements for this {currentCourseLevel || "course"} in {institutionCountry || "your institution's country"}.
                </p>
                <Button
                  type="button"
                  onClick={async () => {
                    setIsGeneratingAiReqs(true);
                    try {
                      const response = await apiRequest("POST", "/api/ai/generate-entry-requirements", {
                        courseLevel: currentCourseLevel,
                        institutionCountry: institutionCountry,
                        courseName: form.getValues("title"),
                        discipline: form.getValues("discipline"),
                      });
                      if (response.ok) {
                        const data = await response.json();
                        setAiGeneratedRequirements(data.requirements || []);
                      } else {
                        const errorData = await response.json().catch(() => ({}));
                        toast({
                          title: "AI Generation Failed",
                          description: errorData.message || "Failed to generate entry requirements. Please try again.",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      console.error("Error generating requirements:", error);
                      toast({
                        title: "Error",
                        description: "An unexpected error occurred while generating requirements.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsGeneratingAiReqs(false);
                    }
                  }}
                  data-testid="button-start-ai-generation"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Requirements
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-medium">AI Suggested Requirements</label>
                <p className="text-xs text-muted-foreground">Select the requirements you want to add to this course</p>
                <div className="space-y-2">
                  {aiGeneratedRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        req.isSelected ? "bg-primary/10 border-primary/30" : "hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        const updated = [...aiGeneratedRequirements];
                        updated[index].isSelected = !updated[index].isSelected;
                        setAiGeneratedRequirements(updated);
                      }}
                      data-testid={`ai-req-option-${index}`}
                    >
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          req.isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        }`}
                      >
                        {req.isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{req.qualificationName}</span>
                          <Badge variant="outline" className="text-xs">{req.qualificationCountry}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Minimum: {req.minGrade}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAiEntryReqDialogOpen(false);
                setAiGeneratedRequirements([]);
              }}
              data-testid="button-cancel-ai-reqs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={aiGeneratedRequirements.filter(r => r.isSelected).length === 0}
              onClick={async () => {
                const selectedReqs = aiGeneratedRequirements.filter(r => r.isSelected);
                for (const req of selectedReqs) {
                  const matchingTemplate = entryRequirementTemplates.find(
                    t => t.qualification?.name?.toLowerCase().includes(req.qualificationName.toLowerCase())
                  );
                  if (matchingTemplate) {
                    const alreadySelected = selectedEntryRequirements.some(
                      r => r.qualificationTypeId === matchingTemplate.qualificationTypeId
                    );
                    if (!alreadySelected) {
                      setSelectedEntryRequirements(prev => [
                        ...prev,
                        {
                          qualificationTypeId: matchingTemplate.qualificationTypeId,
                          minGrade: req.minGrade,
                        }
                      ]);
                    }
                  }
                }
                setAiEntryReqDialogOpen(false);
                setAiGeneratedRequirements([]);
              }}
              data-testid="button-apply-ai-reqs"
            >
              Apply {aiGeneratedRequirements.filter(r => r.isSelected).length} Requirements
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Equivalencies are now automatically generated when entry requirements are saved */}
      {/* No manual approval dialog needed - fully automatic */}

      {/* AI Course Data Extraction Preview Dialog */}
      <Dialog open={aiExtractDialogOpen} onOpenChange={setAiExtractDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Extracted Course Data
            </DialogTitle>
            <DialogDescription>
              Review the extracted data below. Click "Apply to Form" to populate the form fields.
            </DialogDescription>
          </DialogHeader>
          
          {extractedCourseData && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* Title */}
              {extractedCourseData.title && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Title</label>
                  <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.title}</div>
                </div>
              )}
              
              {/* Description */}
              {extractedCourseData.description && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <div className="p-2 bg-muted/50 rounded text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {extractedCourseData.description}
                  </div>
                </div>
              )}
              
              {/* Grid for smaller fields */}
              <div className="grid grid-cols-2 gap-3">
                {extractedCourseData.courseCode && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Course Code</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.courseCode}</div>
                  </div>
                )}
                {extractedCourseData.qualificationFramework && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Framework</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.qualificationFramework}</div>
                  </div>
                )}
                {extractedCourseData.level && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Level</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.level}</div>
                  </div>
                )}
                {extractedCourseData.discipline && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Discipline</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.discipline}</div>
                  </div>
                )}
                {extractedCourseData.specialization && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Specialization</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.specialization}</div>
                  </div>
                )}
                {extractedCourseData.duration && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Duration</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.duration}</div>
                  </div>
                )}
                {extractedCourseData.fees && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Tuition Fees</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">
                      {extractedCourseData.currency || 'AUD'} {extractedCourseData.fees.toLocaleString()}
                    </div>
                  </div>
                )}
                {extractedCourseData.applicationFees !== undefined && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Application Fee</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">
                      {extractedCourseData.applicationFees === 0 ? 'Waived' : `${extractedCourseData.currency || 'AUD'} ${extractedCourseData.applicationFees}`}
                    </div>
                  </div>
                )}
                {extractedCourseData.startDate && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.startDate}</div>
                  </div>
                )}
                {extractedCourseData.applicationDeadline && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Application Deadline</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.applicationDeadline}</div>
                  </div>
                )}
                {extractedCourseData.deliveryMode && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Delivery Mode</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.deliveryMode}</div>
                  </div>
                )}
                {extractedCourseData.studyModes && extractedCourseData.studyModes.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Study Modes</label>
                    <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.studyModes.join(", ")}</div>
                  </div>
                )}
              </div>
              
              {/* Intakes */}
              {extractedCourseData.intakes && extractedCourseData.intakes.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Intakes</label>
                  <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.intakes.join(", ")}</div>
                </div>
              )}
              
              {/* Requirements */}
              {extractedCourseData.prerequisites && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Prerequisites</label>
                  <div className="p-2 bg-muted/50 rounded text-sm whitespace-pre-wrap">{extractedCourseData.prerequisites}</div>
                </div>
              )}
              {extractedCourseData.eligibilityRequirements && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Eligibility Requirements</label>
                  <div className="p-2 bg-muted/50 rounded text-sm whitespace-pre-wrap">{extractedCourseData.eligibilityRequirements}</div>
                </div>
              )}
              {extractedCourseData.englishRequirements && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">English Requirements</label>
                  <div className="p-2 bg-muted/50 rounded text-sm whitespace-pre-wrap">{extractedCourseData.englishRequirements}</div>
                </div>
              )}
              
              {/* Structured English Requirements */}
              {extractedCourseData.structuredEnglishRequirements && extractedCourseData.structuredEnglishRequirements.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Structured English Requirements (Auto-Apply)</label>
                  <div className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded text-sm space-y-2">
                    {extractedCourseData.structuredEnglishRequirements.map((req, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">{req.testType}</Badge>
                        <span className="text-xs">
                          Overall: {req.minOverallScore}
                          {req.minListeningScore && req.minReadingScore && req.minWritingScore && req.minSpeakingScore && (
                            <span className="text-muted-foreground ml-1">
                              (L{req.minListeningScore}/R{req.minReadingScore}/W{req.minWritingScore}/S{req.minSpeakingScore})
                            </span>
                          )}
                        </span>
                        {req.notes && <span className="text-xs text-muted-foreground">- {req.notes}</span>}
                      </div>
                    ))}
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      These will be automatically added to the course English requirements when you apply.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Career */}
              {extractedCourseData.careerOutcomes && extractedCourseData.careerOutcomes.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Career Outcomes</label>
                  <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.careerOutcomes.join(", ")}</div>
                </div>
              )}
              {extractedCourseData.careerPath && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Career Path</label>
                  <div className="p-2 bg-muted/50 rounded text-sm whitespace-pre-wrap">{extractedCourseData.careerPath}</div>
                </div>
              )}
              
              {/* Study Areas */}
              {extractedCourseData.studyAreas && extractedCourseData.studyAreas.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Study Areas</label>
                  <div className="p-2 bg-muted/50 rounded text-sm">{extractedCourseData.studyAreas.join(", ")}</div>
                </div>
              )}
              
              {/* Summary of found fields */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Found {Object.keys(extractedCourseData).filter(k => extractedCourseData[k as keyof typeof extractedCourseData] != null).length} fields from the course page.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setAiExtractDialogOpen(false);
                setExtractedCourseData(null);
              }}
              data-testid="button-cancel-extract"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyExtractedData}
              disabled={!extractedCourseData}
              data-testid="button-apply-extracted-data"
            >
              <Check className="h-4 w-4 mr-2" />
              Apply to Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
