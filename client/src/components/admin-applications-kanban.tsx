import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, User, FileText, CheckCircle, XCircle, Clock, 
  ChevronRight, UserPlus, AlertCircle, Filter, BarChart3, GripVertical, MessageSquare, Bell,
  List, LayoutGrid, ChevronDown, X, Building2, GraduationCap, Calendar, Eye, AlertTriangle,
  CheckCheck, Users, Trash2, PanelLeftClose, PanelLeft, Bookmark, SlidersHorizontal, Save,
  ArrowUpDown, ChevronLeft, Globe, Download
} from "lucide-react";
import type { SavedFilter } from "@shared/schema";
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
    logo: string | null;
  };
  externalCountry?: string | null;
  externalCourseName?: string | null;
  externalInstitutionName?: string | null;
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  };
  consultant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
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
  branchId: string | null;
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

// Zoho-style stage header colors (prominent background colors)
const STAGE_HEADER_COLORS: Record<ApplicationStage, string> = {
  "Assessment": "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600",
  "Collect Docs": "bg-blue-200 dark:bg-blue-800 border-blue-300 dark:border-blue-700",
  "Documents Verification": "bg-purple-200 dark:bg-purple-800 border-purple-300 dark:border-purple-700",
  "Offer-Letter": "bg-orange-200 dark:bg-orange-800 border-orange-300 dark:border-orange-700",
  "GS-Clearance": "bg-emerald-200 dark:bg-emerald-800 border-emerald-300 dark:border-emerald-700",
  "COE": "bg-cyan-200 dark:bg-cyan-800 border-cyan-300 dark:border-cyan-700",
  "Health Cover": "bg-pink-200 dark:bg-pink-800 border-pink-300 dark:border-pink-700",
  "Visa Lodgment": "bg-indigo-200 dark:bg-indigo-800 border-indigo-300 dark:border-indigo-700",
  "Application Won": "bg-green-300 dark:bg-green-700 border-green-400 dark:border-green-600",
  "Refusal/Refunds": "bg-red-300 dark:bg-red-700 border-red-400 dark:border-red-600",
  "Application Lost": "bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600",
};

// All stages combined for single row display
const ALL_STAGES: ApplicationStage[] = [...STAGES, ...TERMINAL_STAGES];

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

// Helper to get initials from name
function getInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

// Helper to get institution initials from name
function getInstitutionInitials(name: string): string {
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Draggable application card with compact design
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

  const studentInitials = getInitials(app.student.firstName, app.student.lastName);
  const institutionInitials = getInstitutionInitials(app.university?.name ?? "");
  const consultantInitials = app.consultant 
    ? getInitials(app.consultant.firstName, app.consultant.lastName)
    : null;

  const courseName = app.externalCourseName || app.course?.title || '';
  const institutionName = app.externalInstitutionName || app.university?.name || '';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-move transition-all select-none ${
        isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
      } ${slaStatus === 'overdue' ? 'border-red-300 dark:border-red-800' : slaStatus === 'at-risk' ? 'border-amber-300 dark:border-amber-700' : ''}`}
      data-testid={`application-card-${app.application.id}`}
      onClick={onViewDetails}
    >
      <CardContent className="p-2.5 space-y-1.5 overflow-hidden">
        {/* Row 1: Drag handle + Checkbox + Student avatar + Name + SLA */}
        <div className="flex items-center gap-1.5 w-full min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/40" />
          </div>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelection}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 h-3.5 w-3.5"
            data-testid={`checkbox-application-${app.application.id}`}
          />
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarImage src={app.student.profileImageUrl || undefined} />
            <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {studentInitials}
            </AvatarFallback>
          </Avatar>
          <p className="text-xs font-semibold truncate flex-1 min-w-0 leading-tight">
            {app.student.firstName} {app.student.lastName}
          </p>
          <div className="flex-shrink-0">
            <SLABadge status={slaStatus} />
          </div>
        </div>

        {/* Row 2: Course name */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-foreground truncate w-full leading-snug cursor-default">
                {courseName || <span className="text-muted-foreground italic">No course</span>}
              </p>
            </TooltipTrigger>
            {courseName && (
              <TooltipContent side="bottom" className="text-xs max-w-[260px]">
                {courseName}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Row 3: Institution + Date */}
        <div className="flex items-center gap-1.5 w-full min-w-0">
          <p className="text-[11px] text-muted-foreground truncate flex-1 min-w-0">
            {institutionName || <span className="italic">External</span>}
          </p>
          <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 whitespace-nowrap">
            {format(new Date(app.application.createdAt), 'MMM d')}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {app.consultant ? (
                  <Avatar className="h-4 w-4 flex-shrink-0">
                    <AvatarImage src={app.consultant.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[7px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {consultantInitials}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-4 w-4 rounded-full border-dashed border border-amber-400 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="h-2 w-2 text-amber-500" />
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {app.consultant
                  ? `${app.consultant.firstName} ${app.consultant.lastName}`
                  : 'Unassigned'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Action row */}
        <div className="flex gap-1 pt-0.5 w-full">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-6 text-xs px-1"
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            data-testid={`button-view-details-${app.application.id}`}
          >
            <Eye className="h-3 w-3 mr-0.5" />
            View
          </Button>
          {nextStage && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); onAdvanceStage(); }}
              data-testid={`button-next-stage-${app.application.id}`}
            >
              <ChevronRight className="h-3 w-3" />
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
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [consultantFilter, setConsultantFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
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
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-az' | 'name-za' | 'stage' | 'sla'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
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

  // Fetch branches for branch filter
  const { data: branchesData } = useQuery<{ id: string; name: string; city: string | null }[]>({
    queryKey: ["/api/admin/branches"],
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
  // Filter consultants (admin and platform_admin users)
  const allUsers = usersData?.users || [];
  const consultants = allUsers.filter(user => {
    const userType = (user as any).userType;
    return userType === 'admin' || userType === 'platform_admin';
  });

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchLower ||
      `${app.student.firstName || ""} ${app.student.lastName || ""}`.toLowerCase().includes(searchLower) ||
      (app.course?.title || '').toLowerCase().includes(searchLower) ||
      (app.university?.name ?? "").toLowerCase().includes(searchLower);

    const matchesConsultant =
      consultantFilter === "all" ||
      (consultantFilter === "unassigned" && !app.application.assignedConsultantId) ||
      app.application.assignedConsultantId === consultantFilter;

    const matchesBranch = (() => {
      if (branchFilter === "all") return true;
      if (!app.application.assignedConsultantId) return false;
      const consultant = allUsers.find(u => u.id === app.application.assignedConsultantId);
      return consultant?.branchId === branchFilter;
    })();

    const matchesCountry =
      countryFilter === "all" ||
      (app.university?.country ?? null) === countryFilter;

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

    return matchesSearch && matchesConsultant && matchesBranch && matchesCountry && matchesStage && matchesStatus && matchesSla;
  });

  // Sort filtered applications
  const sortedApplications = useMemo(() => {
    const sorted = [...filteredApplications];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.application.createdAt ?? 0).getTime() - new Date(a.application.createdAt ?? 0).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.application.createdAt ?? 0).getTime() - new Date(b.application.createdAt ?? 0).getTime());
        break;
      case 'name-az':
        sorted.sort((a, b) => (a.student.lastName ?? '').localeCompare(b.student.lastName ?? ''));
        break;
      case 'name-za':
        sorted.sort((a, b) => (b.student.lastName ?? '').localeCompare(a.student.lastName ?? ''));
        break;
      case 'stage':
        sorted.sort((a, b) => ALL_STAGES.indexOf(a.application.currentStage as ApplicationStage) - ALL_STAGES.indexOf(b.application.currentStage as ApplicationStage));
        break;
      case 'sla': {
        const order: Record<string, number> = { overdue: 0, 'at-risk': 1, 'on-track': 2 };
        sorted.sort((a, b) =>
          (order[getSLAStatus(a.application.createdAt, a.application.updatedAt, a.application.currentStage)] ?? 3) -
          (order[getSLAStatus(b.application.createdAt, b.application.updatedAt, b.application.currentStage)] ?? 3)
        );
        break;
      }
    }
    return sorted;
  }, [filteredApplications, sortBy]);

  // Reset page when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredApplications.length, sortBy]);

  // Paginated slice for list view
  const totalPages = Math.ceil(sortedApplications.length / PAGE_SIZE);
  const paginatedApplications = sortedApplications.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Get unique universities
  const universities = Array.from(new Set(applications.map(app => app.university?.name).filter(Boolean)));
  
  // Track mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = consultantFilter !== "all" || branchFilter !== "all" || countryFilter !== "all" || stageFilter !== "all" || statusFilter !== "all" || slaFilter !== "all";
  
  // Clear all filters
  const clearAllFilters = () => {
    setConsultantFilter("all");
    setBranchFilter("all");
    setCountryFilter("all");
    setStageFilter("all");
    setStatusFilter("all");
    setSlaFilter("all");
    setSearchQuery("");
  };

  // Saved filters
  const [saveFilterName, setSaveFilterName] = useState("");
  const [saveFilterOpen, setSaveFilterOpen] = useState(false);

  const { data: savedFiltersData } = useQuery<SavedFilter[]>({
    queryKey: ["/api/saved-filters", { panelType: "applications" }],
  });

  const createSavedFilterMutation = useMutation({
    mutationFn: async (name: string) => {
      const filters = { stageFilter, statusFilter, consultantFilter, branchFilter, countryFilter, slaFilter };
      return apiRequest("POST", "/api/saved-filters", { name, panelType: "applications", filters });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-filters", { panelType: "applications" }] });
      setSaveFilterName("");
      setSaveFilterOpen(false);
      toast({ title: "Filter saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save filter", variant: "destructive" }),
  });

  const deleteSavedFilterMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/saved-filters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-filters", { panelType: "applications" }] });
      toast({ title: "Filter deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete filter", variant: "destructive" }),
  });

  const loadSavedFilter = (sf: SavedFilter) => {
    const f = sf.filters as any;
    if (f.stageFilter !== undefined) setStageFilter(f.stageFilter);
    if (f.statusFilter !== undefined) setStatusFilter(f.statusFilter);
    if (f.consultantFilter !== undefined) setConsultantFilter(f.consultantFilter);
    if (f.branchFilter !== undefined) setBranchFilter(f.branchFilter);
    if (f.countryFilter !== undefined) setCountryFilter(f.countryFilter);
    if (f.slaFilter !== undefined) setSlaFilter(f.slaFilter as any);
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

  sortedApplications.forEach((app) => {
    applicationsByStage[app.application.currentStage].push(app);
  });

  // Get unique countries
  const countries = Array.from(new Set(applications.map(app => app.university?.country).filter(Boolean)));

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
    <div className="flex flex-col h-full">
      {/* Top Header Bar — two rows */}
      <div className="flex flex-col gap-2 mb-3">
        {/* Row 1: Filter toggle + Search + Sort + Export + View toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFilterSidebarOpen(!filterSidebarOpen)}
            data-testid="button-toggle-filter-sidebar"
            title={filterSidebarOpen ? "Hide filters" : "Show filters"}
            className="shrink-0"
          >
            {filterSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-full"
              data-testid="input-search-applications"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 w-auto text-sm gap-1.5 shrink-0 border-dashed" data-testid="select-sort-applications">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name-az">Name A → Z</SelectItem>
              <SelectItem value="name-za">Name Z → A</SelectItem>
              <SelectItem value="stage">By stage</SelectItem>
              <SelectItem value="sla">By SLA urgency</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={() => {
              const rows = filteredApplications.map(app => {
                const isExternal = !app.application.courseId;
                return [
                  `${app.student.firstName || ''} ${app.student.lastName || ''}`.trim(),
                  app.student.email || '',
                  isExternal ? (app.externalCourseName || app.course?.title || '') : (app.course?.title || ''),
                  isExternal ? (app.externalInstitutionName || app.university?.name || '') : (app.university?.name || ''),
                  isExternal ? (app.externalCountry || '') : (app.university?.country || ''),
                  isExternal ? 'External' : 'Platform',
                  app.application.currentStage,
                  app.application.status || '',
                  app.consultant ? `${app.consultant.firstName || ''} ${app.consultant.lastName || ''}`.trim() : '',
                  app.application.createdAt ? format(new Date(app.application.createdAt), 'yyyy-MM-dd') : '',
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
              });
              const headers = ['Student Name','Email','Course','Institution','Destination Country','Type','Stage','Status','Consultant','Applied Date'];
              const csv = [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `applications-${format(new Date(), 'yyyy-MM-dd')}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            data-testid="button-export-csv"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <div className="flex items-center gap-1 border rounded-lg p-0.5 shrink-0">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-7"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="h-7"
              onClick={() => setViewMode('kanban')}
              data-testid="button-view-kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: My Apps + Stage/Status/Consultant + SLA chips + Select All — single scrollable line */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
          {user?.id && (
            <Button
              variant="outline"
              size="sm"
              className={`h-8 shrink-0 toggle-elevate${consultantFilter === user.id ? " toggle-elevated" : ""}`}
              onClick={() => setConsultantFilter(consultantFilter === user.id ? "all" : user.id)}
              data-testid="button-my-applications-topbar"
            >
              <User className="h-3.5 w-3.5 mr-1.5" />
              Mine
            </Button>
          )}
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="min-w-[120px] w-[140px] h-8 text-sm shrink-0" data-testid="select-stage-filter-inline">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {ALL_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-[120px] w-[140px] h-8 text-sm shrink-0" data-testid="select-status-filter-inline">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={consultantFilter} onValueChange={setConsultantFilter}>
            <SelectTrigger className="min-w-[130px] w-[160px] h-8 text-sm shrink-0" data-testid="select-consultant-filter-inline">
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
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 shrink-0" onClick={clearAllFilters} data-testid="button-clear-filters-inline">
              <X className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </Button>
          )}
          {hasActiveFilters && (
            <Popover open={saveFilterOpen} onOpenChange={setSaveFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 shrink-0" data-testid="button-save-filter-apps">
                  <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                  Save
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <p className="text-sm font-medium mb-2">Name this filter</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Active BD Apps"
                    value={saveFilterName}
                    onChange={(e) => setSaveFilterName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && saveFilterName.trim()) createSavedFilterMutation.mutate(saveFilterName.trim()); }}
                    className="h-8 text-sm"
                    data-testid="input-save-filter-name-apps"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-8 shrink-0"
                    disabled={!saveFilterName.trim() || createSavedFilterMutation.isPending}
                    onClick={() => createSavedFilterMutation.mutate(saveFilterName.trim())}
                    data-testid="button-confirm-save-filter-apps"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Separator orientation="vertical" className="h-5 mx-1 shrink-0" />
          <Button
            variant={slaFilter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={() => setSlaFilter('all')}
            data-testid="chip-sla-all"
          >
            All
          </Button>
          <Button
            variant={slaFilter === 'on-track' ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={() => setSlaFilter('on-track')}
            data-testid="chip-sla-on-track"
          >
            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
            On Track ({slaCounts['on-track']})
          </Button>
          <Button
            variant={slaFilter === 'at-risk' ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={() => setSlaFilter('at-risk')}
            data-testid="chip-sla-at-risk"
          >
            <Clock className="h-3 w-3 mr-1 text-amber-500" />
            At Risk ({slaCounts['at-risk']})
          </Button>
          <Button
            variant={slaFilter === 'overdue' ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={() => setSlaFilter('overdue')}
            data-testid="chip-sla-overdue"
          >
            <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
            Overdue ({slaCounts['overdue']})
          </Button>
          <Separator orientation="vertical" className="h-5 mx-1 shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={selectAllVisible}
            data-testid="button-select-all"
          >
            <Users className="h-3 w-3 mr-1" />
            Select All ({filteredApplications.length})
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar (when items selected) */}
      {selectedApplications.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-2 mb-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <CheckCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedApplications.size} selected</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7" onClick={() => setAssignDialogOpen(true)} data-testid="button-bulk-assign">
              <UserPlus className="h-3 w-3 mr-1" />
              Assign
            </Button>
            <Button size="sm" variant="outline" className="h-7" onClick={() => setBatchStageDialogOpen(true)} data-testid="button-bulk-stage">
              <ChevronRight className="h-3 w-3 mr-1" />
              Move Stage
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={clearSelection} data-testid="button-clear-selection">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area with Left Sidebar */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* Left Filter Sidebar — overlay on mobile, inline on desktop */}
        {filterSidebarOpen && isMobile && (
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => setFilterSidebarOpen(false)}
          />
        )}
        {filterSidebarOpen && (
          <div className={isMobile
            ? "fixed left-0 top-0 bottom-0 z-50 w-72 border-r bg-card overflow-y-auto shadow-xl"
            : "w-56 flex-shrink-0 border rounded-lg bg-card overflow-y-auto"
          }>
            {isMobile && (
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-sm font-semibold">Filters</span>
                <Button size="icon" variant="ghost" onClick={() => setFilterSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="p-3 space-y-4">
              {/* Saved Filters */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold mb-2">
                  <div className="flex items-center gap-1.5">
                    <Bookmark className="h-3.5 w-3.5" />
                    Saved Filters
                  </div>
                  <ChevronDown className="h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  <Button 
                    variant={!hasActiveFilters ? "secondary" : "ghost"} 
                    size="sm" 
                    className="w-full justify-start h-7 text-xs"
                    onClick={clearAllFilters}
                  >
                    All Applications
                    <Badge variant="outline" className="ml-auto text-[10px] h-4">{applications.length}</Badge>
                  </Button>
                  <Button 
                    variant={slaFilter === 'overdue' ? "secondary" : "ghost"} 
                    size="sm" 
                    className="w-full justify-start h-7 text-xs text-red-600"
                    onClick={() => setSlaFilter('overdue')}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1.5" />
                    Overdue
                    <Badge variant="outline" className="ml-auto text-[10px] h-4">{slaCounts.overdue}</Badge>
                  </Button>
                  <Button 
                    variant={slaFilter === 'at-risk' ? "secondary" : "ghost"} 
                    size="sm" 
                    className="w-full justify-start h-7 text-xs text-amber-600"
                    onClick={() => setSlaFilter('at-risk')}
                  >
                    <Clock className="h-3 w-3 mr-1.5" />
                    At Risk
                    <Badge variant="outline" className="ml-auto text-[10px] h-4">{slaCounts['at-risk']}</Badge>
                  </Button>
                  {user?.id && (
                    <Button
                      variant={consultantFilter === user.id ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start h-7 text-xs"
                      onClick={() => setConsultantFilter(consultantFilter === user.id ? "all" : user.id)}
                      data-testid="button-my-applications-filter"
                    >
                      My Applications
                      <Badge variant="outline" className="ml-auto text-[10px] h-4">
                        {applications.filter(a => a.application.assignedConsultantId === user.id).length}
                      </Badge>
                    </Button>
                  )}
                  <Button 
                    variant={consultantFilter === 'unassigned' ? "secondary" : "ghost"} 
                    size="sm" 
                    className="w-full justify-start h-7 text-xs"
                    onClick={() => setConsultantFilter('unassigned')}
                  >
                    <AlertCircle className="h-3 w-3 mr-1.5" />
                    Unassigned
                    <Badge variant="outline" className="ml-auto text-[10px] h-4">{stats.unassigned}</Badge>
                  </Button>
                  {savedFiltersData && savedFiltersData.length > 0 && (
                    <>
                      <div className="border-t my-1.5" />
                      {savedFiltersData.map((sf) => (
                        <div key={sf.id} className="flex items-center group">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 justify-start h-7 text-xs truncate"
                            onClick={() => loadSavedFilter(sf)}
                            data-testid={`button-load-saved-filter-${sf.id}`}
                          >
                            <Bookmark className="h-3 w-3 mr-1.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{sf.name}</span>
                          </Button>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => deleteSavedFilterMutation.mutate(sf.id)}
                            data-testid={`button-delete-saved-filter-${sf.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Filter by Branch */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Branch
                  </div>
                  <ChevronDown className="h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="h-7 text-xs" data-testid="select-filter-branch">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branchesData?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}{branch.city ? ` (${branch.city})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Filter by Country */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Country
                  </div>
                  <ChevronDown className="h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="h-7 text-xs" data-testid="select-filter-country">
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country!}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CollapsibleContent>
              </Collapsible>

            </div>
          </div>
        )}

        {/* Main Content - Kanban or List */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">

          {/* Loading State */}
      {isLoading ? (
        <Card className="flex-shrink-0">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading applications...</p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2" data-testid="applications-list-view">
          {sortedApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No applications found matching your filters.</p>
              </CardContent>
            </Card>
          ) : (
            paginatedApplications.map((app) => {
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
                    setLocation(`/admin/applications/${app.application.id}`);
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
                        <div className="flex items-center gap-2 lg:justify-center flex-wrap">
                          <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{app.externalCourseName || app.course?.title || ''}</span>
                          {app.externalCourseName && !app.application.courseId && (
                            <Badge variant="outline" className="text-[10px] px-1.5 no-default-active-elevate shrink-0">External</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 lg:justify-center flex-wrap">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground truncate">{app.university?.name}</span>
                          {app.externalCountry && !app.application.courseId && (
                            <span className="text-xs text-muted-foreground/70 flex items-center gap-1 shrink-0">
                              <Globe className="h-3 w-3" />{app.externalCountry}
                            </span>
                          )}
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
                              setLocation(`/admin/applications/${app.application.id}`);
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
        {/* Pagination Bar */}
        {sortedApplications.length > PAGE_SIZE && (
          <div className="flex-shrink-0 flex items-center justify-between gap-4 pt-2 pb-1 border-t" data-testid="pagination-bar">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="button-pagination-prev"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="text-pagination-page">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-pagination-next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <span className="text-xs text-muted-foreground ml-auto" data-testid="text-pagination-count">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedApplications.length)} of {sortedApplications.length}
            </span>
          </div>
        )}
        </>
      ) : (
        /* Zoho-style Kanban View - All stages in single row */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0">
            {ALL_STAGES.map((stage) => {
              const stageCount = applicationsByStage[stage].length;
              const isTerminal = TERMINAL_STAGES.includes(stage);
              
              return (
                <DroppableStageColumn key={stage} stage={stage}>
                  <SortableContext
                    id={stage}
                    items={applicationsByStage[stage].map(app => app.application.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="w-[230px] min-w-[230px] flex-shrink-0 flex flex-col h-full">
                      {/* Minimal Stage Header */}
                      <div className="flex items-center gap-2 px-1 pb-2">
                        <span className="text-xs font-semibold truncate flex-1 text-foreground" title={stage}>
                          {stage}
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0 no-default-active-elevate">
                          {stageCount}
                        </Badge>
                      </div>
                      <div className="h-px bg-border mb-2 w-full" />

                      {/* Cards Container — transparent, full column width */}
                      <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                          <div className="pt-1 pb-3 pr-1 space-y-2">
                            {stageCount === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-6">
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
                                    setLocation(`/admin/applications/${app.application.id}`);
                                  }}
                                  onAdvanceStage={() => {
                                    if (!isTerminal) {
                                      const next = getNextStage(stage);
                                      if (next) handleStageTransition(app.application.id, next);
                                    }
                                  }}
                                  nextStage={isTerminal ? null : getNextStage(stage)}
                                />
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </SortableContext>
                </DroppableStageColumn>
              );
            })}
          </div>
        </DndContext>
      )}
        </div>
      </div>

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
