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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Loader2, Building, Plus, X, Briefcase, Camera, User, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRef } from "react";
import { COUNTRIES, NATIONALITIES_SORTED, getFlagUrl, getCountryByName, getCountryByNationality } from "@/lib/countries";
import { PhoneInput } from "@/components/ui/phone-input";

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

type ContactType = 'clients' | 'external' | 'others' | 'partner' | 'providers_rep';
type ClientStatus = 'lead' | 'applicant' | 'enrolled' | 'completed' | 'inactive';
type EntrySource = 'website' | 'consultant' | 'sub_agent' | 'affiliate' | 'import' | 'referral' | 'facebook_ads' | 'other';
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
  courseName: string | null;
  courseUrl: string | null;
  interestedIn: string | null;
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
  institution?: {
    id: number;
    name: string;
    country?: string;
  };
}

interface Institution {
  id: number;
  name: string;
  country?: string;
}

const roleNeedsInstitution = (contactType: string | null | undefined): boolean => {
  return ['providers_rep', 'partner', 'external'].includes(contactType || '');
};

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
  { value: 'other', label: 'Other' },
];

const leadRatingOptions = [
  { value: 'cold', label: 'Cold' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
];


export default function AdminContactForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<CrmContact>>({
    contactType: 'clients',
    clientStatus: 'lead',
    entrySource: 'consultant',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

  // Role Details - Institution links
  const [showAddInstitution, setShowAddInstitution] = useState(false);
  const [newInstitutionId, setNewInstitutionId] = useState<number | null>(null);
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const { data: institutionLinks = [] } = useQuery<InstitutionLink[]>({
    queryKey: ["/api/crm/contacts", params.id, "institutions"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/contacts/${params.id}/institutions`, { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch institution links");
      return response.json();
    },
    enabled: isEditing && roleNeedsInstitution(formData.contactType),
  });

  const { data: allInstitutions = [] } = useQuery<Institution[]>({
    queryKey: ["/api/admin/institutions"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/institutions", { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch institutions");
      return response.json();
    },
    enabled: isEditing && roleNeedsInstitution(formData.contactType),
  });

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
    addInstitutionLinkMutation.mutate({
      institutionId: newInstitutionId,
      roleTitle: newRoleTitle || null,
      department: newDepartment || null,
    });
  };

  // Filter out already linked institutions
  const availableInstitutions = allInstitutions.filter(
    inst => !institutionLinks.some(link => link.institutionId === inst.id)
  );

  useEffect(() => {
    if (existingContact) {
      setFormData(existingContact);
    }
  }, [existingContact]);

  useEffect(() => {
    if (!isEditing && currentUser && !formData.contactOwner) {
      setFormData(prev => ({
        ...prev,
        contactOwner: currentUser.id,
      }));
    }
  }, [currentUser, isEditing, formData.contactOwner]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CrmContact>) => {
      const response = await apiRequest("POST", "/api/crm/contacts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      toast({ title: "Success", description: "Contact created successfully" });
      navigate("/admin/dashboard");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create contact", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CrmContact>) => {
      return apiRequest("PATCH", `/api/crm/contacts/${params.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts", params.id] });
      toast({ title: "Success", description: "Contact updated successfully" });
      navigate("/admin/dashboard");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update contact", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({ title: "Error", description: "Please fill in all required fields (First Name, Last Name, Email)", variant: "destructive" });
      return;
    }

    if (!formData.contactType) {
      toast({ title: "Error", description: "Please select a Contact Type", variant: "destructive" });
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Query to find linked platform user by email
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

    // Photo upload requires contact ID - only available when editing
    if (!isEditing || !params.id) {
      toast({ title: "Info", description: "Save the contact first, then upload a photo", variant: "default" });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('photo', file);

      const headers = await getAuthHeaders();
      // Remove Content-Type header - let browser set it with boundary for FormData
      delete (headers as any)['Content-Type'];
      
      const response = await fetch(`/api/crm/contacts/${params.id}/upload-photo`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formDataUpload,
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

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-form-title">
              {isEditing ? "Edit Contact" : "Create New Contact"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update contact information" : "Add a new contact to your CRM"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={() => navigate("/admin/dashboard")} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} data-testid="button-save-contact">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Contact
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className={`grid w-full mb-6 ${isEditing && roleNeedsInstitution(formData.contactType) ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
          <TabsTrigger value="crm" data-testid="tab-crm">CRM Details</TabsTrigger>
          <TabsTrigger value="address" data-testid="tab-address">Address</TabsTrigger>
          <TabsTrigger value="emergency" data-testid="tab-emergency">Emergency</TabsTrigger>
          {isEditing && roleNeedsInstitution(formData.contactType) && (
            <TabsTrigger value="role-details" data-testid="tab-role-details">Role Details</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-muted/30 rounded-lg">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-2 border-border">
                    <AvatarImage src={formData.photo || linkedUser?.photo || undefined} alt="Profile" />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials() || <User className="h-10 w-10" />}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    data-testid="input-photo-upload"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    data-testid="button-upload-photo"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
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
                      <Badge variant="secondary" data-testid="badge-linked-user-type">
                        {getUserTypeBadge(linkedUser.userType)}
                      </Badge>
                      <span className="text-sm font-medium" data-testid="text-linked-user-name">
                        {linkedUser.firstName} {linkedUser.lastName}
                      </span>
                    </div>
                  )}
                  {formData.photo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, photo: null }))}
                      className="text-destructive hover:text-destructive"
                      data-testid="button-remove-photo"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove Photo
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferredName">Preferred Name</Label>
                  <Input
                    id="preferredName"
                    value={formData.preferredName || ""}
                    onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                    placeholder="Name to call this contact"
                    data-testid="input-preferred-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender || ""}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger id="gender" data-testid="select-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
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
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  data-testid="input-email"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <PhoneInput
                    value={formData.mobile || ""}
                    onChange={(value) => setFormData({ ...formData, mobile: value })}
                    placeholder="Mobile number"
                    data-testid="input-mobile"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <PhoneInput
                    value={formData.whatsapp || ""}
                    onChange={(value) => setFormData({ ...formData, whatsapp: value })}
                    placeholder="WhatsApp number"
                    data-testid="input-whatsapp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <PhoneInput
                    value={formData.phone || ""}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    placeholder="Phone number"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactType">Contact Type *</Label>
                  <Select
                    value={formData.contactType || "clients"}
                    onValueChange={(value: ContactType) => setFormData({ ...formData, contactType: value })}
                  >
                    <SelectTrigger id="contactType" data-testid="select-contact-type">
                      <SelectValue placeholder="Select contact type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">Clients</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="providers_rep">Providers Rep</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Select
                    value={(() => {
                      const matched = getCountryByNationality(formData.nationality || "");
                      return matched ? matched.nationality : (formData.nationality || "");
                    })()}
                    onValueChange={(value) => setFormData({ ...formData, nationality: value })}
                  >
                    <SelectTrigger id="nationality" data-testid="select-nationality">
                      <SelectValue placeholder="Select nationality">
                        {formData.nationality && (() => {
                          const matched = getCountryByNationality(formData.nationality);
                          if (matched) {
                            return (
                              <span className="flex items-center gap-2">
                                <img 
                                  src={getFlagUrl(matched.code)} 
                                  alt={matched.name}
                                  className="w-5 h-4 object-cover rounded-sm"
                                />
                                {matched.nationality}
                              </span>
                            );
                          }
                          return formData.nationality;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {formData.nationality && !getCountryByNationality(formData.nationality) && (
                        <SelectItem value={formData.nationality}>{formData.nationality}</SelectItem>
                      )}
                      {NATIONALITIES_SORTED.map((country) => (
                        <SelectItem key={country.code} value={country.nationality}>
                          <span className="flex items-center gap-2">
                            <img 
                              src={getFlagUrl(country.code)} 
                              alt={country.name}
                              className="w-5 h-4 object-cover rounded-sm"
                            />
                            {country.nationality}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country of Residence</Label>
                <Select
                  value={(() => {
                    const matched = getCountryByName(formData.country || "");
                    return matched ? matched.name : (formData.country || "");
                  })()}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger id="country" data-testid="select-country">
                    <SelectValue placeholder="Select country">
                      {formData.country && (() => {
                        const matched = getCountryByName(formData.country);
                        if (matched) {
                          return (
                            <span className="flex items-center gap-2">
                              <img 
                                src={getFlagUrl(matched.code)} 
                                alt={matched.name}
                                className="w-5 h-4 object-cover rounded-sm"
                              />
                              {matched.name}
                            </span>
                          );
                        }
                        return formData.country;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {formData.country && !getCountryByName(formData.country) && (
                      <SelectItem value={formData.country}>{formData.country}</SelectItem>
                    )}
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        <span className="flex items-center gap-2">
                          <img 
                            src={getFlagUrl(country.code)} 
                            alt={country.name}
                            className="w-5 h-4 object-cover rounded-sm"
                          />
                          {country.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm">
          <Card>
            <CardHeader>
              <CardTitle>CRM Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientStatus">Client Status</Label>
                  <Select
                    value={formData.clientStatus || "lead"}
                    onValueChange={(value: ClientStatus) => setFormData({ ...formData, clientStatus: value })}
                  >
                    <SelectTrigger id="clientStatus" data-testid="select-client-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entrySource">Entry Source</Label>
                  <Select
                    value={formData.entrySource || ""}
                    onValueChange={(value: EntrySource) => setFormData({ ...formData, entrySource: value })}
                  >
                    <SelectTrigger id="entrySource" data-testid="select-entry-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {entrySourceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadRating">Lead Rating</Label>
                  <Select
                    value={formData.leadRating || ""}
                    onValueChange={(value: LeadRating) => setFormData({ ...formData, leadRating: value })}
                  >
                    <SelectTrigger id="leadRating" data-testid="select-lead-rating">
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadRatingOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="interestedIn">Interested In</Label>
                <Input
                  id="interestedIn"
                  value={formData.interestedIn || ""}
                  onChange={(e) => setFormData({ ...formData, interestedIn: e.target.value })}
                  placeholder="What courses or programs is this contact interested in?"
                  data-testid="input-interested-in"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courseName">Course Name</Label>
                  <Input
                    id="courseName"
                    value={formData.courseName || ""}
                    onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                    placeholder="Specific course name if known"
                    data-testid="input-course-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseUrl">Course URL</Label>
                  <Input
                    id="courseUrl"
                    value={formData.courseUrl || ""}
                    onChange={(e) => setFormData({ ...formData, courseUrl: e.target.value })}
                    placeholder="Link to course page"
                    data-testid="input-course-url"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitNo">Unit No.</Label>
                  <Input
                    id="unitNo"
                    value={formData.unitNo || ""}
                    onChange={(e) => setFormData({ ...formData, unitNo: e.target.value })}
                    placeholder="Unit or apartment number"
                    data-testid="input-unit-no"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.street || ""}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Street address"
                    data-testid="input-street"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suburb">Suburb</Label>
                  <Input
                    id="suburb"
                    value={formData.suburb || ""}
                    onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                    placeholder="Suburb or district"
                    data-testid="input-suburb"
                  />
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State / Province</Label>
                  <Input
                    id="state"
                    value={formData.state || ""}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state or province"
                    data-testid="input-state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={formData.postcode || ""}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    placeholder="Enter postcode"
                    data-testid="input-postcode"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressCountry">Country</Label>
                  <Select
                    value={(() => {
                      const matched = getCountryByName(formData.country || "");
                      return matched ? matched.name : (formData.country || "");
                    })()}
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger id="addressCountry" data-testid="select-address-country">
                      <SelectValue placeholder="Select country">
                        {formData.country && (() => {
                          const matched = getCountryByName(formData.country);
                          if (matched) {
                            return (
                              <span className="flex items-center gap-2">
                                <img 
                                  src={getFlagUrl(matched.code)} 
                                  alt={matched.name}
                                  className="w-5 h-4 object-cover rounded-sm"
                                />
                                {matched.name}
                              </span>
                            );
                          }
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
                          <span className="flex items-center gap-2">
                            <img 
                              src={getFlagUrl(c.code)} 
                              alt={c.name}
                              className="w-5 h-4 object-cover rounded-sm"
                            />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName || ""}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    placeholder="Emergency contact full name"
                    data-testid="input-emergency-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactMobile">Emergency Contact Mobile</Label>
                  <Input
                    id="emergencyContactMobile"
                    value={formData.emergencyContactMobile || ""}
                    onChange={(e) => setFormData({ ...formData, emergencyContactMobile: e.target.value })}
                    placeholder="Emergency contact mobile"
                    data-testid="input-emergency-mobile"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                  <Input
                    id="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship || ""}
                    onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                    placeholder="e.g., Parent, Spouse, Sibling"
                    data-testid="input-emergency-relationship"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactAddress">Emergency Contact Address</Label>
                  <Input
                    id="emergencyContactAddress"
                    value={formData.emergencyContactAddress || ""}
                    onChange={(e) => setFormData({ ...formData, emergencyContactAddress: e.target.value })}
                    placeholder="Emergency contact address"
                    data-testid="input-emergency-address"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the contact..."
                  className="min-h-[120px]"
                  data-testid="input-notes"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isEditing && roleNeedsInstitution(formData.contactType) && (
          <TabsContent value="role-details">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Institution Affiliations
                  </CardTitle>
                  <Dialog open={showAddInstitution} onOpenChange={setShowAddInstitution}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-institution-link">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Institution
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Link to Institution</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Institution *</Label>
                          <Select
                            value={newInstitutionId?.toString() || ""}
                            onValueChange={(value) => setNewInstitutionId(parseInt(value))}
                          >
                            <SelectTrigger data-testid="select-institution">
                              <SelectValue placeholder="Select institution" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableInstitutions.map((inst) => (
                                <SelectItem key={inst.id} value={inst.id.toString()}>
                                  {inst.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Role Title</Label>
                          <Input
                            placeholder="e.g., Marketing Officer, Admissions Manager"
                            value={newRoleTitle}
                            onChange={(e) => setNewRoleTitle(e.target.value)}
                            data-testid="input-new-role-title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Department</Label>
                          <Input
                            placeholder="e.g., Marketing, Admissions"
                            value={newDepartment}
                            onChange={(e) => setNewDepartment(e.target.value)}
                            data-testid="input-new-department"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleAddInstitutionLink}
                          disabled={addInstitutionLinkMutation.isPending}
                          data-testid="button-confirm-add-institution"
                        >
                          {addInstitutionLinkMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
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
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card gap-3"
                        data-testid={`institution-link-${link.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate" data-testid={`text-institution-name-${link.id}`}>
                              {link.institution?.name || "Unknown Institution"}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {link.roleTitle && (
                                <Badge variant="secondary" data-testid={`badge-role-title-${link.id}`}>
                                  {link.roleTitle}
                                </Badge>
                              )}
                              {link.department && (
                                <span className="text-sm text-muted-foreground" data-testid={`text-department-${link.id}`}>
                                  {link.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInstitutionLinkMutation.mutate(link.institutionId)}
                          disabled={removeInstitutionLinkMutation.isPending}
                          data-testid={`button-remove-institution-${link.id}`}
                        >
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

      <div className="flex justify-end gap-2 mt-6 sm:hidden">
        <Button variant="outline" onClick={() => navigate("/admin/dashboard")} data-testid="button-cancel-mobile">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading} data-testid="button-save-contact-mobile">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
