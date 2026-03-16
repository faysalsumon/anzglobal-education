import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Loader2, ArrowLeft, Plus, X } from "lucide-react";
import { Link } from "wouter";
import { baseCourseSchema, type InsertCourse, type Course, type SubDiscipline, type Campus } from "@shared/schema";
import { z } from "zod";

const formSchema = baseCourseSchema.extend({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  level: z.string().min(1, "Level is required"),
});

export default function CourseForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/university/courses/:id/edit");
  const courseId = params?.id;
  const isEditing = !!courseId;
  const [aiLoading, setAiLoading] = useState(false);
  const [subDisciplineInput, setSubDisciplineInput] = useState("");
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);
  
  // Array field states
  const [intakeInput, setIntakeInput] = useState("");
  const [studyAreaInput, setStudyAreaInput] = useState("");
  const [careerOutcomeInput, setCareerOutcomeInput] = useState("");
  const [pathwayInput, setPathwayInput] = useState("");
  const [campusLocationInput, setCampusLocationInput] = useState("");

  const { data: course } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: isEditing,
  });

  // Fetch institution campuses
  const { data: institutionCampuses = [] } = useQuery<Campus[]>({
    queryKey: ["/api/university/campuses"],
  });

  // Fetch currently assigned campuses when editing
  const { data: courseCampuses = [] } = useQuery<Campus[]>({
    queryKey: ["/api/courses", courseId, "campuses"],
    enabled: isEditing && !!courseId,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      universityId: "",
      title: "",
      description: "",
      subject: "",
      discipline: undefined,
      level: "",
      duration: "",
      durationMonths: undefined,
      durationWeeks: undefined,
      fees: undefined,
      currency: "AUD",
      location: "",
      country: "",
      startDate: "",
      applicationDeadline: "",
      prerequisites: "",
      thumbnailUrl: "",
      courseCode: "",
      cricosCode: "",
      isCricosRegistered: false,
      prPathway: false,
      scholarshipPercentageMin: undefined,
      scholarshipPercentageMax: undefined,
      eligibilityRequirements: "",
      englishRequirements: "",
      curriculumUrl: "",
      costOfLiving: undefined,
      applicationFees: undefined,
      isActive: true,
      intakes: [],
      studyAreas: [],
      careerOutcomes: [],
      careerPath: "",
      pathways: [],
      minimumAge: undefined,
      englishRequirementsStructured: {
        IELTS: {},
        TOEFL: {},
        PTE: {},
        Duolingo: {},
      },
      deliveryMode: undefined,
      campusLocations: [],
      internshipAvailable: false,
      internshipDetails: "",
    },
  });

  useEffect(() => {
    if (course && isEditing) {
      form.reset({
        universityId: course.universityId,
        title: course.title,
        description: course.description ?? "",
        subject: course.subject,
        discipline: course.discipline ?? undefined,
        level: course.level,
        duration: course.duration ?? "",
        durationMonths: course.durationMonths ?? undefined,
        durationWeeks: course.durationWeeks ?? undefined,
        fees: course.fees ?? undefined,
        currency: course.currency ?? "AUD",
        location: course.location ?? "",
        country: course.country ?? "",
        startDate: course.startDate ?? "",
        applicationDeadline: course.applicationDeadline ?? "",
        prerequisites: course.prerequisites ?? "",
        thumbnailUrl: course.thumbnailUrl ?? "",
        courseCode: course.courseCode ?? "",
        cricosCode: course.cricosCode ?? "",
        isCricosRegistered: course.isCricosRegistered ?? false,
        prPathway: course.prPathway ?? false,
        scholarshipPercentageMin: course.scholarshipPercentageMin ?? undefined,
        scholarshipPercentageMax: course.scholarshipPercentageMax ?? undefined,
        eligibilityRequirements: course.eligibilityRequirements ?? "",
        englishRequirements: course.englishRequirements ?? "",
        curriculumUrl: course.curriculumUrl ?? "",
        costOfLiving: course.costOfLiving ?? undefined,
        applicationFees: course.applicationFees ?? undefined,
        isActive: course.isActive ?? true,
        intakes: course.intakes ?? [],
        studyAreas: course.studyAreas ?? [],
        careerOutcomes: course.careerOutcomes ?? [],
        careerPath: course.careerPath ?? "",
        pathways: course.pathways ?? [],
        minimumAge: course.minimumAge ?? undefined,
        englishRequirementsStructured: course.englishRequirementsStructured ?? {
          IELTS: {},
          TOEFL: {},
          PTE: {},
          Duolingo: {},
        },
        deliveryMode: (course.deliveryMode as "online" | "on-campus" | "hybrid" | undefined) ?? undefined,
        campusLocations: course.campusLocations ?? [],
        internshipAvailable: course.internshipAvailable ?? false,
        internshipDetails: course.internshipDetails ?? "",
      });
    }
  }, [course, isEditing, form]);

  // Clear internship details when internshipAvailable is unchecked
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "internshipAvailable" && !value.internshipAvailable) {
        form.setValue("internshipDetails", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Watch discipline to fetch sub-disciplines
  const selectedDiscipline = form.watch("discipline");
  const isCricosRegistered = form.watch("isCricosRegistered");
  
  const { data: subDisciplines = [] } = useQuery<SubDiscipline[]>({
    queryKey: ["/api/sub-disciplines", selectedDiscipline],
    enabled: !!selectedDiscipline,
  });
  
  // Reset sub-discipline when discipline changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'discipline') {
        // Clear sub-discipline input and form value when discipline changes
        setSubDisciplineInput('');
        form.setValue('subDisciplineId', undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Load sub-discipline name when editing
  useEffect(() => {
    if (course?.subDisciplineId && subDisciplines.length > 0) {
      const currentSubDiscipline = subDisciplines.find(sd => sd.id === course.subDisciplineId);
      if (currentSubDiscipline) {
        setSubDisciplineInput(currentSubDiscipline.name);
      }
    }
  }, [course?.subDisciplineId, subDisciplines]);

  // Load selected campuses when editing
  useEffect(() => {
    // Always update selectedCampusIds, even if list is empty
    // This ensures removing all campuses clears the selection
    if (isEditing && courseCampuses !== undefined) {
      setSelectedCampusIds(courseCampuses.map(c => c.id));
    }
  }, [courseCampuses, isEditing]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("Form data before submission:", data);
      console.log("Fees type:", typeof data.fees, "Value:", data.fees);
      
      // Handle sub-discipline creation if needed
      let finalData = { ...data };
      if (subDisciplineInput && data.discipline) {
        // Create slug from input
        const slug = subDisciplineInput.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        
        // Check if this sub-discipline already exists
        const existing = subDisciplines.find(sd => sd.slug === slug && sd.discipline === data.discipline);
        
        if (existing) {
          finalData.subDisciplineId = existing.id;
        } else {
          // Create new sub-discipline
          try {
            const response = await apiRequest("POST", "/api/sub-disciplines", {
              discipline: data.discipline,
              name: subDisciplineInput,
              slug: slug,
            });
            const newSubDiscipline = await response.json() as SubDiscipline;
            finalData.subDisciplineId = newSubDiscipline.id;
          } catch (error) {
            console.error("Failed to create sub-discipline:", error);
          }
        }
      }
      
      // Create or update the course
      const url = isEditing ? `/api/courses/${courseId}` : "/api/courses";
      const courseResponse = await apiRequest(isEditing ? "PUT" : "POST", url, finalData);
      const savedCourse = await courseResponse.json() as Course;
      
      // Update campus associations
      await apiRequest("PUT", `/api/courses/${savedCourse.id}/campuses`, {
        campusIds: selectedCampusIds
      });
      
      return savedCourse;
    },
    onSuccess: (savedCourse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/university/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-disciplines"] });
      // Invalidate course campuses cache to keep components synchronized
      queryClient.invalidateQueries({ queryKey: ["/api/courses", savedCourse.id, "campuses"] });
      toast({
        title: isEditing ? "Course updated" : "Course created",
        description: `Your course has been ${isEditing ? "updated" : "created"} successfully.`,
      });
      if (!isEditing) {
        navigate("/university/courses");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateDescription = async () => {
    const title = form.getValues("title");
    const subject = form.getValues("subject");
    const level = form.getValues("level");

    if (!title || !subject || !level) {
      toast({
        title: "Missing information",
        description: "Please enter title, subject, and level first.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-course-description", {
        title,
        subject,
        level,
      }) as unknown as { description: string };
      form.setValue("description", response.description);
      toast({
        title: "Description generated",
        description: "AI has created a description for your course.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const addArrayItem = (fieldName: "intakes" | "studyAreas" | "careerOutcomes" | "pathways" | "campusLocations", value: string, setter: (val: string) => void) => {
    if (!value.trim()) return;
    const currentValues = form.getValues(fieldName) || [];
    if (!currentValues.includes(value.trim())) {
      form.setValue(fieldName, [...currentValues, value.trim()]);
    }
    setter("");
  };

  const removeArrayItem = (fieldName: "intakes" | "studyAreas" | "careerOutcomes" | "pathways" | "campusLocations", index: number) => {
    const currentValues = form.getValues(fieldName) || [];
    form.setValue(fieldName, currentValues.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/university/courses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isEditing ? "Edit Course" : "Create New Course"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? "Update your course details" : "Add a new course to your offerings"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential course details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-subject">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Computer Science">Computer Science</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="Medicine">Medicine</SelectItem>
                          <SelectItem value="Arts">Arts</SelectItem>
                          <SelectItem value="Science">Science</SelectItem>
                          <SelectItem value="Law">Law</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="VCE (11-12)">VCE (11-12)</SelectItem>
                          <SelectItem value="Certificate II">Certificate II</SelectItem>
                          <SelectItem value="Certificate III">Certificate III</SelectItem>
                          <SelectItem value="Certificate IV">Certificate IV</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Graduate Certificate">Graduate Certificate</SelectItem>
                          <SelectItem value="Graduate Diploma">Graduate Diploma</SelectItem>
                          <SelectItem value="Bachelor Degree">Bachelor Degree</SelectItem>
                          <SelectItem value="Professional Year">Professional Year</SelectItem>
                          <SelectItem value="Masters Degree">Masters Degree</SelectItem>
                          <SelectItem value="Doctoral Degree">Doctoral Degree</SelectItem>
                          <SelectItem value="Higher Doctoral Degree">Higher Doctoral Degree</SelectItem>
                          <SelectItem value="ELICOS">ELICOS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="discipline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discipline</FormLabel>
                    <FormDescription>
                      Main discipline category for this course
                    </FormDescription>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-discipline">
                          <SelectValue placeholder="Select discipline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

              <div className="space-y-2">
                <FormLabel htmlFor="sub-discipline-input">
                  Sub-Discipline {!selectedDiscipline && <span className="text-muted-foreground text-sm">(select discipline first)</span>}
                </FormLabel>
                <FormDescription>
                  Specific area within the discipline (e.g., "Software Engineering", "Data Science")
                </FormDescription>
                <Input
                  id="sub-discipline-input"
                  value={subDisciplineInput}
                  onChange={(e) => setSubDisciplineInput(e.target.value)}
                  placeholder={selectedDiscipline ? "Type to search or create..." : "Select a discipline first"}
                  disabled={!selectedDiscipline}
                  list="sub-disciplines-datalist"
                  data-testid="input-sub-discipline"
                />
                <datalist id="sub-disciplines-datalist">
                  {subDisciplines.map((sd) => (
                    <option key={sd.id} value={sd.name} />
                  ))}
                </datalist>
                {subDisciplineInput && !subDisciplines.find(sd => sd.name.toLowerCase() === subDisciplineInput.toLowerCase()) && (
                  <p className="text-sm text-muted-foreground">
                    Will create new sub-discipline: "{subDisciplineInput}"
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => form.setValue('isCricosRegistered', false)}
                    className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${!isCricosRegistered ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover-elevate'}`}
                    data-testid="toggle-course-code"
                  >
                    Course Code
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue('isCricosRegistered', true)}
                    className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${isCricosRegistered ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover-elevate'}`}
                    data-testid="toggle-cricos-code"
                  >
                    CRICOS Code
                  </button>
                </div>
                {!isCricosRegistered ? (
                  <FormField
                    control={form.control}
                    name="courseCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="e.g. BSB51415" data-testid="input-course-code" />
                        </FormControl>
                        <FormDescription>RTO or national course code</FormDescription>
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
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="e.g. 116694A" data-testid="input-course-cricos-code" />
                        </FormControl>
                        <FormDescription>CRICOS registered course code (AU)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Course Description */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Course Description
                  </CardTitle>
                  <CardDescription>Detailed information about the course</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateDescription}
                  disabled={aiLoading}
                  data-testid="button-generate-description"
                >
                  {aiLoading ? (
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Describe the course content, learning outcomes, and what makes it unique..."
                        className="min-h-[200px]"
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Study Areas */}
          <Card>
            <CardHeader>
              <CardTitle>Study Areas & Topics</CardTitle>
              <CardDescription>Key subjects and topics covered in this course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="studyAreas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add Study Areas</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={studyAreaInput}
                        onChange={(e) => setStudyAreaInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addArrayItem("studyAreas", studyAreaInput, setStudyAreaInput);
                          }
                        }}
                        placeholder="e.g., Machine Learning, Web Development"
                        data-testid="input-study-area"
                      />
                      <Button
                        type="button"
                        onClick={() => addArrayItem("studyAreas", studyAreaInput, setStudyAreaInput)}
                        data-testid="button-add-study-area"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(field.value || []).map((area, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1" data-testid={`badge-study-area-${idx}`}>
                          {area}
                          <button
                            type="button"
                            onClick={() => removeArrayItem("studyAreas", idx)}
                            className="hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Location & Duration */}
          <Card>
            <CardHeader>
              <CardTitle>Location & Duration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="Sydney, NSW" data-testid="input-location" />
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
                        <Input {...field} value={field.value ?? ""} placeholder="Australia" data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormLabel>Campus Locations</FormLabel>
                <FormDescription>
                  Select which campuses offer this course
                </FormDescription>
                {institutionCampuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No campuses configured. Please add campuses to your institution first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {institutionCampuses.map((campus) => (
                      <div key={campus.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`campus-${campus.id}`}
                          checked={selectedCampusIds.includes(campus.id)}
                          onCheckedChange={(checked) => {
                            setSelectedCampusIds(prev =>
                              checked
                                ? [...prev, campus.id]
                                : prev.filter(id => id !== campus.id)
                            );
                          }}
                          data-testid={`checkbox-campus-${campus.id}`}
                        />
                        <label
                          htmlFor={`campus-${campus.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {campus.name}
                          {campus.city && campus.state && (
                            <span className="text-muted-foreground ml-2">
                              ({campus.city}, {campus.state})
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {selectedCampusIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedCampusIds.length} campus{selectedCampusIds.length === 1 ? '' : 'es'} selected
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="deliveryMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-delivery-mode">
                          <SelectValue placeholder="Select delivery mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="on-campus">On Campus</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Text)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="3 years" data-testid="input-duration" />
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
                        <Input
                          {...field}
                          type="number"
                          placeholder="156"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-duration-weeks"
                        />
                      </FormControl>
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
                        <Input
                          {...field}
                          type="number"
                          placeholder="36"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-duration-months"
                        />
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
                    <FormLabel>Available Intakes</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={intakeInput}
                        onChange={(e) => setIntakeInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addArrayItem("intakes", intakeInput, setIntakeInput);
                          }
                        }}
                        placeholder="e.g., February, July, October"
                        data-testid="input-intake"
                      />
                      <Button
                        type="button"
                        onClick={() => addArrayItem("intakes", intakeInput, setIntakeInput)}
                        data-testid="button-add-intake"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(field.value || []).map((intake, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1" data-testid={`badge-intake-${idx}`}>
                          {intake}
                          <button
                            type="button"
                            onClick={() => removeArrayItem("intakes", idx)}
                            className="hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Fees & Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Fees & Financial Information</CardTitle>
              <CardDescription>Tuition fees, scholarships, and related costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="fees"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Tuition Fees</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="25000.00"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e.target.value || undefined);
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-fees"
                        />
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
                      <Select onValueChange={field.onChange} value={field.value ?? "AUD"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AUD">AUD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                          <SelectItem value="NZD">NZD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="applicationFees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application / Admission Fee</FormLabel>
                      <FormDescription>One-time fee charged at application or admission</FormDescription>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="100.00"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e.target.value || undefined);
                          }}
                          data-testid="input-application-fees"
                        />
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
                      <FormDescription>Estimated yearly living expenses</FormDescription>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="18000.00"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e.target.value || undefined);
                          }}
                          data-testid="input-cost-of-living"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="scholarshipPercentageMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scholarship Range (Min %)</FormLabel>
                      <FormDescription>Minimum scholarship percentage available</FormDescription>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="10"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e.target.value ? parseInt(e.target.value) : undefined);
                          }}
                          data-testid="input-scholarship-min"
                        />
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
                      <FormLabel>Scholarship Range (Max %)</FormLabel>
                      <FormDescription>Maximum scholarship percentage available</FormDescription>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="50"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e.target.value ? parseInt(e.target.value) : undefined);
                          }}
                          data-testid="input-scholarship-max"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="February 2026" data-testid="input-start-date" />
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
                        <Input {...field} value={field.value ?? ""} placeholder="December 2025" data-testid="input-deadline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Entry Requirements</CardTitle>
              <CardDescription>Academic and English language requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-minimum-age"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prerequisites"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prerequisites</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="List any entry requirements or prerequisites..."
                        className="min-h-[100px]"
                        data-testid="textarea-prerequisites"
                      />
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
                    <FormDescription>
                      General eligibility criteria for applicants
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="e.g., Must be 18 years or older, Valid passport, etc..."
                        className="min-h-[100px]"
                        data-testid="textarea-eligibility-requirements"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>English Language Requirements (Structured)</FormLabel>
                <FormDescription>
                  Enter minimum scores for accepted English tests
                </FormDescription>
                
                <div className="border rounded-md p-4 space-y-3">
                  <p className="text-sm font-medium">IELTS Scores</p>
                  <div className="grid gap-3 md:grid-cols-5">
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Overall</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="6.5"
                              value={(field.value as any)?.ielts?.overall || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  ielts: { ...(field.value as any)?.ielts, overall: val }
                                });
                              }}
                              data-testid="input-ielts-overall"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Listening</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="6.0"
                              value={(field.value as any)?.ielts?.listening || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  ielts: { ...(field.value as any)?.ielts, listening: val }
                                });
                              }}
                              data-testid="input-ielts-listening"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Reading</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="6.0"
                              value={(field.value as any)?.ielts?.reading || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  ielts: { ...(field.value as any)?.ielts, reading: val }
                                });
                              }}
                              data-testid="input-ielts-reading"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Writing</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="6.0"
                              value={(field.value as any)?.ielts?.writing || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  ielts: { ...(field.value as any)?.ielts, writing: val }
                                });
                              }}
                              data-testid="input-ielts-writing"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Speaking</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="6.0"
                              value={(field.value as any)?.ielts?.speaking || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  ielts: { ...(field.value as any)?.ielts, speaking: val }
                                });
                              }}
                              data-testid="input-ielts-speaking"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border rounded-md p-4 space-y-3">
                  <p className="text-sm font-medium">TOEFL Scores</p>
                  <div className="grid gap-3 md:grid-cols-5">
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Overall</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="79"
                              value={(field.value as any)?.toefl?.overall || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  toefl: { ...(field.value as any)?.toefl, overall: val }
                                });
                              }}
                              data-testid="input-toefl-overall"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Listening</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="20"
                              value={(field.value as any)?.toefl?.listening || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  toefl: { ...(field.value as any)?.toefl, listening: val }
                                });
                              }}
                              data-testid="input-toefl-listening"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Reading</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="20"
                              value={(field.value as any)?.toefl?.reading || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  toefl: { ...(field.value as any)?.toefl, reading: val }
                                });
                              }}
                              data-testid="input-toefl-reading"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Writing</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="20"
                              value={(field.value as any)?.toefl?.writing || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  toefl: { ...(field.value as any)?.toefl, writing: val }
                                });
                              }}
                              data-testid="input-toefl-writing"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Speaking</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="20"
                              value={(field.value as any)?.toefl?.speaking || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  toefl: { ...(field.value as any)?.toefl, speaking: val }
                                });
                              }}
                              data-testid="input-toefl-speaking"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border rounded-md p-4 space-y-3">
                  <p className="text-sm font-medium">PTE Academic Scores</p>
                  <div className="grid gap-3 md:grid-cols-5">
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Overall</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="58"
                              value={(field.value as any)?.pte?.overall || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  pte: { ...(field.value as any)?.pte, overall: val }
                                });
                              }}
                              data-testid="input-pte-overall"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Listening</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50"
                              value={(field.value as any)?.pte?.listening || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  pte: { ...(field.value as any)?.pte, listening: val }
                                });
                              }}
                              data-testid="input-pte-listening"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Reading</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50"
                              value={(field.value as any)?.pte?.reading || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  pte: { ...(field.value as any)?.pte, reading: val }
                                });
                              }}
                              data-testid="input-pte-reading"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Writing</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50"
                              value={(field.value as any)?.pte?.writing || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  pte: { ...(field.value as any)?.pte, writing: val }
                                });
                              }}
                              data-testid="input-pte-writing"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="englishRequirementsStructured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Speaking</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50"
                              value={(field.value as any)?.pte?.speaking || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange({
                                  ...(field.value as any || {}),
                                  pte: { ...(field.value as any)?.pte, speaking: val }
                                });
                              }}
                              data-testid="input-pte-speaking"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border rounded-md p-4">
                  <p className="text-sm font-medium mb-3">Duolingo English Test</p>
                  <FormField
                    control={form.control}
                    name="englishRequirementsStructured"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Overall Score</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="105"
                            className="max-w-xs"
                            value={(field.value as any)?.duolingo?.overall || ""}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : undefined;
                              field.onChange({
                                ...(field.value as any || {}),
                                duolingo: { overall: val }
                              });
                            }}
                            data-testid="input-duolingo-overall"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="englishRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>English Requirements (Summary)</FormLabel>
                    <FormDescription>
                      Plain text summary of English language requirements (optional, for display purposes)
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="e.g., IELTS 6.5 overall with no band less than 6.0, or equivalent"
                        className="min-h-[80px]"
                        data-testid="textarea-english-requirements"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Career Outcomes & Pathways */}
          <Card>
            <CardHeader>
              <CardTitle>Career Outcomes & Pathways</CardTitle>
              <CardDescription>Potential careers and further education options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="careerOutcomes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Career Outcomes</FormLabel>
                    <FormDescription>Potential career paths after completing this course</FormDescription>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={careerOutcomeInput}
                        onChange={(e) => setCareerOutcomeInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addArrayItem("careerOutcomes", careerOutcomeInput, setCareerOutcomeInput);
                          }
                        }}
                        placeholder="e.g., Software Engineer, Data Scientist"
                        data-testid="input-career-outcome"
                      />
                      <Button
                        type="button"
                        onClick={() => addArrayItem("careerOutcomes", careerOutcomeInput, setCareerOutcomeInput)}
                        data-testid="button-add-career-outcome"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(field.value || []).map((outcome, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1" data-testid={`badge-career-outcome-${idx}`}>
                          {outcome}
                          <button
                            type="button"
                            onClick={() => removeArrayItem("careerOutcomes", idx)}
                            className="hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pathways"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pathway Options</FormLabel>
                    <FormDescription>Further education pathways available</FormDescription>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={pathwayInput}
                        onChange={(e) => setPathwayInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addArrayItem("pathways", pathwayInput, setPathwayInput);
                          }
                        }}
                        placeholder="e.g., Master of Data Science, PhD in Computer Science"
                        data-testid="input-pathway"
                      />
                      <Button
                        type="button"
                        onClick={() => addArrayItem("pathways", pathwayInput, setPathwayInput)}
                        data-testid="button-add-pathway"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(field.value || []).map((pathway, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1" data-testid={`badge-pathway-${idx}`}>
                          {pathway}
                          <button
                            type="button"
                            onClick={() => removeArrayItem("pathways", idx)}
                            className="hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
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
                    <FormDescription>
                      Detailed description of the career progression and trajectory for graduates
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Describe the typical career progression, opportunities for advancement, industry demand, and long-term prospects..."
                        className="min-h-[120px]"
                        data-testid="textarea-career-path"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Course Status</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-active"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Course</FormLabel>
                      <FormDescription>
                        Active courses are visible to students and accept applications
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/university/courses">Cancel</Link>
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-course">
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? "Update Course" : "Create Course"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
