import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, User, FileText, CheckCircle, XCircle, Clock, 
  ChevronRight, UserPlus, AlertCircle, Filter, BarChart3, GripVertical, MessageSquare, Bell
} from "lucide-react";
import { ApplicationInternalNotes } from "@/components/application-internal-notes";
import { CreateReminderModal } from "@/components/create-reminder-modal";
import { useAuth } from "@/hooks/useAuth";
import { ApplicationStageSelector } from "@/components/application-stage-selector";
import { ApplicationStage as StageType, STAGE_CONFIG, ALL_STAGES, ACTIVE_STAGES as CONFIG_ACTIVE_STAGES, TERMINAL_STAGES as CONFIG_TERMINAL_STAGES } from "@/lib/stage-config";

type ApplicationStage = 
  | "Assessment"
  | "Collect Docs"
  | "Documents Verification"
  | "Offer-Letter"
  | "GS-Clearance"
  | "COE"
  | "Health Cover"
  | "Visa Lodgment"
  | "Application Won"
  | "Refusal/Refunds"
  | "Application Lost";

interface AdminApplication {
  application: {
    id: string;
    studentId: string;
    courseId: string;
    currentStage: ApplicationStage;
    status: string;
    assignedConsultantId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  course: {
    id: string;
    title: string;
    level: string | null;
  };
  university: {
    id: string;
    name: string;
    country: string | null;
  };
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  consultant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface Consultant {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

const STAGES: ApplicationStage[] = [
  "Assessment",
  "Collect Docs",
  "Documents Verification",
  "Offer-Letter",
  "GS-Clearance",
  "COE",
  "Health Cover",
  "Visa Lodgment",
];

const TERMINAL_STAGES: ApplicationStage[] = [
  "Application Won",
  "Refusal/Refunds",
  "Application Lost",
];

const STAGE_COLORS: Record<ApplicationStage, string> = {
  "Assessment": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Collect Docs": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Documents Verification": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Offer-Letter": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "GS-Clearance": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "COE": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "Health Cover": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "Visa Lodgment": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Application Won": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Refusal/Refunds": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "Application Lost": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

// Droppable stage column
function DroppableStageColumn({ 
  stage, 
  children 
}: { 
  stage: ApplicationStage;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: stage,
  });

  return (
    <div ref={setNodeRef} className="h-full">
      {children}
    </div>
  );
}

// Draggable application card
function DraggableApplicationCard({ 
  app, 
  isSelected,
  onToggleSelection,
  onViewDetails,
  onAdvanceStage,
  nextStage
}: { 
  app: AdminApplication;
  isSelected: boolean;
  onToggleSelection: () => void;
  onViewDetails: () => void;
  onAdvanceStage: () => void;
  nextStage: ApplicationStage | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: app.application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="hover-elevate cursor-move"
      data-testid={`application-card-${app.application.id}`}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-1">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              onClick={(e) => e.stopPropagation()}
              data-testid={`checkbox-application-${app.application.id}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {app.student.firstName} {app.student.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {app.course.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {app.university.name}
              </p>
            </div>
          </div>
        </div>

        {app.consultant && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">
              {app.consultant.firstName} {app.consultant.lastName}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-xs"
            onClick={onViewDetails}
            data-testid={`button-view-details-${app.application.id}`}
          >
            <FileText className="h-3 w-3 mr-1" />
            Details
          </Button>
          {nextStage && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={onAdvanceStage}
              data-testid={`button-next-stage-${app.application.id}`}
            >
              <ChevronRight className="h-3 w-3 mr-1" />
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminApplicationsKanban() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [consultantFilter, setConsultantFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState<string | undefined>();
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<AdminApplication | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    })
  );

  // Fetch applications
  const { data: applicationsData, isLoading } = useQuery<{ applications: AdminApplication[] }>({
    queryKey: ["/api/admin/applications"],
  });

  // Fetch all users and filter admin consultants
  const { data: usersData } = useQuery<{ users: Consultant[] }>({
    queryKey: ["/api/admin/users"],
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async (data: { applicationIds: string[]; consultantId: string }) => {
      return apiRequest("POST", "/api/admin/applications/assign", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({
        title: "Applications Assigned",
        description: "Selected applications have been assigned successfully.",
      });
      setAssignDialogOpen(false);
      setSelectedApplications(new Set());
      setSelectedConsultant(undefined);
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign applications",
        variant: "destructive",
      });
    },
  });

  // Stage transition mutation
  const transitionMutation = useMutation({
    mutationFn: async (data: { applicationId: string; toStage: ApplicationStage }) => {
      return apiRequest("POST", "/api/admin/applications/transition-stage", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({
        title: "Stage Updated",
        description: "Application stage has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update stage",
        variant: "destructive",
      });
    },
  });

  const applications = applicationsData?.applications || [];
  // Filter consultants (admin users only)
  const allUsers = usersData?.users || [];
  const consultants = allUsers.filter(user => (user as any).userType === 'admin');

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchLower ||
      `${app.student.firstName || ""} ${app.student.lastName || ""}`.toLowerCase().includes(searchLower) ||
      app.course.title.toLowerCase().includes(searchLower) ||
      app.university.name.toLowerCase().includes(searchLower);

    const matchesConsultant =
      consultantFilter === "all" ||
      (consultantFilter === "unassigned" && !app.application.assignedConsultantId) ||
      app.application.assignedConsultantId === consultantFilter;

    const matchesCountry =
      countryFilter === "all" ||
      app.university.country === countryFilter;

    return matchesSearch && matchesConsultant && matchesCountry;
  });

  // Group by stage
  const applicationsByStage: Record<ApplicationStage, AdminApplication[]> = {
    "Assessment": [],
    "Collect Docs": [],
    "Documents Verification": [],
    "Offer-Letter": [],
    "GS-Clearance": [],
    "COE": [],
    "Health Cover": [],
    "Visa Lodgment": [],
    "Application Won": [],
    "Refusal/Refunds": [],
    "Application Lost": [],
  };

  filteredApplications.forEach((app) => {
    applicationsByStage[app.application.currentStage].push(app);
  });

  // Get unique countries
  const countries = Array.from(new Set(applications.map(app => app.university.country).filter(Boolean)));

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedApplications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedApplications(newSelected);
  };

  // Handle assignment
  const handleAssign = () => {
    if (!selectedConsultant || selectedApplications.size === 0) return;
    assignMutation.mutate({
      applicationIds: Array.from(selectedApplications),
      consultantId: selectedConsultant,
    });
  };

  // Get next stage
  const getNextStage = (currentStage: ApplicationStage): ApplicationStage | null => {
    const currentIndex = STAGES.indexOf(currentStage);
    if (currentIndex >= 0 && currentIndex < STAGES.length - 1) {
      return STAGES[currentIndex + 1];
    }
    return null;
  };

  // Handle stage transition
  const handleStageTransition = (applicationId: string, toStage: ApplicationStage) => {
    transitionMutation.mutate({ applicationId, toStage });
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const applicationId = active.id as string;
    
    // Get the target stage - check if it's a column drop zone or read from sortable container
    let newStage: ApplicationStage | undefined;
    
    // Check if dropped directly on a column (droppable zone)
    if (STAGES.includes(over.id as ApplicationStage) || TERMINAL_STAGES.includes(over.id as ApplicationStage)) {
      newStage = over.id as ApplicationStage;
    } 
    // If dropped on another card, get its container (column)
    else if (over.data.current?.sortable) {
      newStage = over.data.current.sortable.containerId as ApplicationStage;
    }

    if (!newStage) return;

    // Find the application being dragged
    const application = filteredApplications.find(app => app.application.id === applicationId);
    if (!application) return;

    // Don't do anything if dropped in the same stage
    if (application.application.currentStage === newStage) return;

    // Transition to the new stage
    handleStageTransition(applicationId, newStage);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  // Calculate stats
  const stats = {
    total: filteredApplications.length,
    unassigned: filteredApplications.filter(app => !app.application.assignedConsultantId).length,
    inProgress: filteredApplications.filter(app => 
      !TERMINAL_STAGES.includes(app.application.currentStage)
    ).length,
    completed: filteredApplications.filter(app => 
      app.application.currentStage === "Application Won"
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-unassigned">{stats.unassigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-in-progress">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Bulk Actions */}
            {selectedApplications.size > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{selectedApplications.size} application(s) selected</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setAssignDialogOpen(true)}
                      data-testid="button-bulk-assign"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedApplications(new Set())}
                      data-testid="button-clear-selection"
                    >
                      Clear
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student, course, or university..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-applications"
                />
              </div>
              <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-consultant">
                  <SelectValue placeholder="All Consultants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Consultants</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {consultants.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-country">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country!}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading applications...</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-8">
            {/* Active Stages */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Active Stages</h3>
              <ScrollArea className="w-full pb-4">
                <div className="flex gap-4 min-w-max">
                  {STAGES.map((stage) => (
                    <DroppableStageColumn key={stage} stage={stage}>
                      <SortableContext
                        id={stage}
                        items={applicationsByStage[stage].map(app => app.application.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="w-80 flex-shrink-0">
                          <Card>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium">
                                  {stage}
                                </CardTitle>
                                <Badge variant="secondary" className="text-xs">
                                  {applicationsByStage[stage].length}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <ScrollArea className="h-96">
                                <div className="space-y-3 pr-4">
                                  {applicationsByStage[stage].length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                      No applications
                                    </p>
                                  ) : (
                                    applicationsByStage[stage].map((app) => (
                                      <DraggableApplicationCard
                                        key={app.application.id}
                                        app={app}
                                        isSelected={selectedApplications.has(app.application.id)}
                                        onToggleSelection={() => toggleSelection(app.application.id)}
                                        onViewDetails={() => {
                                          setSelectedApplication(app);
                                          setDetailsDialogOpen(true);
                                        }}
                                        onAdvanceStage={() => {
                                          const next = getNextStage(stage);
                                          if (next) handleStageTransition(app.application.id, next);
                                        }}
                                        nextStage={getNextStage(stage)}
                                      />
                                    ))
                                  )}
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        </div>
                      </SortableContext>
                    </DroppableStageColumn>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Terminal Stages */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Final Outcomes</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {TERMINAL_STAGES.map((stage) => (
                  <DroppableStageColumn key={stage} stage={stage}>
                    <SortableContext
                      id={stage}
                      items={applicationsByStage[stage].map(app => app.application.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                              {stage}
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {applicationsByStage[stage].length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-64">
                            <div className="space-y-2 pr-4">
                              {applicationsByStage[stage].length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No applications
                                </p>
                              ) : (
                                applicationsByStage[stage].map((app) => (
                                  <DraggableApplicationCard
                                    key={app.application.id}
                                    app={app}
                                    isSelected={selectedApplications.has(app.application.id)}
                                    onToggleSelection={() => toggleSelection(app.application.id)}
                                    onViewDetails={() => {
                                      setSelectedApplication(app);
                                      setDetailsDialogOpen(true);
                                    }}
                                    onAdvanceStage={() => {}}
                                    nextStage={null}
                                  />
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </SortableContext>
                  </DroppableStageColumn>
                ))}
              </div>
            </div>
          </div>
        </DndContext>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent data-testid="dialog-assign-consultant">
          <DialogHeader>
            <DialogTitle>Assign Consultant</DialogTitle>
            <DialogDescription>
              Assign {selectedApplications.size} application(s) to a consultant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger data-testid="select-assign-consultant">
                <SelectValue placeholder="Select consultant" />
              </SelectTrigger>
              <SelectContent>
                {consultants.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedConsultant || assignMutation.isPending}
              data-testid="button-confirm-assign"
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-application-details">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Student</p>
                  <p className="text-sm">
                    {selectedApplication.student.firstName} {selectedApplication.student.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedApplication.student.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Course</p>
                  <p className="text-sm">{selectedApplication.course.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedApplication.course.level}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">University</p>
                  <p className="text-sm">{selectedApplication.university.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedApplication.university.country}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Current Stage</p>
                  <ApplicationStageSelector
                    applicationId={selectedApplication.application.id}
                    currentStage={selectedApplication.application.currentStage as StageType}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Consultant</p>
                  <p className="text-sm">
                    {selectedApplication.consultant
                      ? `${selectedApplication.consultant.firstName} ${selectedApplication.consultant.lastName}`
                      : "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Applied Date</p>
                  <p className="text-sm">
                    {new Date(selectedApplication.application.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Internal Notes</h3>
                </div>
                <ApplicationInternalNotes 
                  applicationId={selectedApplication.application.id}
                  currentUserId={user?.id}
                  compact
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button 
              variant="outline"
              onClick={() => setReminderDialogOpen(true)}
              data-testid="button-set-reminder"
            >
              <Bell className="h-4 w-4 mr-2" />
              Set Reminder
            </Button>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Reminder Modal */}
      {selectedApplication && (
        <CreateReminderModal
          open={reminderDialogOpen}
          onOpenChange={setReminderDialogOpen}
          applicationId={selectedApplication.application.id}
        />
      )}
    </div>
  );
}
