import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { LeadNotes } from "@/components/lead-notes";

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
  Clock,
  BookOpen,
  Star,
  Link2,
  Bookmark,
  Save,
  CheckCircle2,
  UserPlus,
  UserMinus,
  Pencil,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { COUNTRIES, getCountryByName } from "@/lib/countries";
import { getCountryCode, getFlagUrl } from "@/lib/country-flags";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SavedFilter } from "@shared/schema";
import { format } from "date-fns";

type ContactType = 'none' | 'clients' | 'external' | 'internal' | 'others' | 'partner' | 'providers_rep';
type ClientStatus = 'lead' | 'applicant' | 'enrolled' | 'completed' | 'inactive';
type LeadStage = 'new' | 'contacted' | 'qualified' | 'counselling' | 'ready_to_apply' | 'converted' | 'lost';
type EntrySource = 'website' | 'consultant' | 'sub_agent' | 'affiliate' | 'import' | 'referral' | 'facebook_ads' | 'walk_in' | 'other';
type LeadRating = 'cold' | 'warm' | 'hot';
type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

interface CrmContact {
  id: string;
  photo: string | null;
  contactType: ContactType;
  clientStatus: ClientStatus | null;
  leadStage: LeadStage | null;
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
  programDiscipline: string | null;
  programType: string | null;
  whereToStudy: string | null;
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  courseId: string | null;
  universityId: string | null;
  visaStatus: string | null;
  referrer: string | null;
  firstPageVisited: string | null;
  firstVisit: string | null;
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
  walk_in: "Walk-In",
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
  walk_in: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
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

const leadStageLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  counselling: "Counselling",
  ready_to_apply: "Ready to Apply",
  converted: "Converted",
  lost: "Lost",
};

const leadStageColors: Record<string, string> = {
  new: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  contacted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  qualified: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  counselling: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  ready_to_apply: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  converted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

const KANBAN_TYPES: ContactType[] = ['clients', 'external', 'internal', 'partner', 'providers_rep', 'others'];
const KANBAN_CLIENT_STATUSES: ClientStatus[] = ['lead', 'applicant', 'enrolled', 'completed', 'inactive'];
const LEAD_PIPELINE_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'counselling', 'ready_to_apply', 'converted', 'lost'];

type AdminUser = { id: string; firstName: string; lastName: string; userType: string; profileImageUrl: string | null };

function AssignPopover({
  contactId,
  assignedTo,
  admins,
  onAssign,
  triggerClassName,
}: {
  contactId: string;
  assignedTo: string | null;
  admins: AdminUser[];
  onAssign: (contactId: string, adminId: string | null) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = admins.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q)
    );
  });

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`shrink-0 text-muted-foreground ${triggerClassName || ""}`}
          onClick={(e) => e.stopPropagation()}
          data-testid={`button-assign-contact-${contactId}`}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2 z-50" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-medium text-muted-foreground px-1 pb-2">Assign to team member</p>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 pl-7 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {assignedTo && (
          <button
            type="button"
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover-elevate text-destructive"
            onClick={(e) => { e.stopPropagation(); onAssign(contactId, null); setOpen(false); }}
          >
            <UserMinus className="h-4 w-4 shrink-0" />
            <span>Unassign</span>
          </button>
        )}
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No results</p>
          ) : (
            filtered.map((admin) => (
              <button
                key={admin.id}
                type="button"
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover-elevate ${assignedTo === admin.id ? "bg-primary/10 text-primary font-medium" : ""}`}
                onClick={(e) => { e.stopPropagation(); onAssign(contactId, admin.id); setOpen(false); }}
                data-testid={`option-assign-${admin.id}`}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={admin.profileImageUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {admin.firstName?.[0]}{admin.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{admin.firstName} {admin.lastName}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CrmContactsPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [clientStatusFilter, setClientStatusFilter] = useState<string>("all");
  const [leadStageFilter, setLeadStageFilter] = useState<string>("all");
  const [entrySourceFilter, setEntrySourceFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [kanbanMode, setKanbanMode] = useState<'type' | 'status' | 'leadPipeline'>('status');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Deep-link: auto-open a contact when contactId is in the URL search params
  const deepLinkContactId = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("contactId");
  }, [searchString]);

  useEffect(() => {
    if (deepLinkContactId && selectedContact?.id !== deepLinkContactId) {
      setSelectedContact({ id: deepLinkContactId } as CrmContact);
      // Remove contactId from URL to prevent re-triggering on refresh
      const params = new URLSearchParams(searchString);
      params.delete("contactId");
      const newSearch = params.toString();
      window.history.replaceState(
        null,
        "",
        `/admin${newSearch ? `?${newSearch}` : ""}${window.location.hash}`
      );
    }
  }, [deepLinkContactId, selectedContact, searchString]);

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
    queryKey: ["/api/crm/contacts", typeFilter, clientStatusFilter, leadStageFilter, entrySourceFilter, branchFilter, searchQuery, countryFilter, nationalityFilter, assignedFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (clientStatusFilter !== "all") params.append("clientStatus", clientStatusFilter);
      if (leadStageFilter !== "all") params.append("leadStage", leadStageFilter);
      if (entrySourceFilter !== "all") params.append("entrySource", entrySourceFilter);
      if (branchFilter !== "all") params.append("branchId", branchFilter);
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

  const { data: admins } = useQuery<{ id: string; firstName: string; lastName: string; userType: string; profileImageUrl: string | null }[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/users", { 
        credentials: 'include',
        headers 
      });
      if (!response.ok) throw new Error("Failed to fetch admins");
      const data = await response.json();
      // Filter for admin and platform_admin users
      return (data.users || []).filter((user: any) => 
        user.userType === 'admin' || user.userType === 'platform_admin'
      );
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

  // Saved filters state
  const [saveFilterName, setSaveFilterName] = useState("");
  const [saveFilterOpen, setSaveFilterOpen] = useState(false);

  const { data: savedFiltersData } = useQuery<SavedFilter[]>({
    queryKey: ["/api/saved-filters", { panelType: "contacts" }],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/saved-filters?panelType=contacts", { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed to fetch saved filters");
      return res.json();
    },
  });

  const createSavedFilterMutation = useMutation({
    mutationFn: async (name: string) => {
      const filters = { typeFilter, clientStatusFilter, leadStageFilter, entrySourceFilter, branchFilter, countryFilter, nationalityFilter, assignedFilter };
      return apiRequest("POST", "/api/saved-filters", { name, panelType: "contacts", filters });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-filters", { panelType: "contacts" }] });
      setSaveFilterName("");
      setSaveFilterOpen(false);
      toast({ title: "Filter saved", description: "Your filter has been saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save filter", variant: "destructive" }),
  });

  const deleteSavedFilterMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/saved-filters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-filters", { panelType: "contacts" }] });
      toast({ title: "Filter deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete filter", variant: "destructive" }),
  });

  const loadSavedFilter = (sf: SavedFilter) => {
    const f = sf.filters as any;
    if (f.typeFilter !== undefined) setTypeFilter(f.typeFilter);
    if (f.clientStatusFilter !== undefined) setClientStatusFilter(f.clientStatusFilter);
    if (f.leadStageFilter !== undefined) setLeadStageFilter(f.leadStageFilter);
    if (f.entrySourceFilter !== undefined) setEntrySourceFilter(f.entrySourceFilter);
    if (f.branchFilter !== undefined) setBranchFilter(f.branchFilter);
    if (f.countryFilter !== undefined) setCountryFilter(f.countryFilter);
    if (f.nationalityFilter !== undefined) setNationalityFilter(f.nationalityFilter);
    if (f.assignedFilter !== undefined) setAssignedFilter(f.assignedFilter);
    setFiltersOpen(false);
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
    
    if (kanbanMode === 'leadPipeline') {
      let newStage: LeadStage | undefined;
      
      if (overId.startsWith('leadstage-')) {
        newStage = overId.replace('leadstage-', '') as LeadStage;
      } else if (over.data.current?.sortable) {
        const containerId = over.data.current.sortable.containerId as string;
        if (containerId.startsWith('leadstage-')) {
          newStage = containerId.replace('leadstage-', '') as LeadStage;
        }
      } else {
        const targetContact = contactsData?.contacts?.find(c => c.id === overId);
        if (targetContact?.leadStage) {
          newStage = targetContact.leadStage as LeadStage;
        }
      }
      
      if (!newStage || !LEAD_PIPELINE_STAGES.includes(newStage)) return;
      
      const contact = contactsData?.contacts?.find(c => c.id === contactId);
      if (contact && contact.leadStage !== newStage) {
        updateMutation.mutate({ 
          id: contactId, 
          data: { leadStage: newStage } 
        });
      }
    } else if (kanbanMode === 'status') {
      let newStatus: ClientStatus | undefined;
      
      if (overId.startsWith('status-')) {
        newStatus = overId.replace('status-', '') as ClientStatus;
      } else if (over.data.current?.sortable) {
        const containerId = over.data.current.sortable.containerId as string;
        if (containerId.startsWith('status-')) {
          newStatus = containerId.replace('status-', '') as ClientStatus;
        }
      } else {
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
      let newType: ContactType | undefined;
      
      if (KANBAN_TYPES.includes(overId as ContactType)) {
        newType = overId as ContactType;
      } else if (over.data.current?.sortable) {
        newType = over.data.current.sortable.containerId as ContactType;
      } else {
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
    setLeadStageFilter("all");
    setEntrySourceFilter("all");
    setCountryFilter("all");
    setNationalityFilter("all");
    setAssignedFilter("all");
    setBranchFilter("all");
    setSearchQuery("");
  };

  const { data: branchesData } = useQuery<any[]>({
    queryKey: ["/api/admin/branches"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/branches", { headers });
      if (!response.ok) return [];
      const data = await response.json();
      return data.branches || data || [];
    },
  });

  const activeFiltersCount = [typeFilter, clientStatusFilter, leadStageFilter, entrySourceFilter, branchFilter, countryFilter, nationalityFilter, assignedFilter]
    .filter(f => f !== 'all').length;
  
  const getContactsByClientStatus = (status: ClientStatus) => {
    return contactsData?.contacts?.filter(contact => contact.clientStatus === status) || [];
  };

  const getContactsByLeadStage = (stage: LeadStage) => {
    return contactsData?.contacts?.filter(contact => 
      contact.clientStatus === 'lead' && contact.leadStage === stage
    ) || [];
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
        admins={admins || []}
        onAssign={(contactId, adminId) => updateMutation.mutate({ id: contactId, data: { assignedTo: adminId } })}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-crm-contacts-title">CRM Contacts</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-muted-foreground text-sm">Manage your contact database</p>
            {contactsData && (
              <Badge variant="secondary" className="text-xs no-default-active-elevate" data-testid="badge-contact-count">
                {contactsData.total} contact{contactsData.total !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`toggle-elevate${viewMode === 'list' ? ' toggle-elevated' : ''}`}
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`toggle-elevate${viewMode === 'kanban' ? ' toggle-elevated' : ''}`}
              onClick={() => setViewMode('kanban')}
              data-testid="button-view-kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          {viewMode === 'kanban' && (
            <Select value={kanbanMode} onValueChange={(v) => setKanbanMode(v as 'type' | 'status' | 'leadPipeline')}>
              <SelectTrigger className="w-[160px]" data-testid="select-kanban-mode">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">By Status</SelectItem>
                <SelectItem value="type">By Type</SelectItem>
                <SelectItem value="leadPipeline">Lead Pipeline</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button type="button" onClick={() => navigate("/admin/contacts/new")} data-testid="button-create-contact">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Row 1: Search + My Contacts */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-contacts"
            />
          </div>
          {user?.id && (
            <Button
              variant="outline"
              size="sm"
              className={`shrink-0 gap-2 toggle-elevate${assignedFilter === user.id ? " toggle-elevated" : ""}`}
              onClick={() => setAssignedFilter(assignedFilter === user.id ? "all" : user.id)}
              data-testid="button-my-contacts-filter"
            >
              My Contacts
            </Button>
          )}
        </div>
        {/* Row 2: Dropdown filters + More Filters + Clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={clientStatusFilter} onValueChange={(v) => {
            setClientStatusFilter(v);
            if (v !== 'lead') setLeadStageFilter("all");
          }}>
            <SelectTrigger className="w-[150px]" data-testid="select-client-status-filter">
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
          {clientStatusFilter === 'lead' && (
            <Select value={leadStageFilter} onValueChange={setLeadStageFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-lead-stage-filter">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lead Stages</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="counselling">Counselling</SelectItem>
                <SelectItem value="ready_to_apply">Ready to Apply</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
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
              <Button variant="outline" size="sm" data-testid="button-more-filters">
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
          {activeFiltersCount > 0 && (
            <Popover open={saveFilterOpen} onOpenChange={setSaveFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-save-filter">
                  <Bookmark className="h-4 w-4 mr-1.5" />
                  Save Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <p className="text-sm font-medium mb-2">Name this filter</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Hot Leads BD"
                    value={saveFilterName}
                    onChange={(e) => setSaveFilterName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && saveFilterName.trim()) createSavedFilterMutation.mutate(saveFilterName.trim()); }}
                    className="h-8 text-sm"
                    data-testid="input-save-filter-name"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-8 shrink-0"
                    disabled={!saveFilterName.trim() || createSavedFilterMutation.isPending}
                    onClick={() => createSavedFilterMutation.mutate(saveFilterName.trim())}
                    data-testid="button-confirm-save-filter"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {clientStatusFilter === 'lead' && (
        <div className="flex items-center gap-2 flex-wrap" data-testid="lead-stage-chips">
          <span className="text-sm text-muted-foreground mr-1">Pipeline:</span>
          {(['new', 'contacted', 'qualified', 'counselling', 'ready_to_apply', 'converted', 'lost'] as LeadStage[]).map((stage) => {
            const isActive = leadStageFilter === stage;
            const stageCount = leadStageFilter === 'all' 
              ? (contactsData?.contacts?.filter(c => c.leadStage === stage).length || 0)
              : null;
            return (
              <Badge
                key={stage}
                variant={isActive ? "default" : "outline"}
                className={`cursor-pointer ${isActive ? '' : leadStageColors[stage]}`}
                onClick={() => setLeadStageFilter(isActive ? "all" : stage)}
                data-testid={`chip-stage-${stage}`}
              >
                {leadStageLabels[stage]}
                {stageCount !== null && (
                  <span className="ml-1.5 text-xs opacity-70">{stageCount}</span>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card className="p-4">
            {savedFiltersData && savedFiltersData.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5" />
                  Saved Filters
                </p>
                <div className="flex flex-wrap gap-2">
                  {savedFiltersData.map((sf) => (
                    <div key={sf.id} className="flex items-center gap-1 border rounded-md px-2 py-1 text-sm bg-muted/40">
                      <button
                        className="hover:text-primary transition-colors"
                        onClick={() => loadSavedFilter(sf)}
                        data-testid={`button-load-saved-filter-${sf.id}`}
                      >
                        {sf.name}
                      </button>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                        onClick={() => deleteSavedFilterMutation.mutate(sf.id)}
                        data-testid={`button-delete-saved-filter-${sf.id}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 mb-1" />
              </div>
            )}
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
                    <SelectItem value="walk_in">Walk-In</SelectItem>
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
              {branchesData && branchesData.length > 0 && (
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger data-testid="select-branch-filter">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branchesData.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
            {kanbanMode === 'leadPipeline' ? (
              LEAD_PIPELINE_STAGES.map((stage) => (
                <LeadPipelineColumn
                  key={stage}
                  stage={stage}
                  contacts={getContactsByLeadStage(stage)}
                  onSelectContact={setSelectedContact}
                />
              ))
            ) : kanbanMode === 'status' ? (
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
              className="flex items-center gap-3 px-4 py-3 border rounded-lg hover-elevate cursor-pointer"
              onClick={() => setSelectedContact(contact)}
              data-testid={`card-contact-${contact.id}`}
            >
              {/* Avatar */}
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={contact.photo || undefined} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {contact.firstName?.[0]}{contact.lastName?.[0]}
                </AvatarFallback>
              </Avatar>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Name + primary badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold leading-tight" data-testid={`text-contact-name-${contact.id}`}>
                    {contact.firstName} {contact.lastName}
                  </span>
                  <Badge variant="outline" className={`text-xs no-default-active-elevate ${contactTypeColors[contact.contactType]}`}>
                    {contactTypeLabels[contact.contactType]}
                  </Badge>
                  {contact.contactType === 'clients' && contact.clientStatus && (
                    <Badge variant="outline" className={`text-xs no-default-active-elevate ${clientStatusColors[contact.clientStatus]}`} data-testid={`badge-status-${contact.id}`}>
                      {clientStatusLabels[contact.clientStatus]}
                    </Badge>
                  )}
                  {contact.contactType === 'clients' && contact.clientStatus === 'lead' && contact.leadStage && (
                    <Badge variant="outline" className={`text-xs no-default-active-elevate ${leadStageColors[contact.leadStage]}`} data-testid={`badge-lead-stage-${contact.id}`}>
                      {leadStageLabels[contact.leadStage]}
                    </Badge>
                  )}
                  {contact.contactType === 'clients' && contact.leadRating && (
                    <Badge variant="secondary" className={`text-xs no-default-active-elevate ${leadRatingColors[contact.leadRating]}`}>
                      {leadRatingLabels[contact.leadRating]}
                    </Badge>
                  )}
                </div>
                {/* Meta row */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  {contact.email && (
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      <Mail className="h-3 w-3 shrink-0" />{contact.email}
                    </span>
                  )}
                  {contact.mobile && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" />{contact.mobile}
                    </span>
                  )}
                  {(contact.city || contact.country) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {[contact.city, contact.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Right column: date + people avatars */}
              <div className="text-right text-xs text-muted-foreground shrink-0 hidden sm:block">
                {contact.createdAt && (
                  <p className="flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(contact.createdAt), "d MMM yyyy")}
                  </p>
                )}
                <div className="flex items-center justify-end gap-1 mt-1">
                  {contact.ownerUser && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 cursor-default">
                          <AvatarImage src={contact.ownerUser.profileImageUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {contact.ownerUser.firstName?.[0]}{contact.ownerUser.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Owner: {contact.ownerUser.firstName} {contact.ownerUser.lastName}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {contact.assignedUser && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 cursor-default ring-2 ring-primary/30">
                          <AvatarImage src={contact.assignedUser.profileImageUrl || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {contact.assignedUser.firstName?.[0]}{contact.assignedUser.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Assigned to: {contact.assignedUser.firstName} {contact.assignedUser.lastName}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Quick-assign button */}
              <AssignPopover
                contactId={contact.id}
                assignedTo={contact.assignedTo}
                admins={admins || []}
                onAssign={(id, adminId) => updateMutation.mutate({ id, data: { assignedTo: adminId } })}
              />

              {/* View icon */}
              <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setSelectedContact(contact); }} data-testid={`button-view-contact-${contact.id}`}>
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

function LeadPipelineColumn({ 
  stage, 
  contacts, 
  onSelectContact 
}: { 
  stage: LeadStage; 
  contacts: CrmContact[]; 
  onSelectContact: (contact: CrmContact) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `leadstage-${stage}`,
  });

  const contactIds = contacts.map(contact => contact.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
      data-testid={`kanban-column-leadstage-${stage}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={leadStageColors[stage]}>
            {leadStageLabels[stage]}
          </Badge>
          <span className="text-sm text-muted-foreground">({contacts.length})</span>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-360px)]">
        <SortableContext id={`leadstage-${stage}`} items={contactIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 pr-2">
            {contacts.map((contact) => (
              <DraggableContactCard
                key={contact.id}
                contact={contact}
                onSelect={() => onSelectContact(contact)}
                showLeadStage
              />
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No leads in this stage
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
  isDragOverlay = false,
  showLeadStage = false,
}: { 
  contact: CrmContact; 
  onSelect: () => void;
  isDragOverlay?: boolean;
  showLeadStage?: boolean;
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
            {showLeadStage ? (
              <>
                {contact.contactType === 'clients' && contact.leadRating && (
                  <Badge variant="secondary" className={`text-xs ${leadRatingColors[contact.leadRating]}`}>
                    {leadRatingLabels[contact.leadRating]}
                  </Badge>
                )}
                {contact.courseName && (
                  <Badge variant="outline" className="text-xs">
                    <BookOpen className="h-3 w-3 mr-1" />
                    <span className="truncate max-w-[100px]">{contact.courseName}</span>
                  </Badge>
                )}
              </>
            ) : (
              <>
                {contact.contactType === 'clients' && contact.clientStatus && (
                  <Badge variant="outline" className={`text-xs ${clientStatusColors[contact.clientStatus]}`}>
                    {clientStatusLabels[contact.clientStatus]}
                  </Badge>
                )}
                {contact.contactType === 'clients' && contact.leadRating && (
                  <Badge variant="secondary" className={`text-xs ${leadRatingColors[contact.leadRating]}`}>
                    {leadRatingLabels[contact.leadRating]}
                  </Badge>
                )}
              </>
            )}
          </div>
          {contact.assignedUser && (
            <div className="mt-2 pt-2 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5 shrink-0 ring-1 ring-primary/30">
                <AvatarImage src={contact.assignedUser.profileImageUrl || undefined} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                  {contact.assignedUser.firstName?.[0]}{contact.assignedUser.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{contact.assignedUser.firstName} {contact.assignedUser.lastName}</span>
            </div>
          )}
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
          {contact.assignedUser && (
            <div className="mt-2 pt-2 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5 shrink-0 ring-1 ring-primary/30">
                <AvatarImage src={contact.assignedUser.profileImageUrl || undefined} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                  {contact.assignedUser.firstName?.[0]}{contact.assignedUser.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{contact.assignedUser.firstName} {contact.assignedUser.lastName}</span>
            </div>
          )}
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

        {/* ── Contact Type — governs the entire form ─────────────── */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-2" data-testid="section-contact-type">
          <div>
            <p className="text-sm font-semibold">Contact Type <span className="text-destructive">*</span></p>
            <p className="text-xs text-muted-foreground">Sets the required fields and workflow for this contact</p>
          </div>
          <Select
            value={formData.contactType || "clients"}
            onValueChange={(value: any) => setFormData({ ...formData, contactType: value })}
          >
            <SelectTrigger data-testid="select-contact-type" className="bg-background">
              <SelectValue />
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

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="crm">CRM Details</TabsTrigger>
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
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input
                value={formData.nationality || ""}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                data-testid="input-nationality"
              />
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
          <TabsContent value="crm" className="space-y-4 mt-4">
            <p className="text-sm font-medium">Study Preferences</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interested Discipline</Label>
                <Select
                  value={formData.programDiscipline || ""}
                  onValueChange={(value) => setFormData({ ...formData, programDiscipline: value || null })}
                >
                  <SelectTrigger data-testid="select-program-discipline">
                    <SelectValue placeholder="Select discipline" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[9999]">
                    {[
                      'Accounting, Business & Finance',
                      'Agriculture & Forestry',
                      'Applied Sciences & Professions',
                      'Arts, Design & Architecture',
                      'Computer Science & IT',
                      'Education & Training',
                      'Engineering & Technology',
                      'Environmental Studies & Earth Sciences',
                      'Hospitality, Leisure & Sports',
                      'Humanities',
                      'Journalism & Media',
                      'Law',
                      'Medicine & Health',
                      'Short Courses',
                      'Trade',
                    ].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Study Level</Label>
                <Select
                  value={formData.programType || ""}
                  onValueChange={(value) => setFormData({ ...formData, programType: value || null })}
                >
                  <SelectTrigger data-testid="select-program-type">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[9999]">
                    {[
                      'Certificate I',
                      'Certificate II',
                      'Certificate III',
                      'Certificate IV',
                      'Diploma',
                      'Advanced Diploma',
                      'Associate Degree',
                      'Bachelor Degree',
                      'Graduate Certificate',
                      'Graduate Diploma',
                      'Masters Degree',
                      'Doctoral Degree',
                      'ELICOS',
                      'Foundation',
                      'Short Course',
                      'Other',
                    ].map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Destination Country</Label>
              <Input
                value={formData.whereToStudy || ""}
                onChange={(e) => setFormData({ ...formData, whereToStudy: e.target.value || null })}
                placeholder="e.g. Australia, UK, Canada"
                data-testid="input-where-to-study"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-muted-foreground">Budget Range (AUD / year)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Minimum</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.budgetMin ?? ""}
                    onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value ? Number(e.target.value) : null })}
                    placeholder="e.g. 5000"
                    data-testid="input-budget-min"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Maximum</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.budgetMax ?? ""}
                    onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value ? Number(e.target.value) : null })}
                    placeholder="e.g. 60000"
                    data-testid="input-budget-max"
                  />
                </div>
              </div>
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

const ACTIVE_LEAD_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'counselling', 'ready_to_apply'];

function LeadStageProgressBar({ 
  currentStage, 
  contactId,
  onStageChange,
  isUpdating
}: { 
  currentStage: LeadStage;
  contactId: string;
  onStageChange: (stage: LeadStage) => void;
  isUpdating: boolean;
}) {
  const currentIndex = ACTIVE_LEAD_STAGES.indexOf(currentStage);
  const isTerminal = currentStage === 'converted' || currentStage === 'lost';

  return (
    <Card data-testid="card-lead-pipeline">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg">Lead Pipeline</CardTitle>
          {isTerminal && (
            <Badge variant="outline" className={leadStageColors[currentStage]}>
              {leadStageLabels[currentStage]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isTerminal ? (
          <p className="text-sm text-muted-foreground">
            This lead has been {currentStage === 'converted' ? 'converted to an applicant' : 'marked as lost'}.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-1">
              {ACTIVE_LEAD_STAGES.map((stage, index) => {
                const isActive = index <= currentIndex;
                const isCurrent = stage === currentStage;
                return (
                  <div key={stage} className="flex-1 flex flex-col items-center gap-1">
                    <button
                      onClick={() => !isUpdating && onStageChange(stage)}
                      disabled={isUpdating}
                      className={`w-full h-2 rounded-full transition-colors ${
                        isActive 
                          ? 'bg-primary' 
                          : 'bg-muted'
                      } ${isUpdating ? 'opacity-50' : 'cursor-pointer'}`}
                      data-testid={`button-stage-${stage}`}
                    />
                    <span className={`text-xs whitespace-nowrap ${
                      isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    }`}>
                      {leadStageLabels[stage]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              {currentStage === 'ready_to_apply' && (
                <Badge variant="outline" className={leadStageColors['ready_to_apply']}>
                  Ready for application
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ContactDetailViewProps {
  contact: CrmContact;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  admins: { id: string; firstName: string; lastName: string; userType: string; profileImageUrl: string | null }[];
  onAssign: (contactId: string, adminId: string | null) => void;
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

type EditSection = 'contact_info' | 'address' | 'inquiry' | 'ownership' | 'emergency' | null;

function ContactDetailView({ contact, onBack, onEdit, onDelete, admins, onAssign }: ContactDetailViewProps) {
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
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [applicationNotes, setApplicationNotes] = useState("");
  const [courseInstitutionFilter, setCourseInstitutionFilter] = useState("");
  const [courseCountryFilter, setCourseCountryFilter] = useState("");
  const [courseEntryMode, setCourseEntryMode] = useState<"search" | "manual">("search");
  const [externalEntries, setExternalEntries] = useState<{ courseName: string; institutionName: string }[]>([]);
  const [manualCourseName, setManualCourseName] = useState("");
  const [manualInstitutionName, setManualInstitutionName] = useState("");

  // Inline section editing
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [sectionData, setSectionData] = useState<Partial<CrmContact>>({});

  // Owner reassign popover
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");

  const startEdit = (section: EditSection, fields: Partial<CrmContact>) => {
    setEditingSection(section);
    setSectionData(fields);
  };
  const cancelEdit = () => {
    setEditingSection(null);
    setSectionData({});
  };

  const ownerMutation = useMutation({
    mutationFn: async (newOwnerId: string | null) => {
      return apiRequest("PATCH", `/api/crm/contacts/${contact.id}`, { contactOwner: newOwnerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setOwnerPopoverOpen(false);
      setOwnerSearch("");
      toast({ title: "Owner updated", description: "Contact owner has been reassigned" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update owner", variant: "destructive" });
    },
  });

  const saveSectionMutation = useMutation({
    mutationFn: async (data: Partial<CrmContact>) => {
      return apiRequest("PATCH", `/api/crm/contacts/${contact.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      cancelEdit();
      toast({ title: "Saved", description: "Contact updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    },
  });

  const [, navigate] = useLocation();

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CrmContact> }) => {
      return apiRequest("PATCH", `/api/crm/contacts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      toast({ title: "Lead stage updated" });
    },
    onError: () => {
      toast({ title: "Failed to update lead stage", variant: "destructive" });
    },
  });
  
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
    queryKey: ["/api/courses", { search: courseSearch, limit: courseInstitutionFilter ? 100 : 20, publishStatus: 'published', universityId: courseInstitutionFilter || undefined }],
    enabled: isCreateApplicationOpen && (courseSearch.length > 1 || !!courseInstitutionFilter),
  });
  const searchCourses = coursesData?.courses || [];

  // Fetch institutions for the course institution filter
  const { data: courseInstitutionsData } = useQuery<any[]>({
    queryKey: ["/api/institutions", { limit: 100, includePrivate: 'true' }],
    enabled: isCreateApplicationOpen,
  });
  const courseInstitutionOptions = Array.isArray(courseInstitutionsData) ? courseInstitutionsData : [];

  const courseCountryOptions = Array.from(
    new Set(courseInstitutionOptions.map((i: any) => i.country).filter(Boolean))
  ).sort() as string[];
  const filteredInstitutionOptions = courseCountryFilter
    ? courseInstitutionOptions.filter((i: any) => i.country === courseCountryFilter)
    : courseInstitutionOptions;

  // Course preferences
  const { data: contactPreferences } = useQuery<{ preferenceRank: number; country: string | null; universityId: string | null; universityName: string | null; courseId: string | null; courseName: string | null }[]>({
    queryKey: ["/api/crm/leads", contact.id, "preferences"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/leads/${contact.id}/preferences`, { credentials: 'include', headers });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!contact.id,
  });
  const hasAnyContactPreferenceData = !!contactPreferences?.some(p => p.country || p.universityName || p.courseName);

  // Fetch applications for this contact (only for 'clients' type)
  const { data: applicationsData, isLoading: isLoadingApplications, isError: isApplicationsError } = useQuery<{
    applications: ContactApplication[];
    studentProfile: { id: string; maxApplicationSlots: number } | null;
  }>({
    queryKey: ["/api/crm/contacts", contact.id, "applications"],
    enabled: contact.contactType === 'clients',
  });

  // Set of course IDs the student has already applied to — used to block re-selection in the dialog
  const alreadyAppliedCourseIds = useMemo(
    () => new Set(
      (applicationsData?.applications ?? []).flatMap((a: any) => a.allCourseIds ?? (a.courseId ? [a.courseId] : []))
    ),
    [applicationsData]
  );

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
    mutationFn: async (data: { courseIds?: string[]; externalEntries?: { courseName: string; institutionName: string }[]; notes?: string }) => {
      return apiRequest("POST", `/api/crm/contacts/${contact.id}/applications`, data);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create application", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateApplication = async () => {
    const coursesToCreate = selectedCourseIds.filter((id) => !alreadyAppliedCourseIds.has(id));
    if (!coursesToCreate.length && !externalEntries.length) return;
    try {
      const payload: { courseIds?: string[]; externalEntries?: { courseName: string; institutionName: string }[]; notes?: string } = {};
      if (coursesToCreate.length) payload.courseIds = coursesToCreate;
      if (externalEntries.length) payload.externalEntries = externalEntries;
      if (applicationNotes) payload.notes = applicationNotes;
      await createApplicationMutation.mutateAsync(payload);
      const n = coursesToCreate.length + externalEntries.length;
      toast({ title: `Application created${n > 1 ? ` with ${n} courses` : ""} successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts", contact.id, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setIsCreateApplicationOpen(false);
      setSelectedCourseIds([]);
      setCourseSearch("");
      setApplicationNotes("");
      setCourseInstitutionFilter("");
      setExternalEntries([]);
      setManualCourseName("");
      setManualInstitutionName("");
      setCourseEntryMode("search");
    } catch {
      // error toast already shown by mutation onError
    }
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
    <div className="space-y-5">
      {/* ── Hero Card ─────────────────────────────────────────── */}
      <Card className="overflow-hidden border-t-4 border-t-primary" data-testid="card-contact-hero">
        <CardContent className="pt-5 pb-4 px-5">
          {/* Back + actions row */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <Button type="button" variant="ghost" size="sm" onClick={onBack} data-testid="button-back" className="-ml-1 gap-1">
              <ChevronLeft className="h-4 w-4" />Back
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onEdit} data-testid="button-edit-contact">
                <Edit className="h-3.5 w-3.5 mr-1" />Edit
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={onDelete} data-testid="button-delete-contact">
                <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
              </Button>
            </div>
          </div>

          {/* Avatar + identity */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0 ring-2 ring-background ring-offset-2">
              <AvatarImage src={contact.photo || undefined} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {contact.firstName?.[0]}{contact.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-tight" data-testid="text-contact-detail-name">
                {contact.firstName} {contact.lastName}
              </h2>
              {contact.preferredName && (
                <p className="text-sm text-muted-foreground">{contact.preferredName}</p>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-0.5 w-fit"
                  data-testid="link-contact-email"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />{contact.email}
                </a>
              )}
            </div>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <Badge variant="outline" className={`no-default-active-elevate ${contactTypeColors[contact.contactType]}`}>
              {contactTypeLabels[contact.contactType]}
            </Badge>
            {contact.contactType === 'clients' && contact.clientStatus && (
              <Badge variant="outline" className={`no-default-active-elevate ${clientStatusColors[contact.clientStatus]}`} data-testid="badge-contact-status">
                {clientStatusLabels[contact.clientStatus]}
              </Badge>
            )}
            {contact.gender && (
              <Badge variant="secondary" className="no-default-active-elevate">
                {contact.gender === 'male' ? 'Male' : contact.gender === 'female' ? 'Female' : contact.gender === 'other' ? 'Other' : 'Prefer not to say'}
              </Badge>
            )}
            {contact.nationality && (
              <Badge variant="secondary" className="no-default-active-elevate">{contact.nationality}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Lead Stage Progress ────────────────────────────────── */}
      {contact.contactType === 'clients' && contact.clientStatus === 'lead' && contact.leadStage && (
        <div className="my-1">
          <LeadStageProgressBar 
            currentStage={contact.leadStage as LeadStage} 
            contactId={contact.id}
            onStageChange={(newStage) => {
              updateStageMutation.mutate({ id: contact.id, data: { leadStage: newStage } });
            }}
            isUpdating={updateStageMutation.isPending}
          />
        </div>
      )}

      {/* ── Two-column layout: info left, notes right ─────────── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* LEFT — info cards */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* ── Contact Information ─────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Contact Information
              </span>
              {editingSection !== 'contact_info' && (
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                  data-testid="button-edit-contact_info"
                  onClick={() => startEdit('contact_info', { email: contact.email, mobile: contact.mobile, whatsapp: contact.whatsapp, phone: contact.phone })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {editingSection === 'contact_info' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={sectionData.email || ""} onChange={e => setSectionData(p => ({ ...p, email: e.target.value }))} data-testid="input-edit-email" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mobile</Label>
                  <Input value={sectionData.mobile || ""} onChange={e => setSectionData(p => ({ ...p, mobile: e.target.value }))} placeholder="+61 4xx xxx xxx" data-testid="input-edit-mobile" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                  <Input value={sectionData.whatsapp || ""} onChange={e => setSectionData(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+61 4xx xxx xxx" data-testid="input-edit-whatsapp" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input value={sectionData.phone || ""} onChange={e => setSectionData(p => ({ ...p, phone: e.target.value }))} placeholder="+61 x xxxx xxxx" data-testid="input-edit-phone" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" onClick={() => saveSectionMutation.mutate(sectionData)} disabled={saveSectionMutation.isPending} data-testid="button-save-contact_info">
                    {saveSectionMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} data-testid="button-cancel-contact_info">Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${contact.email}`} className="text-sm hover:text-primary truncate" data-testid="link-email-detail">{contact.email}</a>
                  </div>
                )}
                {contact.mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${contact.mobile}`} className="text-sm hover:text-primary" data-testid="link-mobile-detail">{contact.mobile}</a>
                    <span className="text-xs text-muted-foreground">Mobile</span>
                  </div>
                )}
                {contact.whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g,'')}`} className="text-sm hover:text-primary" target="_blank" rel="noopener noreferrer" data-testid="link-whatsapp-detail">{contact.whatsapp}</a>
                    <span className="text-xs text-muted-foreground">WhatsApp</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${contact.phone}`} className="text-sm hover:text-primary" data-testid="link-phone-detail">{contact.phone}</a>
                  </div>
                )}
                {!contact.email && !contact.mobile && !contact.whatsapp && !contact.phone && (
                  <p className="text-sm text-muted-foreground">No contact info on file</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Address ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Address
              </span>
              {editingSection !== 'address' && (
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                  data-testid="button-edit-address"
                  onClick={() => startEdit('address', { unitNo: contact.unitNo, street: contact.street, suburb: contact.suburb, city: contact.city, state: contact.state, postcode: contact.postcode, country: contact.country })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {editingSection === 'address' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Unit No</Label>
                    <Input value={sectionData.unitNo || ""} onChange={e => setSectionData(p => ({ ...p, unitNo: e.target.value }))} placeholder="Unit" data-testid="input-edit-unitno" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Street</Label>
                    <Input value={sectionData.street || ""} onChange={e => setSectionData(p => ({ ...p, street: e.target.value }))} placeholder="Street address" data-testid="input-edit-street" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Suburb</Label>
                  <Input value={sectionData.suburb || ""} onChange={e => setSectionData(p => ({ ...p, suburb: e.target.value }))} data-testid="input-edit-suburb" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <Input value={sectionData.city || ""} onChange={e => setSectionData(p => ({ ...p, city: e.target.value }))} data-testid="input-edit-city" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">State</Label>
                    <Input value={sectionData.state || ""} onChange={e => setSectionData(p => ({ ...p, state: e.target.value }))} data-testid="input-edit-state" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Postcode</Label>
                    <Input value={sectionData.postcode || ""} onChange={e => setSectionData(p => ({ ...p, postcode: e.target.value }))} data-testid="input-edit-postcode" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Select value={sectionData.country || ""} onValueChange={v => setSectionData(p => ({ ...p, country: v }))}>
                    <SelectTrigger data-testid="select-edit-country"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" onClick={() => saveSectionMutation.mutate(sectionData)} disabled={saveSectionMutation.isPending} data-testid="button-save-address">
                    {saveSectionMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} data-testid="button-cancel-address">Cancel</Button>
                </div>
              </div>
            ) : (
              contact.street || contact.city ? (
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
              )
            )}
          </CardContent>
        </Card>

        {/* ── Inquiry Details ───────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Inquiry Details
              </span>
              {editingSection !== 'inquiry' && (
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                  data-testid="button-edit-inquiry"
                  onClick={() => startEdit('inquiry', {
                    programDiscipline: contact.programDiscipline,
                    programType: contact.programType,
                    whereToStudy: contact.whereToStudy,
                    budgetMin: contact.budgetMin as number | null,
                    budgetMax: contact.budgetMax as number | null,
                  })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editingSection === 'inquiry' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Interested Discipline</Label>
                  <Select
                    value={sectionData.programDiscipline || ""}
                    onValueChange={(v) => setSectionData(p => ({ ...p, programDiscipline: v || null }))}
                  >
                    <SelectTrigger data-testid="select-edit-discipline">
                      <SelectValue placeholder="Select discipline" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                      {[
                        'Accounting, Business & Finance','Agriculture & Forestry','Applied Sciences & Professions',
                        'Arts, Design & Architecture','Computer Science & IT','Education & Training',
                        'Engineering & Technology','Environmental Studies & Earth Sciences','Hospitality, Leisure & Sports',
                        'Humanities','Journalism & Media','Law','Medicine & Health','Short Courses','Trade',
                      ].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Study Level</Label>
                  <Select
                    value={sectionData.programType || ""}
                    onValueChange={(v) => setSectionData(p => ({ ...p, programType: v || null }))}
                  >
                    <SelectTrigger data-testid="select-edit-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                      {[
                        'Certificate I','Certificate II','Certificate III','Certificate IV','Diploma',
                        'Advanced Diploma','Associate Degree','Bachelor Degree','Graduate Certificate',
                        'Graduate Diploma','Masters Degree','Doctoral Degree','ELICOS','Foundation','Short Course','Other',
                      ].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Destination Country</Label>
                  <Input
                    value={sectionData.whereToStudy || ""}
                    onChange={e => setSectionData(p => ({ ...p, whereToStudy: e.target.value || null }))}
                    placeholder="e.g. Australia, UK, Canada"
                    data-testid="input-edit-where-to-study"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Budget Range (AUD / year)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={sectionData.budgetMin ?? ""}
                      onChange={e => setSectionData(p => ({ ...p, budgetMin: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Min e.g. 5000"
                      data-testid="input-edit-budget-min"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={sectionData.budgetMax ?? ""}
                      onChange={e => setSectionData(p => ({ ...p, budgetMax: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Max e.g. 60000"
                      data-testid="input-edit-budget-max"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" onClick={() => saveSectionMutation.mutate(sectionData)} disabled={saveSectionMutation.isPending} data-testid="button-save-inquiry">
                    {saveSectionMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} data-testid="button-cancel-inquiry">Cancel</Button>
                </div>
              </div>
            )}
            {contact.courseName && (
              <div className="flex justify-between items-center gap-3">
                <span className="text-muted-foreground shrink-0">Course Interested In</span>
                {contact.courseId ? (
                  <a href={`/courses/${contact.courseSlug || contact.courseId}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1 text-right" target="_blank" rel="noopener noreferrer" data-testid="link-inquiry-course">
                    {contact.courseName}<ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-sm font-medium text-right">{contact.courseName}</span>
                )}
              </div>
            )}
            {hasAnyContactPreferenceData && (
              <div className="space-y-2" data-testid="section-course-preferences">
                <span className="text-muted-foreground text-sm shrink-0">Course Preferences</span>
                {contactPreferences!.slice(0, 3).map((pref) => {
                  if (!pref.country && !pref.universityName && !pref.courseName) return null;
                  const code = getCountryCode(pref.country);
                  return (
                    <div key={pref.preferenceRank} className="flex items-start gap-2 pl-1" data-testid={`pref-row-${pref.preferenceRank}`}>
                      <Badge variant="outline" className="text-xs shrink-0 mt-0.5 no-default-active-elevate">
                        {pref.preferenceRank}
                      </Badge>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {pref.country && (
                          <div className="flex items-center gap-1.5">
                            {code && (
                              <img src={getFlagUrl(code)} alt={pref.country} className="rounded-sm object-cover shrink-0" style={{ width: '18px', height: '12px' }} />
                            )}
                            <span className="text-xs text-muted-foreground">{pref.country}</span>
                          </div>
                        )}
                        {pref.universityName && (
                          <span className="text-sm text-muted-foreground leading-tight">{pref.universityName}</span>
                        )}
                        {pref.courseName && (
                          <span className="text-sm font-medium leading-tight">{pref.courseName}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {contact.country && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground shrink-0">Country</span>
                <span data-testid="text-inquiry-country">{contact.country}</span>
              </div>
            )}
            {contact.visaStatus && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground shrink-0">Visa Status</span>
                <span data-testid="text-inquiry-visa">{contact.visaStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
            )}
            {contact.entrySource && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground shrink-0">Entry Source</span>
                <Badge variant="secondary" data-testid="badge-entry-source">
                  {contact.entrySource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
            )}
            {contact.contactType === 'clients' && contact.leadRating && (
              <div className="flex justify-between items-center gap-3">
                <span className="text-muted-foreground shrink-0">Lead Rating</span>
                <Badge variant={contact.leadRating === 'hot' ? 'destructive' : contact.leadRating === 'warm' ? 'default' : 'secondary'} data-testid="badge-lead-rating">
                  <Star className="h-3 w-3 mr-1" />
                  {contact.leadRating.charAt(0).toUpperCase() + contact.leadRating.slice(1)}
                </Badge>
              </div>
            )}
            {contact.referrer && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-3">
                <span className="text-muted-foreground shrink-0">Referrer</span>
                <span className="text-sm text-muted-foreground break-all sm:text-right" data-testid="text-referrer">{contact.referrer}</span>
              </div>
            )}
            {contact.firstPageVisited && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-3">
                <span className="text-muted-foreground shrink-0">Page Visited</span>
                <span className="text-sm text-muted-foreground break-all sm:text-right" data-testid="text-first-page">{contact.firstPageVisited}</span>
              </div>
            )}
            {contact.firstVisit && !isNaN(new Date(contact.firstVisit).getTime()) && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground shrink-0">First Visit</span>
                <span className="text-sm">{format(new Date(contact.firstVisit), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
            )}
            {(contact.budgetMin || contact.budgetMax) && (
              <div className="flex justify-between items-center gap-3">
                <span className="text-muted-foreground shrink-0">Budget Range</span>
                <span className="text-sm font-medium" data-testid="text-budget-range">
                  {contact.budgetMin ? `$${Number(contact.budgetMin).toLocaleString()}` : "Any"}
                  {" — "}
                  {contact.budgetMax ? `$${Number(contact.budgetMax).toLocaleString()} AUD/yr` : "Any"}
                </span>
              </div>
            )}
            {!contact.courseName && !contact.entrySource && !contact.leadRating && !contact.visaStatus && !contact.country && !hasAnyContactPreferenceData && !contact.budgetMin && !contact.budgetMax && (
              <p className="text-sm text-muted-foreground">No inquiry details on file</p>
            )}
          </CardContent>
        </Card>

        {/* ── Contact Details (read-only system fields) ────────── */}
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
                  {contact.updatedByUser && (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={contact.updatedByUser.profileImageUrl || undefined} />
                        <AvatarFallback>{contact.updatedByUser.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span>{contact.updatedByUser.firstName} {contact.updatedByUser.lastName}</span>
                      <span className="text-muted-foreground">·</span>
                    </>
                  )}
                  <span className="text-muted-foreground">{format(new Date(contact.updatedAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Contact Owner</span>
              <div className="flex items-center gap-2">
                {contact.ownerUser ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={contact.ownerUser.profileImageUrl || undefined} />
                      <AvatarFallback className="text-[10px]">{contact.ownerUser.firstName?.[0]}{contact.ownerUser.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{contact.ownerUser.firstName} {contact.ownerUser.lastName}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Not set</span>
                )}
                <Popover open={ownerPopoverOpen} onOpenChange={(v) => { setOwnerPopoverOpen(v); if (!v) setOwnerSearch(""); }}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-reassign-owner">
                      <ChevronsUpDown className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search team members..." value={ownerSearch} onValueChange={setOwnerSearch} />
                      <CommandList>
                        <CommandEmpty>No team members found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="no-owner" onSelect={() => ownerMutation.mutate(null)} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>No owner</span>
                            </div>
                            {!contact.contactOwner && <Check className="ml-auto h-4 w-4" />}
                          </CommandItem>
                          {admins.filter(a => {
                            const q = ownerSearch.toLowerCase();
                            return !q || a.firstName.toLowerCase().includes(q) || a.lastName.toLowerCase().includes(q);
                          }).map((admin) => (
                            <CommandItem
                              key={admin.id}
                              value={`${admin.firstName} ${admin.lastName}`}
                              onSelect={() => ownerMutation.mutate(admin.id)}
                              className="cursor-pointer"
                              data-testid={`option-owner-${admin.id}`}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={admin.profileImageUrl || undefined} />
                                  <AvatarFallback className="text-[10px]">{admin.firstName?.[0]}{admin.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{admin.firstName} {admin.lastName}</span>
                              </div>
                              {contact.contactOwner === admin.id && <Check className="ml-auto h-4 w-4" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Assigned To</span>
              <div className="flex items-center gap-2">
                {contact.assignedUser ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={contact.assignedUser.profileImageUrl || undefined} />
                      <AvatarFallback className="text-[10px]">{contact.assignedUser.firstName?.[0]}{contact.assignedUser.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{contact.assignedUser.firstName} {contact.assignedUser.lastName}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Not assigned</span>
                )}
                <AssignPopover contactId={contact.id} assignedTo={contact.assignedTo} admins={admins} onAssign={onAssign} />
              </div>
            </div>
            {contact.sourceLead && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source Lead</span>
                <span>{contact.sourceLead.firstName} {contact.sourceLead.lastName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Emergency Contact ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between gap-2">
              Emergency Contact
              {editingSection !== 'emergency' && (
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                  data-testid="button-edit-emergency"
                  onClick={() => startEdit('emergency', { emergencyContactName: contact.emergencyContactName, emergencyContactMobile: contact.emergencyContactMobile, emergencyContactRelationship: contact.emergencyContactRelationship, emergencyContactAddress: contact.emergencyContactAddress })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editingSection === 'emergency' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input value={sectionData.emergencyContactName || ""} onChange={e => setSectionData(p => ({ ...p, emergencyContactName: e.target.value }))} data-testid="input-edit-emergency-name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mobile</Label>
                  <Input value={sectionData.emergencyContactMobile || ""} onChange={e => setSectionData(p => ({ ...p, emergencyContactMobile: e.target.value }))} placeholder="+61 4xx xxx xxx" data-testid="input-edit-emergency-mobile" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Relationship</Label>
                  <Input value={sectionData.emergencyContactRelationship || ""} onChange={e => setSectionData(p => ({ ...p, emergencyContactRelationship: e.target.value }))} placeholder="e.g. Parent, Sibling" data-testid="input-edit-emergency-relationship" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <Input value={sectionData.emergencyContactAddress || ""} onChange={e => setSectionData(p => ({ ...p, emergencyContactAddress: e.target.value }))} data-testid="input-edit-emergency-address" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" onClick={() => saveSectionMutation.mutate(sectionData)} disabled={saveSectionMutation.isPending} data-testid="button-save-emergency">
                    {saveSectionMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} data-testid="button-cancel-emergency">Cancel</Button>
                </div>
              </div>
            ) : (
              contact.emergencyContactName ? (
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
              )
            )}
          </CardContent>
        </Card>

        </div>{/* end left info grid */}

        {/* RIGHT — sticky notes panel */}
        <div className="w-full lg:w-[360px] shrink-0 lg:sticky lg:top-4 flex flex-col" style={{ maxHeight: "calc(100vh - 90px)" }}>
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CardContent className="flex-1 flex flex-col min-h-0 pt-4 px-4 pb-4 overflow-hidden">
              <LeadNotes
                leadId={contact.id}
                leadName={`${contact.firstName} ${contact.lastName}`}
                branchId={contact.branchId}
              />
            </CardContent>
          </Card>
        </div>

      </div>{/* end two-column flex */}

      {roleNeedsInstitution(contact.contactType) && (
          <Card>
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
          <Card>
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
                <Button
                  size="sm"
                  onClick={() => setIsCreateApplicationOpen(true)}
                  disabled={!!(applicationsData?.studentProfile && applicationsData.applications.length >= (applicationsData.studentProfile.maxApplicationSlots || 3))}
                  data-testid="button-create-application"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Application
                </Button>
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
                          <div className="flex items-center gap-2 flex-wrap">
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
                            {(app as any).hasExternalCourses && (
                              <Badge variant="outline" className="text-[10px] px-1.5">External</Badge>
                            )}
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
      <Dialog open={isCreateApplicationOpen} onOpenChange={(open) => {
        setIsCreateApplicationOpen(open);
        if (!open) {
          setCourseCountryFilter("");
          setCourseInstitutionFilter("");
          setSelectedCourseIds([]);
          setCourseSearch("");
          setApplicationNotes("");
          setExternalEntries([]);
          setManualCourseName("");
          setManualInstitutionName("");
          setCourseEntryMode("search");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Application</DialogTitle>
            <DialogDescription>
              Create a new application on behalf of {contact.firstName} {contact.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs value={courseEntryMode} onValueChange={(v) => setCourseEntryMode(v as "search" | "manual")}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="search">Search Courses</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>
              <TabsContent value="search" className="space-y-3 mt-2">

            {/* Step 1 — Country */}
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select
                value={courseCountryFilter}
                onValueChange={(v) => {
                  setCourseCountryFilter(v);
                  setCourseInstitutionFilter("");
                  setSelectedCourseIds([]);
                  setCourseSearch("");
                }}
              >
                <SelectTrigger data-testid="select-country-filter">
                  <SelectValue placeholder="Select a country">
                    {courseCountryFilter && (() => {
                      const code = getCountryCode(courseCountryFilter);
                      return (
                        <div className="flex items-center gap-2">
                          {code && (
                            <img
                              src={getFlagUrl(code)}
                              className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                              alt={courseCountryFilter}
                            />
                          )}
                          <span>{courseCountryFilter}</span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {courseCountryOptions.map((country) => {
                    const code = getCountryCode(country);
                    return (
                      <SelectItem key={country} value={country} data-testid={`country-option-${country}`}>
                        <div className="flex items-center gap-2">
                          {code && (
                            <img
                              src={getFlagUrl(code)}
                              className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                              alt={country}
                            />
                          )}
                          <span>{country}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2 — Institution (only after country chosen) */}
            {courseCountryFilter && (
              <div className="space-y-1.5">
                <Label>Institution</Label>
                <Select
                  value={courseInstitutionFilter}
                  onValueChange={(v) => {
                    setCourseInstitutionFilter(v);
                    setSelectedCourseIds([]);
                    setCourseSearch("");
                  }}
                >
                  <SelectTrigger data-testid="select-institution-filter">
                    <SelectValue placeholder="Select an institution">
                      {courseInstitutionFilter && (() => {
                        const inst = filteredInstitutionOptions.find((i: any) => i.id === courseInstitutionFilter);
                        if (!inst) return null;
                        return (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={inst.logo || undefined} />
                              <AvatarFallback className="text-[9px]">
                                {inst.name?.slice(0, 2).toUpperCase() ?? "IN"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{inst.name}</span>
                          </div>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredInstitutionOptions.map((inst: any) => (
                      <SelectItem key={inst.id} value={inst.id} data-testid={`institution-option-${inst.id}`}>
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

            {/* Step 3 — Courses (only after both country + institution chosen) */}
            {courseCountryFilter && courseInstitutionFilter && (
              <div className="space-y-1.5">
                <Label>Select Course(s) *</Label>
                <Input
                  placeholder="Optionally filter by name..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  data-testid="input-course-search"
                />
                {isLoadingCourses && (
                  <p className="text-xs text-muted-foreground py-2">
                    {`Loading courses from ${filteredInstitutionOptions.find((i: any) => i.id === courseInstitutionFilter)?.name ?? "institution"}...`}
                  </p>
                )}
                {!isLoadingCourses && searchCourses.length > 0 && (
                  <ScrollArea className="h-52 border rounded-md">
                    <div className="p-1.5 space-y-1">
                      {searchCourses.map((course: any) => {
                        const uni = course.university;
                        const isAlreadyApplied = alreadyAppliedCourseIds.has(course.id);
                        const isSelected = selectedCourseIds.includes(course.id);
                        return (
                          <div
                            key={course.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md ${
                              isAlreadyApplied
                                ? "opacity-50 cursor-not-allowed border border-transparent"
                                : isSelected
                                  ? "bg-primary/10 border border-primary/30 cursor-pointer hover-elevate"
                                  : "border border-transparent cursor-pointer hover-elevate"
                            }`}
                            onClick={() => {
                              if (isAlreadyApplied) return;
                              setSelectedCourseIds((prev) =>
                                isSelected ? prev.filter((id) => id !== course.id) : [...prev, course.id]
                              );
                            }}
                            data-testid={`course-option-${course.id}`}
                          >
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={uni?.logo || undefined} alt={uni?.name || "Institution"} />
                              <AvatarFallback className="text-xs font-medium bg-muted">
                                {uni?.name?.slice(0, 2).toUpperCase() ?? "IN"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight">{course.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {course.level && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 no-default-active-elevate">{course.level}</Badge>
                                )}
                                {course.duration && (
                                  <span className="text-xs text-muted-foreground">{course.duration}</span>
                                )}
                              </div>
                            </div>
                            {isAlreadyApplied ? (
                              <Badge variant="secondary" className="text-[10px] shrink-0 no-default-active-elevate">Applied</Badge>
                            ) : isSelected ? (
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
                {!isLoadingCourses && searchCourses.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">
                    No published courses found for this institution.
                  </p>
                )}
              </div>
            )}

            {/* Selected courses summary */}
            {selectedCourseIds.length > 0 && (
              <div className="space-y-1.5" data-testid="selected-courses-summary">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Selected ({selectedCourseIds.length})
                  </span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={() => setSelectedCourseIds([])}
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCourseIds.map((id) => {
                    const c = searchCourses.find((x: any) => x.id === id);
                    const label = c?.title ?? id;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="text-xs max-w-[200px] truncate pr-1 gap-1 no-default-active-elevate"
                        data-testid={`selected-course-badge-${id}`}
                      >
                        <span className="truncate">{label}</span>
                        <button
                          type="button"
                          className="ml-0.5 shrink-0 opacity-60 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCourseIds((prev) => prev.filter((x) => x !== id));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

              </TabsContent>
              <TabsContent value="manual" className="space-y-3 mt-2">
                <p className="text-xs text-muted-foreground">
                  Enter the institution and course name for a course not in the platform catalog.
                </p>
                <div className="space-y-1.5">
                  <Label>Institution Name *</Label>
                  <Input
                    placeholder="e.g. University of Melbourne"
                    value={manualInstitutionName}
                    onChange={(e) => setManualInstitutionName(e.target.value)}
                    data-testid="input-manual-institution"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Course Name *</Label>
                  <Input
                    placeholder="e.g. Master of Data Science"
                    value={manualCourseName}
                    onChange={(e) => setManualCourseName(e.target.value)}
                    data-testid="input-manual-course"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!manualCourseName.trim() || !manualInstitutionName.trim()}
                  onClick={() => {
                    setExternalEntries(prev => [...prev, { courseName: manualCourseName.trim(), institutionName: manualInstitutionName.trim() }]);
                    setManualCourseName("");
                    setManualInstitutionName("");
                  }}
                  data-testid="button-add-external-entry"
                >
                  <Plus className="h-3 w-3 mr-1" />Add to List
                </Button>
                {externalEntries.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">External Entries ({externalEntries.length})</span>
                    <div className="space-y-1">
                      {externalEntries.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{entry.courseName}</p>
                            <p className="text-xs text-muted-foreground truncate">{entry.institutionName}</p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 opacity-60 hover:opacity-100"
                            onClick={() => setExternalEntries(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

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
            <Button type="button" variant="outline" onClick={() => {
              setIsCreateApplicationOpen(false);
              setCourseCountryFilter("");
              setCourseInstitutionFilter("");
              setSelectedCourseIds([]);
              setCourseSearch("");
              setApplicationNotes("");
              setExternalEntries([]);
              setManualCourseName("");
              setManualInstitutionName("");
              setCourseEntryMode("search");
            }}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateApplication}
              disabled={(!selectedCourseIds.length && !externalEntries.length) || createApplicationMutation.isPending}
              data-testid="button-confirm-create-application"
            >
              {createApplicationMutation.isPending
                ? "Creating..."
                : "Create Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
