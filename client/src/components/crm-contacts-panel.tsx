import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";

// Helper to get auth headers for fetch requests
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  }
  return headers;
}

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
  Globe,
  List,
  LayoutGrid,
  Filter,
  ChevronDown,
  X,
  GripVertical,
  MessageCircle,
  GraduationCap,
  ExternalLink,
  FileText,
  Clock
} from "lucide-react";
import { format } from "date-fns";

type ContactType = 'none' | 'clients' | 'external' | 'internal' | 'others' | 'partner' | 'providers_rep';
type ClientStatus = 'lead' | 'applicant' | 'enrolled' | 'completed' | 'inactive';
type EntrySource = 'website' | 'consultant' | 'sub_agent' | 'affiliate' | 'import' | 'referral' | 'facebook_ads' | 'other';
type LeadRating = 'cold' | 'warm' | 'hot';
type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

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
  gender: Gender | null;
  email: string;
  mobile: string | null;
  phone: string | null;
  whatsapp: string | null;
  nationality: string | null;
  country: string | null;
  city: string | null;
  regionId: string | null;
  branchId: string | null;
  unitNo: string | null;
  street: string | null;
  suburb: string | null;
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
  courseId: string | null;
  universityId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  lastActivityTime: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl: string | null;
  } | null;
  updatedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl: string | null;
  } | null;
  ownerUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl: string | null;
  } | null;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl: string | null;
  } | null;
  region?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
  sourceLead?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface InstitutionLink {
  id: string;
  institutionId: string;
  contactId: string;
  contactRole: string;
  roleTitle: string | null;
  department: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string | null;
  institution: {
    id: string;
    name: string;
    logo: string | null;
    country: string | null;
  } | null;
}

interface ContactApplication {
  id: string;
  courseId: string;
  currentStage: string;
  status: string;
  submittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  courseName: string | null;
  courseLevel: string | null;
  universityName: string | null;
  universityLogo: string | null;
  assignedConsultant: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  } | null;
}

const contactTypeLabels: Record<string, string> = {
  none: "None",
  clients: "Clients (Students)",
  external: "External (Referrals)",
  internal: "Internal",
  others: "Others",
  partner: "Partner",
  providers_rep: "Providers Rep",
};

const contactTypeColors: Record<string, string> = {
  none: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  clients: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  external: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  internal: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  others: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  partner: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  providers_rep: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

const clientStatusLabels: Record<string, string> = {
  lead: "Lead",
  applicant: "Applicant",
  enrolled: "Enrolled",
  completed: "Completed",
  inactive: "Inactive",
};

const clientStatusColors: Record<string, string> = {
  lead: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  applicant: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  enrolled: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const entrySourceLabels: Record<string, string> = {
  website: "Website",
  consultant: "Consultant",
  sub_agent: "Sub-Agent",
  affiliate: "Affiliate",
  import: "Import",
  referral: "Referral",
  facebook_ads: "Facebook Ads",
  other: "Other",
};

const entrySourceColors: Record<string, string> = {
  website: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  consultant: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sub_agent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  affiliate: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  import: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  referral: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  facebook_ads: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const leadRatingLabels: Record<string, string> = {
  cold: "Cold",
  warm: "Warm",
  hot: "Hot",
};

const leadRatingColors: Record<string, string> = {
  cold: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  warm: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  hot: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const KANBAN_TYPES: ContactType[] = ['clients', 'external', 'internal', 'partner', 'providers_rep', 'others'];
const KANBAN_CLIENT_STATUSES: ClientStatus[] = ['lead', 'applicant', 'enrolled', 'completed', 'inactive'];

export function CrmContactsPanel() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [clientStatusFilter, setClientStatusFilter] = useState<string>("all");
  const [entrySourceFilter, setEntrySourceFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [kanbanMode, setKanbanMode] = useState<'type' | 'status'>('status');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: contactsData, isLoading } = useQuery<{
    contacts: CrmContact[];
    total: number;
  }>({
    queryKey: ["/api/crm/contacts", typeFilter, clientStatusFilter, entrySourceFilter, searchQuery, countryFilter, nationalityFilter, assignedFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (clientStatusFilter !== "all") params.append("clientStatus", clientStatusFilter);
      if (entrySourceFilter !== "all") params.append("entrySource", entrySourceFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (countryFilter !== "all") params.append("country", countryFilter);
      if (nationalityFilter !== "all") params.append("nationality", nationalityFilter);
      if (assignedFilter !== "all") {
        if (assignedFilter === "unassigned") {
          params.append("unassigned", "true");
        } else {
          params.append("assignedTo", assignedFilter);
        }
      }
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/contacts?${params.toString()}`, { 
        credentials: 'include',
        headers 
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  const { data: contactDetail } = useQuery<CrmContact>({
    queryKey: ["/api/crm/contacts", selectedContact?.id],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/contacts/${selectedContact?.id}`, { 
        credentials: 'include',
        headers 
      });
      if (!response.ok) throw new Error("Failed to fetch contact details");
      return response.json();
    },
    enabled: !!selectedContact?.id,
  });

  const { data: admins } = useQuery<{ id: string; firstName: string; lastName: string }[]>({
    queryKey: ["/api/super-admin/users", "admin"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/super-admin/users?userType=admin", { 
        credentials: 'include',
        headers 
      });
      if (!response.ok) throw new Error("Failed to fetch admins");
      const data = await response.json();
      return data.users || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CrmContact> }) => {
      return apiRequest("PATCH", `/api/crm/contacts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
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

  const handleDeleteContact = () => {
    if (selectedContact) {
      deleteMutation.mutate(selectedContact.id);
    }
  };

  const openEditPage = (contact: CrmContact) => {
    navigate(`/admin/contacts/${contact.id}/edit`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over) return;
    
    const contactId = active.id as string;
    const overId = over.id as string;
    
    // Check if we're in status mode
    if (kanbanMode === 'status') {
      let newStatus: ClientStatus | undefined;
      
      // Check if dropped directly on a status column
      if (overId.startsWith('status-')) {
        newStatus = overId.replace('status-', '') as ClientStatus;
      } else if (over.data.current?.sortable) {
        // Dropped on another contact card - get the container ID
        const containerId = over.data.current.sortable.containerId as string;
        if (containerId.startsWith('status-')) {
          newStatus = containerId.replace('status-', '') as ClientStatus;
        }
      } else {
        // Fallback: find which status column the target contact belongs to
        const targetContact = contactsData?.contacts?.find(c => c.id === overId);
        if (targetContact?.clientStatus) {
          newStatus = targetContact.clientStatus as ClientStatus;
        }
      }
      
      if (!newStatus || !KANBAN_CLIENT_STATUSES.includes(newStatus)) return;
      
      const contact = contactsData?.contacts?.find(c => c.id === contactId);
      if (contact && contact.clientStatus !== newStatus) {
        updateMutation.mutate({ 
          id: contactId, 
          data: { clientStatus: newStatus } 
        });
      }
    } else {
      // Type mode
      let newType: ContactType | undefined;
      
      if (KANBAN_TYPES.includes(overId as ContactType)) {
        newType = overId as ContactType;
      } else if (over.data.current?.sortable) {
        newType = over.data.current.sortable.containerId as ContactType;
      } else {
        // Fallback: find which type column the target contact belongs to
        const targetContact = contactsData?.contacts?.find(c => c.id === overId);
        if (targetContact?.contactType) {
          newType = targetContact.contactType as ContactType;
        }
      }
      
      if (!newType) return;
      
      const contact = contactsData?.contacts?.find(c => c.id === contactId);
      if (contact && contact.contactType !== newType) {
        updateMutation.mutate({ 
          id: contactId, 
          data: { contactType: newType } 
        });
      }
    }
  };

  const getContactsByType = (type: ContactType) => {
    return contactsData?.contacts?.filter(contact => contact.contactType === type) || [];
  };

  const clearAllFilters = () => {
    setTypeFilter("all");
    setClientStatusFilter("all");
    setEntrySourceFilter("all");
    setCountryFilter("all");
    setNationalityFilter("all");
    setAssignedFilter("all");
    setSearchQuery("");
  };

  const activeFiltersCount = [typeFilter, clientStatusFilter, entrySourceFilter, countryFilter, nationalityFilter, assignedFilter]
    .filter(f => f !== 'all').length;
  
  const getContactsByClientStatus = (status: ClientStatus) => {
    return contactsData?.contacts?.filter(contact => contact.clientStatus === status) || [];
  };

  const uniqueCountries = Array.from(new Set(contactsData?.contacts?.map(c => c.country).filter(Boolean) || []));
  const uniqueNationalities = Array.from(new Set(contactsData?.contacts?.map(c => c.nationality).filter(Boolean) || []));

  if (selectedContact && !isDeleteOpen) {
    return (
      <ContactDetailView
        contact={contactDetail || selectedContact}
        onBack={() => setSelectedContact(null)}
        onEdit={() => openEditPage(selectedContact)}
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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              data-testid="button-view-kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          {viewMode === 'kanban' && (
            <Select value={kanbanMode} onValueChange={(v) => setKanbanMode(v as 'type' | 'status')}>
              <SelectTrigger className="w-[140px]" data-testid="select-kanban-mode">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">By Status</SelectItem>
                <SelectItem value="type">By Type</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => navigate("/admin/contacts/new")} data-testid="button-create-contact">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-contacts"
          />
        </div>
        <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-client-status-filter">
            <SelectValue placeholder="Client Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="applicant">Applicant</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
            <SelectValue placeholder="Contact Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="clients">Clients (Students)</SelectItem>
            <SelectItem value="external">External (Referrals)</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="providers_rep">Providers Rep</SelectItem>
            <SelectItem value="others">Others</SelectItem>
          </SelectContent>
        </Select>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" data-testid="button-more-filters">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
              )}
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} data-testid="button-clear-filters">
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Entry Source</Label>
                <Select value={entrySourceFilter} onValueChange={setEntrySourceFilter}>
                  <SelectTrigger data-testid="select-entry-source-filter">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="sub_agent">Sub-Agent</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger data-testid="select-country-filter">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {uniqueCountries.map((country) => (
                      <SelectItem key={country} value={country!}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                  <SelectTrigger data-testid="select-nationality-filter">
                    <SelectValue placeholder="All Nationalities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Nationalities</SelectItem>
                    {uniqueNationalities.map((nationality) => (
                      <SelectItem key={nationality} value={nationality!}>{nationality}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                  <SelectTrigger data-testid="select-assigned-filter">
                    <SelectValue placeholder="All Team Members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Members</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {admins?.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.firstName} {admin.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
      ) : viewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setActiveDragId(event.active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanMode === 'status' ? (
              KANBAN_CLIENT_STATUSES.map((status) => (
                <KanbanStatusColumn
                  key={status}
                  status={status}
                  contacts={getContactsByClientStatus(status)}
                  onSelectContact={setSelectedContact}
                />
              ))
            ) : (
              KANBAN_TYPES.map((type) => (
                <KanbanColumn
                  key={type}
                  type={type}
                  contacts={getContactsByType(type)}
                  onSelectContact={setSelectedContact}
                />
              ))
            )}
          </div>
          <DragOverlay>
            {activeDragId ? (
              <KanbanContactCardOverlay
                contact={contactsData?.contacts?.find(c => c.id === activeDragId)!}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium" data-testid={`text-contact-name-${contact.id}`}>
                    {contact.firstName} {contact.lastName}
                  </span>
                  {contact.clientStatus && (
                    <Badge variant="outline" className={clientStatusColors[contact.clientStatus]} data-testid={`badge-status-${contact.id}`}>
                      {clientStatusLabels[contact.clientStatus]}
                    </Badge>
                  )}
                  <Badge variant="outline" className={contactTypeColors[contact.contactType]}>
                    {contactTypeLabels[contact.contactType]}
                  </Badge>
                  {contact.leadRating && (
                    <Badge variant="secondary" className={leadRatingColors[contact.leadRating]}>
                      {leadRatingLabels[contact.leadRating]}
                    </Badge>
                  )}
                  {contact.entrySource && (
                    <Badge variant="secondary" className={`text-xs ${entrySourceColors[contact.entrySource]}`}>
                      {entrySourceLabels[contact.entrySource]}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
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
                  {contact.country && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {contact.country}
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

function KanbanColumn({ 
  type, 
  contacts, 
  onSelectContact 
}: { 
  type: ContactType; 
  contacts: CrmContact[]; 
  onSelectContact: (contact: CrmContact) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: type,
  });

  const contactIds = contacts.map(contact => contact.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={contactTypeColors[type]}>
            {contactTypeLabels[type]}
          </Badge>
          <span className="text-sm text-muted-foreground">({contacts.length})</span>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-360px)]">
        <SortableContext id={type} items={contactIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 pr-2">
            {contacts.map((contact) => (
              <DraggableContactCard
                key={contact.id}
                contact={contact}
                onSelect={() => onSelectContact(contact)}
              />
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No contacts in this category
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

function KanbanStatusColumn({ 
  status, 
  contacts, 
  onSelectContact 
}: { 
  status: ClientStatus; 
  contacts: CrmContact[]; 
  onSelectContact: (contact: CrmContact) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `status-${status}`,
  });

  const contactIds = contacts.map(contact => contact.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
      data-testid={`kanban-column-${status}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={clientStatusColors[status]}>
            {clientStatusLabels[status]}
          </Badge>
          <span className="text-sm text-muted-foreground">({contacts.length})</span>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-360px)]">
        <SortableContext id={`status-${status}`} items={contactIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 pr-2">
            {contacts.map((contact) => (
              <DraggableContactCard
                key={contact.id}
                contact={contact}
                onSelect={() => onSelectContact(contact)}
              />
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No contacts with this status
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

function DraggableContactCard({ 
  contact, 
  onSelect,
  isDragOverlay = false
}: { 
  contact: CrmContact; 
  onSelect: () => void;
  isDragOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`p-3 cursor-pointer hover-elevate ${isDragOverlay ? 'shadow-lg' : ''}`}
      onClick={onSelect}
      data-testid={`kanban-card-contact-${contact.id}`}
    >
      <div className="flex items-start gap-2">
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={contact.photo || undefined} />
              <AvatarFallback className="text-xs">
                {contact.firstName?.[0]}{contact.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {contact.firstName} {contact.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {contact.email}
              </p>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            {contact.mobile && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span className="truncate">{contact.mobile}</span>
              </div>
            )}
            {contact.country && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span className="truncate">{contact.country}</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {contact.clientStatus && (
              <Badge variant="outline" className={`text-xs ${clientStatusColors[contact.clientStatus]}`}>
                {clientStatusLabels[contact.clientStatus]}
              </Badge>
            )}
            {contact.leadRating && (
              <Badge variant="secondary" className={`text-xs ${leadRatingColors[contact.leadRating]}`}>
                {leadRatingLabels[contact.leadRating]}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function KanbanContactCardOverlay({ contact }: { contact: CrmContact }) {
  return (
    <Card className="p-3 shadow-lg w-72">
      <div className="flex items-start gap-2">
        <div className="cursor-grabbing mt-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={contact.photo || undefined} />
              <AvatarFallback className="text-xs">
                {contact.firstName?.[0]}{contact.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {contact.firstName} {contact.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {contact.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferred Name</Label>
                <Input
                  value={formData.preferredName || ""}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  placeholder="Name to call this contact"
                  data-testid="input-preferred-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender || ""}
                  onValueChange={(value: any) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger data-testid="select-gender">
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
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-email"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input
                  value={formData.mobile || ""}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  data-testid="input-mobile"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={formData.whatsapp || ""}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="If different"
                  data-testid="input-whatsapp"
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
                    <SelectItem value="clients">Clients</SelectItem>
                    <SelectItem value="external">External</SelectItem>
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
              <Label>Assign To</Label>
              <Select
                value={formData.assignedTo || ""}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              >
                <SelectTrigger data-testid="select-assigned-to">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  {admins && admins.length > 0 ? (
                    admins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id} data-testid={`option-assign-${admin.id}`}>
                        {admin.firstName} {admin.lastName}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No team members available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
          <TabsContent value="address" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unit No.</Label>
                <Input
                  value={formData.unitNo || ""}
                  onChange={(e) => setFormData({ ...formData, unitNo: e.target.value })}
                  data-testid="input-unit-no"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={formData.street || ""}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  data-testid="input-street"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Suburb</Label>
                <Input
                  value={formData.suburb || ""}
                  onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                  data-testid="input-suburb"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  data-testid="input-city"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.state || ""}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  data-testid="input-state"
                />
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input
                  value={formData.postcode || ""}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  data-testid="input-postcode"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input
                  value={formData.emergencyContactName || ""}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  data-testid="input-emergency-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Mobile</Label>
                <Input
                  value={formData.emergencyContactMobile || ""}
                  onChange={(e) => setFormData({ ...formData, emergencyContactMobile: e.target.value })}
                  data-testid="input-emergency-mobile"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input
                  value={formData.emergencyContactRelationship || ""}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                  data-testid="input-emergency-relationship"
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Address</Label>
                <Input
                  value={formData.emergencyContactAddress || ""}
                  onChange={(e) => setFormData({ ...formData, emergencyContactAddress: e.target.value })}
                  data-testid="input-emergency-address"
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

const CONTACT_ROLES = [
  { value: "primary", label: "Primary Contact" },
  { value: "academic", label: "Academic Contact" },
  { value: "finance", label: "Finance Contact" },
  { value: "marketing", label: "Marketing Contact" },
  { value: "admissions", label: "Admissions Contact" },
  { value: "international", label: "International Contact" },
  { value: "other", label: "Other" },
];

const roleNeedsInstitution = (contactType: ContactType) => 
  ['providers_rep', 'partner', 'external'].includes(contactType);

function ContactDetailView({ contact, onBack, onEdit, onDelete }: ContactDetailViewProps) {
  const { toast } = useToast();
  const [isAddInstitutionOpen, setIsAddInstitutionOpen] = useState(false);
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [linkRole, setLinkRole] = useState("other");
  const [linkRoleTitle, setLinkRoleTitle] = useState("");
  const [linkDepartment, setLinkDepartment] = useState("");
  const [linkIsPrimary, setLinkIsPrimary] = useState(false);

  // Create Application dialog state
  const [isCreateApplicationOpen, setIsCreateApplicationOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [applicationNotes, setApplicationNotes] = useState("");

  const [, navigate] = useLocation();
  
  const { data: institutionLinks = [], isLoading: isLoadingLinks } = useQuery<InstitutionLink[]>({
    queryKey: ["/api/crm/contacts", contact.id, "institutions"],
    enabled: roleNeedsInstitution(contact.contactType),
  });

  const { data: institutionsData } = useQuery<{ universities: any[]; total: number }>({
    queryKey: ["/api/institutions", { search: institutionSearch }],
    enabled: isAddInstitutionOpen && institutionSearch.length > 1,
  });
  const institutions = institutionsData?.universities || [];

  // Fetch courses for Create Application dialog
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery<{ courses: any[]; total: number }>({
    queryKey: ["/api/courses", { search: courseSearch, limit: 20, publishStatus: 'published' }],
    enabled: isCreateApplicationOpen && courseSearch.length > 1,
  });
  const searchCourses = coursesData?.courses || [];

  // Fetch applications for this contact (only for 'clients' type)
  const { data: applicationsData, isLoading: isLoadingApplications, isError: isApplicationsError } = useQuery<{
    applications: ContactApplication[];
    studentProfile: { id: string; maxApplicationSlots: number } | null;
  }>({
    queryKey: ["/api/crm/contacts", contact.id, "applications"],
    enabled: contact.contactType === 'clients',
  });

  const addLinkMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/crm/contacts/${contact.id}/institutions`, data);
    },
    onSuccess: () => {
      toast({ title: "Institution linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts", contact.id, "institutions"] });
      setIsAddInstitutionOpen(false);
      setSelectedInstitutionId(null);
      setLinkRole("other");
      setLinkRoleTitle("");
      setLinkDepartment("");
      setLinkIsPrimary(false);
      setInstitutionSearch("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to link institution", description: error.message, variant: "destructive" });
    },
  });

  const removeLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      return apiRequest("DELETE", `/api/crm/contacts/${contact.id}/institutions/${linkId}`);
    },
    onSuccess: () => {
      toast({ title: "Institution link removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts", contact.id, "institutions"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove link", description: error.message, variant: "destructive" });
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: { courseId: string; notes?: string }) => {
      return apiRequest("POST", `/api/crm/contacts/${contact.id}/applications`, data);
    },
    onSuccess: () => {
      toast({ title: "Application created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts", contact.id, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setIsCreateApplicationOpen(false);
      setSelectedCourseId(null);
      setCourseSearch("");
      setApplicationNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to create application", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateApplication = () => {
    if (!selectedCourseId) return;
    createApplicationMutation.mutate({
      courseId: selectedCourseId,
      notes: applicationNotes || undefined,
    });
  };

  const handleAddInstitution = () => {
    if (!selectedInstitutionId) return;
    addLinkMutation.mutate({
      institutionId: selectedInstitutionId,
      contactRole: linkRole,
      roleTitle: linkRoleTitle || null,
      department: linkDepartment || null,
      isPrimary: linkIsPrimary,
    });
  };

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
            {contact.preferredName && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                (Call: {contact.preferredName})
              </span>
            )}
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

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={contactTypeColors[contact.contactType]}>
          {contactTypeLabels[contact.contactType]}
        </Badge>
        {contact.gender && (
          <Badge variant="secondary">
            {contact.gender === 'male' ? 'Male' : 
             contact.gender === 'female' ? 'Female' : 
             contact.gender === 'other' ? 'Other' : 
             'Prefer not to say'}
          </Badge>
        )}
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
            {contact.whatsapp && (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span>{contact.whatsapp} (WhatsApp)</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contact.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.street || contact.city ? (
              <>
                {(contact.unitNo || contact.street) && (
                  <p>{[contact.unitNo, contact.street].filter(Boolean).join(" ")}</p>
                )}
                {contact.suburb && <p>{contact.suburb}</p>}
                {(contact.city || contact.state || contact.postcode) && (
                  <p>{[contact.city, contact.state, contact.postcode].filter(Boolean).join(", ")}</p>
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
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Created By</span>
              {contact.createdByUser ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={contact.createdByUser.profileImageUrl || undefined} />
                    <AvatarFallback>{contact.createdByUser.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                  <span>{contact.createdByUser.firstName} {contact.createdByUser.lastName}</span>
                </div>
              ) : (
                <span className="text-muted-foreground italic">System Generated</span>
              )}
            </div>
            {contact.createdAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created On</span>
                <span>{format(new Date(contact.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
            )}
            {contact.updatedAt && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Last Updated</span>
                <div className="flex items-center gap-2">
                  {contact.updatedByUser ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={contact.updatedByUser.profileImageUrl || undefined} />
                        <AvatarFallback>{contact.updatedByUser.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span>{contact.updatedByUser.firstName} {contact.updatedByUser.lastName}</span>
                      <span className="text-muted-foreground">·</span>
                    </>
                  ) : null}
                  <span className="text-muted-foreground">{format(new Date(contact.updatedAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            )}
            {contact.ownerUser && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Contact Owner</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={contact.ownerUser.profileImageUrl || undefined} />
                    <AvatarFallback>{contact.ownerUser.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                  <span>{contact.ownerUser.firstName} {contact.ownerUser.lastName}</span>
                </div>
              </div>
            )}
            {contact.assignedUser && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Assigned To</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={contact.assignedUser.profileImageUrl || undefined} />
                    <AvatarFallback>{contact.assignedUser.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                  <span>{contact.assignedUser.firstName} {contact.assignedUser.lastName}</span>
                </div>
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
                {contact.emergencyContactMobile && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobile</span>
                    <span>{contact.emergencyContactMobile}</span>
                  </div>
                )}
                {contact.emergencyContactRelationship && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Relationship</span>
                    <span>{contact.emergencyContactRelationship}</span>
                  </div>
                )}
                {contact.emergencyContactAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span>{contact.emergencyContactAddress}</span>
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

        {roleNeedsInstitution(contact.contactType) && (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg">Role Details</CardTitle>
              <Button 
                size="sm" 
                onClick={() => setIsAddInstitutionOpen(true)}
                data-testid="button-add-institution"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Institution
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingLinks ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : institutionLinks.length === 0 ? (
                <p className="text-muted-foreground">No institutions linked. Click "Add Institution" to link this contact to an institution.</p>
              ) : (
                <div className="space-y-3">
                  {institutionLinks.map((link) => (
                    <div 
                      key={link.id} 
                      className="flex items-center justify-between p-3 border rounded-md"
                      data-testid={`institution-link-${link.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={link.institution?.logo || undefined} />
                          <AvatarFallback>
                            <Building2 className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{link.institution?.name || "Unknown Institution"}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {link.roleTitle && (
                              <Badge variant="secondary">{link.roleTitle}</Badge>
                            )}
                            {link.department && (
                              <span className="text-sm text-muted-foreground">{link.department}</span>
                            )}
                            <Badge variant="outline">
                              {CONTACT_ROLES.find(r => r.value === link.contactRole)?.label || link.contactRole}
                            </Badge>
                            {link.isPrimary && (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLinkMutation.mutate(link.id)}
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
        )}

        {/* Applications Section - Only for clients (students) */}
        {contact.contactType === 'clients' && (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Applications</CardTitle>
                {applicationsData?.applications && applicationsData.applications.length > 0 && (
                  <Badge variant="secondary">{applicationsData.applications.length}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                {applicationsData?.studentProfile && (
                  <span className="text-sm text-muted-foreground">
                    {applicationsData.applications.length} / {applicationsData.studentProfile.maxApplicationSlots} slots used
                  </span>
                )}
                {applicationsData?.studentProfile && (
                  <Button
                    size="sm"
                    onClick={() => setIsCreateApplicationOpen(true)}
                    disabled={applicationsData.applications.length >= (applicationsData.studentProfile.maxApplicationSlots || 3)}
                    data-testid="button-create-application"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Application
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingApplications ? (
                <p className="text-muted-foreground">Loading applications...</p>
              ) : isApplicationsError ? (
                <p className="text-destructive">Failed to load applications. Please try again later.</p>
              ) : !applicationsData?.studentProfile ? (
                <p className="text-muted-foreground">No student profile linked to this contact.</p>
              ) : applicationsData.applications.length === 0 ? (
                <p className="text-muted-foreground">No applications yet. This student has not applied to any courses.</p>
              ) : (
                <div className="space-y-3">
                  {applicationsData.applications.map((app) => (
                    <div 
                      key={app.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => navigate(`/admin/applications/${app.id}`)}
                      data-testid={`application-${app.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={app.universityLogo || undefined} />
                          <AvatarFallback>
                            <GraduationCap className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <p className="font-medium">{app.courseName || 'Unknown Course'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{app.universityName || 'Unknown Institution'}</span>
                            {app.courseLevel && (
                              <>
                                <span>•</span>
                                <span>{app.courseLevel}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={
                                app.status === 'accepted' ? 'default' :
                                app.status === 'rejected' ? 'destructive' :
                                app.status === 'withdrawn' ? 'secondary' :
                                'outline'
                              }
                            >
                              {app.status}
                            </Badge>
                            <Badge variant="outline">
                              {app.currentStage}
                            </Badge>
                            {app.createdAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(app.createdAt), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {app.assignedConsultant && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={app.assignedConsultant.profileImageUrl || undefined} />
                              <AvatarFallback>{app.assignedConsultant.firstName?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="hidden md:inline">{app.assignedConsultant.firstName}</span>
                          </div>
                        )}
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isAddInstitutionOpen} onOpenChange={setIsAddInstitutionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Institution</DialogTitle>
            <DialogDescription>
              Add this contact as a representative of an institution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Institution *</Label>
              <Input
                placeholder="Type to search institutions..."
                value={institutionSearch}
                onChange={(e) => setInstitutionSearch(e.target.value)}
                data-testid="input-institution-search"
              />
              {institutions.length > 0 && (
                <ScrollArea className="h-40 border rounded-md">
                  <div className="p-2 space-y-1">
                    {institutions.map((inst: any) => (
                      <div
                        key={inst.id}
                        className={`p-2 rounded cursor-pointer hover-elevate ${
                          selectedInstitutionId === inst.id ? "bg-primary/10 border border-primary" : ""
                        }`}
                        onClick={() => setSelectedInstitutionId(inst.id)}
                        data-testid={`institution-option-${inst.id}`}
                      >
                        <p className="font-medium">{inst.name}</p>
                        {inst.country && <p className="text-sm text-muted-foreground">{inst.country}</p>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role Title</Label>
              <Input
                placeholder="e.g., Marketing Officer"
                value={linkRoleTitle}
                onChange={(e) => setLinkRoleTitle(e.target.value)}
                data-testid="input-role-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                placeholder="e.g., Marketing"
                value={linkDepartment}
                onChange={(e) => setLinkDepartment(e.target.value)}
                data-testid="input-department"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Function</Label>
              <Select value={linkRole} onValueChange={setLinkRole}>
                <SelectTrigger data-testid="select-contact-function">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
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
                checked={linkIsPrimary}
                onChange={(e) => setLinkIsPrimary(e.target.checked)}
                data-testid="checkbox-is-primary"
              />
              <Label htmlFor="isPrimary">Primary contact for this institution</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddInstitutionOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddInstitution}
              disabled={!selectedInstitutionId || addLinkMutation.isPending}
              data-testid="button-confirm-add-institution"
            >
              {addLinkMutation.isPending ? "Adding..." : "Add Institution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Application Dialog */}
      <Dialog open={isCreateApplicationOpen} onOpenChange={setIsCreateApplicationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Application</DialogTitle>
            <DialogDescription>
              Create a new application on behalf of {contact.firstName} {contact.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Course *</Label>
              <Input
                placeholder="Type to search courses..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                data-testid="input-course-search"
              />
              {isLoadingCourses && courseSearch.length > 1 && (
                <p className="text-sm text-muted-foreground">Searching courses...</p>
              )}
              {!isLoadingCourses && searchCourses.length > 0 && (
                <ScrollArea className="h-48 border rounded-md">
                  <div className="p-2 space-y-1">
                    {searchCourses.map((course: any) => (
                      <div
                        key={course.id}
                        className={`p-3 rounded cursor-pointer hover-elevate ${
                          selectedCourseId === course.id ? "bg-primary/10 border border-primary" : ""
                        }`}
                        onClick={() => setSelectedCourseId(course.id)}
                        data-testid={`course-option-${course.id}`}
                      >
                        <p className="font-medium">{course.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {course.universityName && <span>{course.universityName}</span>}
                          {course.level && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">{course.level}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {!isLoadingCourses && courseSearch.length > 1 && searchCourses.length === 0 && (
                <p className="text-sm text-muted-foreground">No courses found. Try a different search term.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this application..."
                value={applicationNotes}
                onChange={(e) => setApplicationNotes(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-application-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateApplicationOpen(false);
              setSelectedCourseId(null);
              setCourseSearch("");
              setApplicationNotes("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateApplication}
              disabled={!selectedCourseId || createApplicationMutation.isPending}
              data-testid="button-confirm-create-application"
            >
              {createApplicationMutation.isPending ? "Creating..." : "Create Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
