import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, FileText, Globe, Tag, X, Plus, Trash2, Star, Edit, CalendarIcon, Sparkles, Monitor, Briefcase, Target, Factory, Users, ChevronDown, Check, GraduationCap, DollarSign, FileCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
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
  level: z.string().optional(),
  discipline: z.string().optional(),
  subDisciplineId: z.string().optional(),
  specialization: z.string().optional(),
  duration: z.string().optional(),
  durationMonths: optionalPositiveInt,
  durationWeeks: optionalPositiveInt,
  fees: optionalPositiveNumber,
  applicationFees: optionalNonNegativeNumber,
  costOfLiving: optionalPositiveNumber,
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
  pathways: z.string().optional(),
  studyAreas: z.string().optional(),
  careerOutcomes: z.string().optional(),
  careerPath: z.string().optional(),
});

interface Institution {
  id: string;
  name: string;
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
  level: string | null;
  subject: string;
  discipline?: string | null;
  subDisciplineId?: string | null;
  specialization?: string | null;
  durationMonths?: number | null;
  durationWeeks?: number | null;
  applicationFees?: number | null;
  costOfLiving?: number | null;
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
  pathways?: string[] | null;
  studyAreas?: string[] | null;
  careerOutcomes?: string[] | null;
  careerPath?: string | null;
  campusLocations?: string[] | null;
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

  const { data: selectedInstitution, isLoading: institutionDetailsLoading } = useQuery<Institution>({
    queryKey: ["/api/super-admin/institutions", selectedInstitutionId],
    enabled: !!selectedInstitutionId,
  });

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

  // Get current course level to determine entry requirement templates
  const currentCourseLevel = form.watch("level");

  // Entry requirement templates query (based on course level and institution country)
  const templateQueryUrl = currentCourseLevel && selectedInstitution?.country 
    ? `/api/course-level-requirements?courseLevel=${encodeURIComponent(currentCourseLevel)}&institutionCountry=${encodeURIComponent(selectedInstitution.country)}`
    : null;

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

  // English requirements query
  const { data: englishRequirements = [], isLoading: englishReqLoading } = useQuery<EnglishRequirement[]>({
    queryKey: ["/api/courses", course?.id, "english-requirements"],
    enabled: !!course?.id,
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

  // Sync entry requirements when course entry requirements load
  useEffect(() => {
    if (courseEntryRequirements && courseEntryRequirements.length > 0) {
      setSelectedEntryRequirements(courseEntryRequirements.map(r => ({
        qualificationTypeId: r.qualificationTypeId,
        minGrade: r.minGrade || "",
        customNotes: r.customNotes || undefined,
      })));
    }
  }, [courseEntryRequirements]);

  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      universityId: course?.universityId || "",
      title: course?.title || "",
      description: course?.description || "",
      subject: course?.subject || "",
      level: course?.level || "",
      discipline: course?.discipline || "",
      subDisciplineId: course?.subDisciplineId || "",
      specialization: course?.specialization || "",
      duration: course?.duration || "",
      durationMonths: course?.durationMonths || ("" as any),
      durationWeeks: course?.durationWeeks || ("" as any),
      fees: course?.fees || ("" as any),
      applicationFees: course?.applicationFees || ("" as any),
      costOfLiving: course?.costOfLiving || ("" as any),
      currency: course?.currency || "AUD",
      location: course?.location || "",
      country: course?.country || "",
      startDate: course?.startDate || "",
      applicationDeadline: course?.applicationDeadline || "",
      intakes: Array.isArray(course?.intakes) ? course.intakes.join(", ") : "",
      prerequisites: course?.prerequisites || "",
      eligibilityRequirements: course?.eligibilityRequirements || "",
      englishRequirements: course?.englishRequirements || "",
      courseCode: course?.courseCode || "",
      pathways: Array.isArray(course?.pathways) ? course.pathways.join(", ") : "",
      studyAreas: Array.isArray(course?.studyAreas) ? course.studyAreas.join(", ") : "",
      careerOutcomes: Array.isArray(course?.careerOutcomes) ? course.careerOutcomes.join(", ") : "",
      careerPath: course?.careerPath || "",
    },
  });

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
        queryClient.invalidateQueries({ queryKey: ["/api/courses", result.id, "tags"] });
        queryClient.invalidateQueries({ queryKey: ["/api/courses", result.id, "scholarships"] });
        queryClient.invalidateQueries({ queryKey: ["/api/courses", result.id, "entry-requirements"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      toast({ title: "Success", description: "Course updated successfully" });
      onBack();
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
    const allTags = Object.values(groupedTags).flat();
    return allTags.filter(tag => selectedTagIds.includes(String(tag.id)));
  };

  const handleSubmit = async (data: z.infer<typeof courseSchema>, publishStatus: 'draft' | 'published' = 'draft') => {
    const transformedData: any = {
      ...data,
      campusLocations: selectedCampusIds,
      intakes: data.intakes ? data.intakes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      pathways: data.pathways ? data.pathways.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      studyAreas: data.studyAreas ? data.studyAreas.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      careerOutcomes: data.careerOutcomes ? data.careerOutcomes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      publishStatus,
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
              <Badge variant={course.publishStatus === 'published' ? 'default' : 'outline'}>
                {course.publishStatus === 'published' ? 'Published' : 'Draft'}
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
            <Button 
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={async () => {
                const formData = form.getValues();
                const isValid = await form.trigger();
                if (isValid) {
                  handleSubmit(formData, 'draft');
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
            <Button 
              size="sm"
              disabled={isSubmitting}
              onClick={async () => {
                const formData = form.getValues();
                const isValid = await form.trigger();
                if (isValid) {
                  handleSubmit(formData, 'published');
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
              data-testid="button-course-publish"
            >
              <Globe className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{isSubmitting ? "Publishing..." : "Publish"}</span>
              <span className="sm:hidden">{isSubmitting ? "..." : "Publish"}</span>
            </Button>
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
                            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                              {institutions?.map((institution) => (
                                <SelectItem key={institution.id} value={institution.id}>
                                  {institution.name}
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Course description..." rows={4} data-testid="input-course-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="courseCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Course Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="CS101" data-testid="input-course-code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-course-level">
                                  <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                                <SelectItem value="Certificate II">Certificate II</SelectItem>
                                <SelectItem value="Certificate III">Certificate III</SelectItem>
                                <SelectItem value="Certificate IV">Certificate IV</SelectItem>
                                <SelectItem value="Diploma">Diploma</SelectItem>
                                <SelectItem value="Advanced Diploma">Advanced Diploma</SelectItem>
                                <SelectItem value="Bachelor Degree">Bachelor Degree</SelectItem>
                                <SelectItem value="Masters Degree">Masters Degree</SelectItem>
                                <SelectItem value="Doctoral Degree">Doctoral Degree</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
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
                    <CardTitle>Duration & Fees</CardTitle>
                    <CardDescription>Costs and time commitment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fees"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tuition Fees</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="30000" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} data-testid="input-course-fees" />
                            </FormControl>
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-course-currency">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="AUD">AUD</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
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
                            <FormLabel>Application Fees</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="100" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} data-testid="input-course-applicationFees" />
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                    data-testid="input-course-startDate"
                                  >
                                    {field.value ? (
                                      field.value
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => {
                                    field.onChange(date ? format(date, "MMMM d, yyyy") : "");
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="applicationDeadline"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Application Deadline</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                    data-testid="input-course-applicationDeadline"
                                  >
                                    {field.value ? (
                                      field.value
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => {
                                    field.onChange(date ? format(date, "MMMM d, yyyy") : "");
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="intakes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intakes (Comma-separated)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="January, March, July, September" data-testid="input-course-intakes" />
                          </FormControl>
                          <FormDescription>Enter multiple intakes separated by commas</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Requirements</CardTitle>
                    <CardDescription>Entry and eligibility requirements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="prerequisites"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prerequisites</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="High school diploma or equivalent..." rows={3} data-testid="input-course-prerequisites" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eligibilityRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Eligibility Requirements</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Academic and other eligibility requirements..." rows={3} data-testid="input-course-eligibilityRequirements" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Structured English Requirements Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <FormLabel>English Language Requirements</FormLabel>
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
                        <p className="text-sm text-muted-foreground">
                          Save the course first to add structured English requirements.
                        </p>
                      )}
                      
                      {course?.id && englishRequirements.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No English requirements added yet. Click "Generate All Tests" to quickly add all test types with equivalent scores, or "Add Test" to add individual tests.
                        </p>
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

              </div>

              <div className="space-y-6">
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
                      const selectedInCategory = categoryTags.filter((tag: TagType) => 
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
                              {categoryTags.map((tag: TagType) => {
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

                {/* Entry Requirements Section */}
                {selectedInstitutionId && currentCourseLevel && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="flex items-center gap-2">
                          <FileCheck className="h-5 w-5" />
                          Entry Requirements
                        </CardTitle>
                        {selectedEntryRequirements.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedEntryRequirements.length} requirements
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Define academic qualifications required for course entry
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      {/* Loading state */}
                      {(templatesLoading || entryReqLoading) && (
                        <p className="text-sm text-muted-foreground py-2">
                          Loading requirements...
                        </p>
                      )}

                      {/* Recommended Requirements from Templates */}
                      {!templatesLoading && entryRequirementTemplates.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Recommended Requirements (click to add/remove)
                          </label>
                          <div className={`flex flex-wrap gap-1.5 ${saveEntryRequirementsMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}>
                            {entryRequirementTemplates.map((template) => {
                              const isSelected = selectedEntryRequirements.some(
                                r => r.qualificationTypeId === template.qualificationTypeId
                              );
                              return (
                                <Badge
                                  key={template.id}
                                  variant={isSelected ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => handleEntryRequirementToggle(template)}
                                  data-testid={`entry-req-template-${template.qualificationTypeId}`}
                                >
                                  {template.displayLabel || `${template.qualification.name} (${template.qualification.country})`}
                                  {template.minGrade && ` - Min: ${template.minGrade}`}
                                  {isSelected && <Check className="h-3 w-3 ml-1" />}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!templatesLoading && entryRequirementTemplates.length === 0 && selectedInstitution?.country && (
                        <p className="text-sm text-muted-foreground py-2">
                          No requirement templates configured for {currentCourseLevel} courses in {selectedInstitution.country}. 
                          Contact system admin to add templates.
                        </p>
                      )}

                      {/* Selected Requirements with Editable Grades */}
                      {selectedEntryRequirements.length > 0 && (
                        <div className={`space-y-2 pt-2 border-t ${saveEntryRequirementsMutation.isPending ? 'opacity-50' : ''}`}>
                          <label className="text-xs font-medium text-muted-foreground">
                            Selected Entry Requirements
                          </label>
                          <div className="space-y-2">
                            {selectedEntryRequirements.map((req) => {
                              const template = entryRequirementTemplates.find(
                                t => t.qualificationTypeId === req.qualificationTypeId
                              );
                              const existingReq = courseEntryRequirements.find(
                                r => r.qualificationTypeId === req.qualificationTypeId
                              );
                              const qualName = template?.qualification?.name || existingReq?.qualification?.name || 'Unknown';
                              const qualCountry = template?.qualification?.country || existingReq?.qualification?.country || '';
                              
                              return (
                                <div 
                                  key={req.qualificationTypeId}
                                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                                  data-testid={`selected-entry-req-${req.qualificationTypeId}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium">
                                      {qualName}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({qualCountry})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Input
                                      type="text"
                                      placeholder="Min grade"
                                      value={req.minGrade}
                                      onChange={(e) => handleUpdateEntryRequirementGrade(req.qualificationTypeId, e.target.value)}
                                      className="w-24 text-sm"
                                      disabled={saveEntryRequirementsMutation.isPending}
                                      data-testid={`entry-req-grade-${req.qualificationTypeId}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveEntryRequirement(req.qualificationTypeId)}
                                      disabled={saveEntryRequirementsMutation.isPending}
                                      data-testid={`remove-entry-req-${req.qualificationTypeId}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
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
    </div>
  );
}
