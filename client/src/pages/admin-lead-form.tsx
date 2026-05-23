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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Loader2, Plus, X, CheckCircle2 } from "lucide-react";
import { LeadNotes } from "@/components/lead-notes";
import { LeadActivityLog } from "@/components/lead-activity-log";
import { getCountryCode, getFlagUrl } from "@/lib/country-flags";

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

interface Institution {
  id: string;
  name: string;
  country: string | null;
  logo: string | null;
}

interface CourseOption {
  id: string;
  title: string;
  level: string | null;
  duration: string | null;
}

interface CoursePreference {
  country: string;
  universityId: string;
  courseId: string;
  courseName: string;
}

const EMPTY_PREF: CoursePreference = { country: "", universityId: "", courseId: "", courseName: "" };

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

// ─── Single preference slot ────────────────────────────────────────────────

interface PreferenceSlotProps {
  rank: number;
  pref: CoursePreference;
  institutions: Institution[];
  onChange: (updated: CoursePreference) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function PreferenceSlot({ rank, pref, institutions, onChange, onRemove, canRemove }: PreferenceSlotProps) {
  const countryOptions = Array.from(
    new Set(institutions.map(i => i.country).filter(Boolean))
  ).sort() as string[];

  const filteredInstitutions = institutions.filter(i => i.country === pref.country);

  const { data: coursesForSlot, isLoading: loadingCourses } = useQuery<CourseOption[]>({
    queryKey: ["/api/courses/by-institution", pref.universityId],
    queryFn: async () => {
      if (!pref.universityId) return [];
      const response = await fetch(`/api/courses?universityId=${pref.universityId}&publishStatus=published&limit=200`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : (data.courses ?? []);
    },
    enabled: !!pref.universityId,
  });

  const [courseSearch, setCourseSearch] = useState("");
  const filteredCourses = (coursesForSlot ?? []).filter(c =>
    !courseSearch || c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <div className="border rounded-md p-4 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Preference {rank}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            data-testid={`button-remove-preference-${rank}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Step 1 — Country */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Country</Label>
        <Select
          value={pref.country}
          onValueChange={(v) => onChange({ ...EMPTY_PREF, country: v })}
        >
          <SelectTrigger data-testid={`select-pref-country-${rank}`}>
            <SelectValue placeholder="Select a country">
              {pref.country && (() => {
                const code = getCountryCode(pref.country);
                return (
                  <div className="flex items-center gap-2">
                    {code && (
                      <img src={getFlagUrl(code)} className="w-5 h-3.5 object-cover rounded-sm shrink-0" alt={pref.country} />
                    )}
                    <span>{pref.country}</span>
                  </div>
                );
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countryOptions.map((country) => {
              const code = getCountryCode(country);
              return (
                <SelectItem key={country} value={country} data-testid={`pref-country-option-${country}`}>
                  <div className="flex items-center gap-2">
                    {code && (
                      <img src={getFlagUrl(code)} className="w-5 h-3.5 object-cover rounded-sm shrink-0" alt={country} />
                    )}
                    <span>{country}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2 — Institution */}
      {pref.country && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Institution</Label>
          <Select
            value={pref.universityId}
            onValueChange={(v) => onChange({ ...pref, universityId: v, courseId: "", courseName: "" })}
          >
            <SelectTrigger data-testid={`select-pref-institution-${rank}`}>
              <SelectValue placeholder="Select an institution">
                {pref.universityId && (() => {
                  const inst = filteredInstitutions.find(i => i.id === pref.universityId);
                  if (!inst) return null;
                  return (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={inst.logo || undefined} />
                        <AvatarFallback className="text-[9px]">{inst.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{inst.name}</span>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredInstitutions.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No institutions in {pref.country}</div>
              )}
              {filteredInstitutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id} data-testid={`pref-institution-option-${inst.id}`}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={inst.logo || undefined} />
                      <AvatarFallback className="text-[9px] bg-muted">{inst.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{inst.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step 3 — Course */}
      {pref.universityId && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Course</Label>
          <Input
            placeholder="Search courses..."
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            className="h-8 text-sm"
            data-testid={`input-pref-course-search-${rank}`}
          />
          {loadingCourses && (
            <p className="text-xs text-muted-foreground py-1">Loading courses...</p>
          )}
          {!loadingCourses && filteredCourses.length > 0 && (
            <ScrollArea className="h-44 border rounded-md">
              <div className="p-1.5 space-y-0.5">
                {filteredCourses.map((course) => {
                  const isSelected = pref.courseId === course.id;
                  return (
                    <div
                      key={course.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover-elevate ${
                        isSelected ? "bg-primary/10 border border-primary/30" : "border border-transparent"
                      }`}
                      onClick={() => onChange({ ...pref, courseId: course.id, courseName: course.title })}
                      data-testid={`pref-course-option-${rank}-${course.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{course.title}</p>
                        {course.level && (
                          <Badge variant="outline" className="text-[10px] px-1.5 mt-0.5 no-default-active-elevate">{course.level}</Badge>
                        )}
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          {!loadingCourses && filteredCourses.length === 0 && !loadingCourses && (
            <p className="text-xs text-muted-foreground py-1">No published courses found.</p>
          )}
          {pref.courseName && (
            <div className="flex items-center gap-2 pt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{pref.courseName}</span>
              <button
                type="button"
                className="ml-auto text-xs text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => onChange({ ...pref, courseId: "", courseName: "" })}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────

export default function AdminLeadForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<CrmLead>>({
    leadStatus: 'not_contacted',
    leadRating: 'cold',
    leadCreationMethod: 'manually',
  });

  // Course preferences state — always 1 visible, up to 3 total
  const [preferences, setPreferences] = useState<CoursePreference[]>([{ ...EMPTY_PREF }]);
  const [visiblePrefCount, setVisiblePrefCount] = useState(1);

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

  const { data: admins } = useQuery<{ id: string; firstName: string; lastName: string; branchId: string | null; profileImageUrl: string | null }[]>({
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

  // Institutions for country cascade (includePrivate so all admin-visible institutions appear)
  const { data: institutionsData } = useQuery<Institution[]>({
    queryKey: ["/api/institutions", "all-for-prefs"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/institutions?limit=200&includePrivate=true", { credentials: 'include', headers });
      if (!response.ok) return [];
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.institutions ?? data.universities ?? []);
      return list.map((i: any) => ({ id: i.id, name: i.name, country: i.country ?? null, logo: i.logo ?? null }));
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

  // Load saved preferences when editing
  const { data: savedPreferences } = useQuery<{ preferenceRank: number; country: string | null; universityId: string | null; courseId: string | null; courseName: string | null }[]>({
    queryKey: ["/api/crm/leads", params.id, "preferences"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/leads/${params.id}/preferences`, { credentials: 'include', headers });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isEditing && !!params.id,
  });

  useEffect(() => {
    if (existingLead) {
      setFormData(existingLead);
    }
  }, [existingLead]);

  // Populate preference slots from saved data
  useEffect(() => {
    if (savedPreferences && savedPreferences.length > 0) {
      const filled: CoursePreference[] = [{ ...EMPTY_PREF }, { ...EMPTY_PREF }, { ...EMPTY_PREF }];
      for (const sp of savedPreferences) {
        const idx = (sp.preferenceRank ?? 1) - 1;
        if (idx >= 0 && idx < 3) {
          filled[idx] = {
            country: sp.country ?? "",
            universityId: sp.universityId ?? "",
            courseId: sp.courseId ?? "",
            courseName: sp.courseName ?? "",
          };
        }
      }
      const maxRank = Math.max(...savedPreferences.map(p => p.preferenceRank ?? 1));
      setPreferences(filled);
      setVisiblePrefCount(Math.max(1, maxRank));
    }
  }, [savedPreferences]);

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

  const savePreferences = async (leadId: string) => {
    const validPrefs = preferences
      .slice(0, visiblePrefCount)
      .map((p, i) => ({ rank: i + 1, country: p.country || null, universityId: p.universityId || null, courseId: p.courseId || null, courseName: p.courseName || null }))
      .filter(p => p.country || p.universityId || p.courseId);

    try {
      await apiRequest("PUT", `/api/crm/leads/${leadId}/preferences`, validPrefs);
    } catch (err) {
      console.error("Failed to save preferences", err);
      toast({ title: "Warning", description: "Lead saved but course preferences could not be saved. Please try again.", variant: "destructive" });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CrmLead>) => {
      const response = await apiRequest("POST", "/api/crm/leads", data);
      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server returned an unexpected response. Please refresh the page and try again.");
      }
      const json = await response.json();
      if (!json || !json.id) throw new Error("Invalid response from server");
      return json as CrmLead;
    },
    onSuccess: async (newLead: CrmLead) => {
      await savePreferences(newLead.id);
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
    onSuccess: async (_data, variables) => {
      await savePreferences(variables.id);
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", variables.id, "activity-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", variables.id, "preferences"] });
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

  const updatePref = (idx: number, updated: CoursePreference) => {
    setPreferences(prev => {
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  };

  const removePref = (idx: number) => {
    setPreferences(prev => {
      // Remove the target slot and compact remaining ones upward
      const next = prev.filter((_, i) => i !== idx);
      while (next.length < 3) next.push({ ...EMPTY_PREF });
      return next;
    });
    setVisiblePrefCount(prev => Math.max(1, prev - 1));
  };

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

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Course Preferences</Label>
                    <span className="text-xs text-muted-foreground">Up to 3 preferences</span>
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: visiblePrefCount }).map((_, i) => (
                      <PreferenceSlot
                        key={i}
                        rank={i + 1}
                        pref={preferences[i] ?? { ...EMPTY_PREF }}
                        institutions={institutionsData ?? []}
                        onChange={(updated) => updatePref(i, updated)}
                        onRemove={() => removePref(i)}
                        canRemove={visiblePrefCount > 1}
                      />
                    ))}
                  </div>

                  {visiblePrefCount < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setVisiblePrefCount(prev => Math.min(3, prev + 1));
                        setPreferences(prev => {
                          const next = [...prev];
                          while (next.length < visiblePrefCount + 1) next.push({ ...EMPTY_PREF });
                          return next;
                        });
                      }}
                      data-testid="button-add-preference"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Preference
                    </Button>
                  )}
                </div>

                <Separator />

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
                        <SelectValue placeholder="Select consultant">
                          {formData.assignedTo && (() => {
                            const selected = admins?.find(a => a.id === formData.assignedTo);
                            if (!selected) return null;
                            return (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={selected.profileImageUrl || undefined} />
                                  <AvatarFallback className="text-[9px]">
                                    {selected.firstName?.[0]}{selected.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{selected.firstName} {selected.lastName}</span>
                              </div>
                            );
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {admins?.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id} data-testid={`assigned-to-option-${admin.id}`}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={admin.profileImageUrl || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {admin.firstName?.[0]}{admin.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{admin.firstName} {admin.lastName}</span>
                            </div>
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
