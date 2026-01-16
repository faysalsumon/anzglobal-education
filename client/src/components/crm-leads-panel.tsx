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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
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
  UserCheck,
  List,
  LayoutGrid,
  ChevronDown,
  GripVertical,
  Globe
} from "lucide-react";
import { format } from "date-fns";

type ViewMode = 'list' | 'kanban';
type LeadStatus = 'not_contacted' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';

const KANBAN_STATUSES: LeadStatus[] = ['not_contacted', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'];

interface CrmLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string | null;
  leadStatus: 'not_contacted' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
  leadRating: 'cold' | 'warm' | 'hot';
  leadSource: string | null;
  leadCreationMethod: 'manually' | 'website_form' | 'facebook_ads' | 'google_ads' | 'education_fair' | 'referral' | 'recruitment_agent' | 'campus_walk_in' | 'database_import' | 'ai_web_scrape' | null;
  branch: string | null;
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
  const [, navigate] = useLocation();
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
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
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

  const convertMutation = useMutation({
    mutationFn: async ({ id, contactType }: { id: string; contactType: string }) => {
      return apiRequest("POST", `/api/crm/leads/${id}/convert`, { contactType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setIsConvertOpen(false);
      setSelectedLead(null);
      toast({ title: "Lead converted", description: "Lead has been converted to a contact" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to convert lead", variant: "destructive" });
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CrmLead> }) => {
      return apiRequest("PATCH", `/api/crm/leads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
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

  const handleConvertLead = (contactType: string) => {
    if (selectedLead) {
      convertMutation.mutate({ id: selectedLead.id, contactType });
    }
  };

  const openEditPage = (lead: CrmLead) => {
    navigate(`/admin/leads/${lead.id}/edit`);
  };

  if (selectedLead && !isDeleteOpen && !isConvertOpen) {
    return (
      <LeadDetailView
        lead={leadDetail || selectedLead}
        onBack={() => setSelectedLead(null)}
        onEdit={() => openEditPage(selectedLead)}
        onDelete={() => setIsDeleteOpen(true)}
        onConvert={() => setIsConvertOpen(true)}
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
                    onSelectLead={setSelectedLead}
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
                  className="flex items-center gap-4 p-4 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                  data-testid={`card-lead-${lead.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {lead.firstName?.[0]}{lead.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-lead-name-${lead.id}`}>
                        {lead.firstName} {lead.lastName}
                      </span>
                      <Badge variant="outline" className={statusColors[lead.leadStatus]}>
                        {statusLabels[lead.leadStatus]}
                      </Badge>
                      <Badge variant="outline" className={ratingColors[lead.leadRating]}>
                        {lead.leadRating}
                      </Badge>
                      {lead.leadCreationMethod === 'website_form' && (
                        <Badge variant="secondary" className="text-xs">
                          Website Inquiry
                        </Badge>
                      )}
                    </div>
                    {lead.courseName && (
                      <div className="flex items-center gap-1 text-sm text-primary mt-1" data-testid={`text-lead-course-${lead.id}`}>
                        <BookOpen className="h-3 w-3" />
                        {lead.courseId ? (
                          <a 
                            href={`/courses/${lead.courseId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.courseName}
                          </a>
                        ) : (
                          <span className="font-medium">{lead.courseName}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </span>
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.country && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lead.country}
                        </span>
                      )}
                      {lead.branch && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.branch}
                        </span>
                      )}
                    </div>
                  </div>
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
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
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

      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead to Contact</DialogTitle>
            <DialogDescription>
              This will create a new contact from this lead and mark the lead as converted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contact Type</Label>
              <Select defaultValue="clients" onValueChange={(value) => handleConvertLead(value)}>
                <SelectTrigger data-testid="select-contact-type">
                  <SelectValue placeholder="Select contact type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="providers_rep">Providers Rep</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertOpen(false)}>Cancel</Button>
            <Button onClick={() => handleConvertLead("clients")} disabled={convertMutation.isPending}>
              <UserCheck className="h-4 w-4 mr-2" />
              Convert to Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

interface LeadDetailViewProps {
  lead: CrmLead & { statusHistory?: StatusHistory[] };
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
}

function LeadDetailView({ lead, onBack, onEdit, onDelete, onConvert }: LeadDetailViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold" data-testid="text-lead-detail-name">
            {lead.firstName} {lead.lastName}
          </h2>
          <p className="text-muted-foreground">{lead.email}</p>
        </div>
        <div className="flex gap-2">
          {lead.leadStatus !== 'converted' && (
            <Button variant="outline" onClick={onConvert} data-testid="button-convert-lead">
              <ArrowRight className="h-4 w-4 mr-2" />
              Convert to Contact
            </Button>
          )}
          <Button variant="outline" onClick={onEdit} data-testid="button-edit-lead">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={onDelete} data-testid="button-delete-lead">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={statusColors[lead.leadStatus]}>
          {statusLabels[lead.leadStatus]}
        </Badge>
        <Badge variant="outline" className={ratingColors[lead.leadRating]}>
          {lead.leadRating}
        </Badge>
        {lead.leadCreationMethod && (
          <Badge variant="secondary">
            {lead.leadCreationMethod === 'website_form' ? 'Website Inquiry' : lead.leadCreationMethod.replace(/_/g, ' ')}
          </Badge>
        )}
        {lead.branch && <Badge variant="secondary">{lead.branch}</Badge>}
      </div>

      {lead.courseName && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Course Interest</h4>
                <p className="text-lg font-medium mt-1" data-testid="text-detail-course-name">{lead.courseName}</p>
                {lead.interestedIn && (
                  <p className="text-sm text-muted-foreground mt-1">{lead.interestedIn}</p>
                )}
              </div>
              {lead.courseId && (
                <a 
                  href={`/courses/${lead.courseId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" data-testid="button-view-course">
                    <Eye className="h-4 w-4 mr-2" />
                    View Course
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="history">Status History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
                {lead.mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.mobile} (Mobile)</span>
                  </div>
                )}
                {lead.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.city}, {lead.country}</span>
                  </div>
                )}
                {lead.nationality && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Nationality: {lead.nationality}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lead Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.leadSource && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source</span>
                    <span className="capitalize">{lead.leadSource}</span>
                  </div>
                )}
                {lead.branch && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch</span>
                    <span>{lead.branch}</span>
                  </div>
                )}
                {lead.assignedToUser && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Assigned To</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={lead.assignedToUser.profileImageUrl || undefined} />
                        <AvatarFallback>{lead.assignedToUser.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span>{lead.assignedToUser.firstName} {lead.assignedToUser.lastName}</span>
                    </div>
                  </div>
                )}
                {lead.ownerUser && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Owner</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={lead.ownerUser.profileImageUrl || undefined} />
                        <AvatarFallback>{lead.ownerUser.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span>{lead.ownerUser.firstName} {lead.ownerUser.lastName}</span>
                    </div>
                  </div>
                )}
                {lead.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Interest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.productInterest && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interest</span>
                    <span>{lead.productInterest}</span>
                  </div>
                )}
                {lead.intakeMonth && lead.intakeYear && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Intake</span>
                    <span>{lead.intakeMonth} {lead.intakeYear}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {lead.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Legacy Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{lead.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <LeadNotes 
            leadId={lead.id} 
            leadName={`${lead.firstName} ${lead.lastName}`}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status History</CardTitle>
            </CardHeader>
            <CardContent>
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
                <p className="text-muted-foreground text-center py-4">No status history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
