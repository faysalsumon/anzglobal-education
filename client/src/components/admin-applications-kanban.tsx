import { useState, useMemo } from "react";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, User, FileText, CheckCircle, XCircle, Clock, 
  ChevronRight, UserPlus, AlertCircle, Filter, BarChart3, GripVertical, MessageSquare, Bell,
  List, LayoutGrid, ChevronDown, X, Building2, GraduationCap, Calendar, Eye, AlertTriangle,
  CheckCheck, Users, Trash2
} from "lucide-react";
import { ApplicationInternalNotes } from "@/components/application-internal-notes";
import { CreateReminderModal } from "@/components/create-reminder-modal";
import { useAuth } from "@/hooks/useAuth";
import { ApplicationStageSelector } from "@/components/application-stage-selector";
import { ApplicationDetailsPanel } from "@/components/application-details-panel";
import { format, differenceInDays } from "date-fns";

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

interface DocumentProgress {
  totalDocs: number;
  uploadedDocs: number;
  verifiedDocs: number;
  requiredDocs: number;
  requiredUploaded: number;
}

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
  documentProgress: DocumentProgress;
}

// Stage SLA configuration (days)
const STAGE_SLA: Record<ApplicationStage, number> = {
  "Assessment": 3,
  "Collect Docs": 7,
  "Documents Verification": 5,
  "Offer-Letter": 14,
  "GS-Clearance": 10,
  "COE": 7,
  "Health Cover": 5,
  "Visa Lodgment": 21,
  "Application Won": 0,
  "Refusal/Refunds": 0,
  "Application Lost": 0,
};

// Calculate progress percentage for stage
// Formula: (stageIndex / (totalActiveStages - 1)) * 50% + (verifiedDocs / requiredDocs) * 50%
function calculateStageProgress(stage: ApplicationStage, stageIndex: number, documentProgress: DocumentProgress): number {
  // Terminal stages always show 100% progress
  if (TERMINAL_STAGES.includes(stage)) {
    return 100;
  }
  
  const totalActiveStages = STAGES.length;
  // Ensure stageIndex is valid (not -1 for non-active stages)
  const validIndex = Math.max(0, stageIndex);
  
  // Stage progress: 50% weight based on position in workflow
  const stageProgress = totalActiveStages > 1 
    ? (validIndex / (totalActiveStages - 1)) * 50 
    : 50;
  
  // Document progress: 50% weight based on verified documents
  const requiredDocs = Math.max(1, documentProgress.requiredDocs);
  const verifiedDocs = documentProgress.verifiedDocs || 0;
  const docProgress = (verifiedDocs / requiredDocs) * 50;
  
  return Math.min(100, Math.round(stageProgress + docProgress));
}

// Get SLA status for an application
// Uses fixed thresholds: 7 days = at-risk, 14 days = overdue
function getSLAStatus(createdAt: string, updatedAt: string, stage: ApplicationStage): 'on-track' | 'at-risk' | 'overdue' {
  // Terminal stages are always on-track (completed)
  if (TERMINAL_STAGES.includes(stage)) {
    return 'on-track';
  }
  
  const daysSinceCreation = differenceInDays(new Date(), new Date(createdAt));
  
  // Fixed thresholds as per requirements
  if (daysSinceCreation >= 14) return 'overdue';
  if (daysSinceCreation >= 7) return 'at-risk';
  return 'on-track';
}

// Circular Progress Component
function CircularProgress({ 
  progress, 
  size = 36, 
  strokeWidth = 3,
  showPercentage = true 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  showPercentage?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const getColor = () => {
    if (progress >= 80) return 'text-green-500';
    if (progress >= 40) return 'text-amber-500';
    return 'text-red-500';
  };
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={getColor()}
        />
      </svg>
      {showPercentage && (
        <span className="absolute text-[10px] font-medium">
          {progress}%
        </span>
      )}
    </div>
  );
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

// SLA Badge Component
function SLABadge({ status }: { status: 'on-track' | 'at-risk' | 'overdue' }) {
  if (status === 'on-track') return null;
  
  return (
    <Badge 
      variant="outline" 
      className={`text-[10px] px-1.5 py-0 h-5 ${
        status === 'overdue' 
          ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400' 
          : 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400'
      }`}
    >
      {status === 'overdue' ? (
        <><AlertTriangle className="h-3 w-3 mr-0.5" /> Overdue</>
      ) : (
        <><Clock className="h-3 w-3 mr-0.5" /> At Risk</>
      )}
    </Badge>
  );
}

// Draggable application card with enhanced design
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

  const stageIndex = STAGES.indexOf(app.application.currentStage);
  const progress = calculateStageProgress(
    app.application.currentStage, 
    stageIndex >= 0 ? stageIndex : 0, 
    app.documentProgress
  );
  const slaStatus = getSLAStatus(
    app.application.createdAt, 
    app.application.updatedAt, 
    app.application.currentStage
  );

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`hover-elevate cursor-move transition-all ${
        isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
      } ${slaStatus === 'overdue' ? 'border-red-300 dark:border-red-800' : ''}`}
      data-testid={`application-card-${app.application.id}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header Row: Checkbox, Student Info, Progress */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-0.5 flex-shrink-0">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 mt-0.5"
              data-testid={`checkbox-application-${app.application.id}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">
                  {app.student.firstName} {app.student.lastName}
                </p>
              </div>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <GraduationCap className="h-3 w-3 flex-shrink-0" />
                {app.course.title}
              </p>
            </div>
          </div>
          
          {/* Progress Circle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-shrink-0">
                  <CircularProgress progress={progress} size={32} strokeWidth={3} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                <p className="font-medium">{progress}% Complete</p>
                <p className="text-muted-foreground">
                  {app.documentProgress.requiredUploaded}/{app.documentProgress.requiredDocs} docs uploaded
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* University and SLA Row */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            {app.university.name}
          </p>
          <SLABadge status={slaStatus} />
        </div>

        {/* Consultant and Date Row */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {app.consultant ? (
            <span className="flex items-center gap-1 truncate">
              <User className="h-3 w-3 flex-shrink-0" />
              {app.consultant.firstName} {app.consultant.lastName}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <UserPlus className="h-3 w-3 flex-shrink-0" />
              Unassigned
            </span>
          )}
          <span className="flex items-center gap-1 flex-shrink-0">
            <Calendar className="h-3 w-3" />
            {format(new Date(app.application.createdAt), 'MMM d')}
          </span>
        </div>

        <Separator className="my-1" />

        {/* Action Buttons */}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-7 text-xs"
            onClick={onViewDetails}
            data-testid={`button-view-details-${app.application.id}`}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          {nextStage && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
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
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [slaFilter, setSlaFilter] = useState<'all' | 'on-track' | 'at-risk' | 'overdue'>('all');
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState<string | undefined>();
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<AdminApplication | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [batchStageDialogOpen, setBatchStageDialogOpen] = useState(false);
  const [batchTargetStage, setBatchTargetStage] = useState<ApplicationStage | undefined>();

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

    const matchesStage =
      stageFilter === "all" ||
      app.application.currentStage === stageFilter;

    const matchesStatus =
      statusFilter === "all" ||
      app.application.status === statusFilter;

    const appSlaStatus = getSLAStatus(
      app.application.createdAt, 
      app.application.updatedAt, 
      app.application.currentStage
    );
    const matchesSla = slaFilter === "all" || appSlaStatus === slaFilter;

    return matchesSearch && matchesConsultant && matchesCountry && matchesStage && matchesStatus && matchesSla;
  });

  // Get unique universities
  const universities = Array.from(new Set(applications.map(app => app.university.name).filter(Boolean)));
  
  // Check if any filters are active
  const hasActiveFilters = consultantFilter !== "all" || countryFilter !== "all" || stageFilter !== "all" || statusFilter !== "all" || slaFilter !== "all";
  
  // Clear all filters
  const clearAllFilters = () => {
    setConsultantFilter("all");
    setCountryFilter("all");
    setStageFilter("all");
    setStatusFilter("all");
    setSlaFilter("all");
    setSearchQuery("");
  };

  // Calculate SLA counts for quick filter chips
  const slaCounts = useMemo(() => {
    const counts = { 'on-track': 0, 'at-risk': 0, 'overdue': 0 };
    applications.forEach(app => {
      const status = getSLAStatus(
        app.application.createdAt,
        app.application.updatedAt,
        app.application.currentStage
      );
      counts[status]++;
    });
    return counts;
  }, [applications]);

  // Select all visible applications
  const selectAllVisible = () => {
    const allIds = new Set(filteredApplications.map(app => app.application.id));
    setSelectedApplications(allIds);
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedApplications(new Set());
  };

  // Batch stage transition
  const batchTransitionMutation = useMutation({
    mutationFn: async (data: { applicationIds: string[]; toStage: ApplicationStage }) => {
      const promises = data.applicationIds.map(id =>
        apiRequest("POST", "/api/admin/applications/transition-stage", {
          applicationId: id,
          toStage: data.toStage,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({
        title: "Batch Update Complete",
        description: `${selectedApplications.size} applications moved successfully.`,
      });
      setBatchStageDialogOpen(false);
      setSelectedApplications(new Set());
      setBatchTargetStage(undefined);
    },
    onError: (error: any) => {
      toast({
        title: "Batch Update Failed",
        description: error.message || "Failed to update some applications",
        variant: "destructive",
      });
    },
  });

  const handleBatchTransition = () => {
    if (!batchTargetStage || selectedApplications.size === 0) return;
    batchTransitionMutation.mutate({
      applicationIds: Array.from(selectedApplications),
      toStage: batchTargetStage,
    });
  };

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
            {/* Enhanced Bulk Actions Toolbar */}
            {selectedApplications.size > 0 ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-5 w-5 text-primary" />
                  <span className="font-medium">{selectedApplications.size} selected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setAssignDialogOpen(true)}
                    data-testid="button-bulk-assign"
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Assign Consultant
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchStageDialogOpen(true)}
                    data-testid="button-bulk-stage"
                  >
                    <ChevronRight className="h-4 w-4 mr-1.5" />
                    Move to Stage
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearSelection}
                    data-testid="button-clear-selection"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              /* Quick Filter Chips - SLA Status */
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground mr-1">Quick filters:</span>
                <Button
                  variant={slaFilter === 'all' ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSlaFilter('all')}
                  data-testid="chip-sla-all"
                >
                  All
                </Button>
                <Button
                  variant={slaFilter === 'on-track' ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSlaFilter('on-track')}
                  data-testid="chip-sla-on-track"
                >
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  On Track ({slaCounts['on-track']})
                </Button>
                <Button
                  variant={slaFilter === 'at-risk' ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSlaFilter('at-risk')}
                  data-testid="chip-sla-at-risk"
                >
                  <Clock className="h-3 w-3 mr-1 text-amber-500" />
                  At Risk ({slaCounts['at-risk']})
                </Button>
                <Button
                  variant={slaFilter === 'overdue' ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSlaFilter('overdue')}
                  data-testid="chip-sla-overdue"
                >
                  <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                  Overdue ({slaCounts['overdue']})
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={selectAllVisible}
                  data-testid="button-select-all"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Select All ({filteredApplications.length})
                </Button>
              </div>
            )}

            {/* Filters Row 1 - Search, Stage Filter, View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
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
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-stage-filter">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                  {TERMINAL_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* View Toggle */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
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
            </div>

            {/* Collapsible Additional Filters */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    data-testid="button-more-filters"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2">{[consultantFilter, countryFilter, statusFilter].filter(f => f !== "all").length}</Badge>
                    )}
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                    <SelectTrigger data-testid="select-filter-consultant">
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
                    <SelectTrigger data-testid="select-filter-country">
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-filter-status">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading applications...</p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-4" data-testid="applications-list-view">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No applications found matching your filters.</p>
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((app) => {
              const stageIndex = STAGES.indexOf(app.application.currentStage);
              const progress = calculateStageProgress(
                app.application.currentStage,
                stageIndex >= 0 ? stageIndex : 0,
                app.documentProgress
              );
              const slaStatus = getSLAStatus(
                app.application.createdAt,
                app.application.updatedAt,
                app.application.currentStage
              );
              
              return (
                <Card 
                  key={app.application.id} 
                  className={`hover-elevate cursor-pointer transition-all ${
                    selectedApplications.has(app.application.id) ? 'ring-2 ring-primary ring-offset-1' : ''
                  } ${slaStatus === 'overdue' ? 'border-red-300 dark:border-red-800' : ''}`}
                  onClick={() => {
                    setSelectedApplication(app);
                    setDetailsDialogOpen(true);
                  }}
                  data-testid={`card-application-${app.application.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Left: Checkbox, Progress and Student Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedApplications.has(app.application.id)}
                          onCheckedChange={() => toggleSelection(app.application.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                          data-testid={`checkbox-list-application-${app.application.id}`}
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-shrink-0">
                                <CircularProgress progress={progress} size={40} strokeWidth={3} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              <p className="font-medium">{progress}% Complete</p>
                              <p className="text-muted-foreground">
                                {app.documentProgress.requiredUploaded}/{app.documentProgress.requiredDocs} docs uploaded
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium truncate">
                              {app.student.firstName} {app.student.lastName}
                            </h4>
                            <Badge className={STAGE_COLORS[app.application.currentStage]}>
                              {app.application.currentStage}
                            </Badge>
                            <SLABadge status={slaStatus} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {app.student.email}
                          </p>
                        </div>
                      </div>

                      {/* Center: Course and University */}
                      <div className="flex-1 min-w-0 lg:text-center">
                        <div className="flex items-center gap-2 lg:justify-center">
                          <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{app.course.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 lg:justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground truncate">{app.university.name}</span>
                        </div>
                      </div>

                      {/* Right: Consultant and Actions */}
                      <div className="flex items-center gap-4 justify-between lg:justify-end">
                        <div className="text-sm">
                          {app.consultant ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{app.consultant.firstName} {app.consultant.lastName}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Unassigned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {app.application.createdAt && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(app.application.createdAt), "MMM d, yyyy")}
                            </div>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApplication(app);
                              setDetailsDialogOpen(true);
                            }}
                            data-testid={`button-view-${app.application.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Kanban View */
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
              <ScrollArea className="w-full pb-4" type="scroll">
                <div className="flex gap-4 min-w-max pb-4">
                  {STAGES.map((stage) => (
                    <DroppableStageColumn key={stage} stage={stage}>
                      <SortableContext
                        id={stage}
                        items={applicationsByStage[stage].map(app => app.application.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="w-72 sm:w-80 flex-shrink-0">
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
                <ScrollBar orientation="horizontal" className="h-3" />
              </ScrollArea>
            </div>

            {/* Terminal Stages */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Final Outcomes</h3>
              <ScrollArea className="w-full pb-4" type="scroll">
                <div className="flex gap-4 min-w-max md:grid md:grid-cols-3 md:min-w-0 pb-4 md:pb-0">
                  {TERMINAL_STAGES.map((stage) => (
                    <DroppableStageColumn key={stage} stage={stage}>
                      <SortableContext
                        id={stage}
                        items={applicationsByStage[stage].map(app => app.application.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="w-72 sm:w-80 md:w-auto flex-shrink-0 md:flex-shrink">
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
                        </div>
                      </SortableContext>
                    </DroppableStageColumn>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="h-3 md:hidden" />
              </ScrollArea>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-application-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Application Details
              {selectedApplication && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {selectedApplication.student.firstName} {selectedApplication.student.lastName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <ApplicationDetailsPanel
              application={selectedApplication.application as any}
              course={selectedApplication.course}
              university={selectedApplication.university}
              student={selectedApplication.student}
              consultant={selectedApplication.consultant}
              currentUserId={user?.id}
              onClose={() => setDetailsDialogOpen(false)}
              onDeleted={() => {
                setSelectedApplication(null);
              }}
            />
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

      {/* Batch Stage Transition Dialog */}
      <Dialog open={batchStageDialogOpen} onOpenChange={setBatchStageDialogOpen}>
        <DialogContent data-testid="dialog-batch-stage">
          <DialogHeader>
            <DialogTitle>Move Applications to Stage</DialogTitle>
            <DialogDescription>
              Move {selectedApplications.size} application(s) to a new stage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={batchTargetStage} onValueChange={(v) => setBatchTargetStage(v as ApplicationStage)}>
              <SelectTrigger data-testid="select-batch-stage">
                <SelectValue placeholder="Select target stage" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Active Stages</div>
                {STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
                <Separator className="my-1" />
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Final Outcomes</div>
                {TERMINAL_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {batchTargetStage && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will move all selected applications to "{batchTargetStage}" stage.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchStageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBatchTransition}
              disabled={!batchTargetStage || batchTransitionMutation.isPending}
              data-testid="button-confirm-batch-stage"
            >
              {batchTransitionMutation.isPending ? "Moving..." : "Move Applications"}
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
