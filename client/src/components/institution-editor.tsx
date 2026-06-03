import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Upload, Save, FileText, Globe, Tag, X, Check, ChevronDown, Sparkles, Loader2, Lock, Eye, History, Users, Clock, Edit, Plus, Trash2, User, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { GoogleAddressAutocomplete, AddressComponents } from "@/components/ui/google-address-autocomplete";
import { GalleryImageManager } from "@/components/gallery-image-manager";
import { InstitutionContactsPanel } from "@/components/institution-contacts-panel";
import { InstitutionBusinessTermsPanel } from "@/components/institution-business-terms-panel";
import { InstitutionDocumentsPanel } from "@/components/institution-documents-panel";
import { InstitutionScholarshipsPanel } from "@/components/institution-scholarships-panel";
import { CountrySelect } from "@/components/ui/country-select";
import { FeaturedCoursesSelector } from "@/components/featured-courses-selector";
import { DisciplineSelector } from "@/components/discipline-selector";

interface FeaturedCourse {
  id: string;
  title: string;
}

const optionalPositiveInt = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().positive().optional()
);

const optionalYear = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().min(1800).max(2100).optional()
);

const optionalPercentage = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().min(0).max(100).optional()
);

const institutionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().min(1, "Country is required"),
  description: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  providerType: z.string().min(1, "Provider type is required"),
  numberOfCampuses: optionalPositiveInt,
  establishedYear: optionalYear,
  logo: z.string().optional(),
  topDisciplines: z.array(z.string()).optional(),
  topCourses: z.string().optional(),
  institutionGallery: z.array(z.string()).optional(),
  campusAddresses: z.array(z.object({
    name: z.string().optional(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string(),
  })).optional(),
  rtoNumber: z.string().optional(), // RTO number for Australian institutions
  cricosProviderCode: z.string().optional(), // CRICOS Provider Code for international students
});

const PROVIDER_TYPES = ["University", "Institution", "Tafe", "School"];

interface Institution {
  id: string;
  name: string;
  description: string | null;
  country: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  providerType: string | null;
  numberOfCampuses: number | null;
  establishedYear: number | null;
  topDisciplines: string[] | null;
  logo: string | null;
  topCourses: string[] | null;
  institutionGallery: string[] | null;
  campusAddresses: Array<{
    name?: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  }> | null;
  rtoNumber: string | null;
  cricosProviderCode: string | null;
  approvalStatus: string | null;
  publishStatus?: string | null;
  visibility?: string | null;
  availableMarkets?: string[] | null;
  featuredMarkets?: string[] | null;
  isActive: boolean;
}

interface InstitutionEditorProps {
  institution?: Institution | null;
  onBack: () => void;
  userId?: string;
}

interface InstitutionTagItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string | null;
  description?: string | null;
}

const INSTITUTION_TAG_CATEGORY_LABELS: Record<string, string> = {
  type: "Institution Type",
  specialization: "Specialization",
  experience: "Student Experience",
  location: "Location",
  financial: "Financial",
  accreditation: "Accreditation",
  services: "Services",
};

// Activity log interface
interface ActivityLogItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userProfilePicture: string | null;
  userType: string | null;
  entityType: string;
  entityId: string;
  entityName: string | null;
  action: string;
  actionDescription: string | null;
  changes: Record<string, { before: any; after: any }> | null;
  metadata: any;
  createdAt: string;
}

export function InstitutionEditor({ institution, onBack, userId }: InstitutionEditorProps) {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(institution?.logo || null);
  const [logoDisplayError, setLogoDisplayError] = useState(false);
  useEffect(() => { setLogoDisplayError(false); }, [logoPreview]);
  useEffect(() => {
    return () => { if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview); };
  }, [logoPreview]);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [legacyCourseNames, setLegacyCourseNames] = useState<string[]>([]); // Preserve legacy text entries
  const [activeTab, setActiveTab] = useState<string>("website");
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(institution?.availableMarkets || ['AU', 'BD']);
  const [selectedFeaturedMarkets, setSelectedFeaturedMarkets] = useState<string[]>(institution?.featuredMarkets || []);
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [extractionConfidence, setExtractionConfidence] = useState<number | null>(null);

  // AI extraction mutation
  const extractInstitutionMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      const response = await apiRequest("POST", "/api/admin/extract-institution-data", { url: websiteUrl });
      return await response.json();
    },
    onSuccess: (response: any) => {
      if (!response.success || !response.data) {
        toast({ title: "Extraction failed", description: "No data returned from extraction", variant: "destructive" });
        return;
      }
      
      const data = response.data;
      
      // Store confidence and warnings
      setExtractionConfidence(data.confidence || null);
      setExtractionWarnings(data.warnings || []);
      
      // Auto-fill form fields from extracted data
      if (data.name) form.setValue("name", data.name);
      if (data.description) form.setValue("description", data.description);
      if (data.country) form.setValue("country", data.country);
      if (data.contactEmail) form.setValue("contactEmail", data.contactEmail);
      if (data.contactPhone) form.setValue("contactPhone", data.contactPhone);
      if (data.providerType) form.setValue("providerType", data.providerType);
      if (data.numberOfCampuses) form.setValue("numberOfCampuses", data.numberOfCampuses);
      if (data.establishedYear) form.setValue("establishedYear", data.establishedYear);
      if (data.topDisciplines && Array.isArray(data.topDisciplines)) {
        form.setValue("topDisciplines", data.topDisciplines);
      }
      if (data.campusAddresses && Array.isArray(data.campusAddresses)) {
        form.setValue("campusAddresses", data.campusAddresses);
      }
      if (data.institutionGallery && Array.isArray(data.institutionGallery)) {
        form.setValue("institutionGallery", data.institutionGallery);
      }
      if (data.logo) {
        form.setValue("logo", data.logo);
        setLogoPreview(data.logo);
      }
      
      const confidencePercent = Math.round((data.confidence || 0.5) * 100);
      toast({
        title: "Data extracted successfully",
        description: `Confidence: ${confidencePercent}%. Review and adjust the auto-filled fields as needed.`,
      });
    },
    onError: (error: any) => {
      let description = error.message || "Failed to extract data from website.";
      
      // Clean up technical error messages for better UX
      if (error.rateLimit) {
        const resetDate = new Date(error.rateLimit.resetDate);
        const minutesUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
        description = `Rate limit exceeded. Try again in ${minutesUntilReset} minute(s).`;
      } else if (description.includes("blocked both HTTP and browser")) {
        description = "This website has strong anti-bot protection. Try entering the data manually or use a different URL (e.g., an 'About' page).";
      } else if (description.includes("Forbidden") || description.includes("403")) {
        description = "Website access was blocked. Please try again or use a different URL (e.g., an 'About Us' page).";
      } else if (description.includes("timeout") || description.includes("Timeout")) {
        description = "The website took too long to respond. Try again or use a different URL.";
      } else if (description.includes("SSRF") || description.includes("internal")) {
        description = "This URL cannot be accessed for security reasons. Please use a public website URL.";
      }
      
      toast({ title: "Extraction failed", description, variant: "destructive" });
    },
  });

  const handleAIExtract = () => {
    const websiteUrl = form.getValues("website");
    if (!websiteUrl) {
      toast({
        title: "Website URL required",
        description: "Please enter a website URL first to extract data.",
        variant: "destructive",
      });
      return;
    }
    
    // Clear previous extraction results
    setExtractionWarnings([]);
    setExtractionConfidence(null);
    
    extractInstitutionMutation.mutate(websiteUrl);
  };

  // Fetch grouped tags for picker
  const { data: groupedTags } = useQuery<Record<string, InstitutionTagItem[]>>({
    queryKey: ["/api/admin/institution-tags/grouped"],
    enabled: !!institution,
  });

  // Fetch current institution tags
  const { data: institutionCurrentTags, isLoading: loadingTags } = useQuery<InstitutionTagItem[]>({
    queryKey: ["/api/admin/institutions", institution?.id, "tags"],
    enabled: !!institution?.id,
  });

  // Sync selected tags when data loads
  useEffect(() => {
    if (institutionCurrentTags) {
      setSelectedTagIds(institutionCurrentTags.map(t => t.id));
    }
  }, [institutionCurrentTags]);

  // Fetch course details for existing topCourses IDs
  const { data: coursesData } = useQuery<{ courses: Array<{ id: string; title: string; level: string; subject: string }> }>({
    queryKey: ["/api/courses", { universityId: institution?.id }],
    queryFn: async () => {
      if (!institution?.id) return { courses: [] };
      const res = await fetch(`/api/courses?universityId=${institution.id}&limit=100`);
      if (!res.ok) return { courses: [] };
      return res.json();
    },
    enabled: !!institution?.id,
  });

  // Initialize featured courses from existing topCourses IDs and preserve legacy names
  useEffect(() => {
    if (institution?.topCourses && coursesData?.courses) {
      const courseMap = new Map(coursesData.courses.map(c => [c.id, c]));
      const matchingCourses: FeaturedCourse[] = [];
      const unmatchedLegacy: string[] = [];
      
      institution.topCourses.forEach(entry => {
        const course = courseMap.get(entry);
        if (course) {
          matchingCourses.push({ id: course.id, title: course.title });
        } else {
          // This is a legacy text-based name (not a valid course ID)
          unmatchedLegacy.push(entry);
        }
      });
      
      setFeaturedCourses(matchingCourses);
      setLegacyCourseNames(unmatchedLegacy);
    }
  }, [institution?.topCourses, coursesData]);

  // Fetch activity logs for history tab
  const { data: activityLogsData, isLoading: loadingActivityLogs } = useQuery<{ logs: ActivityLogItem[]; total: number }>({
    queryKey: ["/api/admin/activity-logs/entity", "institution", institution?.id],
    queryFn: async () => {
      if (!institution?.id) return { logs: [], total: 0 };
      const res = await fetch(`/api/admin/activity-logs/entity/institution/${institution.id}?limit=50`);
      if (!res.ok) return { logs: [], total: 0 };
      return res.json();
    },
    enabled: !!institution?.id && activeTab === "history",
  });

  // Update tags mutation
  const updateTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      const response = await apiRequest("PUT", `/api/admin/institutions/${institution?.id}/tags`, { tagIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/institutions", institution?.id, "tags"] });
      toast({ title: "Success", description: "Tags updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle a tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const newIds = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      // Auto-save when tags change
      updateTagsMutation.mutate(newIds);
      return newIds;
    });
  };

  // Get all available tags as flat array for display
  // Exclude the "featured" slug — homepage featuring is controlled by the "Featured On" card instead
  const allTags = groupedTags ? Object.values(groupedTags).flat().filter(t => t.slug !== 'featured') : [];
  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));

  const form = useForm<z.infer<typeof institutionSchema>>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: institution?.name || "",
      country: institution?.country || "",
      description: institution?.description || "",
      contactEmail: institution?.contactEmail || "",
      contactPhone: institution?.contactPhone || "",
      website: institution?.website || "",
      providerType: institution?.providerType || "",
      numberOfCampuses: institution?.numberOfCampuses ?? ("" as any),
      establishedYear: institution?.establishedYear ?? ("" as any),
      logo: institution?.logo || "",
      topDisciplines: institution?.topDisciplines || [],
      topCourses: institution?.topCourses?.join(", ") || "",
      institutionGallery: institution?.institutionGallery || [],
      campusAddresses: institution?.campusAddresses || [],
      rtoNumber: institution?.rtoNumber || "",
      cricosProviderCode: institution?.cricosProviderCode || "",
    },
  });

  // `defaultValues` only hydrates the form on initial mount. When the `institution` prop
  // changes (e.g. after a save that refetches data, or when opening a different record),
  // React Hook Form does NOT re-read `defaultValues`. We must call `form.reset()` explicitly
  // so every field reflects the latest server state. If a new field is added to
  // `institutionSchema`, it MUST also be added to both `defaultValues` above and this
  // `form.reset()` call, otherwise it will appear blank after the first save.
  useEffect(() => {
    if (institution) {
      form.reset({
        name: institution.name || "",
        country: institution.country || "",
        description: institution.description || "",
        contactEmail: institution.contactEmail || "",
        contactPhone: institution.contactPhone || "",
        website: institution.website || "",
        providerType: institution.providerType || "",
        numberOfCampuses: institution.numberOfCampuses ?? ("" as any),
        establishedYear: institution.establishedYear ?? ("" as any),
        logo: institution.logo || "",
        topDisciplines: institution.topDisciplines || [],
        topCourses: institution.topCourses?.join(", ") || "",
        institutionGallery: institution.institutionGallery || [],
        campusAddresses: institution.campusAddresses || [],
        rtoNumber: institution.rtoNumber || "",
        cricosProviderCode: institution.cricosProviderCode || "",
      });
      setSelectedMarkets(institution.availableMarkets || ['AU', 'BD']);
      setSelectedFeaturedMarkets(institution.featuredMarkets || []);
    }
  }, [institution?.id]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/super-admin/institutions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      toast({ title: "Success", description: "Institution created successfully" });
      onBack();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, stayOnPage }: { id: string; data: any; stayOnPage?: boolean }) => {
      const response = await apiRequest("PATCH", `/api/super-admin/institutions/${id}`, data);
      const result = await response.json();
      return { result, stayOnPage };
    },
    onSuccess: ({ stayOnPage }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
      toast({ title: "Success", description: "Institution updated successfully" });
      if (!stayOnPage) {
        onBack();
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    const blobUrl = URL.createObjectURL(file);
    setLogoPreview(blobUrl);

    const formData = new FormData();
    formData.append("logo", file);
    if (institution?.id) {
      formData.append("institutionId", institution.id);
    }

    try {
      const response = await apiRequest("POST", "/api/university/upload-logo", formData);
      const data = await response.json();
      form.setValue("logo", data.logoPath);
      toast({ title: "Logo uploaded", description: "Institution logo has been uploaded successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSubmit = (data: z.infer<typeof institutionSchema>, publishStatus: 'draft' | 'published' = 'draft', visibility: 'public' | 'private' = 'public', stayOnPage: boolean = false) => {
    const apiData: any = {
      ...data,
      topDisciplines: data.topDisciplines && data.topDisciplines.length > 0
        ? data.topDisciplines
        : undefined,
      topCourses: featuredCourses.length > 0 || legacyCourseNames.length > 0
        ? [...featuredCourses.map(c => c.id), ...legacyCourseNames]
        : undefined,
      rtoNumber: data.rtoNumber?.trim() || null,
      cricosProviderCode: data.cricosProviderCode?.trim() || null,
      availableMarkets: selectedMarkets.length > 0 ? selectedMarkets : ['AU', 'BD'],
      featuredMarkets: selectedFeaturedMarkets,
      publishStatus,
      visibility,
      ...(publishStatus === 'published' && {
        publishedAt: new Date().toISOString(),
        publishedByUserId: userId,
      }),
    };
    
    if (institution?.id) {
      updateMutation.mutate({ id: institution.id, data: apiData, stayOnPage });
    } else {
      createMutation.mutate(apiData);
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
              data-testid="button-back-to-institutions"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Back to Institutions</span>
            </Button>
            <div className="hidden sm:block h-6 w-px bg-border" />
            <h1 className="text-base sm:text-lg font-semibold">
              {institution?.id ? "Edit Institution" : "Create Institution"}
            </h1>
            {institution?.publishStatus && (
              <Badge 
                variant={institution.publishStatus === 'published' ? 'default' : 'outline'}
                className={institution.publishStatus === 'published' && institution.visibility === 'private' ? 'bg-amber-500' : ''}
              >
                {institution.publishStatus === 'published' 
                  ? (institution.visibility === 'private' ? 'Private' : 'Published') 
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
              data-testid="button-discard"
            >
              Discard
            </Button>
            {institution?.id && (
              <Button 
                variant="default"
                size="sm"
                disabled={isSubmitting}
                onClick={async () => {
                  const formData = form.getValues();
                  const isValid = await form.trigger();
                  if (isValid) {
                    // Keep current publish status and visibility, stay on page for quick edits
                    const currentStatus = institution.publishStatus || 'draft';
                    const currentVisibility = institution.visibility || 'public';
                    handleSubmit(formData, currentStatus as 'draft' | 'published', currentVisibility as 'public' | 'private', true);
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
                data-testid="button-update"
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
              data-testid="button-save-draft"
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
                  data-testid="button-publish-dropdown"
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
                  data-testid="button-publish-public"
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
                  data-testid="button-publish-private"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Publish Privately
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b bg-muted/50 sticky top-0 z-50 px-6 py-3">
            <TabsList className="h-12 bg-background border shadow-sm p-1" data-testid="tabs-institution-editor">
              <TabsTrigger 
                value="website" 
                className="gap-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md" 
                data-testid="tab-website"
              >
                <Globe className="h-4 w-4" />
                Website
              </TabsTrigger>
              <TabsTrigger 
                value="crm" 
                className="gap-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md" 
                data-testid="tab-crm"
              >
                <Users className="h-4 w-4" />
                CRM
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="gap-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md" 
                data-testid="tab-history"
              >
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="website" className="flex-1 overflow-y-auto p-6 mt-0">
            <Form {...form}>
              <form className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Essential details about the institution</CardDescription>
                      </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Institution Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., University of Sydney" data-testid="input-institution-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country *</FormLabel>
                            <FormControl>
                              <CountrySelect
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select a country"
                                data-testid="input-institution-country"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="providerType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-institution-providerType">
                                  <SelectValue placeholder="Select provider type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PROVIDER_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("country") === "Australia" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="cricosProviderCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CRICOS Provider Code</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value || ""} 
                                  placeholder="e.g., 03548F" 
                                  data-testid="input-institution-cricosProviderCode" 
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Required for enrolling international students
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="rtoNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>RTO Number</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value || ""} 
                                  placeholder="e.g., 52010" 
                                  data-testid="input-institution-rtoNumber" 
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Registered Training Organization number
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

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
                              disabled={isGeneratingDescription || !form.watch("website")}
                              onClick={async () => {
                                const websiteUrl = form.watch("website");
                                if (!websiteUrl) {
                                  toast({
                                    title: "Website URL required",
                                    description: "Please enter the institution website URL first",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                setIsGeneratingDescription(true);
                                try {
                                  const response = await apiRequest("POST", "/api/ai/generate-institution-description-from-url", {
                                    url: websiteUrl,
                                  });
                                  const data = await response.json();
                                  if (data.description) {
                                    form.setValue("description", data.description);
                                    toast({
                                      title: "Description generated",
                                      description: "AI has generated a description based on the website content",
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
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
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
                            <Textarea {...field} placeholder="Brief description of the institution" rows={6} data-testid="input-institution-description" />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Enter the website URL above and click "AI Generate" to auto-generate a description
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="numberOfCampuses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Campuses</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="1" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} data-testid="input-institution-numberOfCampuses" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>How to reach the institution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="contact@university.edu" data-testid="input-institution-contactEmail" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+61 2 1234 5678" data-testid="input-institution-contactPhone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} placeholder="https://university.edu" data-testid="input-institution-website" />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="default"
                              onClick={handleAIExtract}
                              disabled={extractInstitutionMutation.isPending || !form.watch("website")}
                              data-testid="button-ai-extract-institution"
                            >
                              {extractInstitutionMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Extracting...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  AI Extract
                                </>
                              )}
                            </Button>
                          </div>
                          <FormDescription className="text-xs">
                            Enter a website URL and click "AI Extract" to auto-fill institution data
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Extraction confidence and warnings */}
                    {extractionConfidence !== null && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={extractionConfidence >= 0.7 ? "default" : extractionConfidence >= 0.5 ? "secondary" : "outline"}
                            data-testid="badge-extraction-confidence"
                          >
                            {Math.round(extractionConfidence * 100)}% Confidence
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {extractionConfidence >= 0.7 ? "High confidence extraction" : 
                             extractionConfidence >= 0.5 ? "Medium confidence - please review" : 
                             "Low confidence - manual review recommended"}
                          </span>
                        </div>
                        
                        {extractionWarnings.length > 0 && (
                          <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-xs">
                              <ul className="list-disc list-inside space-y-1 mt-1">
                                {extractionWarnings.map((warning, index) => (
                                  <li key={index}>{warning}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Academic Information</CardTitle>
                    <CardDescription>Disciplines, courses, and scholarships</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="topDisciplines"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Top Disciplines</FormLabel>
                          <FormDescription className="text-xs">
                            Select disciplines offered by this institution
                          </FormDescription>
                          <FormControl>
                            <DisciplineSelector
                              value={field.value || []}
                              onChange={field.onChange}
                              maxDisciplines={10}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Featured Courses</FormLabel>
                      <FormDescription className="text-xs">
                        Select published courses to feature on the institution's public page
                      </FormDescription>
                      <FeaturedCoursesSelector
                        institutionId={institution?.id || ""}
                        value={featuredCourses}
                        onChange={setFeaturedCourses}
                        maxCourses={10}
                      />
                      {legacyCourseNames.length > 0 && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">
                            Legacy course names (not linked to course records):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {legacyCourseNames.map((name, index) => (
                              <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-legacy-course-${index}`}>
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </CardContent>
                </Card>

                {form.watch("numberOfCampuses") && Number(form.watch("numberOfCampuses")) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Campus Addresses</CardTitle>
                      <CardDescription>
                        {form.watch("numberOfCampuses")} campus{Number(form.watch("numberOfCampuses") ?? 0) > 1 ? "es" : ""} to configure
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Array.from({ length: Number(form.watch("numberOfCampuses") ?? 0) }).map((_, index) => {
                        const campusAddresses = form.watch("campusAddresses") || [];
                        const currentAddress = campusAddresses[index] || { name: "", address: "", city: "", state: "", postcode: "", country: "" };

                        return (
                          <div key={index} className="space-y-3 p-4 border rounded-lg bg-muted/30">
                            <h4 className="font-medium text-sm">Campus {index + 1}</h4>
                            
                            <div className="space-y-2">
                              <FormLabel>Campus Name</FormLabel>
                              <Input
                                value={currentAddress.name || ""}
                                onChange={(e) => {
                                  const newAddresses = [...(form.watch("campusAddresses") || [])];
                                  newAddresses[index] = { ...currentAddress, name: e.target.value };
                                  form.setValue("campusAddresses", newAddresses);
                                }}
                                placeholder="e.g., Sydney Campus, Melbourne CBD"
                                data-testid={`input-institution-campusName-${index}`}
                              />
                              <FormDescription className="text-xs">
                                A friendly name to identify this campus
                              </FormDescription>
                            </div>

                            <div className="space-y-2">
                              <FormLabel>Street Address</FormLabel>
                              <GoogleAddressAutocomplete
                                value={currentAddress.address || ""}
                                onAddressSelect={(components: AddressComponents) => {
                                  const newAddresses = [...(form.watch("campusAddresses") || [])];
                                  newAddresses[index] = {
                                    ...currentAddress,
                                    address: components.address,
                                    city: components.city,
                                    state: components.state,
                                    postcode: components.postcode,
                                    country: components.country,
                                  };
                                  form.setValue("campusAddresses", newAddresses);
                                }}
                                onInputChange={(value: string) => {
                                  const newAddresses = [...(form.watch("campusAddresses") || [])];
                                  newAddresses[index] = { ...currentAddress, address: value };
                                  form.setValue("campusAddresses", newAddresses);
                                }}
                                placeholder="Start typing an address..."
                                testId={`input-institution-campusAddress-${index}`}
                              />
                              <FormDescription className="text-xs">
                                Start typing to search for an address, or enter manually
                              </FormDescription>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <FormLabel>City</FormLabel>
                                <Input
                                  value={currentAddress.city || ""}
                                  onChange={(e) => {
                                    const newAddresses = [...(form.watch("campusAddresses") || [])];
                                    newAddresses[index] = { ...currentAddress, city: e.target.value };
                                    form.setValue("campusAddresses", newAddresses);
                                  }}
                                  placeholder="Sydney"
                                  data-testid={`input-institution-campusCity-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <FormLabel>State/Province</FormLabel>
                                <Input
                                  value={currentAddress.state || ""}
                                  onChange={(e) => {
                                    const newAddresses = [...(form.watch("campusAddresses") || [])];
                                    newAddresses[index] = { ...currentAddress, state: e.target.value };
                                    form.setValue("campusAddresses", newAddresses);
                                  }}
                                  placeholder="NSW"
                                  data-testid={`input-institution-campusState-${index}`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <FormLabel>Postcode</FormLabel>
                                <Input
                                  value={currentAddress.postcode || ""}
                                  onChange={(e) => {
                                    const newAddresses = [...(form.watch("campusAddresses") || [])];
                                    newAddresses[index] = { ...currentAddress, postcode: e.target.value };
                                    form.setValue("campusAddresses", newAddresses);
                                  }}
                                  placeholder="2000"
                                  data-testid={`input-institution-campusPostcode-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <FormLabel>Country</FormLabel>
                                <Input
                                  value={currentAddress.country || ""}
                                  onChange={(e) => {
                                    const newAddresses = [...(form.watch("campusAddresses") || [])];
                                    newAddresses[index] = { ...currentAddress, country: e.target.value };
                                    form.setValue("campusAddresses", newAddresses);
                                  }}
                                  placeholder="Australia"
                                  data-testid={`input-institution-campusCountry-${index}`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Markets</CardTitle>
                    <CardDescription>Which regional domains should display this institution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { code: 'AU', label: 'Australia (AU)' },
                      { code: 'BD', label: 'Bangladesh (BD)' },
                    ].map((market) => (
                      <label
                        key={market.code}
                        className="flex items-center gap-3 cursor-pointer"
                        data-testid={`label-market-${market.code.toLowerCase()}`}
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
                          data-testid={`checkbox-market-${market.code.toLowerCase()}`}
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
                    <CardDescription>Which regional homepages should feature this institution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { code: 'AU', label: 'Australia (AU)' },
                      { code: 'BD', label: 'Bangladesh (BD)' },
                    ].map((market) => (
                      <label
                        key={market.code}
                        className="flex items-center gap-3 cursor-pointer"
                        data-testid={`label-featured-${market.code.toLowerCase()}`}
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
                          data-testid={`checkbox-featured-${market.code.toLowerCase()}`}
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
                  <CardHeader>
                    <CardTitle>Logo</CardTitle>
                    <CardDescription>Upload institution logo (resized to 160x160px)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden">
                        {logoPreview && !logoDisplayError ? (
                          <img
                            src={logoPreview}
                            alt="Institution logo"
                            className="w-full h-full object-cover"
                            data-testid="img-institution-logo-preview"
                            onError={() => setLogoDisplayError(true)}
                          />
                        ) : logoPreview && logoDisplayError ? (
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        ) : (
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        data-testid="input-institution-logo-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="w-full"
                        data-testid="button-institution-upload-logo"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {logoPreview ? "Change Logo" : "Upload Logo"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Gallery Images</CardTitle>
                    <CardDescription>Campus and facility photos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GalleryImageManager
                      value={form.watch("institutionGallery") || []}
                      onChange={(urls) => form.setValue("institutionGallery", urls)}
                      institutionName={form.watch("name")}
                      institutionLocation={form.watch("country")}
                      institutionProviderType={form.watch("providerType")}
                    />
                  </CardContent>
                </Card>

                {institution && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </CardTitle>
                      <CardDescription>Categorize this institution for better search and recommendations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2 min-h-[40px]" data-testid="container-selected-tags">
                        {selectedTags.length === 0 && !loadingTags && (
                          <span className="text-sm text-muted-foreground" data-testid="text-no-tags">No tags selected</span>
                        )}
                        {loadingTags && (
                          <span className="text-sm text-muted-foreground" data-testid="text-loading-tags">Loading tags...</span>
                        )}
                        {selectedTags.map((tag) => (
                          <div key={tag.id} className="flex flex-wrap items-center gap-1" data-testid={`container-tag-${tag.slug}`}>
                            <Badge
                              variant="secondary"
                              data-testid={`badge-tag-${tag.slug}`}
                            >
                              {tag.name}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleTag(tag.id)}
                              aria-label={`Remove ${tag.name} tag`}
                              data-testid={`button-remove-tag-${tag.slug}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                            data-testid="button-add-tags"
                          >
                            <span className="flex flex-wrap items-center gap-2">
                              <Tag className="h-4 w-4" />
                              Add Tags
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search tags..." data-testid="input-tag-search" />
                            <CommandList className="max-h-64" data-testid="list-tags">
                              <CommandEmpty data-testid="text-no-tags-found">No tags found.</CommandEmpty>
                              {groupedTags && Object.entries(groupedTags).map(([category, categoryTags]) => (
                                <CommandGroup key={category} heading={INSTITUTION_TAG_CATEGORY_LABELS[category] || category}>
                                  {categoryTags.filter(t => t.slug !== 'featured').map((tag) => {
                                    const isSelected = selectedTagIds.includes(tag.id);
                                    return (
                                      <CommandItem
                                        key={tag.id}
                                        value={tag.name}
                                        onSelect={() => toggleTag(tag.id)}
                                        className="flex flex-wrap items-center gap-2 cursor-pointer"
                                        data-testid={`option-tag-${tag.slug}`}
                                      >
                                        <div
                                          className="w-3 h-3 rounded-full border"
                                          style={{ backgroundColor: tag.color || '#888', borderColor: tag.color || '#888' }}
                                        />
                                        <span className="flex-1">{tag.name}</span>
                                        {isSelected && <Check className="h-4 w-4" />}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {updateTagsMutation.isPending && (
                        <p className="text-xs text-muted-foreground" data-testid="text-saving-tags">Saving tags...</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {institution && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Approval Status</span>
                        <Badge variant={institution.approvalStatus === 'approved' ? 'default' : 'outline'}>
                          {institution.approvalStatus || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active</span>
                        <Badge variant={institution.isActive ? 'default' : 'secondary'}>
                          {institution.isActive ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
              </form>
            </Form>

            {institution && (
              <div className="space-y-6 mt-6">
                <InstitutionScholarshipsPanel
                  institutionId={institution.id}
                  institutionName={institution.name}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="crm" className="flex-1 overflow-y-auto p-6 mt-0">
            {institution ? (
              <div className="max-w-7xl mx-auto space-y-6">
                <InstitutionContactsPanel
                  institutionId={institution.id}
                  institutionName={institution.name}
                />
                <InstitutionBusinessTermsPanel
                  institutionId={institution.id}
                  institutionName={institution.name}
                />
                <InstitutionDocumentsPanel
                  institutionId={institution.id}
                  institutionName={institution.name}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-crm-save-first">
                Please save the institution first to access CRM features.
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto p-6 mt-0">
            {institution ? (
              <div className="max-w-7xl mx-auto">
                <Card data-testid="card-institution-history">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Activity History
                    </CardTitle>
                    <CardDescription>Track all changes and activities for this institution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingActivityLogs ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Loading activity history...</span>
                      </div>
                    ) : activityLogsData?.logs && activityLogsData.logs.length > 0 ? (
                      <div className="space-y-4">
                        {activityLogsData.logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex gap-4 p-4 border rounded-lg bg-muted/30"
                            data-testid={`activity-log-${log.id}`}
                          >
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={log.userProfilePicture || undefined} alt={log.userName || "User"} />
                              <AvatarFallback>
                                {log.userName ? log.userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : <User className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <span className="font-medium" data-testid={`activity-user-${log.id}`}>
                                    {log.userName || log.userEmail || "Unknown User"}
                                  </span>
                                  <span className="text-muted-foreground mx-1">-</span>
                                  <Badge
                                    variant={
                                      log.action === "create" ? "default" :
                                      log.action === "update" ? "secondary" :
                                      log.action === "delete" ? "destructive" : "outline"
                                    }
                                    data-testid={`activity-action-${log.id}`}
                                  >
                                    {log.action === "create" && <Plus className="h-3 w-3 mr-1" />}
                                    {log.action === "update" && <Edit className="h-3 w-3 mr-1" />}
                                    {log.action === "delete" && <Trash2 className="h-3 w-3 mr-1" />}
                                    {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`activity-time-${log.id}`}>
                                  <Clock className="h-3 w-3" />
                                  {new Date(log.createdAt).toLocaleString()}
                                </div>
                              </div>
                              {log.actionDescription && (
                                <p className="text-sm text-muted-foreground mt-1" data-testid={`activity-description-${log.id}`}>
                                  {log.actionDescription}
                                </p>
                              )}
                              {log.changes && Object.keys(log.changes).length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {Object.entries(log.changes).map(([field, change]) => (
                                    <div key={field} className="text-xs bg-muted px-2 py-1 rounded" data-testid={`activity-change-${log.id}-${field}`}>
                                      <span className="font-medium">{field}:</span>
                                      <span className="text-destructive mx-1 line-through">{String(change.before || "empty")}</span>
                                      <span className="text-muted-foreground mx-1">→</span>
                                      <span className="text-green-600 dark:text-green-400">{String(change.after || "empty")}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground" data-testid="text-no-activity">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No activity recorded yet.</p>
                        <p className="text-sm">Changes to this institution will appear here.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-history-save-first">
                Please save the institution first to view activity history.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
