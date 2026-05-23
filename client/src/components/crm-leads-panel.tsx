import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { LeadNotes } from "@/components/lead-notes";

// Helper to get auth headers for fetch requests
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
import { 
  Search, 
  Plus, 
  Filter, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  ArrowRight,
  Trash2,
  Edit,
  Clock,
  Building2,
  BookOpen,
  Eye,
  ChevronLeft,
  List,
  LayoutGrid,
  ChevronDown,
  GripVertical,
  Globe,
  Check,
  ChevronsUpDown,
  UserPlus,
  ExternalLink,
  FileText,
  Pencil,
  Star,
  MessageCircle,
  GraduationCap,
  X,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { getCountryCode, getFlagUrl } from "@/lib/country-flags";

type ViewMode = 'list' | 'kanban';
type LeadStatus = 'not_contacted' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';

const KANBAN_STATUSES: LeadStatus[] = ['not_contacted', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'];

type LeadStage = 'new' | 'contacted' | 'qualified' | 'counselling' | 'ready_to_apply' | 'converted' | 'lost';

interface CrmLead {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  gender: string | null;
  photo: string | null;
  email: string;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  leadStatus: 'not_contacted' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
  leadStage: LeadStage | null;
  leadRating: 'cold' | 'warm' | 'hot';
  leadSource: string | null;
  entrySource: string | null;
  leadCreationMethod: 'manually' | 'website_form' | 'facebook_ads' | 'google_ads' | 'education_fair' | 'referral' | 'recruitment_agent' | 'campus_walk_in' | 'database_import' | 'ai_web_scrape' | null;
  branch: string | null;
  branchId: string | null;
  nationality: string | null;
  country: string | null;
  city: string | null;
  // Address
  unitNo: string | null;
  street: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  // Emergency Contact
  emergencyContactName: string | null;
  emergencyContactMobile: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactAddress: string | null;
  // Student fields
  courseId: string | null;
  courseSlug: string | null;
  universityId: string | null;
  courseName: string | null;
  interestedIn: string | null;
  productInterest: string | null;
  visaStatus: string | null;
  intakeMonth: string | null;
  intakeYear: string | null;
  // Contact type
  contactType: string | null;
  clientStatus: string | null;
  // Visit tracking
  firstVisit: string | null;
  firstPageVisited: string | null;
  notes: string | null;
  referrer: string | null;
  assignedTo: string | null;
  leadOwner: string | null;
  convertedContactId: string | null;
  convertedAt: string | null;
  lastActivityTime: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignedToUser?: {
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
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  } | null;
  updatedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  } | null;
}

interface LeadApplication {
  id: string;
  courseId: string;
  courseName: string | null;
  courseLevel: string | null;
  universityName: string | null;
  universityLogo: string | null;
  status: string;
  currentStage: string;
  createdAt: string | null;
  assignedConsultant: { firstName: string; lastName: string; profileImageUrl: string | null } | null;
}

interface StatusHistory {
  id: string;
  leadId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  notes: string | null;
  createdAt: string;
  changedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

const statusColors: Record<string, string> = {
  not_contacted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  contacted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  qualified: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  unqualified: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const ratingColors: Record<string, string> = {
  cold: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  warm: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  hot: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  qualified: "Qualified",
  unqualified: "Unqualified",
  converted: "Converted",
  lost: "Lost",
};

export function CrmLeadsPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<string>("details");
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: leadsData, isLoading } = useQuery<{
    leads: CrmLead[];
    total: number;
  }>({
    queryKey: ["/api/crm/leads", statusFilter, ratingFilter, branchFilter, sourceFilter, countryFilter, assignedFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (ratingFilter !== "all") params.append("rating", ratingFilter);
      if (branchFilter !== "all") params.append("branch", branchFilter);
      if (sourceFilter !== "all") params.append("source", sourceFilter);
      if (countryFilter !== "all") params.append("country", countryFilter);
      if (assignedFilter !== "all") params.append("assignedTo", assignedFilter);
      if (searchQuery) params.append("search", searchQuery);
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/leads?${params.toString()}`, { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
  });

  const { data: leadDetail } = useQuery<CrmLead & { statusHistory: StatusHistory[] }>({
    queryKey: ["/api/crm/leads", selectedLead?.id],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/crm/leads/${selectedLead?.id}`, { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch lead details");
      return response.json();
    },
    enabled: !!selectedLead?.id,
  });

  // Handle URL parameters for deep-linking to specific lead and notes tab
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const leadId = params.get('leadId');
    const showNotes = params.get('showNotes');
    
    if (leadId && leadsData?.leads) {
      // Find the lead in the loaded data
      const lead = leadsData.leads.find(l => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
        if (showNotes === 'true') {
          setInitialTab('notes');
        }
        // Clear URL params after handling
        navigate('/admin?tab=crm-leads', { replace: true });
      } else {
        // Lead not in current filter, fetch it directly
        (async () => {
          try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/crm/leads/${leadId}`, { credentials: 'include', headers });
            if (response.ok) {
              const fetchedLead = await response.json();
              setSelectedLead(fetchedLead);
              if (showNotes === 'true') {
                setInitialTab('notes');
              }
            }
          } catch (error) {
            console.error('Failed to fetch lead from URL param:', error);
          }
          // Clear URL params after handling
          navigate('/admin?tab=crm-leads', { replace: true });
        })();
      }
    }
  }, [searchString, leadsData?.leads, navigate]);

  // Fetch branches from database
  const { data: branchesData } = useQuery<{ id: string; name: string; code: string; city: string | null }[]>({
    queryKey: ["/api/admin/branches"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/branches", { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch branches");
      return response.json();
    },
  });

  // Fetch admins for filter dropdown
  const { data: admins } = useQuery<{ id: string; firstName: string; lastName: string; branchId: string | null }[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("userType", "admin");
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch admins");
      const data = await response.json();
      return data.users || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/crm/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      setIsDeleteOpen(false);
      setSelectedLead(null);
      toast({ title: "Lead deleted", description: "Lead has been removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" });
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CrmLead> }) => {
      return apiRequest("PATCH", `/api/crm/leads/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", variables.id, "activity-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", variables.id, "status-history"] });
      toast({ title: "Lead updated", description: "Lead status has been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lead status", variant: "destructive" });
    },
  });

  const handleDeleteLead = () => {
    if (selectedLead) {
      deleteMutation.mutate(selectedLead.id);
    }
  };

  const openEditPage = (lead: CrmLead) => {
    navigate(`/admin/leads/${lead.id}/edit`);
  };

  if (selectedLead && !isDeleteOpen) {
    return (
      <LeadDetailView
        lead={leadDetail || selectedLead}
        onBack={() => { setSelectedLead(null); setInitialTab('details'); }}
        onEdit={() => openEditPage(selectedLead)}
        onDelete={() => setIsDeleteOpen(true)}
        activeTab={initialTab}
        onTabChange={setInitialTab}
      />
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over) return;
    
    const leadId = active.id as string;
    
    // Get the target status - check if it's a column drop zone or read from sortable container
    let newStatus: LeadStatus | undefined;
    
    // Check if dropped directly on a column (droppable zone)
    if (KANBAN_STATUSES.includes(over.id as LeadStatus)) {
      newStatus = over.id as LeadStatus;
    } 
    // If dropped on another card, get its container (column)
    else if (over.data.current?.sortable) {
      newStatus = over.data.current.sortable.containerId as LeadStatus;
    }
    
    if (!newStatus) return;
    
    const lead = leadsData?.leads?.find(l => l.id === leadId);
    if (lead && lead.leadStatus !== newStatus) {
      statusUpdateMutation.mutate({ 
        id: leadId, 
        data: { leadStatus: newStatus } 
      });
    }
  };

  const getLeadsByStatus = (status: LeadStatus) => {
    return leadsData?.leads?.filter(lead => lead.leadStatus === status) || [];
  };

  const activeFiltersCount = [statusFilter, ratingFilter, branchFilter, sourceFilter, countryFilter, assignedFilter]
    .filter(f => f !== 'all').length;

  const uniqueCountries = Array.from(new Set(leadsData?.leads?.map(l => l.country).filter(Boolean) || []));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-crm-leads-title">CRM Leads</h2>
          <p className="text-muted-foreground">Manage and track potential students</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={() => navigate("/admin/leads/new")} data-testid="button-create-lead">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-leads"
                />
              </div>
              {viewMode === 'list' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="not_contacted">Not Contacted</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[120px]" data-testid="select-rating-filter">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                </SelectContent>
              </Select>
              {user?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`gap-2 toggle-elevate${assignedFilter === user.id ? " toggle-elevated" : ""}`}
                  onClick={() => setAssignedFilter(assignedFilter === user.id ? "all" : user.id)}
                  data-testid="button-my-leads-filter"
                >
                  My Leads
                </Button>
              )}
              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    More Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
            
            <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-3 pt-2 border-t">
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-[160px]" data-testid="select-branch-filter">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branchesData?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.name}>
                          {branch.name}{branch.city ? ` (${branch.city})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-source-filter">
                      <SelectValue placeholder="Lead Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="website_form">Website Form</SelectItem>
                      <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                      <SelectItem value="google_ads">Google Ads</SelectItem>
                      <SelectItem value="education_fair">Education Fair</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="recruitment_agent">Recruitment Agent</SelectItem>
                      <SelectItem value="campus_walk_in">Campus Walk-in</SelectItem>
                      <SelectItem value="manually">Manual Entry</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="w-[140px]" data-testid="select-country-filter">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {uniqueCountries.map(country => (
                        <SelectItem key={country} value={country!}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-assigned-filter">
                      <SelectValue placeholder="Assigned To" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Consultants</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {admins?.map(admin => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.firstName} {admin.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeFiltersCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setStatusFilter('all');
                        setRatingFilter('all');
                        setBranchFilter('all');
                        setSourceFilter('all');
                        setCountryFilter('all');
                        setAssignedFilter('all');
                      }}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
          ) : leadsData?.leads?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leads found. Create your first lead to get started.
            </div>
          ) : viewMode === 'kanban' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event) => setActiveDragId(event.active.id as string)}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4">
                {KANBAN_STATUSES.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    leads={getLeadsByStatus(status)}
                    onSelectLead={(lead) => { setSelectedLead(lead); setInitialTab('details'); }}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeDragId ? (
                  <KanbanLeadCardOverlay
                    lead={leadsData?.leads?.find(l => l.id === activeDragId)!}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="space-y-2">
              {leadsData?.leads?.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => { setSelectedLead(lead); setInitialTab('details'); }}
                  data-testid={`card-lead-${lead.id}`}
                >
                  {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    {/* Avatar + Name + Badges section */}
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback>
                          {lead.firstName?.[0]}{lead.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        {/* Name and badges row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium" data-testid={`text-lead-name-${lead.id}`}>
                            {lead.firstName} {lead.lastName}
                          </span>
                        </div>
                        {/* Badges on their own row for clarity */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <Badge variant="outline" className={`${statusColors[lead.leadStatus]} text-xs`}>
                            {statusLabels[lead.leadStatus]}
                          </Badge>
                          <Badge variant="outline" className={`${ratingColors[lead.leadRating]} text-xs`}>
                            {lead.leadRating}
                          </Badge>
                          {lead.leadCreationMethod === 'website_form' && (
                            <Badge variant="secondary" className="text-xs">
                              Website
                            </Badge>
                          )}
                        </div>
                        {/* Course name */}
                        {lead.courseName && (
                          <div className="flex items-center gap-1 text-sm text-primary mt-1.5" data-testid={`text-lead-course-${lead.id}`}>
                            <BookOpen className="h-3 w-3 shrink-0" />
                            {lead.courseId ? (
                              <a 
                                href={`/courses/${lead.courseSlug || lead.courseId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:underline truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {lead.courseName}
                              </a>
                            ) : (
                              <span className="font-medium truncate">{lead.courseName}</span>
                            )}
                          </div>
                        )}
                        {/* Date and Assigned - visible on mobile */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5 sm:hidden">
                          {lead.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(lead.createdAt), "MMM d, yyyy")}
                            </span>
                          )}
                          {lead.assignedToUser && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {lead.assignedToUser.firstName} {lead.assignedToUser.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* View button - visible on mobile, aligned right */}
                      <Button variant="ghost" size="icon" className="sm:hidden shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setInitialTab('details'); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Contact info - horizontal on desktop, vertical on mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground pl-13 sm:pl-0">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </span>
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.country && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {lead.country}
                        </span>
                      )}
                      {lead.branch && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {lead.branch}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Date/Assigned + View button - desktop only */}
                  <div className="hidden sm:flex items-center justify-end gap-4 mt-2">
                    <div className="text-right text-sm text-muted-foreground">
                      {lead.createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(lead.createdAt), "MMM d, yyyy")}
                        </div>
                      )}
                      {lead.assignedToUser && (
                        <div className="flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          {lead.assignedToUser.firstName} {lead.assignedToUser.lastName}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setInitialTab('details'); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// Kanban Column Component
function KanbanColumn({ 
  status, 
  leads, 
  onSelectLead 
}: { 
  status: LeadStatus; 
  leads: CrmLead[]; 
  onSelectLead: (lead: CrmLead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const leadIds = leads.map(lead => lead.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[status]}>
            {statusLabels[status]}
          </Badge>
          <span className="text-sm text-muted-foreground">({leads.length})</span>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-360px)]">
        <SortableContext id={status} items={leadIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 pr-2">
            {leads.map((lead) => (
              <DraggableLeadCard
                key={lead.id}
                lead={lead}
                onSelect={() => onSelectLead(lead)}
              />
            ))}
            {leads.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No leads in this status
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

// Draggable Lead Card Component for Kanban
function DraggableLeadCard({ 
  lead, 
  onSelect,
  isDragOverlay = false
}: { 
  lead: CrmLead; 
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
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={`cursor-pointer hover-elevate ${isDragging || isDragOverlay ? 'shadow-lg' : ''}`}
      onClick={onSelect}
      data-testid={`kanban-card-lead-${lead.id}`}
    >
      <CardContent className="p-3">
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
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {lead.firstName?.[0]}{lead.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm truncate">
                {lead.firstName} {lead.lastName}
              </span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.country && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 flex-shrink-0" />
                  <span>{lead.country}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${ratingColors[lead.leadRating]}`}>
                {lead.leadRating}
              </Badge>
              {lead.leadCreationMethod === 'website_form' && (
                <Badge variant="secondary" className="text-xs">
                  Web
                </Badge>
              )}
              {lead.courseName && (
                <Badge variant="outline" className="text-xs max-w-[120px] truncate">
                  {lead.courseName}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Static Lead Card for DragOverlay (no hooks)
function KanbanLeadCardOverlay({ lead }: { lead: CrmLead }) {
  if (!lead) return null;
  
  return (
    <Card className="cursor-grabbing shadow-lg w-64">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="mt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {lead.firstName?.[0]}{lead.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm truncate">
                {lead.firstName} {lead.lastName}
              </span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Badge variant="outline" className={`text-xs ${ratingColors[lead.leadRating]}`}>
                {lead.leadRating}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Lead Stage Constants ──────────────────────────────────────────────────
const ACTIVE_LEAD_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'counselling', 'ready_to_apply'];

const leadStageLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  counselling: 'Counselling',
  ready_to_apply: 'Ready to Apply',
  converted: 'Converted',
  lost: 'Lost',
};

const leadStageColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  qualified: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  counselling: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ready_to_apply: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// ── Lead Stage Progress Bar ───────────────────────────────────────────────
function LeadStageProgressBar({
  currentStage,
  onStageChange,
  isUpdating,
}: {
  currentStage: LeadStage;
  onStageChange: (stage: LeadStage) => void;
  isUpdating: boolean;
}) {
  const currentIndex = ACTIVE_LEAD_STAGES.indexOf(currentStage);
  const isTerminal = currentStage === 'converted' || currentStage === 'lost';

  return (
    <Card data-testid="card-lead-pipeline">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-semibold">Lead Pipeline</CardTitle>
          {isTerminal && (
            <Badge variant="outline" className={`no-default-active-elevate ${leadStageColors[currentStage]}`}>
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
                        isActive ? 'bg-primary' : 'bg-muted'
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
            {currentStage === 'ready_to_apply' && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className={`no-default-active-elevate ${leadStageColors['ready_to_apply']}`}>
                  Ready for application
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Lead Detail View ──────────────────────────────────────────────────────
interface LeadDetailViewProps {
  lead: CrmLead & { statusHistory?: StatusHistory[] };
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

type LeadEditSection = 'contact_info' | 'address' | 'emergency' | null;

function LeadDetailView({ lead, onBack, onEdit, onDelete }: LeadDetailViewProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Inline editing
  const [editingSection, setEditingSection] = useState<LeadEditSection>(null);
  const [sectionData, setSectionData] = useState<Partial<CrmLead>>({});

  // Assign popovers
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);

  // Status history collapsible
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Create application dialog
  const [isCreateApplicationOpen, setIsCreateApplicationOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [applicationNotes, setApplicationNotes] = useState("");
  const [courseInstitutionFilter, setCourseInstitutionFilter] = useState("");
  const [courseCountryFilter, setCourseCountryFilter] = useState("");

  const startEdit = (section: LeadEditSection, fields: Partial<CrmLead>) => {
    setEditingSection(section);
    setSectionData(fields);
  };
  const cancelEdit = () => {
    setEditingSection(null);
    setSectionData({});
  };

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: teamMembers } = useQuery<{ id: string; firstName: string; lastName: string; email: string; profileImageUrl: string | null }[]>({
    queryKey: ["/api/crm/team-members"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/crm/team-members", { credentials: 'include', headers });
      if (!response.ok) throw new Error("Failed to fetch team members");
      return response.json();
    },
  });

  const { data: applicationsData, isLoading: isLoadingApplications, isError: isApplicationsError } = useQuery<{
    applications: LeadApplication[];
    studentProfile: { id: string; maxApplicationSlots: number } | null;
  }>({
    queryKey: ["/api/crm/contacts", lead.id, "applications"],
  });

  const { data: coursesData, isLoading: isLoadingCourses } = useQuery<{ courses: any[]; total: number }>({
    queryKey: ["/api/courses", { search: courseSearch, limit: courseInstitutionFilter ? 100 : 20, publishStatus: 'published', universityId: courseInstitutionFilter || undefined }],
    enabled: isCreateApplicationOpen && (courseSearch.length > 1 || !!courseInstitutionFilter),
  });
  const searchCourses = coursesData?.courses || [];

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

  const alreadyAppliedCourseIds = new Set((applicationsData?.applications ?? []).map((a) => a.courseId));

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveSectionMutation = useMutation({
    mutationFn: async (data: Partial<CrmLead>) => {
      return apiRequest("PATCH", `/api/crm/leads/${lead.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", lead.id] });
      cancelEdit();
      toast({ title: "Saved", description: "Lead updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (assignedToUserId: string | null) => {
      return apiRequest("PATCH", `/api/crm/leads/${lead.id}`, { assignedTo: assignedToUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", lead.id] });
      setAssigneePopoverOpen(false);
      toast({ title: "Assignee updated", description: "Lead has been reassigned" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update assignee", variant: "destructive" });
    },
  });

  const ownerMutation = useMutation({
    mutationFn: async (newOwnerId: string | null) => {
      return apiRequest("PATCH", `/api/crm/leads/${lead.id}`, { leadOwner: newOwnerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", lead.id] });
      setOwnerPopoverOpen(false);
      toast({ title: "Owner updated", description: "Lead owner has been reassigned" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update owner", variant: "destructive" });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async (newStage: LeadStage) => {
      return apiRequest("PATCH", `/api/crm/leads/${lead.id}`, { leadStage: newStage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads", lead.id] });
      toast({ title: "Lead stage updated" });
    },
    onError: () => {
      toast({ title: "Failed to update lead stage", variant: "destructive" });
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: { courseId: string; notes?: string }) => {
      return apiRequest("POST", `/api/crm/contacts/${lead.id}/applications`, data);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create application", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateApplication = async () => {
    const coursesToCreate = selectedCourseIds.filter((id) => !alreadyAppliedCourseIds.has(id));
    if (!coursesToCreate.length) return;
    try {
      for (const courseId of coursesToCreate) {
        await createApplicationMutation.mutateAsync({ courseId, notes: applicationNotes || undefined });
      }
      const n = coursesToCreate.length;
      toast({ title: `${n} application${n !== 1 ? "s" : ""} created successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts", lead.id, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      setIsCreateApplicationOpen(false);
      setSelectedCourseIds([]);
      setCourseSearch("");
      setApplicationNotes("");
    } catch {
      // error toast already shown
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Hero Card ─────────────────────────────────────────── */}
      <Card className="overflow-hidden border-t-4 border-t-primary" data-testid="card-lead-hero">
        <CardContent className="pt-5 pb-4 px-5">
          {/* Back + actions row */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <Button type="button" variant="ghost" size="sm" onClick={onBack} data-testid="button-back" className="-ml-1 gap-1">
              <ChevronLeft className="h-4 w-4" />Back
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onEdit} data-testid="button-edit-lead">
                <Edit className="h-3.5 w-3.5 mr-1" />Edit
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={onDelete} data-testid="button-delete-lead">
                <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
              </Button>
            </div>
          </div>

          {/* Avatar + identity */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0 ring-2 ring-background ring-offset-2">
              <AvatarImage src={lead.photo || undefined} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {lead.firstName?.[0]}{lead.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-tight" data-testid="text-lead-detail-name">
                {lead.firstName} {lead.lastName}
              </h2>
              {lead.preferredName && (
                <p className="text-sm text-muted-foreground">{lead.preferredName}</p>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-0.5 w-fit"
                  data-testid="link-lead-email"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />{lead.email}
                </a>
              )}
            </div>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <Badge variant="outline" className={`no-default-active-elevate ${statusColors[lead.leadStatus]}`} data-testid="badge-lead-status">
              {statusLabels[lead.leadStatus]}
            </Badge>
            <Badge variant="outline" className={`no-default-active-elevate ${ratingColors[lead.leadRating]}`} data-testid="badge-lead-rating">
              <Star className="h-3 w-3 mr-1" />
              {lead.leadRating.charAt(0).toUpperCase() + lead.leadRating.slice(1)}
            </Badge>
            {lead.gender && (
              <Badge variant="secondary" className="no-default-active-elevate">
                {lead.gender === 'male' ? 'Male' : lead.gender === 'female' ? 'Female' : lead.gender === 'other' ? 'Other' : 'Prefer not to say'}
              </Badge>
            )}
            {lead.nationality && (
              <Badge variant="secondary" className="no-default-active-elevate">{lead.nationality}</Badge>
            )}
            {lead.leadCreationMethod && lead.leadCreationMethod !== 'manually' && (
              <Badge variant="secondary" className="no-default-active-elevate">
                {lead.leadCreationMethod === 'website_form' ? 'Website Inquiry' : lead.leadCreationMethod.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Lead Stage Progress ─────────────────────────────────── */}
      {lead.leadStage && (
        <div className="my-1">
          <LeadStageProgressBar
            currentStage={lead.leadStage}
            onStageChange={(newStage) => updateStageMutation.mutate(newStage)}
            isUpdating={updateStageMutation.isPending}
          />
        </div>
      )}

      {/* ── Two-column layout ──────────────────────────────────── */}
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
                    onClick={() => startEdit('contact_info', { email: lead.email, mobile: lead.mobile, whatsapp: lead.whatsapp, phone: lead.phone })}>
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
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${lead.email}`} className="text-sm hover:text-primary truncate" data-testid="link-email-detail">{lead.email}</a>
                    </div>
                  )}
                  {lead.mobile && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${lead.mobile}`} className="text-sm hover:text-primary" data-testid="link-mobile-detail">{lead.mobile}</a>
                      <span className="text-xs text-muted-foreground">Mobile</span>
                    </div>
                  )}
                  {lead.whatsapp && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g,'')}`} className="text-sm hover:text-primary" target="_blank" rel="noopener noreferrer" data-testid="link-whatsapp-detail">{lead.whatsapp}</a>
                      <span className="text-xs text-muted-foreground">WhatsApp</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${lead.phone}`} className="text-sm hover:text-primary" data-testid="link-phone-detail">{lead.phone}</a>
                    </div>
                  )}
                  {!lead.email && !lead.mobile && !lead.whatsapp && !lead.phone && (
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
                    onClick={() => startEdit('address', { unitNo: lead.unitNo, street: lead.street, suburb: lead.suburb, city: lead.city, state: lead.state, postcode: lead.postcode, country: lead.country })}>
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
                  <div className="flex gap-2 pt-1">
                    <Button type="button" size="sm" onClick={() => saveSectionMutation.mutate(sectionData)} disabled={saveSectionMutation.isPending} data-testid="button-save-address">
                      {saveSectionMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} data-testid="button-cancel-address">Cancel</Button>
                  </div>
                </div>
              ) : (
                lead.street || lead.city ? (
                  <>
                    {(lead.unitNo || lead.street) && (
                      <p>{[lead.unitNo, lead.street].filter(Boolean).join(" ")}</p>
                    )}
                    {lead.suburb && <p>{lead.suburb}</p>}
                    {(lead.city || lead.state || lead.postcode) && (
                      <p>{[lead.city, lead.state, lead.postcode].filter(Boolean).join(", ")}</p>
                    )}
                    {lead.country && <p>{lead.country}</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground">No address on file</p>
                )
              )}
            </CardContent>
          </Card>

          {/* ── Inquiry Details ──────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Inquiry Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.courseName && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-muted-foreground text-sm shrink-0">Course Interested In</span>
                  {lead.courseId ? (
                    <a href={`/courses/${lead.courseSlug || lead.courseId}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1 text-right" target="_blank" rel="noopener noreferrer" data-testid="link-inquiry-course">
                      {lead.courseName}<ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-right">{lead.courseName}</span>
                  )}
                </div>
              )}
              {lead.country && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground text-sm shrink-0">Country</span>
                  <span className="text-sm">{lead.country}</span>
                </div>
              )}
              {lead.visaStatus && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground text-sm shrink-0">Visa Status</span>
                  <span className="text-sm">{lead.visaStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </div>
              )}
              {lead.entrySource && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground text-sm shrink-0">Entry Source</span>
                  <Badge variant="secondary" data-testid="badge-entry-source">
                    {lead.entrySource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
              )}
              {lead.referrer && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-3">
                  <span className="text-muted-foreground text-sm shrink-0">Referrer</span>
                  <span className="text-sm text-muted-foreground break-all sm:text-right">{lead.referrer}</span>
                </div>
              )}
              {lead.firstPageVisited && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-3">
                  <span className="text-muted-foreground text-sm shrink-0">Page Visited</span>
                  <span className="text-sm text-muted-foreground break-all sm:text-right">{lead.firstPageVisited}</span>
                </div>
              )}
              {lead.firstVisit && !isNaN(new Date(lead.firstVisit).getTime()) && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground text-sm shrink-0">First Visit</span>
                  <span className="text-sm">{format(new Date(lead.firstVisit), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
              )}
              {!lead.courseName && !lead.entrySource && !lead.visaStatus && !lead.country && (
                <p className="text-sm text-muted-foreground">No inquiry details on file</p>
              )}
            </CardContent>
          </Card>

          {/* ── Contact Details ───────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created By</span>
                {lead.createdByUser ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={lead.createdByUser.profileImageUrl || undefined} />
                      <AvatarFallback>{lead.createdByUser.firstName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{lead.createdByUser.firstName} {lead.createdByUser.lastName}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">System Generated</span>
                )}
              </div>
              {lead.createdAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created On</span>
                  <span className="text-sm">{format(new Date(lead.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
              )}
              {lead.updatedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <div className="flex items-center gap-2">
                    {lead.updatedByUser && (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={lead.updatedByUser.profileImageUrl || undefined} />
                          <AvatarFallback>{lead.updatedByUser.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{lead.updatedByUser.firstName} {lead.updatedByUser.lastName}</span>
                        <span className="text-muted-foreground">·</span>
                      </>
                    )}
                    <span className="text-sm text-muted-foreground">{format(new Date(lead.updatedAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Lead Owner</span>
                <div className="flex items-center gap-2">
                  {lead.ownerUser ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={lead.ownerUser.profileImageUrl || undefined} />
                        <AvatarFallback className="text-[10px]">{lead.ownerUser.firstName?.[0]}{lead.ownerUser.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{lead.ownerUser.firstName} {lead.ownerUser.lastName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Not set</span>
                  )}
                  <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-reassign-lead-owner">
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search team members..." />
                        <CommandList>
                          <CommandEmpty>No team members found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="no-owner" onSelect={() => ownerMutation.mutate(null)} className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>No owner</span>
                              </div>
                              {!lead.leadOwner && <Check className="ml-auto h-4 w-4" />}
                            </CommandItem>
                            {teamMembers?.map((member) => (
                              <CommandItem
                                key={member.id}
                                value={`${member.firstName} ${member.lastName} ${member.email}`}
                                onSelect={() => ownerMutation.mutate(member.id)}
                                className="cursor-pointer"
                                data-testid={`option-lead-owner-${member.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={member.profileImageUrl || undefined} />
                                    <AvatarFallback className="text-[10px]">{member.firstName?.[0]}{member.lastName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm">{member.firstName} {member.lastName}</span>
                                    <span className="text-xs text-muted-foreground">{member.email}</span>
                                  </div>
                                </div>
                                {lead.leadOwner === member.id && <Check className="ml-auto h-4 w-4" />}
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
                <span className="text-sm text-muted-foreground">Assigned To</span>
                <div className="flex items-center gap-2">
                  {lead.assignedToUser ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={lead.assignedToUser.profileImageUrl || undefined} />
                        <AvatarFallback className="text-[10px]">{lead.assignedToUser.firstName?.[0]}{lead.assignedToUser.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{lead.assignedToUser.firstName} {lead.assignedToUser.lastName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Not assigned</span>
                  )}
                  <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-assign-lead">
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search team members..." />
                        <CommandList>
                          <CommandEmpty>No team members found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="unassigned" onSelect={() => assignMutation.mutate(null)} className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>Unassigned</span>
                              </div>
                              {!lead.assignedTo && <Check className="ml-auto h-4 w-4" />}
                            </CommandItem>
                            {teamMembers?.map((member) => (
                              <CommandItem
                                key={member.id}
                                value={`${member.firstName} ${member.lastName} ${member.email}`}
                                onSelect={() => assignMutation.mutate(member.id)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={member.profileImageUrl || undefined} />
                                    <AvatarFallback>{member.firstName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm">{member.firstName} {member.lastName}</span>
                                    <span className="text-xs text-muted-foreground">{member.email}</span>
                                  </div>
                                </div>
                                {lead.assignedTo === member.id && <Check className="ml-auto h-4 w-4" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Emergency Contact ─────────────────────────────────── */}
          <Card className="sm:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
                <span>Emergency Contact</span>
                {editingSection !== 'emergency' && (
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                    data-testid="button-edit-emergency"
                    onClick={() => startEdit('emergency', { emergencyContactName: lead.emergencyContactName, emergencyContactMobile: lead.emergencyContactMobile, emergencyContactRelationship: lead.emergencyContactRelationship, emergencyContactAddress: lead.emergencyContactAddress })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editingSection === 'emergency' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="button" size="sm" onClick={() => saveSectionMutation.mutate(sectionData)} disabled={saveSectionMutation.isPending} data-testid="button-save-emergency">
                      {saveSectionMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} data-testid="button-cancel-emergency">Cancel</Button>
                  </div>
                </div>
              ) : (
                lead.emergencyContactName ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground">Name</span>
                      <span>{lead.emergencyContactName}</span>
                    </div>
                    {lead.emergencyContactMobile && (
                      <div className="flex justify-between col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground">Mobile</span>
                        <span>{lead.emergencyContactMobile}</span>
                      </div>
                    )}
                    {lead.emergencyContactRelationship && (
                      <div className="flex justify-between col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground">Relationship</span>
                        <span>{lead.emergencyContactRelationship}</span>
                      </div>
                    )}
                    {lead.emergencyContactAddress && (
                      <div className="flex justify-between col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground">Address</span>
                        <span>{lead.emergencyContactAddress}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No emergency contact on file</p>
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
                leadId={lead.id}
                leadName={`${lead.firstName} ${lead.lastName}`}
                branchId={lead.branchId}
              />
            </CardContent>
          </Card>
        </div>

      </div>{/* end two-column flex */}

      {/* ── Applications ───────────────────────────────────────── */}
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
            <p className="text-muted-foreground text-sm">No student profile linked to this contact.</p>
          ) : applicationsData.applications.length === 0 ? (
            <p className="text-muted-foreground text-sm">No applications yet.</p>
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
                        {app.courseLevel && <><span>•</span><span>{app.courseLevel}</span></>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          app.status === 'accepted' ? 'default' :
                          app.status === 'rejected' ? 'destructive' :
                          app.status === 'withdrawn' ? 'secondary' :
                          'outline'
                        }>
                          {app.status}
                        </Badge>
                        <Badge variant="outline">{app.currentStage}</Badge>
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

      {/* ── Status History (collapsible) ───────────────────────── */}
      <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex items-center justify-between px-4 py-3 border rounded-lg" data-testid="button-toggle-history">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Status History</span>
              {lead.statusHistory && lead.statusHistory.length > 0 && (
                <Badge variant="secondary">{lead.statusHistory.length}</Badge>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-4">
              {lead.statusHistory && lead.statusHistory.length > 0 ? (
                <div className="space-y-4">
                  {lead.statusHistory.map((history, index) => (
                    <div key={history.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-primary rounded-full" />
                        {index < lead.statusHistory!.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {history.fromStatus && (
                            <>
                              <Badge variant="outline" className={statusColors[history.fromStatus]}>
                                {statusLabels[history.fromStatus] || history.fromStatus}
                              </Badge>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </>
                          )}
                          <Badge variant="outline" className={statusColors[history.toStatus]}>
                            {statusLabels[history.toStatus] || history.toStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(history.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                          {history.changedByUser && (
                            <>
                              <span>by</span>
                              <span>{history.changedByUser.firstName} {history.changedByUser.lastName}</span>
                            </>
                          )}
                        </div>
                        {history.notes && (
                          <p className="text-sm mt-2 text-muted-foreground">{history.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4 text-sm">No status history available</p>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Create Application Dialog ──────────────────────────── */}
      <Dialog open={isCreateApplicationOpen} onOpenChange={(open) => {
        setIsCreateApplicationOpen(open);
        if (!open) {
          setCourseCountryFilter("");
          setCourseInstitutionFilter("");
          setSelectedCourseIds([]);
          setCourseSearch("");
          setApplicationNotes("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Application</DialogTitle>
            <DialogDescription>
              Create a new application on behalf of {lead.firstName} {lead.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">

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
            }}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateApplication}
              disabled={!selectedCourseIds.length || createApplicationMutation.isPending}
              data-testid="button-confirm-create-application"
            >
              {createApplicationMutation.isPending
                ? "Creating..."
                : selectedCourseIds.length > 1
                  ? `Create ${selectedCourseIds.length} Applications`
                  : "Create Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
