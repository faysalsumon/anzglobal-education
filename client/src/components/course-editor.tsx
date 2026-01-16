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
import { ArrowLeft, FileText, Globe, Tag, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

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
  subject: z.string().min(1, "Subject is required"),
  level: z.string().optional(),
  discipline: z.string().optional(),
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
  scholarshipPercentageMin: optionalIntPercentage,
  scholarshipPercentageMax: optionalIntPercentage,
  thumbnailUrl: optionalUrl,
  curriculumUrl: optionalUrl,
  images: z.string().optional(),
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
  scholarshipPercentageMin?: number | null;
  scholarshipPercentageMax?: number | null;
  thumbnailUrl?: string | null;
  curriculumUrl?: string | null;
  images?: string[] | null;
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

const TAG_CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  feature: { label: 'Features', description: 'Course features' },
  delivery: { label: 'Delivery', description: 'How the course is delivered' },
  career: { label: 'Career', description: 'Career outcomes' },
  skill: { label: 'Skills', description: 'Skills and learning approaches' },
  industry: { label: 'Industry', description: 'Industry sectors' },
  audience: { label: 'Audience', description: 'Target students' },
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

  const { data: selectedInstitution, isLoading: institutionDetailsLoading } = useQuery<Institution>({
    queryKey: ["/api/super-admin/institutions", selectedInstitutionId],
    enabled: !!selectedInstitutionId,
  });

  const { data: groupedTags } = useQuery<Record<string, TagType[]>>({
    queryKey: ["/api/admin/tags/grouped"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tags/grouped", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
  });

  const { data: courseTags } = useQuery<TagType[]>({
    queryKey: ["/api/courses", course?.id, "tags"],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await fetch(`/api/courses/${course.id}/tags`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch course tags");
      return res.json();
    },
    enabled: !!course?.id,
  });

  useEffect(() => {
    if (courseTags) {
      setSelectedTagIds(courseTags.map(t => String(t.id)));
    }
  }, [courseTags]);

  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      universityId: course?.universityId || "",
      title: course?.title || "",
      description: course?.description || "",
      subject: course?.subject || "",
      level: course?.level || "",
      discipline: course?.discipline || "",
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
      scholarshipPercentageMin: course?.scholarshipPercentageMin || ("" as any),
      scholarshipPercentageMax: course?.scholarshipPercentageMax || ("" as any),
      thumbnailUrl: course?.thumbnailUrl || "",
      curriculumUrl: course?.curriculumUrl || "",
      images: Array.isArray(course?.images) ? course.images.join(", ") : "",
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/super-admin/courses", data);
      return response.json();
    },
    onSuccess: async (newCourse: any) => {
      if (newCourse?.id && selectedTagIds.length > 0) {
        await saveTagsMutation.mutateAsync({ courseId: newCourse.id, tagIds: selectedTagIds });
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
        await saveTagsMutation.mutateAsync({ courseId: result.id, tagIds: selectedTagIds });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", result.id, "tags"] });
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
      images: data.images ? data.images.split(',').map(s => s.trim()).filter(Boolean) : undefined,
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
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Computer Science" data-testid="input-course-subject" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <FormField
                        control={form.control}
                        name="costOfLiving"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost of Living (Annual)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="20000" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} data-testid="input-course-costOfLiving" />
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
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location/Campus</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Sydney Campus" data-testid="input-course-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Australia" data-testid="input-course-country" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="February 2025" data-testid="input-course-startDate" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="applicationDeadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Application Deadline</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="December 31, 2024" data-testid="input-course-applicationDeadline" />
                            </FormControl>
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
                    <FormField
                      control={form.control}
                      name="englishRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>English Language Requirements</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="IELTS 6.5 overall, no band less than 6.0..." rows={3} data-testid="input-course-englishRequirements" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Career & Pathways</CardTitle>
                    <CardDescription>Career outcomes and study pathways</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="pathways"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pathways (Comma-separated)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="University degrees, Advanced studies" rows={2} data-testid="input-course-pathways" />
                          </FormControl>
                          <FormDescription>Enter progression routes separated by commas</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="studyAreas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Study Areas (Comma-separated)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Programming, Database Design, Web Development" rows={2} data-testid="input-course-studyAreas" />
                          </FormControl>
                          <FormDescription>Enter study topics separated by commas</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="careerOutcomes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Career Outcomes (Comma-separated)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Software Engineer, Data Analyst, Web Developer" rows={2} data-testid="input-course-careerOutcomes" />
                          </FormControl>
                          <FormDescription>Enter career paths separated by commas</FormDescription>
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
                            <Textarea {...field} placeholder="Detailed career progression and trajectory..." rows={3} data-testid="input-course-careerPath" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Course Tags
                    </CardTitle>
                    <CardDescription>Select tags to help students find this course</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedTagIds.length > 0 && (
                      <div className="mb-3">
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          Selected ({selectedTagIds.length})
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
                    
                    {groupedTags && Object.entries(groupedTags).map(([category, categoryTags]) => (
                      <div key={category}>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          {TAG_CATEGORY_LABELS[category]?.label || category}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {categoryTags.map((tag: TagType) => {
                            const isSelected = selectedTagIds.includes(String(tag.id));
                            return (
                              <Tooltip key={tag.id}>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={isSelected ? "default" : "outline"}
                                    style={isSelected ? { backgroundColor: tag.color || '#3B82F6' } : {}}
                                    className={`cursor-pointer transition-all ${isSelected ? '' : 'hover:bg-muted'}`}
                                    onClick={() => handleTagToggle(String(tag.id))}
                                    data-testid={`tag-option-${tag.slug}`}
                                  >
                                    {tag.name}
                                  </Badge>
                                </TooltipTrigger>
                                {tag.description && (
                                  <TooltipContent>
                                    <p>{tag.description}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {!groupedTags && (
                      <p className="text-sm text-muted-foreground">Loading tags...</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Scholarships</CardTitle>
                    <CardDescription>Available scholarship percentages</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="scholarshipPercentageMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scholarship Min %</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="10" min="0" max="100" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} data-testid="input-course-scholarshipMin" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scholarshipPercentageMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scholarship Max %</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="50" min="0" max="100" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} data-testid="input-course-scholarshipMax" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Media</CardTitle>
                    <CardDescription>Course thumbnail and images</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="thumbnailUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thumbnail URL</FormLabel>
                          <FormControl>
                            <Input {...field} type="url" placeholder="https://..." data-testid="input-course-thumbnailUrl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="curriculumUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Curriculum URL</FormLabel>
                          <FormControl>
                            <Input {...field} type="url" placeholder="https://..." data-testid="input-course-curriculumUrl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="images"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Images (Comma-separated URLs)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="https://image1.jpg, https://image2.jpg" rows={2} data-testid="input-course-images" />
                          </FormControl>
                          <FormDescription>Enter multiple image URLs</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

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
    </div>
  );
}
