import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Loader2, Building, Plus, X, Briefcase, Camera, User, Link2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { COUNTRIES, NATIONALITIES_SORTED, getFlagUrl, getCountryByName, getCountryByNationality } from "@/lib/countries";
import { getCountryCode } from "@/lib/country-flags";
import { PhoneInput } from "@/components/ui/phone-input";
import { AddressAutocomplete, AddressComponents } from "@/components/ui/address-autocomplete";
import { LeadNotes } from "@/components/lead-notes";
import { LeadActivityLog } from "@/components/lead-activity-log";

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

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactType = 'clients' | 'external' | 'others' | 'partner' | 'providers_rep';
type ClientStatus = 'lead' | 'applicant' | 'enrolled' | 'completed' | 'inactive';
type EntrySource = 'website' | 'consultant' | 'sub_agent' | 'affiliate' | 'import' | 'referral' | 'facebook_ads' | 'walk_in' | 'other';
type LeadRating = 'cold' | 'warm' | 'hot';

interface CrmContact {
  id: string;
  photo: string | null;
  contactType: ContactType;
  clientStatus: ClientStatus | null;
  entrySource: EntrySource | null;
  leadRating: LeadRating | null;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  gender: string | null;
  email: string;
  mobile: string | null;
  phone: string | null;
  whatsapp: string | null;
  nationality: string | null;
  country: string | null;
  unitNo: string | null;
  street: string | null;
  suburb: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  emergencyContactName: string | null;
  emergencyContactMobile: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactAddress: string | null;
  notes: string | null;
  contactOwner: string | null;
  assignedTo: string | null;
  sourceLeadId: string | null;
  branchId: string | null;
  subAgentAccountId: string | null;
  referenceSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  courseName: string | null;
  courseUrl: string | null;
  interestedIn: string | null;
  programDiscipline: string | null;
  programType: string | null;
  whereToStudy: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface InstitutionLink {
  id: number;
  institutionId: number;
  contactId: string;
  contactRole: string;
  roleTitle: string | null;
  department: string | null;
  isPrimary: boolean;
  notes: string | null;
  institution?: { id: number; name: string; country?: string };
}

interface Institution {
  id: number;
  name: string;
  country?: string;
}

// Used only for the course-preference cascade (string IDs from /api/institutions)
interface PrefInstitution {
  id: string;
  name: string;
  country: string | null;
  logo: string | null;
}

interface CoursePreference {
  country: string;
  universityId: string;
  courseId: string;
  courseName: string;
}

interface CourseOption {
  id: string;
  title: string;
  level: string | null;
}

const EMPTY_PREF: CoursePreference = { country: "", universityId: "", courseId: "", courseName: "" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helper flags ─────────────────────────────────────────────────────────────

const roleNeedsInstitution = (contactType: string | null | undefined): boolean =>
  ['providers_rep', 'partner', 'external'].includes(contactType || '');

// ─── Options ─────────────────────────────────────────────────────────────────

const clientStatusOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'applicant', label: 'Applicant' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'completed', label: 'Completed' },
  { value: 'inactive', label: 'Inactive' },
];

const entrySourceOptions = [
  { value: 'website', label: 'Website' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'sub_agent', label: 'Sub-Agent' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'import', label: 'Import' },
  { value: 'referral', label: 'Referral' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'walk_in', label: 'Walk-In' },
  { value: 'other', label: 'Other' },
];

const leadRatingOptions = [
  { value: 'cold', label: 'Cold' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
];

const interestedInOptions = [
  { value: 'higher_education', label: 'Higher Education' },
  { value: 'vocational', label: 'Vocational Training' },
  { value: 'english_language', label: 'English Language' },
  { value: 'pathway_programs', label: 'Pathway Programs' },
  { value: 'short_courses', label: 'Short Courses' },
  { value: 'other', label: 'Other' },
];

// ─── PreferenceSlot component ─────────────────────────────────────────────────

interface PreferenceSlotProps {
  rank: number;
  pref: CoursePreference;
  institutions: PrefInstitution[];
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
      try {
        const response = await apiRequest("GET", `/api/courses?universityId=${pref.universityId}&publishStatus=published&limit=200`);
        const data = await response.json();
        return Array.isArray(data) ? data : (data.courses ?? []);
      } catch {
        return [];
      }
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
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} data-testid={`button-remove-preference-${rank}`}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Country</Label>
        <Select value={pref.country} onValueChange={(v) => onChange({ ...EMPTY_PREF, country: v })}>
          <SelectTrigger data-testid={`select-pref-country-${rank}`}>
            <SelectValue placeholder="Select a country">
              {pref.country && (() => {
                const code = getCountryCode(pref.country);
                return (
                  <div className="flex items-center gap-2">
                    {code && <img src={getFlagUrl(code)} className="w-5 h-3.5 object-cover rounded-sm shrink-0" alt={pref.country} />}
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
                    {code && <img src={getFlagUrl(code)} className="w-5 h-3.5 object-cover rounded-sm shrink-0" alt={country} />}
                    <span>{country}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

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
          {loadingCourses && <p className="text-xs text-muted-foreground py-1">Loading courses...</p>}
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
                      {isSelected
                        ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      }
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          {!loadingCourses && filteredCourses.length === 0 && (
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

// ─── Sub-Agent Account Picker ─────────────────────────────────────────────────

interface AccountOption { id: string; name: string; }

function SubAgentPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { data: accounts = [] } = useQuery<AccountOption[]>({
    queryKey: ["/api/admin/accounts/by-type/sub_agent"],
  });
  return (
    <div className="space-y-2">
      <Label>Referring Sub Agent</Label>
      <Select
        value={value || ""}
        onValueChange={(v) => onChange(v || null)}
      >
        <SelectTrigger data-testid="select-sub-agent-account">
          <SelectValue placeholder="Select sub agent…" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function AdminContactForm() {
  const [location, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const isLeadMode = location.startsWith('/admin/leads');
  const { toast } = useToast();

  const backPath = isLeadMode ? "/admin?tab=crm-leads" : "/admin?tab=crm-contacts";

  const [formData, setFormData] = useState<Partial<CrmContact>>({
    contactType: isLeadMode ? 'clients' : 'clients',
    entrySource: 'consultant',
    ...(isLeadMode ? { clientStatus: 'lead', leadRating: 'cold' } : {}),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Course preferences state (used in lead mode)
  const [preferences, setPreferences] = useState<CoursePreference[]>([{ ...EMPTY_PREF }]);
  const [visiblePrefCount, setVisiblePrefCount] = useState(1);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: currentUser } = useQuery<{ id: string; firstName: string; lastName: string }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: existingContact, isLoading: contactLoading } = useQuery<CrmContact>({
    queryKey: ["/api/crm/contacts", params.id],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/contacts/${params.id}`, { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch contact");
      return response.json();
    },
    enabled: isEditing,
  });

  const { data: institutionLinks = [] } = useQuery<InstitutionLink[]>({
    queryKey: ["/api/crm/contacts", params.id, "institutions"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/contacts/${params.id}/institutions`, { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch institution links");
      return response.json();
    },
    enabled: isEditing && !isLeadMode && roleNeedsInstitution(formData.contactType),
  });

  const { data: allInstitutions = [] } = useQuery<Institution[]>({
    queryKey: ["/api/admin/institutions"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/institutions", { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch institutions");
      return response.json();
    },
    enabled: isEditing && !isLeadMode && roleNeedsInstitution(formData.contactType),
  });

  // Institutions for the course preference cascade (lead mode)
  const { data: prefInstitutions = [] } = useQuery<PrefInstitution[]>({
    queryKey: ["/api/institutions", "all-for-prefs"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/institutions?limit=200&includePrivate=true", { credentials: 'include', headers });
      if (!response.ok) return [];
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.institutions ?? data.universities ?? []);
      return list.map((i: any) => ({ id: i.id, name: i.name, country: i.country ?? null, logo: i.logo ?? null }));
    },
    enabled: isLeadMode,
  });

  // Saved preferences (lead mode edit)
  const { data: savedPreferences } = useQuery<{ preferenceRank: number; country: string | null; universityId: string | null; courseId: string | null; courseName: string | null }[]>({
    queryKey: ["/api/crm/leads", params.id, "preferences"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/leads/${params.id}/preferences`, { credentials: 'include', headers });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isLeadMode && isEditing && !!params.id,
  });

  const { data: branches = [] } = useQuery<{ id: string; name: string; code: string; city?: string; country?: string }[]>({
    queryKey: ["/api/admin/branches"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/branches", { credentials: 'include', headers });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: teamMembers = [] } = useQuery<{ id: string; firstName: string; lastName: string; userType: string; profileImageUrl?: string | null }[]>({
    queryKey: ["/api/crm/team-members"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/crm/team-members", { credentials: 'include', headers });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: linkedUser } = useQuery<{ id: string; firstName: string; lastName: string; userType: string; photo?: string } | null>({
    queryKey: ["/api/crm/contacts/linked-user", formData.email],
    queryFn: async () => {
      if (!formData.email) return null;
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/contacts/linked-user?email=${encodeURIComponent(formData.email)}`, { credentials: 'include', headers });
      if (!response.ok) return null;
      const data = await response.json();
      return data.user || null;
    },
    enabled: !!formData.email,
  });

  // Institution link mutations (contact mode only)
  const [showAddInstitution, setShowAddInstitution] = useState(false);
  const [newInstitutionId, setNewInstitutionId] = useState<number | null>(null);
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const addInstitutionLinkMutation = useMutation({
    mutationFn: async (data: { institutionId: number; roleTitle: string | null; department: string | null }) => {
      return apiRequest("POST", `/api/crm/contacts/${params.id}/institutions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts", params.id, "institutions"] });
      toast({ title: "Success", description: "Institution link added" });
      setShowAddInstitution(false);
      setNewInstitutionId(null);
      setNewRoleTitle("");
      setNewDepartment("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add institution link", variant: "destructive" });
    },
  });

  const removeInstitutionLinkMutation = useMutation({
    mutationFn: async (institutionId: number) => {
      return apiRequest("DELETE", `/api/crm/contacts/${params.id}/institutions/${institutionId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts", params.id, "institutions"] });
      toast({ title: "Success", description: "Institution link removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove institution link", variant: "destructive" });
    },
  });

  const handleAddInstitutionLink = () => {
    if (!newInstitutionId) {
      toast({ title: "Error", description: "Please select an institution", variant: "destructive" });
      return;
    }
    addInstitutionLinkMutation.mutate({ institutionId: newInstitutionId, roleTitle: newRoleTitle || null, department: newDepartment || null });
  };

  const availableInstitutions = allInstitutions.filter(
    inst => !institutionLinks.some(link => link.institutionId === inst.id)
  );

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (existingContact) {
      setFormData(existingContact);
    }
  }, [existingContact]);

  // Populate preference slots from saved data (lead mode)
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

  // Auto-assign new leads to current user (lead mode)
  useEffect(() => {
    if (isLeadMode && !isEditing && currentUser) {
      setFormData(prev => ({
        ...prev,
        assignedTo: prev.assignedTo || currentUser.id,
        contactOwner: prev.contactOwner || currentUser.id,
      }));
    }
  }, [isLeadMode, isEditing, currentUser]);

  useEffect(() => {
    if (!isLeadMode && !isEditing && currentUser && !formData.contactOwner) {
      setFormData(prev => ({ ...prev, contactOwner: currentUser.id }));
    }
  }, [currentUser, isEditing, isLeadMode, formData.contactOwner]);

  // ── Preferences helpers ────────────────────────────────────────────────────

  const savePreferences = async (contactId: string) => {
    const validPrefs = preferences
      .slice(0, visiblePrefCount)
      .map((p, i) => ({ rank: i + 1, country: p.country || null, universityId: p.universityId || null, courseId: p.courseId || null, courseName: p.courseName || null }))
      .filter(p => p.country || p.universityId || p.courseId);
    try {
      await apiRequest("PUT", `/api/crm/leads/${contactId}/preferences`, validPrefs);
    } catch (err) {
      console.error("Failed to save preferences", err);
      toast({ title: "Warning", description: "Saved but course preferences could not be saved. Try again.", variant: "destructive" });
    }
  };

  const updatePref = (idx: number, updated: CoursePreference) => {
    setPreferences(prev => { const next = [...prev]; next[idx] = updated; return next; });
  };

  const removePref = (idx: number) => {
    setPreferences(prev => {
      const next = prev.filter((_, i) => i !== idx);
      while (next.length < 3) next.push({ ...EMPTY_PREF });
      return next;
    });
    setVisiblePrefCount(prev => Math.max(1, prev - 1));
  };

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CrmContact>) => {
      const response = await apiRequest("POST", "/api/crm/contacts", data);
      return response.json();
    },
    onSuccess: async (data: { id?: string | number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      const newId = String(data?.id ?? "");
      if (isLeadMode && newId) {
        await savePreferences(newId);
        toast({ title: "Lead created", description: "New lead has been added successfully" });
        navigate(`/admin/leads/${newId}/edit`);
      } else {
        toast({ title: "Success", description: "Contact created successfully" });
        navigate(newId ? `/admin?tab=crm-contacts&contactId=${newId}` : "/admin?tab=crm-contacts");
      }
    },
    onError: (error: any) => {
      const msg: string = error.message || "";
      try {
        const jsonStart = msg.indexOf("{");
        if (jsonStart !== -1 && msg.startsWith("409:")) {
          const parsed = JSON.parse(msg.slice(jsonStart));
          if (parsed.existingContactId) {
            const existingId = parsed.existingContactId;
            toast({
              title: isLeadMode ? "Lead already exists" : "Contact already exists",
              description: parsed.message || "A record with this email already exists.",
              variant: "destructive",
              action: (
                <ToastAction
                  altText="View"
                  onClick={() => navigate(isLeadMode ? `/admin/leads/${existingId}/edit` : `/admin/contacts/${existingId}/edit`)}
                >
                  View
                </ToastAction>
              ),
            });
            return;
          }
        }
      } catch {}
      toast({ title: "Error", description: msg || "Failed to create record", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CrmContact>) => {
      return apiRequest("PATCH", `/api/crm/contacts/${params.id}`, data);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      if (isLeadMode && params.id) {
        await savePreferences(params.id);
        queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", params.id, "preferences"] });
        queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", params.id, "activity-log"] });
        toast({ title: "Lead updated", description: "Lead has been updated successfully" });
        navigate("/admin?tab=crm-leads");
      } else {
        toast({ title: "Success", description: "Contact updated successfully" });
        navigate(`/admin?tab=crm-contacts&contactId=${params.id}`);
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update record", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({ title: "Error", description: "Please fill in First Name, Last Name, and Email", variant: "destructive" });
      return;
    }
    if (!isLeadMode && !formData.contactType) {
      toast({ title: "Error", description: "Please select a Contact Type", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      ...(isLeadMode ? { contactType: 'clients' as ContactType, clientStatus: 'lead' as ClientStatus } : {}),
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // ── Photo upload ───────────────────────────────────────────────────────────

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }
    if (!isEditing || !params.id) {
      toast({ title: "Info", description: "Save the contact first, then upload a photo", variant: "default" });
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('photo', file);
      const headers = await getAuthHeaders();
      delete (headers as any)['Content-Type'];
      const response = await fetch(`/api/crm/contacts/${params.id}/upload-photo`, {
        method: 'POST', headers, credentials: 'include', body: formDataUpload,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }
      const { photoPath } = await response.json();
      setFormData(prev => ({ ...prev, photo: photoPath }));
      toast({ title: "Success", description: "Photo uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getInitials = () => {
    const first = formData.firstName?.[0] || '';
    const last = formData.lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'platform_admin': return 'Platform Admin';
      case 'admin': return 'Admin';
      case 'student': return 'Student';
      case 'institution_admin': return 'Institution Admin';
      default: return userType;
    }
  };

  if (isEditing && contactLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // ── Tab count ──────────────────────────────────────────────────────────────
  const showRoleTab = !isLeadMode && isEditing && roleNeedsInstitution(formData.contactType);
  const tabCount = isLeadMode ? 4 : (showRoleTab ? 5 : 4);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-form-title">
              {isLeadMode
                ? (isEditing ? "Edit Lead" : "Add New Lead")
                : (isEditing ? "Edit Contact" : "Create New Contact")}
            </h1>
            <p className="text-muted-foreground">
              {isLeadMode
                ? (isEditing ? "Update lead information" : "Enter the details for the new lead")
                : (isEditing ? "Update contact information" : "Add a new contact to your CRM")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={() => navigate(backPath)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} data-testid="button-save-contact">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />{isLeadMode ? (isEditing ? "Update Lead" : "Save Lead") : "Save Contact"}</>
            )}
          </Button>
        </div>
      </div>

      {/* Contact Type banner — hidden in lead mode (locked to clients/lead) */}
      {!isLeadMode && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-2 mb-4" data-testid="section-contact-type">
          <div>
            <p className="text-sm font-semibold">Contact Type <span className="text-destructive">*</span></p>
            <p className="text-xs text-muted-foreground">Sets the required fields and workflow for this contact</p>
          </div>
          <Select
            value={formData.contactType || "clients"}
            onValueChange={(value: ContactType) => setFormData({
              ...formData,
              contactType: value,
              ...(value !== 'clients' ? { clientStatus: null, leadRating: null } : {}),
            })}
          >
            <SelectTrigger id="contactType" data-testid="select-contact-type" className="bg-background">
              <SelectValue placeholder="Select contact type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clients">Clients (Students)</SelectItem>
              <SelectItem value="external">External (Referrals)</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="providers_rep">Providers Rep</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className={`grid w-full mb-6 grid-cols-${tabCount}`}>
          <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
          <TabsTrigger value="crm" data-testid="tab-crm">{isLeadMode ? "Lead Details" : "CRM Details"}</TabsTrigger>
          <TabsTrigger value="address" data-testid="tab-address">Address</TabsTrigger>
          <TabsTrigger value="emergency" data-testid="tab-emergency">Emergency</TabsTrigger>
          {showRoleTab && (
            <TabsTrigger value="role-details" data-testid="tab-role-details">Role Details</TabsTrigger>
          )}
        </TabsList>

        {/* ── Basic Info Tab ─────────────────────────────────────────────── */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile picture */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-muted/30 rounded-lg">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-2 border-border">
                    <AvatarImage src={formData.photo || linkedUser?.photo || undefined} alt="Profile" />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials() || <User className="h-10 w-10" />}
                    </AvatarFallback>
                  </Avatar>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" data-testid="input-photo-upload" />
                  <Button
                    type="button" size="icon" variant="secondary"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    data-testid="button-upload-photo"
                  >
                    {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Profile Photo</p>
                    <p className="text-xs text-muted-foreground">Click the camera icon to upload a photo (max 5MB)</p>
                  </div>
                  {linkedUser && (
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                      <Link2 className="h-4 w-4 text-primary" />
                      <span className="text-sm">Linked to platform user:</span>
                      <Badge variant="secondary" data-testid="badge-linked-user-type">{getUserTypeBadge(linkedUser.userType)}</Badge>
                      <span className="text-sm font-medium" data-testid="text-linked-user-name">{linkedUser.firstName} {linkedUser.lastName}</span>
                    </div>
                  )}
                  {formData.photo && (
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, photo: null }))}
                      className="text-destructive hover:text-destructive"
                      data-testid="button-remove-photo"
                    >
                      <X className="h-4 w-4 mr-1" />Remove Photo
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" value={formData.firstName || ""} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Enter first name" data-testid="input-first-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" value={formData.lastName || ""} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Enter last name" data-testid="input-last-name" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferredName">Preferred Name</Label>
                  <Input id="preferredName" value={formData.preferredName || ""} onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })} placeholder="Name to call this contact" data-testid="input-preferred-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender || ""} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                    <SelectTrigger id="gender" data-testid="select-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email address" data-testid="input-email" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <PhoneInput value={formData.mobile || ""} onChange={(value) => setFormData({ ...formData, mobile: value })} placeholder="Mobile number" data-testid="input-mobile" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <PhoneInput value={formData.whatsapp || ""} onChange={(value) => setFormData({ ...formData, whatsapp: value })} placeholder="WhatsApp number" data-testid="input-whatsapp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <PhoneInput value={formData.phone || ""} onChange={(value) => setFormData({ ...formData, phone: value })} placeholder="Phone number" data-testid="input-phone" />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Select
                  value={(() => { const m = getCountryByNationality(formData.nationality || ""); return m ? m.nationality : (formData.nationality || ""); })()}
                  onValueChange={(value) => setFormData({ ...formData, nationality: value })}
                >
                  <SelectTrigger id="nationality" data-testid="select-nationality">
                    <SelectValue placeholder="Select nationality">
                      {formData.nationality && (() => {
                        const m = getCountryByNationality(formData.nationality);
                        if (m) return <span className="flex items-center gap-2"><img src={getFlagUrl(m.code)} alt={m.name} className="w-5 h-4 object-cover rounded-sm" />{m.nationality}</span>;
                        return formData.nationality;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {formData.nationality && !getCountryByNationality(formData.nationality) && (
                      <SelectItem value={formData.nationality}>{formData.nationality}</SelectItem>
                    )}
                    {NATIONALITIES_SORTED.map((c) => (
                      <SelectItem key={c.code} value={c.nationality}>
                        <span className="flex items-center gap-2"><img src={getFlagUrl(c.code)} alt={c.name} className="w-5 h-4 object-cover rounded-sm" />{c.nationality}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country of Residence</Label>
                <Select
                  value={(() => { const m = getCountryByName(formData.country || ""); return m ? m.name : (formData.country || ""); })()}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger id="country" data-testid="select-country">
                    <SelectValue placeholder="Select country">
                      {formData.country && (() => {
                        const m = getCountryByName(formData.country);
                        if (m) return <span className="flex items-center gap-2"><img src={getFlagUrl(m.code)} alt={m.name} className="w-5 h-4 object-cover rounded-sm" />{m.name}</span>;
                        return formData.country;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {formData.country && !getCountryByName(formData.country) && (
                      <SelectItem value={formData.country}>{formData.country}</SelectItem>
                    )}
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.name}>
                        <span className="flex items-center gap-2"><img src={getFlagUrl(c.code)} alt={c.name} className="w-5 h-4 object-cover rounded-sm" />{c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CRM / Lead Details Tab ─────────────────────────────────────── */}
        <TabsContent value="crm">
          <Card>
            <CardHeader>
              <CardTitle>{isLeadMode ? "Lead Details" : "CRM Details"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Status row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {formData.contactType === 'clients' && !isLeadMode && (
                  <div className="space-y-2">
                    <Label htmlFor="clientStatus">Client Status</Label>
                    <Select
                      value={formData.clientStatus || "lead"}
                      onValueChange={(value: ClientStatus) => setFormData({ ...formData, clientStatus: value })}
                    >
                      <SelectTrigger id="clientStatus" data-testid="select-client-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        {clientStatusOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="entrySource">Entry Source</Label>
                  <Select value={formData.entrySource || ""} onValueChange={(value: EntrySource) => setFormData({ ...formData, entrySource: value, subAgentAccountId: value !== 'sub_agent' ? null : formData.subAgentAccountId })}>
                    <SelectTrigger id="entrySource" data-testid="select-entry-source"><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      {entrySourceOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {formData.entrySource === 'sub_agent' && (
                  <SubAgentPicker
                    value={formData.subAgentAccountId || null}
                    onChange={(id) => setFormData({ ...formData, subAgentAccountId: id })}
                  />
                )}
                {(formData.contactType === 'clients' || isLeadMode) && (
                  <div className="space-y-2">
                    <Label htmlFor="leadRating">Lead Rating</Label>
                    <Select value={formData.leadRating || ""} onValueChange={(value: LeadRating) => setFormData({ ...formData, leadRating: value })}>
                      <SelectTrigger id="leadRating" data-testid="select-lead-rating"><SelectValue placeholder="Select rating" /></SelectTrigger>
                      <SelectContent>
                        {leadRatingOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Branch + Owner/Assigned */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branchId">Branch Location</Label>
                  <Select value={formData.branchId || "none"} onValueChange={(value) => setFormData({ ...formData, branchId: value === "none" ? null : value })}>
                    <SelectTrigger id="branchId" data-testid="select-branch"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Branch</SelectItem>
                      {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}{b.city ? ` - ${b.city}` : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">{isLeadMode ? "Assigned To" : "Contact Owner"}</Label>
                  <Select
                    value={(isLeadMode ? formData.assignedTo : formData.contactOwner) || ""}
                    onValueChange={(value) => setFormData({ ...formData, ...(isLeadMode ? { assignedTo: value || null, contactOwner: value || null } : { contactOwner: value || null }) })}
                  >
                    <SelectTrigger id="assignedTo" data-testid="select-assigned-to">
                      <SelectValue placeholder="Select person">
                        {(() => {
                          const val = isLeadMode ? formData.assignedTo : formData.contactOwner;
                          const m = teamMembers.find(t => t.id === val);
                          if (!m) return null;
                          return (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={(m as any).profileImageUrl || undefined} />
                                <AvatarFallback className="text-[9px]">{m.firstName?.[0]}{m.lastName?.[0]}</AvatarFallback>
                              </Avatar>
                              <span>{m.firstName} {m.lastName}</span>
                            </div>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id} data-testid={`assigned-to-option-${m.id}`}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={(m as any).profileImageUrl || undefined} />
                              <AvatarFallback className="text-[10px]">{m.firstName?.[0]}{m.lastName?.[0]}</AvatarFallback>
                            </Avatar>
                            <span>{m.firstName} {m.lastName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceSource">Reference Source</Label>
                <Input id="referenceSource" value={formData.referenceSource || ""} onChange={(e) => setFormData({ ...formData, referenceSource: e.target.value })} placeholder="e.g. QR Code - Dhaka Branch, Facebook Winter Campaign" data-testid="input-reference-source" />
              </div>

              <Separator />

              {/* UTM tracking */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Campaign Tracking (UTM)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="utmSource" className="text-xs text-muted-foreground">Source</Label>
                    <Input id="utmSource" value={formData.utmSource || ""} onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })} placeholder="e.g. google, facebook" data-testid="input-utm-source" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utmMedium" className="text-xs text-muted-foreground">Medium</Label>
                    <Input id="utmMedium" value={formData.utmMedium || ""} onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })} placeholder="e.g. cpc, social, email" data-testid="input-utm-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utmCampaign" className="text-xs text-muted-foreground">Campaign</Label>
                    <Input id="utmCampaign" value={formData.utmCampaign || ""} onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })} placeholder="e.g. winter_2026_intake" data-testid="input-utm-campaign" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="utmTerm" className="text-xs text-muted-foreground">Term (keyword)</Label>
                    <Input id="utmTerm" value={formData.utmTerm || ""} onChange={(e) => setFormData({ ...formData, utmTerm: e.target.value })} placeholder="Paid search keyword" data-testid="input-utm-term" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utmContent" className="text-xs text-muted-foreground">Content (ad variant)</Label>
                    <Input id="utmContent" value={formData.utmContent || ""} onChange={(e) => setFormData({ ...formData, utmContent: e.target.value })} placeholder="Ad variant identifier" data-testid="input-utm-content" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referrer" className="text-xs text-muted-foreground">Referrer URL</Label>
                  <Input id="referrer" value={formData.referrer || ""} onChange={(e) => setFormData({ ...formData, referrer: e.target.value })} placeholder="Website that referred this contact" data-testid="input-referrer" />
                </div>
              </div>

              <Separator />

              {/* Interest & Study Preferences */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Interest & Study Preferences</Label>

                <div className="space-y-2">
                  <Label htmlFor="interestedIn" className="text-xs text-muted-foreground">Interested In</Label>
                  {isLeadMode ? (
                    <Select value={formData.interestedIn || ""} onValueChange={(value) => setFormData({ ...formData, interestedIn: value || null })}>
                      <SelectTrigger id="interestedIn" data-testid="select-interested-in"><SelectValue placeholder="Select interest area" /></SelectTrigger>
                      <SelectContent>
                        {interestedInOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input id="interestedIn" value={formData.interestedIn || ""} onChange={(e) => setFormData({ ...formData, interestedIn: e.target.value })} placeholder="What courses or programs is this contact interested in?" data-testid="input-interested-in" />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="courseName" className="text-xs text-muted-foreground">Course Name</Label>
                    <Input id="courseName" value={formData.courseName || ""} onChange={(e) => setFormData({ ...formData, courseName: e.target.value })} placeholder="Specific course name if known" data-testid="input-course-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="courseUrl" className="text-xs text-muted-foreground">Course URL</Label>
                    <Input id="courseUrl" value={formData.courseUrl || ""} onChange={(e) => setFormData({ ...formData, courseUrl: e.target.value })} placeholder="Link to course page" data-testid="input-course-url" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="programDiscipline" className="text-xs text-muted-foreground">Interested Discipline</Label>
                    <Select value={formData.programDiscipline || ""} onValueChange={(value) => setFormData({ ...formData, programDiscipline: value || null })}>
                      <SelectTrigger id="programDiscipline" data-testid="select-program-discipline"><SelectValue placeholder="Select discipline" /></SelectTrigger>
                      <SelectContent>
                        {['Accounting, Business & Finance','Agriculture & Forestry','Applied Sciences & Professions','Arts, Design & Architecture','Computer Science & IT','Education & Training','Engineering & Technology','Environmental Studies & Earth Sciences','Hospitality, Leisure & Sports','Humanities','Journalism & Media','Law','Medicine & Health','Short Courses','Trade'].map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="programType" className="text-xs text-muted-foreground">Study Level</Label>
                    <Select value={formData.programType || ""} onValueChange={(value) => setFormData({ ...formData, programType: value || null })}>
                      <SelectTrigger id="programType" data-testid="select-program-type"><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        {['Certificate I','Certificate II','Certificate III','Certificate IV','Diploma','Advanced Diploma','Associate Degree','Bachelor Degree','Graduate Certificate','Graduate Diploma','Masters Degree','Doctoral Degree','ELICOS','Foundation','Short Course','Other'].map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whereToStudy" className="text-xs text-muted-foreground">Destination Country</Label>
                    <Input id="whereToStudy" value={formData.whereToStudy || ""} onChange={(e) => setFormData({ ...formData, whereToStudy: e.target.value || null })} placeholder="e.g. Australia, UK, Canada" data-testid="input-where-to-study" />
                  </div>
                </div>
              </div>

              {/* Course Preferences cascade — lead mode */}
              {isLeadMode && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Course Preferences</Label>
                      <span className="text-xs text-muted-foreground">Up to 3 preferences</span>
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: visiblePrefCount }).map((_, i) => (
                        <PreferenceSlot
                          key={i}
                          rank={i + 1}
                          pref={preferences[i] ?? { ...EMPTY_PREF }}
                          institutions={prefInstitutions}
                          onChange={(updated) => updatePref(i, updated)}
                          onRemove={() => removePref(i)}
                          canRemove={visiblePrefCount > 1}
                        />
                      ))}
                    </div>
                    {visiblePrefCount < 3 && (
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => {
                          setVisiblePrefCount(prev => Math.min(3, prev + 1));
                          setPreferences(prev => { const next = [...prev]; while (next.length < visiblePrefCount + 1) next.push({ ...EMPTY_PREF }); return next; });
                        }}
                        data-testid="button-add-preference"
                      >
                        <Plus className="h-4 w-4 mr-1" />Add Preference
                      </Button>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Budget */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Budget Range (AUD / year)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budgetMin" className="text-xs text-muted-foreground">Minimum Budget</Label>
                    <Input id="budgetMin" type="number" min={0} value={formData.budgetMin ?? ""} onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value ? Number(e.target.value) : null })} placeholder="e.g. 5000" data-testid="input-budget-min" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budgetMax" className="text-xs text-muted-foreground">Maximum Budget</Label>
                    <Input id="budgetMax" type="number" min={0} value={formData.budgetMax ?? ""} onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value ? Number(e.target.value) : null })} placeholder="e.g. 60000" data-testid="input-budget-max" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Address Tab ────────────────────────────────────────────────── */}
        <TabsContent value="address">
          <Card>
            <CardHeader><CardTitle>Address Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Search Address</Label>
                <AddressAutocomplete
                  onAddressSelect={(address: AddressComponents) => {
                    setFormData({
                      ...formData,
                      unitNo: address.unitNo || formData.unitNo,
                      street: address.street || formData.street,
                      suburb: address.suburb || formData.suburb,
                      city: address.city || formData.city,
                      state: address.state || formData.state,
                      postcode: address.postcode || formData.postcode,
                      country: address.country || formData.country,
                    });
                  }}
                  placeholder="Start typing an address to search..."
                  data-testid="input-address-search"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitNo">Unit No.</Label>
                  <Input id="unitNo" value={formData.unitNo || ""} onChange={(e) => setFormData({ ...formData, unitNo: e.target.value })} placeholder="Unit or apartment number" data-testid="input-unit-no" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input id="street" value={formData.street || ""} onChange={(e) => setFormData({ ...formData, street: e.target.value })} placeholder="Street address" data-testid="input-street" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suburb">Suburb</Label>
                  <Input id="suburb" value={formData.suburb || ""} onChange={(e) => setFormData({ ...formData, suburb: e.target.value })} placeholder="Suburb or district" data-testid="input-suburb" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={formData.city || ""} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Enter city" data-testid="input-city" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State / Province</Label>
                  <Input id="state" value={formData.state || ""} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="Enter state or province" data-testid="input-state" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input id="postcode" value={formData.postcode || ""} onChange={(e) => setFormData({ ...formData, postcode: e.target.value })} placeholder="Enter postcode" data-testid="input-postcode" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressCountry">Country</Label>
                  <Select
                    value={(() => { const m = getCountryByName(formData.country || ""); return m ? m.name : (formData.country || ""); })()}
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger id="addressCountry" data-testid="select-address-country">
                      <SelectValue placeholder="Select country">
                        {formData.country && (() => {
                          const m = getCountryByName(formData.country);
                          if (m) return <span className="flex items-center gap-2"><img src={getFlagUrl(m.code)} alt={m.name} className="w-5 h-4 object-cover rounded-sm" />{m.name}</span>;
                          return formData.country;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {formData.country && !getCountryByName(formData.country) && (
                        <SelectItem value={formData.country}>{formData.country}</SelectItem>
                      )}
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.name}>
                          <span className="flex items-center gap-2"><img src={getFlagUrl(c.code)} alt={c.name} className="w-5 h-4 object-cover rounded-sm" />{c.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Emergency Tab ──────────────────────────────────────────────── */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader><CardTitle>Emergency Contact & Notes</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                  <Input id="emergencyContactName" value={formData.emergencyContactName || ""} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} placeholder="Emergency contact full name" data-testid="input-emergency-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactMobile">Emergency Contact Mobile</Label>
                  <Input id="emergencyContactMobile" value={formData.emergencyContactMobile || ""} onChange={(e) => setFormData({ ...formData, emergencyContactMobile: e.target.value })} placeholder="Emergency contact mobile" data-testid="input-emergency-mobile" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                  <Input id="emergencyContactRelationship" value={formData.emergencyContactRelationship || ""} onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })} placeholder="e.g., Parent, Spouse, Sibling" data-testid="input-emergency-relationship" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactAddress">Emergency Contact Address</Label>
                  <Input id="emergencyContactAddress" value={formData.emergencyContactAddress || ""} onChange={(e) => setFormData({ ...formData, emergencyContactAddress: e.target.value })} placeholder="Emergency contact address" data-testid="input-emergency-address" />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." className="min-h-[120px]" data-testid="input-notes" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Role Details Tab (contact mode, provider reps / partners) ──── */}
        {showRoleTab && (
          <TabsContent value="role-details">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Institution Affiliations</CardTitle>
                  <Dialog open={showAddInstitution} onOpenChange={setShowAddInstitution}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-institution-link">
                        <Plus className="h-4 w-4 mr-1" />Add Institution
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Link to Institution</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Institution *</Label>
                          <Select value={newInstitutionId?.toString() || ""} onValueChange={(value) => setNewInstitutionId(parseInt(value))}>
                            <SelectTrigger data-testid="select-institution"><SelectValue placeholder="Select institution" /></SelectTrigger>
                            <SelectContent>
                              {availableInstitutions.map((inst) => (
                                <SelectItem key={inst.id} value={inst.id.toString()}>{inst.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Role Title</Label>
                          <Input placeholder="e.g., Marketing Officer, Admissions Manager" value={newRoleTitle} onChange={(e) => setNewRoleTitle(e.target.value)} data-testid="input-new-role-title" />
                        </div>
                        <div className="space-y-2">
                          <Label>Department</Label>
                          <Input placeholder="e.g., Marketing, Admissions" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} data-testid="input-new-department" />
                        </div>
                        <Button className="w-full" onClick={handleAddInstitutionLink} disabled={addInstitutionLinkMutation.isPending} data-testid="button-confirm-add-institution">
                          {addInstitutionLinkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Add Institution Link
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {institutionLinks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No institution affiliations yet.</p>
                    <p className="text-sm">Click "Add Institution" to link this contact to an institution.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {institutionLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-4 rounded-lg border bg-card gap-3" data-testid={`institution-link-${link.id}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate" data-testid={`text-institution-name-${link.id}`}>{link.institution?.name || "Unknown Institution"}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {link.roleTitle && <Badge variant="secondary" data-testid={`badge-role-title-${link.id}`}>{link.roleTitle}</Badge>}
                              {link.department && <span className="text-sm text-muted-foreground" data-testid={`text-department-${link.id}`}>{link.department}</span>}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeInstitutionLinkMutation.mutate(link.institutionId)} disabled={removeInstitutionLinkMutation.isPending} data-testid={`button-remove-institution-${link.id}`}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Lead Notes + Activity Log — lead mode edit only */}
      {isLeadMode && isEditing && params.id && (
        <div className="mt-6 space-y-6">
          <LeadNotes leadId={params.id} leadName={`${formData.firstName || ''} ${formData.lastName || ''}`} />
          <LeadActivityLog leadId={params.id} />
        </div>
      )}

      {/* Mobile bottom save bar */}
      <div className="flex justify-end gap-2 mt-6 sm:hidden">
        <Button variant="outline" onClick={() => navigate(backPath)} data-testid="button-cancel-mobile">Cancel</Button>
        <Button onClick={handleSubmit} disabled={isLoading} data-testid="button-save-contact-mobile">
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />{isLeadMode ? "Save Lead" : "Save"}</>}
        </Button>
      </div>
    </div>
  );
}
