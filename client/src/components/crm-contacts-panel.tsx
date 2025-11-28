import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  Trash2,
  Edit,
  Eye,
  ChevronLeft,
  Building2,
  Globe
} from "lucide-react";
import { format } from "date-fns";

interface CrmContact {
  id: string;
  photo: string | null;
  contactType: 'none' | 'clients' | 'employee' | 'external' | 'internal' | 'others' | 'partner' | 'providers_rep';
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
  phone: string | null;
  skype: string | null;
  nationality: string | null;
  country: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  notes: string | null;
  contactOwner: string | null;
  sourceLeadId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  ownerUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl: string | null;
  } | null;
  sourceLead?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

const contactTypeLabels: Record<string, string> = {
  none: "None",
  clients: "Clients",
  employee: "Employee",
  external: "External",
  internal: "Internal",
  others: "Others",
  partner: "Partner",
  providers_rep: "Providers Rep",
};

const contactTypeColors: Record<string, string> = {
  none: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  clients: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  employee: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  external: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  internal: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  others: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  partner: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  providers_rep: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

export function CrmContactsPanel() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CrmContact>>({});

  const { data: contactsData, isLoading } = useQuery<{
    contacts: CrmContact[];
    total: number;
  }>({
    queryKey: ["/api/crm/contacts", typeFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (searchQuery) params.append("search", searchQuery);
      const response = await fetch(`/api/crm/contacts?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  const { data: contactDetail } = useQuery<CrmContact>({
    queryKey: ["/api/crm/contacts", selectedContact?.id],
    queryFn: async () => {
      const response = await fetch(`/api/crm/contacts/${selectedContact?.id}`, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch contact details");
      return response.json();
    },
    enabled: !!selectedContact?.id,
  });

  const { data: admins } = useQuery<{ id: string; firstName: string; lastName: string }[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users?userType=admin", { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch admins");
      const data = await response.json();
      return data.users || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CrmContact>) => {
      return apiRequest("POST", "/api/crm/contacts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setIsCreateOpen(false);
      setFormData({});
      toast({ title: "Contact created", description: "New contact has been added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create contact", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CrmContact> }) => {
      return apiRequest("PATCH", `/api/crm/contacts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setIsEditOpen(false);
      setFormData({});
      toast({ title: "Contact updated", description: "Contact has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update contact", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/crm/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setIsDeleteOpen(false);
      setSelectedContact(null);
      toast({ title: "Contact deleted", description: "Contact has been removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete contact", variant: "destructive" });
    },
  });

  const handleCreateContact = () => {
    createMutation.mutate(formData);
  };

  const handleUpdateContact = () => {
    if (selectedContact) {
      updateMutation.mutate({ id: selectedContact.id, data: formData });
    }
  };

  const handleDeleteContact = () => {
    if (selectedContact) {
      deleteMutation.mutate(selectedContact.id);
    }
  };

  const openEditDialog = (contact: CrmContact) => {
    setFormData({ ...contact });
    setSelectedContact(contact);
    setIsEditOpen(true);
  };

  if (selectedContact && !isEditOpen && !isDeleteOpen) {
    return (
      <ContactDetailView
        contact={contactDetail || selectedContact}
        onBack={() => setSelectedContact(null)}
        onEdit={() => openEditDialog(selectedContact)}
        onDelete={() => setIsDeleteOpen(true)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-crm-contacts-title">CRM Contacts</h2>
          <p className="text-muted-foreground">Manage your contact database</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-contact">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-contacts"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                <SelectValue placeholder="Contact Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="clients">Clients</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="external">External</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="providers_rep">Providers Rep</SelectItem>
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
          ) : contactsData?.contacts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found. Create your first contact to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {contactsData?.contacts?.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => setSelectedContact(contact)}
                  data-testid={`card-contact-${contact.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.photo || undefined} />
                    <AvatarFallback>
                      {contact.firstName?.[0]}{contact.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" data-testid={`text-contact-name-${contact.id}`}>
                        {contact.firstName} {contact.lastName}
                      </span>
                      <Badge variant="outline" className={contactTypeColors[contact.contactType]}>
                        {contactTypeLabels[contact.contactType]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                      {contact.mobile && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.mobile}
                        </span>
                      )}
                      {contact.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {contact.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {contact.createdAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(contact.createdAt), "MMM d, yyyy")}
                      </div>
                    )}
                    {contact.ownerUser && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        {contact.ownerUser.firstName} {contact.ownerUser.lastName}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedContact(contact); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ContactFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create New Contact"
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateContact}
        isLoading={createMutation.isPending}
        admins={admins || []}
      />

      <ContactFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit Contact"
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleUpdateContact}
        isLoading={updateMutation.isPending}
        admins={admins || []}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  formData: Partial<CrmContact>;
  setFormData: (data: Partial<CrmContact>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  admins: { id: string; firstName: string; lastName: string }[];
}

function ContactFormDialog({
  open,
  onOpenChange,
  title,
  formData,
  setFormData,
  onSubmit,
  isLoading,
  admins,
}: ContactFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName || ""}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName || ""}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input
                  value={formData.mobile || ""}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  data-testid="input-mobile"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="input-phone"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Type</Label>
                <Select
                  value={formData.contactType || "none"}
                  onValueChange={(value: any) => setFormData({ ...formData, contactType: value })}
                >
                  <SelectTrigger data-testid="select-contact-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="clients">Clients</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="providers_rep">Providers Rep</SelectItem>
                    <SelectItem value="others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input
                  value={formData.nationality || ""}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  data-testid="input-nationality"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact Owner</Label>
              <Select
                value={formData.contactOwner || ""}
                onValueChange={(value) => setFormData({ ...formData, contactOwner: value })}
              >
                <SelectTrigger data-testid="select-contact-owner">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.firstName} {admin.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Skype</Label>
              <Input
                value={formData.skype || ""}
                onChange={(e) => setFormData({ ...formData, skype: e.target.value })}
                data-testid="input-skype"
              />
            </div>
          </TabsContent>
          <TabsContent value="address" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input
                value={formData.addressLine1 || ""}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                data-testid="input-address1"
              />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input
                value={formData.addressLine2 || ""}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                data-testid="input-address2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.state || ""}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  data-testid="input-state"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input
                  value={formData.postalCode || ""}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  data-testid="input-postal-code"
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={formData.country || ""}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  data-testid="input-country"
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="emergency" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Emergency Contact Name</Label>
              <Input
                value={formData.emergencyContactName || ""}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                data-testid="input-emergency-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Emergency Contact Phone</Label>
                <Input
                  value={formData.emergencyContactPhone || ""}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  data-testid="input-emergency-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input
                  value={formData.emergencyContactRelation || ""}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                  data-testid="input-emergency-relation"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the contact..."
                data-testid="input-notes"
              />
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ContactDetailViewProps {
  contact: CrmContact;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ContactDetailView({ contact, onBack, onEdit, onDelete }: ContactDetailViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-12 w-12">
          <AvatarImage src={contact.photo || undefined} />
          <AvatarFallback>{contact.firstName?.[0]}{contact.lastName?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-2xl font-bold" data-testid="text-contact-detail-name">
            {contact.firstName} {contact.lastName}
          </h2>
          <p className="text-muted-foreground">{contact.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit} data-testid="button-edit-contact">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={onDelete} data-testid="button-delete-contact">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={contactTypeColors[contact.contactType]}>
          {contactTypeLabels[contact.contactType]}
        </Badge>
        {contact.nationality && <Badge variant="secondary">{contact.nationality}</Badge>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{contact.email}</span>
            </div>
            {contact.mobile && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contact.mobile} (Mobile)</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.skype && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>Skype: {contact.skype}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.addressLine1 || contact.city ? (
              <>
                {contact.addressLine1 && <p>{contact.addressLine1}</p>}
                {contact.addressLine2 && <p>{contact.addressLine2}</p>}
                {(contact.city || contact.state || contact.postalCode) && (
                  <p>{[contact.city, contact.state, contact.postalCode].filter(Boolean).join(", ")}</p>
                )}
                {contact.country && <p>{contact.country}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">No address on file</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.ownerUser && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Owner</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={contact.ownerUser.profileImageUrl || undefined} />
                    <AvatarFallback>{contact.ownerUser.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                  <span>{contact.ownerUser.firstName} {contact.ownerUser.lastName}</span>
                </div>
              </div>
            )}
            {contact.createdAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(contact.createdAt), "MMM d, yyyy")}</span>
              </div>
            )}
            {contact.sourceLead && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source Lead</span>
                <span>{contact.sourceLead.firstName} {contact.sourceLead.lastName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.emergencyContactName ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>{contact.emergencyContactName}</span>
                </div>
                {contact.emergencyContactPhone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{contact.emergencyContactPhone}</span>
                  </div>
                )}
                {contact.emergencyContactRelation && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Relationship</span>
                    <span>{contact.emergencyContactRelation}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No emergency contact on file</p>
            )}
          </CardContent>
        </Card>

        {contact.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{contact.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
