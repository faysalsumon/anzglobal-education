import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, X, Star, Search, Plus, User } from "lucide-react";

const CONTACT_ROLES = [
  { value: "primary", label: "Primary Contact" },
  { value: "academic", label: "Academic Contact" },
  { value: "finance", label: "Finance Contact" },
  { value: "marketing", label: "Marketing Contact" },
  { value: "admissions", label: "Admissions Contact" },
  { value: "international", label: "International Contact" },
  { value: "other", label: "Other" },
];

interface CrmContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  mobile?: string | null;
  contactType: string;
}

interface InstitutionContact {
  id: string;
  institutionId: string;
  contactId: string;
  contactRole: string;
  isPrimary: boolean;
  notes: string | null;
  contact: CrmContact | null;
}

interface InstitutionContactsPanelProps {
  institutionId: string;
  institutionName: string;
}

export function InstitutionContactsPanel({ institutionId, institutionName }: InstitutionContactsPanelProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactRole, setContactRole] = useState("other");
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState("");

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newMobile, setNewMobile] = useState("");

  const { data: contacts = [], isLoading } = useQuery<InstitutionContact[]>({
    queryKey: ["/api/admin/institution-crm/institutions", institutionId, "contacts"],
    enabled: !!institutionId,
  });

  const { data: availableContacts = [] } = useQuery<CrmContact[]>({
    queryKey: ["/api/crm/contacts?contactType=providers_rep"],
  });

  const createCrmContactMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; phone?: string; mobile?: string; contactType: string }) => {
      const response = await apiRequest("POST", "/api/crm/contacts", data);
      return response.json();
    },
    onSuccess: (newContact: any) => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/crm/contacts');
      }});
      addContactMutation.mutate({
        contactId: newContact.id,
        contactRole,
        isPrimary,
        notes,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create contact",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (data: { contactId: string; contactRole: string; isPrimary: boolean; notes: string }) => {
      return apiRequest("POST", `/api/admin/institution-crm/institutions/${institutionId}/contacts`, data);
    },
    onSuccess: () => {
      toast({ title: "Contact added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/institution-crm/institutions", institutionId, "contacts"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add contact",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const removeContactMutation = useMutation({
    mutationFn: async (contactLinkId: string) => {
      return apiRequest("DELETE", `/api/admin/institution-crm/institutions/${institutionId}/contacts/${contactLinkId}`);
    },
    onSuccess: () => {
      toast({ title: "Contact removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/institution-crm/institutions", institutionId, "contacts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove contact",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedContactId(null);
    setContactRole("other");
    setIsPrimary(false);
    setNotes("");
    setSearchQuery("");
    setActiveTab("existing");
    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setNewPhone("");
    setNewMobile("");
  };

  const filteredAvailableContacts = (availableContacts || []).filter((contact) => {
    const isAlreadyLinked = contacts.some((c) => c.contactId === contact.id);
    if (isAlreadyLinked) return false;
    if (!searchQuery) return true;
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || contact.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddExistingContact = () => {
    if (!selectedContactId) {
      toast({ title: "Please select a contact", variant: "destructive" });
      return;
    }
    addContactMutation.mutate({
      contactId: selectedContactId,
      contactRole,
      isPrimary,
      notes,
    });
  };

  const handleCreateNewContact = () => {
    if (!newFirstName || !newLastName || !newEmail) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    createCrmContactMutation.mutate({
      firstName: newFirstName,
      lastName: newLastName,
      email: newEmail,
      phone: newPhone || undefined,
      mobile: newMobile || undefined,
      contactType: "providers_rep",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "primary": return "default";
      case "academic": return "secondary";
      case "finance": return "outline";
      case "marketing": return "secondary";
      default: return "outline";
    }
  };

  const isSubmitting = addContactMutation.isPending || createCrmContactMutation.isPending;

  return (
    <Card data-testid="card-institution-contacts">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Institution Contacts
            </CardTitle>
            <CardDescription>Manage contacts associated with this institution</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-institution-contact">
                <Plus className="h-4 w-4 mr-1" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Contact to {institutionName}</DialogTitle>
              </DialogHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing" data-testid="tab-existing-contact">
                    <Search className="h-4 w-4 mr-1" />
                    Existing Contact
                  </TabsTrigger>
                  <TabsTrigger value="new" data-testid="tab-new-contact">
                    <User className="h-4 w-4 mr-1" />
                    Create New
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="existing" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Search Contacts</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-contacts"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Contact</Label>
                    <Select value={selectedContactId || ""} onValueChange={setSelectedContactId}>
                      <SelectTrigger data-testid="select-contact">
                        <SelectValue placeholder="Choose a contact..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAvailableContacts.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No available contacts found
                          </div>
                        ) : (
                          filteredAvailableContacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id} data-testid={`option-contact-${contact.id}`}>
                              {contact.firstName} {contact.lastName} ({contact.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="new" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        placeholder="First name"
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        data-testid="input-new-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        placeholder="Last name"
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        data-testid="input-new-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      data-testid="input-new-email"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="Phone number"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        data-testid="input-new-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile</Label>
                      <Input
                        placeholder="Mobile number"
                        value={newMobile}
                        onChange={(e) => setNewMobile(e.target.value)}
                        data-testid="input-new-mobile"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="space-y-4 pt-4 border-t mt-4">
                <div className="space-y-2">
                  <Label>Contact Role</Label>
                  <Select value={contactRole} onValueChange={setContactRole}>
                    <SelectTrigger data-testid="select-contact-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value} data-testid={`option-role-${role.value}`}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded border-border"
                    data-testid="checkbox-is-primary"
                  />
                  <Label htmlFor="isPrimary" className="font-normal cursor-pointer">
                    Set as primary contact for this role
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Add any notes about this contact..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    data-testid="textarea-contact-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-add-contact">
                  Cancel
                </Button>
                <Button
                  onClick={activeTab === "existing" ? handleAddExistingContact : handleCreateNewContact}
                  disabled={isSubmitting || (activeTab === "existing" && !selectedContactId) || (activeTab === "new" && (!newFirstName || !newLastName || !newEmail))}
                  data-testid="button-confirm-add-contact"
                >
                  {isSubmitting ? "Adding..." : activeTab === "existing" ? "Add Contact" : "Create & Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-contacts">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-contacts">
            No contacts linked to this institution yet. Click "Add Contact" to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card gap-2"
                data-testid={`contact-item-${link.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                    {link.contact?.firstName?.[0]}{link.contact?.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-contact-name-${link.id}`}>
                        {link.contact?.firstName} {link.contact?.lastName}
                      </span>
                      {link.isPrimary && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate" data-testid={`text-contact-email-${link.id}`}>{link.contact?.email}</div>
                    {link.contact?.phone && (
                      <div className="text-sm text-muted-foreground" data-testid={`text-contact-phone-${link.id}`}>{link.contact.phone}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={getRoleBadgeColor(link.contactRole) as any} data-testid={`badge-role-${link.id}`}>
                    {CONTACT_ROLES.find((r) => r.value === link.contactRole)?.label || link.contactRole}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeContactMutation.mutate(link.id)}
                    disabled={removeContactMutation.isPending}
                    data-testid={`button-remove-contact-${link.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
