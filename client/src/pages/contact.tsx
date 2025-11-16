import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Send,
  ChevronLeft,
  Globe,
  BookOpen,
  Users,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicHeader } from "@/components/public-header";
import { Footer } from "@/components/footer";

// Student contact form schema
const studentContactSchema = z.object({
  inquiryType: z.literal("student"),
  studentName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  country: z.string().min(2, "Please select your country"),
  courseInterest: z.string().optional(),
  studyLevel: z.string().min(1, "Please select your study level"),
  visaStatus: z.string().min(1, "Please select your visa status"),
  message: z.string().min(20, "Message must be at least 20 characters").max(5000, "Message must not exceed 5000 characters"),
});

// Institution contact form schema
const institutionContactSchema = z.object({
  inquiryType: z.literal("institution"),
  institutionName: z.string().min(2, "Institution name must be at least 2 characters"),
  contactPerson: z.string().min(2, "Contact person name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  website: z.string().url("Please enter a valid URL").or(z.literal("")),
  partnershipType: z.string().min(1, "Please select partnership type"),
  message: z.string().min(20, "Message must be at least 20 characters").max(5000, "Message must not exceed 5000 characters"),
});

type StudentContactData = z.infer<typeof studentContactSchema>;
type InstitutionContactData = z.infer<typeof institutionContactSchema>;
type ContactData = StudentContactData | InstitutionContactData;

export default function Contact() {
  const [contactType, setContactType] = useState<"student" | "institution" | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Student form
  const studentForm = useForm<StudentContactData>({
    resolver: zodResolver(studentContactSchema),
    defaultValues: {
      inquiryType: "student",
      studentName: "",
      email: "",
      phone: "",
      country: "",
      courseInterest: "",
      studyLevel: "",
      visaStatus: "",
      message: "",
    },
  });

  // Institution form
  const institutionForm = useForm<InstitutionContactData>({
    resolver: zodResolver(institutionContactSchema),
    defaultValues: {
      inquiryType: "institution",
      institutionName: "",
      contactPerson: "",
      email: "",
      phone: "",
      website: "",
      partnershipType: "",
      message: "",
    },
  });

  const submitContactMutation = useMutation({
    mutationFn: async (data: ContactData) => {
      const res = await apiRequest("POST", "/api/contact/inquiry", data);
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      if (contactType === "student") {
        studentForm.reset();
      } else {
        institutionForm.reset();
      }
      queryClient.invalidateQueries({ queryKey: ["/api/contact/inquiries"] });
    },
    onError: (error: any) => {
      console.error("Contact form submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit your inquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitStudent = (data: StudentContactData) => {
    submitContactMutation.mutate(data);
  };

  const onSubmitInstitution = (data: InstitutionContactData) => {
    submitContactMutation.mutate(data);
  };

  const resetForm = () => {
    setContactType(null);
    setIsSubmitted(false);
    studentForm.reset();
    institutionForm.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 sm:py-24">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-accent mb-6">
              Contact Us
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you're a student looking for your dream education or an institution seeking partnerships, we're here to help you succeed.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {!contactType ? (
            // Role Selection Cards
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
                I am a...
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Student Card */}
                <Card 
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary"
                  onClick={() => setContactType("student")}
                  data-testid="card-student-type"
                >
                  <CardHeader className="text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GraduationCap className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Student</CardTitle>
                    <CardDescription className="text-base">
                      Looking for courses, admissions, or general inquiries about studying abroad
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>Course recommendations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>Visa guidance</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Application support</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Institution Card */}
                <Card 
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-accent"
                  onClick={() => setContactType("institution")}
                  data-testid="card-institution-type"
                >
                  <CardHeader className="text-center">
                    <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-10 h-10 text-accent" />
                    </div>
                    <CardTitle className="text-2xl">Institution</CardTitle>
                    <CardDescription className="text-base">
                      Interested in partnerships, course listings, or institutional services
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="w-4 h-4" />
                      <span>Partnership opportunities</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>Platform registration</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Recruitment services</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            // Contact Forms
            <div className="max-w-3xl mx-auto">
              {/* Back Button */}
              {!isSubmitted && (
                <Button
                  variant="ghost"
                  onClick={resetForm}
                  className="mb-6"
                  data-testid="button-back"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to selection
                </Button>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    {contactType === "student" ? (
                      <>
                        <GraduationCap className="w-6 h-6 text-primary" />
                        Student Inquiry Form
                      </>
                    ) : (
                      <>
                        <Building2 className="w-6 h-6 text-accent" />
                        Institution Partnership Form
                      </>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {contactType === "student"
                      ? "Tell us about your educational goals and how we can help you achieve them."
                      : "Let us know about your institution and partnership interests."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSubmitted ? (
                    // Success Message
                    <div
                      className="flex flex-col items-center justify-center py-12 text-center"
                      data-testid="success-message"
                      role="status"
                      aria-live="polite"
                    >
                      <CheckCircle2 className="w-16 h-16 text-primary mb-4" aria-hidden="true" />
                      <h3 className="text-2xl font-semibold mb-2">Inquiry Sent Successfully!</h3>
                      <p className="text-muted-foreground mb-6">
                        Thank you for reaching out. We'll respond to your inquiry within 24-48 hours.
                      </p>
                      <div className="flex gap-4">
                        <Button
                          onClick={resetForm}
                          variant="outline"
                          data-testid="button-send-another"
                        >
                          Send Another Inquiry
                        </Button>
                        <Button
                          onClick={() => window.location.href = "/"}
                          data-testid="button-go-home"
                        >
                          Go to Homepage
                        </Button>
                      </div>
                    </div>
                  ) : contactType === "student" ? (
                    // Student Form
                    <Form {...studentForm}>
                      <form onSubmit={studentForm.handleSubmit(onSubmitStudent)} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={studentForm.control}
                            name="studentName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="John Doe"
                                    {...field}
                                    data-testid="input-student-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={studentForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="john@example.com"
                                    {...field}
                                    data-testid="input-student-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={studentForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="+1 234 567 8900"
                                    {...field}
                                    data-testid="input-student-phone"
                                  />
                                </FormControl>
                                <FormDescription>Include country code</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={studentForm.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country of Residence *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-student-country">
                                      <SelectValue placeholder="Select your country" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="India">India</SelectItem>
                                    <SelectItem value="China">China</SelectItem>
                                    <SelectItem value="Indonesia">Indonesia</SelectItem>
                                    <SelectItem value="Malaysia">Malaysia</SelectItem>
                                    <SelectItem value="Nepal">Nepal</SelectItem>
                                    <SelectItem value="Pakistan">Pakistan</SelectItem>
                                    <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                                    <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                                    <SelectItem value="Vietnam">Vietnam</SelectItem>
                                    <SelectItem value="Thailand">Thailand</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={studentForm.control}
                            name="studyLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Study Level *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-study-level">
                                      <SelectValue placeholder="Select study level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Bachelor">Bachelor's Degree</SelectItem>
                                    <SelectItem value="Master">Master's Degree</SelectItem>
                                    <SelectItem value="PhD">PhD / Doctorate</SelectItem>
                                    <SelectItem value="Diploma">Diploma / Certificate</SelectItem>
                                    <SelectItem value="Foundation">Foundation / Pathway</SelectItem>
                                    <SelectItem value="Language">Language Course</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={studentForm.control}
                            name="visaStatus"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Visa Status *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-visa-status">
                                      <SelectValue placeholder="Select visa status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Need visa">Need student visa</SelectItem>
                                    <SelectItem value="Have visa">Already have visa</SelectItem>
                                    <SelectItem value="PR">Permanent Resident</SelectItem>
                                    <SelectItem value="Citizen">Australian Citizen</SelectItem>
                                    <SelectItem value="Not sure">Not sure</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={studentForm.control}
                          name="courseInterest"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Course/Field of Interest</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Computer Science, Business Management, Engineering"
                                  {...field}
                                  data-testid="input-course-interest"
                                />
                              </FormControl>
                              <FormDescription>
                                Let us know what subject area interests you
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={studentForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message *</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us about your educational goals, preferred universities, budget considerations, or any questions you have..."
                                  className="min-h-[150px]"
                                  {...field}
                                  data-testid="textarea-student-message"
                                />
                              </FormControl>
                              <FormDescription>
                                Minimum 20 characters. Be as detailed as possible so we can assist you better.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full sm:w-auto"
                          disabled={submitContactMutation.isPending}
                          data-testid="button-submit-student"
                        >
                          {submitContactMutation.isPending ? (
                            "Sending..."
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Inquiry
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  ) : (
                    // Institution Form
                    <Form {...institutionForm}>
                      <form onSubmit={institutionForm.handleSubmit(onSubmitInstitution)} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={institutionForm.control}
                            name="institutionName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Institution Name *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="University of Example"
                                    {...field}
                                    data-testid="input-institution-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={institutionForm.control}
                            name="contactPerson"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Person *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Jane Smith"
                                    {...field}
                                    data-testid="input-contact-person"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={institutionForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="contact@university.edu"
                                    {...field}
                                    data-testid="input-institution-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={institutionForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="+61 2 1234 5678"
                                    {...field}
                                    data-testid="input-institution-phone"
                                  />
                                </FormControl>
                                <FormDescription>Include country code</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={institutionForm.control}
                            name="website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Website</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="https://www.university.edu"
                                    {...field}
                                    data-testid="input-website"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={institutionForm.control}
                            name="partnershipType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Partnership Type *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-partnership-type">
                                      <SelectValue placeholder="Select partnership type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Recruitment">Student Recruitment</SelectItem>
                                    <SelectItem value="Academic">Academic Partnership</SelectItem>
                                    <SelectItem value="Research">Research Collaboration</SelectItem>
                                    <SelectItem value="Exchange">Student Exchange Program</SelectItem>
                                    <SelectItem value="Marketing">Marketing Partnership</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={institutionForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message *</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us about your institution, partnership interests, and how we can collaborate..."
                                  className="min-h-[150px]"
                                  {...field}
                                  data-testid="textarea-institution-message"
                                />
                              </FormControl>
                              <FormDescription>
                                Minimum 20 characters. Please provide details about your partnership goals.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full sm:w-auto"
                          disabled={submitContactMutation.isPending}
                          data-testid="button-submit-institution"
                        >
                          {submitContactMutation.isPending ? (
                            "Sending..."
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Partnership Inquiry
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Contact Information */}
          {!contactType && (
            <div className="mt-16 max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
                Other Ways to Reach Us
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Email</h3>
                    <p className="text-sm text-muted-foreground">info@anzglobal.education</p>
                    <p className="text-sm text-muted-foreground">support@anzglobal.education</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 text-center">
                    <Phone className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Phone</h3>
                    <p className="text-sm text-muted-foreground">+61 2 9876 5432</p>
                    <p className="text-sm text-muted-foreground">Mon-Fri: 9AM-6PM AEDT</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 text-center">
                    <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Office</h3>
                    <p className="text-sm text-muted-foreground">123 Education Street</p>
                    <p className="text-sm text-muted-foreground">Sydney, NSW 2000</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}