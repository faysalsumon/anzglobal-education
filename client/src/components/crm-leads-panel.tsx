import { useState } from "react";
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CrmLead>>({});
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
      const response = await fetch(`/api/crm/leads?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
  });

  const { data: leadDetail } = useQuery<CrmLead & { statusHistory: StatusHistory[] }>({
    queryKey: ["/api/crm/leads", selectedLead?.id],
    queryFn: async () => {
      const response = await fetch(`/api/crm/leads/${selectedLead?.id}`, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch lead details");
      return response.json();
    },
    enabled: !!selectedLead?.id,
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
    mutationFn: async (data: Partial<CrmLead>) => {
      return apiRequest("POST", "/api/crm/leads", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      setIsCreateOpen(false);
      setFormData({});
      toast({ title: "Lead created", description: "New lead has been added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create lead", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CrmLead> }) => {
      return apiRequest("PATCH", `/api/crm/leads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      setIsEditOpen(false);
      setFormData({});
      toast({ title: "Lead updated", description: "Lead has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lead", variant: "destructive" });
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

  const handleCreateLead = () => {
    createMutation.mutate(formData);
  };

  const handleUpdateLead = () => {
    if (selectedLead) {
      updateMutation.mutate({ id: selectedLead.id, data: formData });
    }
  };

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

  const openEditDialog = (lead: CrmLead) => {
    setFormData({ ...lead });
    setSelectedLead(lead);
    setIsEditOpen(true);
  };

  if (selectedLead && !isEditOpen && !isDeleteOpen && !isConvertOpen) {
    return (
      <LeadDetailView
        lead={leadDetail || selectedLead}
        onBack={() => setSelectedLead(null)}
        onEdit={() => openEditDialog(selectedLead)}
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
      updateMutation.mutate({ 
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

  const uniqueCountries = [...new Set(leadsData?.leads?.map(l => l.country).filter(Boolean) || [])];

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
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-lead">
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
                    <SelectTrigger className="w-[130px]" data-testid="select-branch-filter">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      <SelectItem value="Melbourne">Melbourne</SelectItem>
                      <SelectItem value="Sydney">Sydney</SelectItem>
                      <SelectItem value="Brisbane">Brisbane</SelectItem>
                      <SelectItem value="Perth">Perth</SelectItem>
                      <SelectItem value="Adelaide">Adelaide</SelectItem>
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

      <LeadFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create New Lead"
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateLead}
        isLoading={createMutation.isPending}
        admins={admins || []}
      />

      <LeadFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit Lead"
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleUpdateLead}
        isLoading={updateMutation.isPending}
        admins={admins || []}
      />

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

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  formData: Partial<CrmLead>;
  setFormData: (data: Partial<CrmLead>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  admins: { id: string; firstName: string; lastName: string }[];
}

function LeadFormDialog({
  open,
  onOpenChange,
  title,
  formData,
  setFormData,
  onSubmit,
  isLoading,
  admins,
}: LeadFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="interest">Interest</TabsTrigger>
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
                <Label>Lead Status</Label>
                <Select
                  value={formData.leadStatus || "not_contacted"}
                  onValueChange={(value: any) => setFormData({ ...formData, leadStatus: value })}
                >
                  <SelectTrigger data-testid="select-lead-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_contacted">Not Contacted</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lead Rating</Label>
                <Select
                  value={formData.leadRating || "cold"}
                  onValueChange={(value: any) => setFormData({ ...formData, leadRating: value })}
                >
                  <SelectTrigger data-testid="select-lead-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select
                  value={formData.leadSource || ""}
                  onValueChange={(value) => setFormData({ ...formData, leadSource: value })}
                >
                  <SelectTrigger data-testid="select-lead-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="walk_in">Walk In</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={formData.branch || ""}
                  onValueChange={(value) => setFormData({ ...formData, branch: value })}
                >
                  <SelectTrigger data-testid="select-branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Melbourne">Melbourne</SelectItem>
                    <SelectItem value="Sydney">Sydney</SelectItem>
                    <SelectItem value="Brisbane">Brisbane</SelectItem>
                    <SelectItem value="Perth">Perth</SelectItem>
                    <SelectItem value="Adelaide">Adelaide</SelectItem>
                    <SelectItem value="Hobart">Hobart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={formData.assignedTo || ""}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              >
                <SelectTrigger data-testid="select-assigned-to">
                  <SelectValue placeholder="Select consultant" />
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
          </TabsContent>
          <TabsContent value="contact" className="space-y-4 mt-4">
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
                <Label>Phone *</Label>
                <Input
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input
                  value={formData.mobile || ""}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  data-testid="input-mobile"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input
                  value={formData.nationality || ""}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  data-testid="input-nationality"
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
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                data-testid="input-city"
              />
            </div>
          </TabsContent>
          <TabsContent value="interest" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Product Interest</Label>
              <Input
                value={formData.productInterest || ""}
                onChange={(e) => setFormData({ ...formData, productInterest: e.target.value })}
                placeholder="e.g., Bachelor of IT, Diploma of Business"
                data-testid="input-product-interest"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Intake Month</Label>
                <Select
                  value={formData.intakeMonth || ""}
                  onValueChange={(value) => setFormData({ ...formData, intakeMonth: value })}
                >
                  <SelectTrigger data-testid="select-intake-month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="January">January</SelectItem>
                    <SelectItem value="February">February</SelectItem>
                    <SelectItem value="March">March</SelectItem>
                    <SelectItem value="April">April</SelectItem>
                    <SelectItem value="May">May</SelectItem>
                    <SelectItem value="June">June</SelectItem>
                    <SelectItem value="July">July</SelectItem>
                    <SelectItem value="August">August</SelectItem>
                    <SelectItem value="September">September</SelectItem>
                    <SelectItem value="October">October</SelectItem>
                    <SelectItem value="November">November</SelectItem>
                    <SelectItem value="December">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Intake Year</Label>
                <Select
                  value={formData.intakeYear || ""}
                  onValueChange={(value) => setFormData({ ...formData, intakeYear: value })}
                >
                  <SelectTrigger data-testid="select-intake-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the lead..."
                data-testid="input-notes"
              />
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{lead.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
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
