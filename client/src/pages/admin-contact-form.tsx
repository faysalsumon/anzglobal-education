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
import { ArrowLeft, Save, Loader2 } from "lucide-react";

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

type ContactType = 'clients' | 'employee' | 'external' | 'others' | 'partner' | 'providers_rep';
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
  email: string;
  mobile: string | null;
  phone: string | null;
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

  const { data: currentUser } = useQuery<{ id: string; firstName: string; lastName: string }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: admins } = useQuery<{ id: string; firstName: string; lastName: string }[]>({
    queryKey: ["/api/super-admin/users", "admin"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/super-admin/users?userType=admin", { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch admins");
      return response.json();
    },
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

  useEffect(() => {
    if (existingContact) {
      setFormData(existingContact);
    }
  }, [existingContact]);

  useEffect(() => {
    if (!isEditing && currentUser && !formData.assignedTo) {
      setFormData(prev => ({
        ...prev,
        assignedTo: currentUser.id,
        contactOwner: currentUser.id,
      }));
    }
  }, [currentUser, isEditing, formData.assignedTo]);

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
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
          <TabsTrigger value="crm" data-testid="tab-crm">CRM Details</TabsTrigger>
          <TabsTrigger value="address" data-testid="tab-address">Address</TabsTrigger>
          <TabsTrigger value="emergency" data-testid="tab-emergency">Emergency</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <SelectItem value="employee">Employee</SelectItem>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select
                  value={formData.assignedTo || ""}
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                >
                  <SelectTrigger id="assignedTo" data-testid="select-assigned-to">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {admins?.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.firstName} {admin.lastName}
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
                  <Label htmlFor="country">Country</Label>
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
