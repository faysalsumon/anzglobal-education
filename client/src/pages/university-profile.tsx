import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { insertUniversitySchema, type InsertUniversity, type University } from "@shared/schema";
import { z } from "zod";
import { GoogleAddressAutocomplete, type AddressComponents } from "@/components/ui/google-address-autocomplete";
import { GalleryManager } from "@/components/gallery-manager";
import { UniversityLayout } from "@/components/university-layout";

// Note: insertUniversitySchema already has validation including refine(), so we can use it directly
// We just need to ensure required fields are validated
const formSchema = insertUniversitySchema;

const PROVIDER_TYPES = [
  "Institution",
  "TAFE",
  "University",
  "College",
  "School",
];

function UniversityProfileContent() {
  const { toast } = useToast();
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasScholarship, setHasScholarship] = useState<boolean>(false);

  const { data: university } = useQuery<University>({
    queryKey: ["/api/university/profile"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      name: "",
      description: "",
      logo: "",
      website: "",
      country: "",
      establishedYear: undefined,
      contactEmail: "",
      contactPhone: "",
      numberOfCampuses: undefined,
      providerType: "",
      scholarshipPercentageMin: undefined,
      scholarshipPercentageMax: undefined,
      topDisciplines: [],
      smallDescription: "",
      fullDescription: "",
      institutionGallery: [],
      topCourses: [],
      campusAddresses: [],
    },
  });

  // Hydrate form when university data loads
  useEffect(() => {
    if (university) {
      form.reset({
        userId: university.userId,
        name: university.name || "",
        description: university.description || "",
        logo: university.logo || "",
        website: university.website || "",
        country: university.country || "",
        establishedYear: university.establishedYear || undefined,
        contactEmail: university.contactEmail || "",
        contactPhone: university.contactPhone || "",
        numberOfCampuses: university.numberOfCampuses ?? undefined,
        providerType: university.providerType || "",
        scholarshipPercentageMin: university.scholarshipPercentageMin ?? undefined,
        scholarshipPercentageMax: university.scholarshipPercentageMax ?? undefined,
        topDisciplines: university.topDisciplines || [],
        smallDescription: university.smallDescription || "",
        fullDescription: university.fullDescription || "",
        institutionGallery: university.institutionGallery || [],
        topCourses: university.topCourses || [],
        campusAddresses: (university.campusAddresses as any) || [],
      });
      
      // Set scholarship toggle state - use explicit null/undefined check to handle 0% scholarships
      setHasScholarship(
        university.scholarshipPercentageMin !== null && university.scholarshipPercentageMin !== undefined ||
        university.scholarshipPercentageMax !== null && university.scholarshipPercentageMax !== undefined
      );
      
      // Set preview images
      if (university.logo) {
        setLogoPreview(university.logo);
      }
      if (university.institutionGallery && university.institutionGallery.length > 0) {
        setGalleryPreviews(university.institutionGallery);
      }
    }
  }, [university, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest("POST", "/api/university/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/university/profile"] });
      toast({
        title: "Profile updated",
        description: "Your university profile has been saved successfully.",
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

  const generateDescription = async () => {
    const name = form.getValues("name");
    const country = form.getValues("country");
    if (!name || !country) {
      toast({
        title: "Missing information",
        description: "Please enter university name and country first.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading("description");
    try {
      const response = await apiRequest("POST", "/api/ai/generate-university-description", {
        name,
        country,
      }) as any as { description: string };
      form.setValue("description", response.description);
      toast({
        title: "Description generated",
        description: "AI has created a description for your university.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAiLoading(null);
    }
  };

  const generateSmallDescription = async () => {
    const name = form.getValues("name");
    const country = form.getValues("country");
    const providerType = form.getValues("providerType");
    
    if (!name || !country) {
      toast({
        title: "Missing information",
        description: "Please enter university name and country first.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading("smallDescription");
    try {
      console.log("Generating small description with:", { name, country, providerType });
      const response = await apiRequest("POST", "/api/university/generate-small-description", {
        name,
        country,
        providerType,
      }) as any as { description: string };
      console.log("Received response:", response);
      console.log("Setting form value to:", response.description);
      form.setValue("smallDescription", response.description);
      toast({
        title: "Small description generated",
        description: "AI has created a concise description for your institution.",
      });
    } catch (error: any) {
      console.error("Error generating small description:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAiLoading(null);
    }
  };

  const generateFullDescription = async () => {
    const name = form.getValues("name");
    const country = form.getValues("country");
    const providerType = form.getValues("providerType");
    const topDisciplines = form.getValues("topDisciplines");
    
    if (!name || !country) {
      toast({
        title: "Missing information",
        description: "Please enter university name and country first.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading("fullDescription");
    try {
      const response = await apiRequest("POST", "/api/university/generate-full-description", {
        name,
        country,
        providerType,
        topDisciplines,
      }) as any as { description: string };
      form.setValue("fullDescription", response.description);
      toast({
        title: "Full description generated",
        description: "AI has created a comprehensive description for your institution.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAiLoading(null);
    }
  };

  const generateGallery = async () => {
    const name = form.getValues("name");
    const country = form.getValues("country");
    const providerType = form.getValues("providerType");
    
    if (!name || !country) {
      toast({
        title: "Missing information",
        description: "Please enter university name and country first.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading("gallery");
    try {
      const response = await apiRequest("POST", "/api/university/generate-gallery", {
        name,
        country,
        providerType,
      }) as any as { institutionGallery: string[] };
      form.setValue("institutionGallery", response.institutionGallery);
      setGalleryPreviews(response.institutionGallery);
      toast({
        title: "Gallery generated",
        description: `AI has created ${response.institutionGallery.length} images for your institution gallery.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAiLoading(null);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/university/upload-logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      const data = await response.json();
      form.setValue("logo", data.logoPath);
      setLogoPreview(data.logoPath);
      
      toast({
        title: "Logo uploaded",
        description: "Your institution logo has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
        <h1 className="text-3xl font-bold text-foreground mb-2">University Profile</h1>
        <p className="text-muted-foreground">Showcase your institution to prospective students</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Institution Logo</CardTitle>
              <CardDescription>Upload your institution's logo (will be resized to 160x160px)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {(logoPreview || university?.logo) && (
                  <div className="w-40 h-40 rounded-full border border-[#F0F0F0] bg-white flex items-center justify-center overflow-hidden">
                    <img
                      src={logoPreview || university?.logo || ""}
                      alt="Institution logo"
                      className="w-full h-full object-cover"
                      data-testid="img-logo-preview"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    data-testid="input-logo-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-logo"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Recommended: Square image, min 160x160px. Will be displayed as circular.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential details about your university</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>University Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="University of Example" data-testid="input-university-name" />
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
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Australia" data-testid="input-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="establishedYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Established Year</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="1995"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-established-year"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="https://university.edu" data-testid="input-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Institution Details */}
          <Card>
            <CardHeader>
              <CardTitle>Institution Details</CardTitle>
              <CardDescription>Additional information about your institution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="providerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-provider-type">
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

                <FormField
                  control={form.control}
                  name="numberOfCampuses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Campuses</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="1"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-number-of-campuses"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Scholarship Availability */}
              <div className="space-y-4">
                <FormItem>
                  <FormLabel>Scholarship Available</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={hasScholarship ? "yes" : "no"}
                      onValueChange={(value) => {
                        const hasScholarshipValue = value === "yes";
                        setHasScholarship(hasScholarshipValue);
                        if (!hasScholarshipValue) {
                          form.setValue("scholarshipPercentageMin", undefined);
                          form.setValue("scholarshipPercentageMax", undefined);
                        }
                      }}
                      className="flex gap-4"
                      data-testid="radio-scholarship-available"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="scholarship-yes" data-testid="radio-scholarship-yes" />
                        <FormLabel htmlFor="scholarship-yes" className="font-normal cursor-pointer">
                          Yes
                        </FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="scholarship-no" data-testid="radio-scholarship-no" />
                        <FormLabel htmlFor="scholarship-no" className="font-normal cursor-pointer">
                          No
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>

                {hasScholarship && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="scholarshipPercentageMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scholarship Min %</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="10"
                              min="0"
                              max="100"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-scholarship-percentage-min"
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
                          <FormLabel>Scholarship Max %</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="20"
                              min="0"
                              max="100"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-scholarship-percentage-max"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="topDisciplines"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Top Disciplines (comma-separated)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Computer Science, Business, Engineering"
                        value={field.value?.join(", ") || ""}
                        onChange={(e) => {
                          const disciplines = e.target.value
                            .split(",")
                            .map((d) => d.trim())
                            .filter((d) => d.length > 0);
                          field.onChange(disciplines.length > 0 ? disciplines : []);
                        }}
                        data-testid="input-top-disciplines"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Campus Addresses */}
          <Card>
            <CardHeader>
              <CardTitle>Campus Addresses</CardTitle>
              <CardDescription>
                {form.watch("numberOfCampuses") 
                  ? `Enter address details for ${form.watch("numberOfCampuses")} campus${(form.watch("numberOfCampuses") ?? 0) > 1 ? "es" : ""}`
                  : "Enter the number of campuses first to add addresses"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {form.watch("numberOfCampuses") && form.watch("numberOfCampuses")! > 0 ? (
                Array.from({ length: form.watch("numberOfCampuses")! }).map((_, index) => {
                  const campusAddresses = form.watch("campusAddresses") || [];
                  const currentAddress = campusAddresses[index] || { address: "", city: "", state: "", postcode: "", country: "" };

                  return (
                    <div key={index} className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium">Campus {index + 1}</h4>
                      
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <GoogleAddressAutocomplete
                            value={currentAddress.address || ""}
                            onAddressSelect={(components: AddressComponents) => {
                              // Merge address fields into existing entry to preserve any additional properties
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
                              // Allow manual typing
                              const newAddresses = [...(form.watch("campusAddresses") || [])];
                              newAddresses[index] = { ...currentAddress, address: value };
                              form.setValue("campusAddresses", newAddresses);
                            }}
                            placeholder="Start typing an address..."
                            testId={`input-campus-${index}-address`}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Start typing to search for an address, or enter manually
                        </FormDescription>
                      </FormItem>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              value={currentAddress.city || ""}
                              onChange={(e) => {
                                const newAddresses = [...(form.watch("campusAddresses") || [])];
                                newAddresses[index] = { ...currentAddress, city: e.target.value };
                                form.setValue("campusAddresses", newAddresses);
                              }}
                              placeholder="Sydney"
                              data-testid={`input-campus-${index}-city`}
                            />
                          </FormControl>
                        </FormItem>

                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input
                              value={currentAddress.state || ""}
                              onChange={(e) => {
                                const newAddresses = [...(form.watch("campusAddresses") || [])];
                                newAddresses[index] = { ...currentAddress, state: e.target.value };
                                form.setValue("campusAddresses", newAddresses);
                              }}
                              placeholder="NSW"
                              data-testid={`input-campus-${index}-state`}
                            />
                          </FormControl>
                        </FormItem>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormItem>
                          <FormLabel>Postcode</FormLabel>
                          <FormControl>
                            <Input
                              value={currentAddress.postcode || ""}
                              onChange={(e) => {
                                const newAddresses = [...(form.watch("campusAddresses") || [])];
                                newAddresses[index] = { ...currentAddress, postcode: e.target.value };
                                form.setValue("campusAddresses", newAddresses);
                              }}
                              placeholder="2000"
                              data-testid={`input-campus-${index}-postcode`}
                            />
                          </FormControl>
                        </FormItem>

                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input
                              value={currentAddress.country || ""}
                              onChange={(e) => {
                                const newAddresses = [...(form.watch("campusAddresses") || [])];
                                newAddresses[index] = { ...currentAddress, country: e.target.value };
                                form.setValue("campusAddresses", newAddresses);
                              }}
                              placeholder="Australia"
                              data-testid={`input-campus-${index}-country`}
                            />
                          </FormControl>
                        </FormItem>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Please enter the number of campuses in the "Institution Details" section above to add campus addresses.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Small Description (AI-powered) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Short Description
                  </CardTitle>
                  <CardDescription>Concise overview (max 100 words) for listings</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateSmallDescription}
                  disabled={aiLoading === "smallDescription"}
                  data-testid="button-generate-small-description"
                >
                  {aiLoading === "smallDescription" ? (
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
                name="smallDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="A brief, impactful description of your institution..."
                        className="min-h-[100px]"
                        data-testid="textarea-small-description"
                      />
                    </FormControl>
                    <FormDescription>
                      This will appear in search results and institution cards (max 100 words recommended)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Full Description (AI-powered) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Full Description
                  </CardTitle>
                  <CardDescription>Comprehensive institutional overview</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateFullDescription}
                  disabled={aiLoading === "fullDescription"}
                  data-testid="button-generate-full-description"
                >
                  {aiLoading === "fullDescription" ? (
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
                name="fullDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Provide a detailed description covering history, programs, facilities, student life, and unique features..."
                        className="min-h-[200px]"
                        data-testid="textarea-full-description"
                      />
                    </FormControl>
                    <FormDescription>
                      This will appear on your institution's detail page (4-5 paragraphs recommended)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Legacy Description */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    General Description
                  </CardTitle>
                  <CardDescription>Tell students about your university</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateDescription}
                  disabled={aiLoading === "description"}
                  data-testid="button-generate-description"
                >
                  {aiLoading === "description" ? (
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
                        value={field.value || ""}
                        placeholder="Describe your university, its history, values, and what makes it unique..."
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

          {/* Institution Gallery (Upload or AI-powered) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-accent" />
                Institution Gallery
              </CardTitle>
              <CardDescription>Upload images or generate them with AI (up to 6 images, 600x400px each)</CardDescription>
            </CardHeader>
            <CardContent>
              <GalleryManager
                images={form.watch("institutionGallery") || []}
                onChange={(images) => form.setValue("institutionGallery", images)}
                maxImages={6}
              />
            </CardContent>
          </Card>

          {/* Top Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Featured Courses</CardTitle>
              <CardDescription>Highlight your top courses (comma-separated)</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="topCourses"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Master of Business Administration, Bachelor of Computer Science, etc."
                        value={field.value?.join(", ") || ""}
                        onChange={(e) => {
                          const courses = e.target.value
                            .split(",")
                            .map((c) => c.trim())
                            .filter((c) => c.length > 0);
                          field.onChange(courses.length > 0 ? courses : []);
                        }}
                        data-testid="input-top-courses"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How students can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} type="email" placeholder="admissions@university.edu" data-testid="input-contact-email" />
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
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="+61 2 1234 5678" data-testid="input-contact-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-profile">
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function UniversityProfile() {
  return (
    <UniversityLayout breadcrumbTitle="Institution Profile">
      <UniversityProfileContent />
    </UniversityLayout>
  );
}
