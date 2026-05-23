import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Loader2, ChevronsUpDown, Check, Search } from "lucide-react";
import { LeadNotes } from "@/components/lead-notes";
import { LeadActivityLog } from "@/components/lead-activity-log";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  }
  return headers;
}

interface CrmLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  leadStatus: 'not_contacted' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
  leadRating: 'cold' | 'warm' | 'hot';
  leadSource: string | null;
  leadCreationMethod: string | null;
  branch: string | null;
  branchId: string | null;
  nationality: string | null;
  country: string | null;
  city: string | null;
  courseId: string | null;
  universityId: string | null;
  courseName: string | null;
  interestedIn: string | null;
  productInterest: string | null;
  intakeMonth: string | null;
  intakeYear: string | null;
  notes: string | null;
  referrer: string | null;
  assignedTo: string | null;
  leadOwner: string | null;
  createdByUserId: string | null;
}

interface Course {
  id: string;
  title: string;
  institutionName?: string;
}

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", 
  "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia",
  "Egypt", "Ethiopia", "France", "Germany", "Ghana", "Greece", "Hong Kong",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan",
  "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Lebanon", "Malaysia", "Mexico",
  "Morocco", "Myanmar", "Nepal", "Netherlands", "New Zealand", "Nigeria",
  "Norway", "Oman", "Pakistan", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Saudi Arabia", "Singapore", "South Africa",
  "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Taiwan",
  "Thailand", "Turkey", "UAE", "Uganda", "Ukraine", "United Kingdom",
  "United States", "Vietnam", "Zimbabwe"
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AdminLeadForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const { toast } = useToast();
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<CrmLead>>({
    leadStatus: 'not_contacted',
    leadRating: 'cold',
    leadCreationMethod: 'manually',
  });

  // Get current user for auto-assignment
  const { data: currentUser } = useQuery<{ id: string; firstName: string; lastName: string }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: branchesData } = useQuery<{ id: string; name: string; code: string; city: string | null }[]>({
    queryKey: ["/api/admin/branches"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/branches", { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch branches");
      return response.json();
    },
  });

  const selectedBranchId = formData.branchId || undefined;

  const { data: admins } = useQuery<{ id: string; firstName: string; lastName: string; branchId: string | null }[]>({
    queryKey: ["/api/admin/users", selectedBranchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("userType", "admin");
      if (selectedBranchId) {
        params.append("branchId", selectedBranchId);
      }
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch admins");
      const data = await response.json();
      return data.users || [];
    },
  });

  // Fetch courses for searchable dropdown
  const { data: coursesData } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    queryFn: async () => {
      const response = await fetch("/api/courses");
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: existingLead, isLoading: isLoadingLead } = useQuery<CrmLead>({
    queryKey: ["/api/crm/leads", params.id],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/leads/${params.id}`, { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch lead");
      return response.json();
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingLead) {
      setFormData(existingLead);
    }
  }, [existingLead]);

  // Auto-assign new leads to current user
  useEffect(() => {
    if (!isEditing && currentUser && !formData.assignedTo) {
      setFormData(prev => ({
        ...prev,
        assignedTo: currentUser.id,
        createdByUserId: currentUser.id,
      }));
    }
  }, [isEditing, currentUser, formData.assignedTo]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CrmLead>) => {
      const response = await apiRequest("POST", "/api/crm/leads", data);
      const json = await response.json();
      if (!json || !json.id) throw new Error("Invalid response from server");
      return json as CrmLead;
    },
    onSuccess: (newLead: CrmLead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      toast({ title: "Lead created", description: "New lead has been added successfully" });
      navigate(`/admin/leads/${newLead.id}/edit`);
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to create lead";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CrmLead> }) => {
      return apiRequest("PATCH", `/api/crm/leads/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", variables.id, "activity-log"] });
      toast({ title: "Lead updated", description: "Lead has been updated successfully" });
      navigate("/admin?tab=crm-leads");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lead", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (isEditing && params.id) {
      updateMutation.mutate({ id: params.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingLead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin?tab=crm-leads")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              {isEditing ? "Edit Lead" : "Add New Lead"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update lead information" : "Enter the details for the new lead"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName || ""}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Enter first name"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName || ""}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Enter last name"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leadStatus">Lead Status</Label>
                    <Select
                      value={formData.leadStatus || "not_contacted"}
                      onValueChange={(value: any) => setFormData({ ...formData, leadStatus: value })}
                    >
                      <SelectTrigger id="leadStatus" data-testid="select-lead-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_contacted">Not Contacted</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="unqualified">Unqualified</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leadRating">Lead Rating</Label>
                    <Select
                      value={formData.leadRating || "cold"}
                      onValueChange={(value: any) => setFormData({ ...formData, leadRating: value })}
                    >
                      <SelectTrigger id="leadRating" data-testid="select-lead-rating">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cold">Cold</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="hot">Hot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leadSource">Lead Source</Label>
                    <Select
                      value={formData.leadSource || ""}
                      onValueChange={(value) => setFormData({ ...formData, leadSource: value })}
                    >
                      <SelectTrigger id="leadSource" data-testid="select-lead-source">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="walk_in">Walk In</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="education_fair">Education Fair</SelectItem>
                        <SelectItem value="recruitment_agent">Recruitment Agent</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referrer">Referrer</Label>
                    <Input
                      id="referrer"
                      value={formData.referrer || ""}
                      onChange={(e) => setFormData({ ...formData, referrer: e.target.value })}
                      placeholder="Who referred this lead?"
                      data-testid="input-referrer"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    data-testid="input-email"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile || ""}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="Enter mobile number"
                      data-testid="input-mobile"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Select
                      value={formData.nationality || ""}
                      onValueChange={(value) => setFormData({ ...formData, nationality: value })}
                    >
                      <SelectTrigger id="nationality" data-testid="select-nationality">
                        <SelectValue placeholder="Select nationality" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country of Residence</Label>
                    <Select
                      value={formData.country || ""}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger id="country" data-testid="select-country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city || ""}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Enter city"
                      data-testid="input-city"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interest & Course Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="interestedIn">Interested In</Label>
                  <Select
                    value={formData.interestedIn || ""}
                    onValueChange={(value) => setFormData({ ...formData, interestedIn: value })}
                  >
                    <SelectTrigger id="interestedIn" data-testid="select-interested-in">
                      <SelectValue placeholder="Select interest area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="higher_education">Higher Education</SelectItem>
                      <SelectItem value="vocational">Vocational Training</SelectItem>
                      <SelectItem value="english_language">English Language</SelectItem>
                      <SelectItem value="pathway_programs">Pathway Programs</SelectItem>
                      <SelectItem value="short_courses">Short Courses</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Course Name / Interest</Label>
                  <Popover open={courseSearchOpen} onOpenChange={setCourseSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={courseSearchOpen}
                        className="w-full justify-between"
                        data-testid="button-select-course"
                      >
                        {formData.courseId && coursesData ? (
                          <span className="truncate">
                            {coursesData.find(c => c.id === formData.courseId)?.title || formData.courseName || "Select a course"}
                          </span>
                        ) : formData.courseName ? (
                          <span className="truncate">{formData.courseName}</span>
                        ) : (
                          <span className="text-muted-foreground">Search and select a course...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search courses..." />
                        <CommandList>
                          <CommandEmpty>No courses found.</CommandEmpty>
                          <CommandGroup heading="Available Courses">
                            {formData.courseId && (
                              <CommandItem
                                value="clear"
                                onSelect={() => {
                                  setFormData({ ...formData, courseId: null, courseName: null });
                                  setCourseSearchOpen(false);
                                }}
                                className="cursor-pointer text-muted-foreground"
                              >
                                <span>Clear selection</span>
                              </CommandItem>
                            )}
                            {coursesData?.map((course) => (
                              <CommandItem
                                key={course.id}
                                value={`${course.title} ${course.institutionName || ''}`}
                                onSelect={() => {
                                  setFormData({ 
                                    ...formData, 
                                    courseId: course.id,
                                    courseName: course.title
                                  });
                                  setCourseSearchOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span>{course.title}</span>
                                  {course.institutionName && (
                                    <span className="text-xs text-muted-foreground">{course.institutionName}</span>
                                  )}
                                </div>
                                {formData.courseId === course.id && (
                                  <Check className="ml-auto h-4 w-4" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intakeMonth">Preferred Intake Month</Label>
                    <Select
                      value={formData.intakeMonth || ""}
                      onValueChange={(value) => setFormData({ ...formData, intakeMonth: value })}
                    >
                      <SelectTrigger id="intakeMonth" data-testid="select-intake-month">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month} value={month}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="intakeYear">Preferred Intake Year</Label>
                    <Select
                      value={formData.intakeYear || ""}
                      onValueChange={(value) => setFormData({ ...formData, intakeYear: value })}
                    >
                      <SelectTrigger id="intakeYear" data-testid="select-intake-year">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2027">2027</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment & Branch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch</Label>
                    <Select
                      value={formData.branchId || ""}
                      onValueChange={(value) => {
                        const selected = branchesData?.find(b => b.id === value);
                        setFormData({ 
                          ...formData, 
                          branchId: value || null,
                          branch: selected?.name || null,
                          assignedTo: undefined
                        });
                      }}
                    >
                      <SelectTrigger id="branch" data-testid="select-branch">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesData?.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}{branch.city ? ` (${branch.city})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assigned To</Label>
                    <Select
                      value={formData.assignedTo || ""}
                      onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                    >
                      <SelectTrigger id="assignedTo" data-testid="select-assigned-to">
                        <SelectValue placeholder="Select consultant" />
                      </SelectTrigger>
                      <SelectContent>
                        {admins?.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id}>
                            {admin.firstName} {admin.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.branchId && admins?.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No team members found for this branch
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {isEditing && params.id ? (
              <>
                <LeadNotes 
                  leadId={params.id} 
                  leadName={`${formData.firstName || ''} ${formData.lastName || ''}`}
                />
                <LeadActivityLog leadId={params.id} />
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add any additional notes about this lead..."
                      rows={4}
                      data-testid="textarea-notes"
                    />
                    <p className="text-sm text-muted-foreground">
                      Save the lead first to enable @mention and note history features.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate("/admin?tab=crm-leads")} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-save">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? "Update Lead" : "Create Lead"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
