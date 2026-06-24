import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  User,
  FileText,
  GraduationCap,
  Languages,
  Briefcase,
  Wallet,
  Heart,
  Globe,
  Calendar,
  Phone,
  MapPin,
  Target,
  Clock,
  Building2,
  Award,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface StudentProfileData {
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    preferredName: string | null;
    gender: string | null;
    maritalStatus: string | null;
    phone: string | null;
    whatsapp: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    profileImageUrl: string | null;
    unitNo: string | null;
    street: string | null;
    suburb: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    country: string | null;
    bio: string | null;
    educationLevel: string | null;
    fieldOfStudy: string | null;
    careerGoals: string | null;
    currentCountry: string | null;
    isInAustralia: boolean | null;
    australianVisaType: string | null;
    visaExpiryDate: string | null;
    visaConditions: string | null;
    passportNumber: string | null;
    passportCountry: string | null;
    passportIssuedDate: string | null;
    passportExpiryDate: string | null;
    passportIssuingAuthority: string | null;
    destinationCountry: string | null;
    preferredDiscipline: string | null;
    preferredCourseLevel: string | null;
    preferredStudyMode: string | null;
    preferredIntakes: string[] | null;
    budgetMin: string | null;
    budgetMax: string | null;
    budgetCurrency: string | null;
    prPathwayInterest: boolean | null;
    hasWorkExperience: boolean | null;
    workExperienceYears: number | null;
    workExperienceIndustry: string | null;
    profileCompletionPercentage: number | null;
    fundingSource: string | null;
    sponsorName: string | null;
    sponsorRelationship: string | null;
    sponsorContact: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    statementOfPurpose: string | null;
  };
  education: Array<{
    id: string;
    institutionName: string | null;
    qualification: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
    grade: string | null;
    country: string | null;
    isCurrentlyStudying: boolean | null;
  }>;
  languageScores: Array<{
    id: string;
    testType: string | null;
    overallScore: string | null;
    listeningScore: string | null;
    readingScore: string | null;
    writingScore: string | null;
    speakingScore: string | null;
    testDate: string | null;
    expiryDate: string | null;
  }>;
  employment: Array<{
    id: string;
    companyName: string | null;
    jobTitle: string | null;
    industry: string | null;
    startDate: string | null;
    endDate: string | null;
    isCurrentJob: boolean | null;
    responsibilities: string | null;
    country: string | null;
  }>;
  documentsSummary: {
    total: number;
    byType: Record<string, number>;
  };
}

interface StudentProfileViewerProps {
  profileId: string;
  studentName?: string;
}

function DataRow({ label, value, icon: Icon }: { label: string; value: string | number | null | undefined; icon?: React.ElementType }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-muted/50 last:border-0" data-testid={`row-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{String(value)}</p>
      </div>
    </div>
  );
}

function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function toDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function SectionHeader({
  icon: Icon,
  title,
  editing,
  isStaff,
  onEdit,
  extras,
}: {
  icon: React.ElementType;
  title: string;
  editing: boolean;
  isStaff: boolean;
  onEdit: (e: React.MouseEvent) => void;
  extras?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 w-full [&>h3]:flex-1">
      <AccordionTrigger className="hover:no-underline pr-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span>{title}</span>
          {extras}
        </div>
      </AccordionTrigger>
      {isStaff && !editing && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={onEdit}
          data-testid={`edit-btn-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function SaveCancelBar({
  onSave,
  onCancel,
  saving,
}: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex gap-2 pt-3 pb-1 border-t border-muted/50 mt-2">
      <Button size="sm" onClick={onSave} disabled={saving} data-testid="btn-save-section">
        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
        Save
      </Button>
      <Button size="sm" variant="outline" onClick={onCancel} data-testid="btn-cancel-section">
        <X className="h-3 w-3 mr-1" />
        Cancel
      </Button>
    </div>
  );
}

export function StudentProfileViewer({ profileId, studentName }: StudentProfileViewerProps) {
  const { isConsultantOrAbove: isStaff } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<StudentProfileData>({
    queryKey: [`/api/admin/student-profiles/${profileId}`],
    enabled: !!profileId,
  });

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["personal", "passport", "education", "english", "preferences", "work", "financial", "sop"]);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const [addingEducation, setAddingEducation] = useState(false);
  const [newEdu, setNewEdu] = useState<Record<string, any>>({});
  const [addingLanguage, setAddingLanguage] = useState(false);
  const [newLang, setNewLang] = useState<Record<string, any>>({});
  const [addingEmployment, setAddingEmployment] = useState(false);
  const [newEmp, setNewEmp] = useState<Record<string, any>>({});

  const invalidate = () => qc.invalidateQueries({ queryKey: [`/api/admin/student-profiles/${profileId}`] });

  const patchMutation = useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest("PATCH", `/api/admin/student-profiles/${profileId}`, body),
    onSuccess: () => {
      invalidate();
      setEditingSection(null);
      toast({ title: "Saved", description: "Profile section updated." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const addEduMutation = useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest("POST", `/api/admin/student-profiles/${profileId}/education`, body),
    onSuccess: () => { invalidate(); setAddingEducation(false); setNewEdu({}); toast({ title: "Education record added" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteEduMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/student-profiles/${profileId}/education/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Education record removed" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const addLangMutation = useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest("POST", `/api/admin/student-profiles/${profileId}/language-scores`, body),
    onSuccess: () => { invalidate(); setAddingLanguage(false); setNewLang({}); toast({ title: "Language score added" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteLangMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/student-profiles/${profileId}/language-scores/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Language score removed" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const addEmpMutation = useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest("POST", `/api/admin/student-profiles/${profileId}/employment`, body),
    onSuccess: () => { invalidate(); setAddingEmployment(false); setNewEmp({}); toast({ title: "Employment record added" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteEmpMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/student-profiles/${profileId}/employment/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Employment record removed" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const startEditing = (section: string, profile: StudentProfileData["profile"]) => {
    const fieldMap: Record<string, (keyof StudentProfileData["profile"])[]> = {
      personal: ["firstName", "lastName", "preferredName", "gender", "maritalStatus", "dateOfBirth", "nationality", "phone", "whatsapp", "unitNo", "street", "suburb", "city", "state", "postcode", "country", "currentCountry"],
      passport: ["passportNumber", "passportCountry", "passportIssuedDate", "passportExpiryDate", "passportIssuingAuthority", "isInAustralia", "australianVisaType", "visaExpiryDate", "visaConditions"],
      preferences: ["destinationCountry", "preferredDiscipline", "preferredCourseLevel", "preferredStudyMode", "preferredIntakes", "budgetMin", "budgetMax", "budgetCurrency", "prPathwayInterest"],
      work: ["hasWorkExperience", "workExperienceYears", "workExperienceIndustry"],
      financial: ["fundingSource", "sponsorName", "sponsorRelationship", "sponsorContact"],
      emergency: ["emergencyContactName", "emergencyContactPhone"],
      sop: ["statementOfPurpose"],
      bio: ["bio", "careerGoals"],
    };
    const fields = fieldMap[section] || [];
    const initial: Record<string, any> = {};
    fields.forEach(f => { initial[f] = (profile as any)[f]; });
    setFormData(initial);
    setEditingSection(section);
    // Auto-expand the target section so the edit form is always visible
    setOpenSections(prev => prev.includes(section) ? prev : [...prev, section]);
  };

  const fd = (key: string) => formData[key] ?? "";
  const setFd = (key: string, val: any) => setFormData(prev => ({ ...prev, [key]: val }));

  const saveSection = () => {
    const payload: Record<string, any> = { ...formData };
    if (payload.preferredIntakes && typeof payload.preferredIntakes === "string") {
      payload.preferredIntakes = (payload.preferredIntakes as string).split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    patchMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load student profile data
        </CardContent>
      </Card>
    );
  }

  const { profile, education, languageScores, employment, documentsSummary } = data;
  const saving = patchMutation.isPending;

  const formatAddress = () => {
    const parts = [profile.unitNo, profile.street, profile.suburb, profile.city, profile.state, profile.postcode, profile.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div className="space-y-4" data-testid="student-profile-viewer">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          {studentName || `${profile.firstName} ${profile.lastName}`}'s Profile
        </h3>
        {profile.profileCompletionPercentage != null && (
          <Badge variant={profile.profileCompletionPercentage >= 80 ? "default" : "secondary"}>
            {profile.profileCompletionPercentage}% Complete
          </Badge>
        )}
      </div>

      <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">

        {/* ── Personal Information ────────────────────────── */}
        <AccordionItem value="personal" className="border rounded-lg px-4">
          <SectionHeader icon={User} title="Personal Information" editing={editingSection === "personal"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); startEditing("personal", profile); }}
          />
          <AccordionContent>
            {editingSection === "personal" ? (
              <div className="space-y-3 py-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FField label="First Name"><Input value={fd("firstName")} onChange={e => setFd("firstName", e.target.value)} data-testid="input-firstName" /></FField>
                  <FField label="Last Name"><Input value={fd("lastName")} onChange={e => setFd("lastName", e.target.value)} data-testid="input-lastName" /></FField>
                  <FField label="Preferred Name"><Input value={fd("preferredName")} onChange={e => setFd("preferredName", e.target.value)} /></FField>
                  <FField label="Gender">
                    <Select value={fd("gender") || ""} onValueChange={v => setFd("gender", v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </FField>
                  <FField label="Marital Status">
                    <Select value={fd("maritalStatus") || ""} onValueChange={v => setFd("maritalStatus", v)}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="separated">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                  </FField>
                  <FField label="Date of Birth"><Input type="date" value={toDateInput(fd("dateOfBirth"))} onChange={e => setFd("dateOfBirth", e.target.value || null)} /></FField>
                  <FField label="Nationality"><Input value={fd("nationality")} onChange={e => setFd("nationality", e.target.value)} /></FField>
                  <FField label="Phone"><Input value={fd("phone")} onChange={e => setFd("phone", e.target.value)} /></FField>
                  <FField label="WhatsApp"><Input value={fd("whatsapp")} onChange={e => setFd("whatsapp", e.target.value)} /></FField>
                  <FField label="Unit No"><Input value={fd("unitNo")} onChange={e => setFd("unitNo", e.target.value)} /></FField>
                  <FField label="Street"><Input value={fd("street")} onChange={e => setFd("street", e.target.value)} /></FField>
                  <FField label="Suburb"><Input value={fd("suburb")} onChange={e => setFd("suburb", e.target.value)} /></FField>
                  <FField label="City"><Input value={fd("city")} onChange={e => setFd("city", e.target.value)} /></FField>
                  <FField label="State"><Input value={fd("state")} onChange={e => setFd("state", e.target.value)} /></FField>
                  <FField label="Postcode"><Input value={fd("postcode")} onChange={e => setFd("postcode", e.target.value)} /></FField>
                  <FField label="Country"><Input value={fd("country")} onChange={e => setFd("country", e.target.value)} /></FField>
                  <FField label="Current Country"><Input value={fd("currentCountry")} onChange={e => setFd("currentCountry", e.target.value)} /></FField>
                </div>
                <SaveCancelBar onSave={saveSection} onCancel={() => setEditingSection(null)} saving={saving} />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 py-2">
                <DataRow label="First Name" value={profile.firstName} icon={User} />
                <DataRow label="Last Name" value={profile.lastName} />
                <DataRow label="Preferred Name" value={profile.preferredName} />
                <DataRow label="Gender" value={profile.gender} />
                <DataRow label="Marital Status" value={profile.maritalStatus} />
                <DataRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} icon={Calendar} />
                <DataRow label="Nationality" value={profile.nationality} icon={Globe} />
                <DataRow label="Phone" value={profile.phone} icon={Phone} />
                <DataRow label="WhatsApp" value={profile.whatsapp} icon={Phone} />
                <DataRow label="Address" value={formatAddress()} icon={MapPin} />
                <DataRow label="Current Country" value={profile.currentCountry || profile.country} icon={Globe} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── Passport & Visa ─────────────────────────────── */}
        <AccordionItem value="passport" className="border rounded-lg px-4">
          <SectionHeader icon={FileText} title="Passport & Visa Details" editing={editingSection === "passport"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); startEditing("passport", profile); }}
          />
          <AccordionContent>
            {editingSection === "passport" ? (
              <div className="space-y-3 py-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FField label="Passport Number"><Input value={fd("passportNumber")} onChange={e => setFd("passportNumber", e.target.value)} /></FField>
                  <FField label="Passport Country"><Input value={fd("passportCountry")} onChange={e => setFd("passportCountry", e.target.value)} /></FField>
                  <FField label="Issued Date"><Input type="date" value={toDateInput(fd("passportIssuedDate"))} onChange={e => setFd("passportIssuedDate", e.target.value || null)} /></FField>
                  <FField label="Expiry Date"><Input type="date" value={toDateInput(fd("passportExpiryDate"))} onChange={e => setFd("passportExpiryDate", e.target.value || null)} /></FField>
                  <FField label="Issuing Authority"><Input value={fd("passportIssuingAuthority")} onChange={e => setFd("passportIssuingAuthority", e.target.value)} /></FField>
                  <FField label="In Australia">
                    <div className="flex items-center gap-2 pt-1">
                      <Switch checked={!!fd("isInAustralia")} onCheckedChange={v => setFd("isInAustralia", v)} />
                      <span className="text-sm">{fd("isInAustralia") ? "Yes" : "No"}</span>
                    </div>
                  </FField>
                  {fd("isInAustralia") && (
                    <>
                      <FField label="Visa Type"><Input value={fd("australianVisaType")} onChange={e => setFd("australianVisaType", e.target.value)} /></FField>
                      <FField label="Visa Expiry"><Input type="date" value={toDateInput(fd("visaExpiryDate"))} onChange={e => setFd("visaExpiryDate", e.target.value || null)} /></FField>
                      <FField label="Visa Conditions"><Input value={fd("visaConditions")} onChange={e => setFd("visaConditions", e.target.value)} /></FField>
                    </>
                  )}
                </div>
                <SaveCancelBar onSave={saveSection} onCancel={() => setEditingSection(null)} saving={saving} />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 py-2">
                <DataRow label="Passport Number" value={profile.passportNumber ? `***${profile.passportNumber.slice(-4)}` : null} icon={FileText} />
                <DataRow label="Passport Country" value={profile.passportCountry} icon={Globe} />
                <DataRow label="Issued Date" value={formatDate(profile.passportIssuedDate)} icon={Calendar} />
                <DataRow label="Expiry Date" value={formatDate(profile.passportExpiryDate)} icon={Calendar} />
                <DataRow label="Issuing Authority" value={profile.passportIssuingAuthority} icon={Building2} />
                <DataRow label="In Australia" value={profile.isInAustralia ? "Yes" : "No"} icon={MapPin} />
                {profile.isInAustralia && (
                  <>
                    <DataRow label="Visa Type" value={profile.australianVisaType} icon={FileText} />
                    <DataRow label="Visa Expiry" value={formatDate(profile.visaExpiryDate)} icon={Calendar} />
                    <DataRow label="Visa Conditions" value={profile.visaConditions} />
                  </>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── Education History ────────────────────────────── */}
        <AccordionItem value="education" className="border rounded-lg px-4">
          <SectionHeader icon={GraduationCap} title="Education History" editing={editingSection === "education"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); setEditingSection(editingSection === "education" ? null : "education"); setOpenSections(prev => prev.includes("education") ? prev : [...prev, "education"]); }}
            extras={<Badge variant="outline" className="ml-2">{education.length}</Badge>}
          />
          <AccordionContent>
            {education.length === 0 && editingSection !== "education" && (
              <p className="text-sm text-muted-foreground py-2">No education records</p>
            )}
            <div className="space-y-3 py-2">
              {education.map((edu, idx) => (
                <Card key={edu.id} className="bg-muted/30" data-testid={`education-${idx}`}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{edu.qualification}</p>
                        <p className="text-sm text-muted-foreground">{edu.institutionName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {edu.isCurrentlyStudying && <Badge variant="secondary">Current</Badge>}
                        {editingSection === "education" && isStaff && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            onClick={() => { if (confirm("Remove this education record?")) deleteEduMutation.mutate(edu.id); }}
                            disabled={deleteEduMutation.isPending}
                            data-testid={`delete-edu-${idx}`}
                          >
                            {deleteEduMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="h-3 w-3" />
                        {edu.fieldOfStudy}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(edu.startDate)} - {edu.isCurrentlyStudying ? "Present" : formatDate(edu.endDate)}
                      </div>
                      {edu.grade && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Award className="h-3 w-3" />
                          Grade: {edu.grade}
                        </div>
                      )}
                      {edu.country && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {edu.country}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {editingSection === "education" && isStaff && (
                <>
                  {addingEducation ? (
                    <Card className="border-dashed">
                      <CardContent className="py-3 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">New Education Record</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FField label="Institution Name"><Input value={newEdu.institutionName || ""} onChange={e => setNewEdu(p => ({ ...p, institutionName: e.target.value }))} /></FField>
                          <FField label="Qualification"><Input value={newEdu.qualification || ""} onChange={e => setNewEdu(p => ({ ...p, qualification: e.target.value }))} /></FField>
                          <FField label="Field of Study"><Input value={newEdu.fieldOfStudy || ""} onChange={e => setNewEdu(p => ({ ...p, fieldOfStudy: e.target.value }))} /></FField>
                          <FField label="Grade"><Input value={newEdu.grade || ""} onChange={e => setNewEdu(p => ({ ...p, grade: e.target.value }))} /></FField>
                          <FField label="Start Date"><Input type="date" value={newEdu.startDate || ""} onChange={e => setNewEdu(p => ({ ...p, startDate: e.target.value || null }))} /></FField>
                          <FField label="End Date"><Input type="date" value={newEdu.endDate || ""} onChange={e => setNewEdu(p => ({ ...p, endDate: e.target.value || null }))} /></FField>
                          <FField label="Country"><Input value={newEdu.country || ""} onChange={e => setNewEdu(p => ({ ...p, country: e.target.value }))} /></FField>
                          <FField label="Currently Studying">
                            <div className="flex items-center gap-2 pt-1">
                              <Switch checked={!!newEdu.isCurrentlyStudying} onCheckedChange={v => setNewEdu(p => ({ ...p, isCurrentlyStudying: v }))} />
                              <span className="text-sm">{newEdu.isCurrentlyStudying ? "Yes" : "No"}</span>
                            </div>
                          </FField>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => addEduMutation.mutate(newEdu)} disabled={addEduMutation.isPending}>
                            {addEduMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Add Record
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setAddingEducation(false); setNewEdu({}); }}>Cancel</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setAddingEducation(true)} className="w-full" data-testid="btn-add-education">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Education Record
                    </Button>
                  )}
                  <div className="flex justify-end pt-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingSection(null); setAddingEducation(false); }}>
                      <X className="h-3 w-3 mr-1" />
                      Done Editing
                    </Button>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── English Proficiency ──────────────────────────── */}
        <AccordionItem value="english" className="border rounded-lg px-4">
          <SectionHeader icon={Languages} title="English Proficiency" editing={editingSection === "english"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); setEditingSection(editingSection === "english" ? null : "english"); setOpenSections(prev => prev.includes("english") ? prev : [...prev, "english"]); }}
            extras={<Badge variant="outline" className="ml-2">{languageScores.length}</Badge>}
          />
          <AccordionContent>
            {languageScores.length === 0 && editingSection !== "english" && (
              <p className="text-sm text-muted-foreground py-2">No language test scores</p>
            )}
            <div className="space-y-3 py-2">
              {languageScores.map((score, idx) => (
                <Card key={score.id} className="bg-muted/30" data-testid={`language-score-${idx}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between mb-3">
                      <Badge>{score.testType}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">{score.overallScore}</span>
                        {editingSection === "english" && isStaff && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            onClick={() => { if (confirm("Remove this language score?")) deleteLangMutation.mutate(score.id); }}
                            disabled={deleteLangMutation.isPending}
                            data-testid={`delete-lang-${idx}`}
                          >
                            {deleteLangMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div><p className="text-muted-foreground text-xs">Listening</p><p className="font-medium">{score.listeningScore || "-"}</p></div>
                      <div><p className="text-muted-foreground text-xs">Reading</p><p className="font-medium">{score.readingScore || "-"}</p></div>
                      <div><p className="text-muted-foreground text-xs">Writing</p><p className="font-medium">{score.writingScore || "-"}</p></div>
                      <div><p className="text-muted-foreground text-xs">Speaking</p><p className="font-medium">{score.speakingScore || "-"}</p></div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>Test Date: {formatDate(score.testDate)}</span>
                      <span>Expires: {formatDate(score.expiryDate)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {editingSection === "english" && isStaff && (
                <>
                  {addingLanguage ? (
                    <Card className="border-dashed">
                      <CardContent className="py-3 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">New Language Score</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FField label="Test Type">
                            <Select value={newLang.testType || ""} onValueChange={v => setNewLang(p => ({ ...p, testType: v }))}>
                              <SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger>
                              <SelectContent>
                                {["IELTS", "TOEFL", "PTE", "OET", "Cambridge", "Duolingo", "Other"].map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FField>
                          <FField label="Overall Score"><Input value={newLang.overallScore || ""} onChange={e => setNewLang(p => ({ ...p, overallScore: e.target.value }))} /></FField>
                          <FField label="Listening"><Input value={newLang.listeningScore || ""} onChange={e => setNewLang(p => ({ ...p, listeningScore: e.target.value }))} /></FField>
                          <FField label="Reading"><Input value={newLang.readingScore || ""} onChange={e => setNewLang(p => ({ ...p, readingScore: e.target.value }))} /></FField>
                          <FField label="Writing"><Input value={newLang.writingScore || ""} onChange={e => setNewLang(p => ({ ...p, writingScore: e.target.value }))} /></FField>
                          <FField label="Speaking"><Input value={newLang.speakingScore || ""} onChange={e => setNewLang(p => ({ ...p, speakingScore: e.target.value }))} /></FField>
                          <FField label="Test Date"><Input type="date" value={newLang.testDate || ""} onChange={e => setNewLang(p => ({ ...p, testDate: e.target.value || null }))} /></FField>
                          <FField label="Expiry Date"><Input type="date" value={newLang.expiryDate || ""} onChange={e => setNewLang(p => ({ ...p, expiryDate: e.target.value || null }))} /></FField>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => addLangMutation.mutate(newLang)} disabled={addLangMutation.isPending}>
                            {addLangMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Add Score
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setAddingLanguage(false); setNewLang({}); }}>Cancel</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setAddingLanguage(true)} className="w-full" data-testid="btn-add-language">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Language Score
                    </Button>
                  )}
                  <div className="flex justify-end pt-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingSection(null); setAddingLanguage(false); }}>
                      <X className="h-3 w-3 mr-1" />
                      Done Editing
                    </Button>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Study Preferences ────────────────────────────── */}
        <AccordionItem value="preferences" className="border rounded-lg px-4">
          <SectionHeader icon={Target} title="Study Preferences" editing={editingSection === "preferences"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); startEditing("preferences", profile); }}
          />
          <AccordionContent>
            {editingSection === "preferences" ? (
              <div className="space-y-3 py-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FField label="Destination Country"><Input value={fd("destinationCountry")} onChange={e => setFd("destinationCountry", e.target.value)} /></FField>
                  <FField label="Preferred Discipline"><Input value={fd("preferredDiscipline")} onChange={e => setFd("preferredDiscipline", e.target.value)} /></FField>
                  <FField label="Course Level">
                    <Select value={fd("preferredCourseLevel") || ""} onValueChange={v => setFd("preferredCourseLevel", v)}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        {["Certificate", "Diploma", "Advanced Diploma", "Associate Degree", "Bachelor", "Graduate Certificate", "Graduate Diploma", "Masters", "PhD", "Other"].map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FField>
                  <FField label="Study Mode">
                    <Select value={fd("preferredStudyMode") || ""} onValueChange={v => setFd("preferredStudyMode", v)}>
                      <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on-campus">On-campus</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </FField>
                  <FField label="Preferred Intakes (comma-separated)">
                    <Input
                      value={Array.isArray(fd("preferredIntakes")) ? (fd("preferredIntakes") as string[]).join(", ") : fd("preferredIntakes")}
                      onChange={e => setFd("preferredIntakes", e.target.value)}
                      placeholder="e.g. February, July"
                    />
                  </FField>
                  <FField label="Budget Currency"><Input value={fd("budgetCurrency")} onChange={e => setFd("budgetCurrency", e.target.value)} placeholder="AUD" /></FField>
                  <FField label="Budget Min"><Input type="number" value={fd("budgetMin")} onChange={e => setFd("budgetMin", e.target.value)} /></FField>
                  <FField label="Budget Max"><Input type="number" value={fd("budgetMax")} onChange={e => setFd("budgetMax", e.target.value)} /></FField>
                  <FField label="PR Pathway Interest">
                    <div className="flex items-center gap-2 pt-1">
                      <Switch checked={!!fd("prPathwayInterest")} onCheckedChange={v => setFd("prPathwayInterest", v)} />
                      <span className="text-sm">{fd("prPathwayInterest") ? "Yes" : "No"}</span>
                    </div>
                  </FField>
                </div>
                <SaveCancelBar onSave={saveSection} onCancel={() => setEditingSection(null)} saving={saving} />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 py-2">
                <DataRow label="Destination Country" value={profile.destinationCountry} icon={Globe} />
                <DataRow label="Preferred Discipline" value={profile.preferredDiscipline} icon={GraduationCap} />
                <DataRow label="Preferred Course Level" value={profile.preferredCourseLevel} icon={Award} />
                <DataRow label="Preferred Study Mode" value={profile.preferredStudyMode} />
                <DataRow label="Preferred Intakes" value={profile.preferredIntakes?.join(", ")} icon={Calendar} />
                <DataRow label="Budget Range" value={profile.budgetMin && profile.budgetMax ? `${profile.budgetCurrency || "AUD"} ${profile.budgetMin} - ${profile.budgetMax}` : null} icon={Wallet} />
                <DataRow label="PR Pathway Interest" value={profile.prPathwayInterest ? "Yes" : "No"} icon={Heart} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── Work Experience ──────────────────────────────── */}
        <AccordionItem value="work" className="border rounded-lg px-4">
          <SectionHeader icon={Briefcase} title="Work Experience" editing={editingSection === "work" || editingSection === "work-entries"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); startEditing("work", profile); setEditingSection("work"); }}
            extras={<Badge variant="outline" className="ml-2">{employment.length}</Badge>}
          />
          <AccordionContent>
            <div className="py-2">
              {editingSection === "work" ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FField label="Has Work Experience">
                      <div className="flex items-center gap-2 pt-1">
                        <Switch checked={!!fd("hasWorkExperience")} onCheckedChange={v => setFd("hasWorkExperience", v)} />
                        <span className="text-sm">{fd("hasWorkExperience") ? "Yes" : "No"}</span>
                      </div>
                    </FField>
                    <FField label="Years of Experience"><Input type="number" value={fd("workExperienceYears")} onChange={e => setFd("workExperienceYears", e.target.value ? Number(e.target.value) : null)} /></FField>
                    <FField label="Industry"><Input value={fd("workExperienceIndustry")} onChange={e => setFd("workExperienceIndustry", e.target.value)} /></FField>
                  </div>
                  <SaveCancelBar onSave={saveSection} onCancel={() => setEditingSection(null)} saving={saving} />
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 mb-4">
                  <DataRow label="Has Work Experience" value={profile.hasWorkExperience ? "Yes" : "No"} icon={Briefcase} />
                  <DataRow label="Years of Experience" value={profile.workExperienceYears} icon={Clock} />
                  <DataRow label="Industry" value={profile.workExperienceIndustry} icon={Building2} />
                </div>
              )}

              <div className="space-y-3">
                {employment.map((job, idx) => (
                  <Card key={job.id} className="bg-muted/30" data-testid={`employment-${idx}`}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{job.jobTitle}</p>
                          <p className="text-sm text-muted-foreground">{job.companyName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.isCurrentJob && <Badge variant="secondary">Current</Badge>}
                          {editingSection === "work-entries" && isStaff && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                              onClick={() => { if (confirm("Remove this employment record?")) deleteEmpMutation.mutate(job.id); }}
                              disabled={deleteEmpMutation.isPending}
                              data-testid={`delete-emp-${idx}`}
                            >
                              {deleteEmpMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        {job.industry && <div className="flex items-center gap-2"><Building2 className="h-3 w-3" />{job.industry}</div>}
                        <div className="flex items-center gap-2"><Calendar className="h-3 w-3" />{formatDate(job.startDate)} - {job.isCurrentJob ? "Present" : formatDate(job.endDate)}</div>
                        {job.country && <div className="flex items-center gap-2"><Globe className="h-3 w-3" />{job.country}</div>}
                      </div>
                      {job.responsibilities && <p className="text-sm mt-2 text-muted-foreground">{job.responsibilities}</p>}
                    </CardContent>
                  </Card>
                ))}

                {isStaff && editingSection !== "work" && (
                  <>
                    {editingSection === "work-entries" ? (
                      <>
                        {addingEmployment ? (
                          <Card className="border-dashed">
                            <CardContent className="py-3 space-y-3">
                              <p className="text-sm font-medium text-muted-foreground">New Employment Record</p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <FField label="Company Name"><Input value={newEmp.companyName || ""} onChange={e => setNewEmp(p => ({ ...p, companyName: e.target.value }))} /></FField>
                                <FField label="Job Title"><Input value={newEmp.jobTitle || ""} onChange={e => setNewEmp(p => ({ ...p, jobTitle: e.target.value }))} /></FField>
                                <FField label="Industry"><Input value={newEmp.industry || ""} onChange={e => setNewEmp(p => ({ ...p, industry: e.target.value }))} /></FField>
                                <FField label="Country"><Input value={newEmp.country || ""} onChange={e => setNewEmp(p => ({ ...p, country: e.target.value }))} /></FField>
                                <FField label="Start Date"><Input type="date" value={newEmp.startDate || ""} onChange={e => setNewEmp(p => ({ ...p, startDate: e.target.value || null }))} /></FField>
                                <FField label="End Date"><Input type="date" value={newEmp.endDate || ""} onChange={e => setNewEmp(p => ({ ...p, endDate: e.target.value || null }))} /></FField>
                                <FField label="Currently Working">
                                  <div className="flex items-center gap-2 pt-1">
                                    <Switch checked={!!newEmp.isCurrentJob} onCheckedChange={v => setNewEmp(p => ({ ...p, isCurrentJob: v }))} />
                                    <span className="text-sm">{newEmp.isCurrentJob ? "Yes" : "No"}</span>
                                  </div>
                                </FField>
                              </div>
                              <FField label="Responsibilities"><Textarea value={newEmp.responsibilities || ""} onChange={e => setNewEmp(p => ({ ...p, responsibilities: e.target.value }))} rows={3} /></FField>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => addEmpMutation.mutate(newEmp)} disabled={addEmpMutation.isPending}>
                                  {addEmpMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                  Add Record
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setAddingEmployment(false); setNewEmp({}); }}>Cancel</Button>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setAddingEmployment(true)} className="w-full" data-testid="btn-add-employment">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Employment Record
                          </Button>
                        )}
                        <div className="flex justify-end">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingSection(null); setAddingEmployment(false); }}>
                            <X className="h-3 w-3 mr-1" />
                            Done Editing
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full mt-1"
                        onClick={(e) => { e.stopPropagation(); setEditingSection("work-entries"); }}
                        data-testid="btn-edit-employment-entries"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit Employment Entries
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Financial Information ────────────────────────── */}
        <AccordionItem value="financial" className="border rounded-lg px-4">
          <SectionHeader icon={Wallet} title="Financial / Sponsor Information" editing={editingSection === "financial"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); startEditing("financial", profile); }}
          />
          <AccordionContent>
            {editingSection === "financial" ? (
              <div className="space-y-3 py-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FField label="Funding Source">
                    <Select value={fd("fundingSource") || ""} onValueChange={v => setFd("fundingSource", v)}>
                      <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Self-funded</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="loan">Loan</SelectItem>
                        <SelectItem value="scholarship">Scholarship</SelectItem>
                        <SelectItem value="sponsor">Sponsor</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                      </SelectContent>
                    </Select>
                  </FField>
                  {fd("fundingSource") && fd("fundingSource") !== "self" && fd("fundingSource") !== "loan" && (
                    <>
                      <FField label="Sponsor Name"><Input value={fd("sponsorName")} onChange={e => setFd("sponsorName", e.target.value)} /></FField>
                      <FField label="Relationship"><Input value={fd("sponsorRelationship")} onChange={e => setFd("sponsorRelationship", e.target.value)} /></FField>
                      <FField label="Sponsor Contact"><Input value={fd("sponsorContact")} onChange={e => setFd("sponsorContact", e.target.value)} /></FField>
                    </>
                  )}
                </div>
                <SaveCancelBar onSave={saveSection} onCancel={() => setEditingSection(null)} saving={saving} />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 py-2">
                <DataRow label="Funding Source" value={profile.fundingSource} icon={Wallet} />
                {profile.fundingSource && profile.fundingSource !== "self" && profile.fundingSource !== "loan" && (
                  <>
                    <DataRow label="Sponsor Name" value={profile.sponsorName} icon={User} />
                    <DataRow label="Relationship" value={profile.sponsorRelationship} />
                    <DataRow label="Sponsor Contact" value={profile.sponsorContact} icon={Phone} />
                  </>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── Emergency Contact ────────────────────────────── */}
        <AccordionItem value="emergency" className="border rounded-lg px-4">
          <SectionHeader icon={Phone} title="Emergency Contact" editing={editingSection === "emergency"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); startEditing("emergency", profile); }}
          />
          <AccordionContent>
            {editingSection === "emergency" ? (
              <div className="space-y-3 py-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FField label="Contact Name"><Input value={fd("emergencyContactName")} onChange={e => setFd("emergencyContactName", e.target.value)} /></FField>
                  <FField label="Contact Phone"><Input value={fd("emergencyContactPhone")} onChange={e => setFd("emergencyContactPhone", e.target.value)} /></FField>
                </div>
                <SaveCancelBar onSave={saveSection} onCancel={() => setEditingSection(null)} saving={saving} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 py-2">
                <DataRow label="Contact Name" value={profile.emergencyContactName} icon={User} />
                <DataRow label="Contact Phone" value={profile.emergencyContactPhone} icon={Phone} />
                {!profile.emergencyContactName && !profile.emergencyContactPhone && (
                  <p className="text-sm text-muted-foreground col-span-2">No emergency contact provided</p>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── Statement of Purpose ─────────────────────────── */}
        <AccordionItem value="sop" className="border rounded-lg px-4">
          <SectionHeader icon={FileText} title="Statement of Purpose" editing={editingSection === "sop"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); startEditing("sop", profile); }}
          />
          <AccordionContent>
            {editingSection === "sop" ? (
              <div className="space-y-3 py-2">
                <FField label="Statement of Purpose">
                  <Textarea value={fd("statementOfPurpose")} onChange={e => setFd("statementOfPurpose", e.target.value)} rows={8} placeholder="Enter statement of purpose…" />
                </FField>
                <SaveCancelBar onSave={saveSection} onCancel={() => setEditingSection(null)} saving={saving} />
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {profile.statementOfPurpose ? (
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{profile.statementOfPurpose}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No statement of purpose provided</p>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── Bio & Career Goals ───────────────────────────── */}
        <AccordionItem value="bio" className="border rounded-lg px-4">
          <SectionHeader icon={Target} title="Bio & Career Goals" editing={editingSection === "bio"} isStaff={isStaff}
            onEdit={(e) => { e.stopPropagation(); startEditing("bio", profile); }}
          />
          <AccordionContent>
            {editingSection === "bio" ? (
              <div className="space-y-3 py-2">
                <FField label="Bio">
                  <Textarea value={fd("bio")} onChange={e => setFd("bio", e.target.value)} rows={4} placeholder="Enter bio…" />
                </FField>
                <FField label="Career Goals">
                  <Textarea value={fd("careerGoals")} onChange={e => setFd("careerGoals", e.target.value)} rows={4} placeholder="Enter career goals…" />
                </FField>
                <SaveCancelBar onSave={saveSection} onCancel={() => setEditingSection(null)} saving={saving} />
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {profile.bio && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Bio</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{profile.bio}</p>
                  </div>
                )}
                {profile.careerGoals && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Career Goals</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{profile.careerGoals}</p>
                  </div>
                )}
                {!profile.bio && !profile.careerGoals && (
                  <p className="text-sm text-muted-foreground">No bio or career goals provided</p>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {/* Documents Summary */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold">{documentsSummary.total}</p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              {Object.entries(documentsSummary.byType).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
