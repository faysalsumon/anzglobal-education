import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Building2, Upload, AlertTriangle, FolderOpen, CheckCircle, Clock, MessageSquare, Send, ChevronDown, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface ApplicationNote {
  id: string;
  content: string;
  authorRole: string;
  isReadByStudent: boolean;
  isReadByConsultant: boolean;
  createdAt: string;
  authorId: string;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorProfilePicture: string | null;
}

// Required documents that students must upload
const REQUIRED_DOCUMENTS = [
  { type: "passport", name: "Passport Copy", required: true },
  { type: "transcript", name: "Academic Transcripts", required: true },
  { type: "language_test", name: "English Test Results", required: true },
];

interface StudentDocument {
  id: string;
  type: string;
  title: string;
  status: string;
}

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

interface StageHistory {
  id: string;
  applicationId: string;
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage;
  notes: string | null;
  changedByUserId: string;
  createdAt: string;
  durationInStage: number | null;
  metadata: any;
}

interface StageDocument {
  id: string;
  applicationId: string;
  stage: ApplicationStage;
  documentName: string;
  documentUrl: string | null;
  documentType: string | null;
  uploadedByUserId: string | null;
  uploadedByRole: string | null;
  uploadedAt: string | null;
  isVerified: boolean | null;
  verificationNotes: string | null;
  rejectionReason: string | null;
}

interface ApplicationCardProps {
  application: {
    id: string;
    studentId: string;
    courseId: string;
    currentStage: ApplicationStage;
    status: string;
    personalStatement: string | null;
    additionalInfo: string | null;
    assignedConsultantId: string | null;
    assignedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  course: {
    id: string;
    title: string;
    universityId: string;
    level: string;
    duration: string;
    fees: string;
    country: string;
  } | null;
  university: {
    id: string;
    name: string;
    logo: string | null;
    country: string | null;
  } | null;
  consultant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

const STAGE_ORDER: ApplicationStage[] = [
  "Assessment",
  "Collect Docs",
  "Documents Verification",
  "Offer-Letter",
  "GS-Clearance",
  "COE",
  "Health Cover",
  "Visa Lodgment",
  "Application Won",
  "Refusal/Refunds",
  "Application Lost",
];

const STAGE_DISPLAY_NAMES: Record<ApplicationStage, string> = {
  "Assessment": "Initial Assessment",
  "Collect Docs": "Collect Documents",
  "Documents Verification": "Document Verification",
  "Offer-Letter": "Offer Letter",
  "GS-Clearance": "GS Clearance",
  "COE": "Confirmation of Enrollment",
  "Health Cover": "Health Cover",
  "Visa Lodgment": "Visa Lodgment",
  "Application Won": "Application Won",
  "Refusal/Refunds": "Refusal/Refunds",
  "Application Lost": "Application Lost",
};

const STAGE_COLORS: Record<ApplicationStage, string> = {
  "Assessment": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Collect Docs": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Documents Verification": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Offer-Letter": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "GS-Clearance": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "COE": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "Health Cover": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "Visa Lodgment": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Application Won": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Refusal/Refunds": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "Application Lost": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

// Student-facing simplified stages (5 main milestones)
const STUDENT_STAGES = [
  { id: "assessment", name: "Initial Assessment", internalStages: ["Assessment", "Collect Docs", "Documents Verification"] },
  { id: "applied", name: "Applied to Institution", internalStages: ["Offer-Letter"] },
  { id: "offer", name: "Offer Letter", internalStages: ["GS-Clearance"] },
  { id: "payment", name: "Payment", internalStages: ["COE"] },
  { id: "coe", name: "COE Issued", internalStages: ["Health Cover", "Visa Lodgment", "Application Won"] },
] as const;

// Helper to map internal stage to student stage index
const getStudentStageIndex = (internalStage: ApplicationStage): number => {
  for (let i = 0; i < STUDENT_STAGES.length; i++) {
    if ((STUDENT_STAGES[i].internalStages as readonly string[]).includes(internalStage)) {
      return i;
    }
  }
  return -1; // Terminal or unknown stage
};

export function ApplicationCard({ application, course, university, consultant }: ApplicationCardProps) {
  const { toast } = useToast();
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentData, setDocumentData] = useState({
    documentName: "",
    documentUrl: "",
    documentType: undefined as string | undefined,
  });
  const [notesOpen, setNotesOpen] = useState(false);
  const [newNote, setNewNote] = useState("");

  // Fetch pending document requests (always fetched to show alert)
  const { data: pendingDocuments } = useQuery<{ pendingRequests: any[] }>({
    queryKey: [`/api/student/applications/${application.id}/pending-documents`],
  });

  // Fetch application notes
  const { data: notes = [], isLoading: notesLoading, refetch: refetchNotes } = useQuery<ApplicationNote[]>({
    queryKey: [`/api/student/applications/${application.id}/notes`],
    enabled: notesOpen,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/student/applications/${application.id}/notes`, { content });
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent to your consultant.",
      });
      setNewNote("");
      refetchNotes();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote.trim());
  };

  const unreadNotesCount = notes.filter(n => !n.isReadByStudent && n.authorRole !== 'student').length;

  // Fetch student's uploaded documents to check for required documents
  const { data: studentDocuments = [] } = useQuery<StudentDocument[]>({
    queryKey: ["/api/student/documents"],
  });

  // Check which required documents are missing
  const missingRequiredDocs = REQUIRED_DOCUMENTS.filter(
    (reqDoc) => !studentDocuments.some((doc) => doc.type === reqDoc.type)
  );
  
  const hasMissingDocuments = missingRequiredDocs.length > 0;

  // Calculate progress based on student-facing stages
  const currentStudentStageIndex = getStudentStageIndex(application.currentStage);
  const totalStudentStages = STUDENT_STAGES.length;
  
  // Calculate percentage (terminal stages = 100% for won, 0% for lost/refunds)
  const progressPercentage = application.currentStage === "Application Won" 
    ? 100 
    : application.currentStage === "Refusal/Refunds" || application.currentStage === "Application Lost"
    ? 0
    : currentStudentStageIndex >= 0 
    ? Math.round(((currentStudentStageIndex + 1) / totalStudentStages) * 100)
    : 0;
  
  // Get current student stage number (1-based)
  const currentStageNumber = currentStudentStageIndex >= 0 ? currentStudentStageIndex + 1 : 1;
  
  // Get current student stage name
  const currentStudentStage = currentStudentStageIndex >= 0 
    ? STUDENT_STAGES[currentStudentStageIndex] 
    : STUDENT_STAGES[0];
  
  // Get next student stage
  const nextStudentStageIndex = currentStudentStageIndex + 1;
  const nextStudentStage = nextStudentStageIndex < totalStudentStages 
    ? STUDENT_STAGES[nextStudentStageIndex] 
    : null;

  const uploadDocumentMutation = useMutation({
    mutationFn: async (data: { applicationId: string; stage: ApplicationStage; documentName: string; documentUrl: string; documentType: string }) => {
      return apiRequest("POST", "/api/student/applications/documents", data);
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully and is pending verification.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/student/applications/${application.id}/documents`] });
      setDocumentDialogOpen(false);
      setDocumentData({ documentName: "", documentUrl: "", documentType: undefined });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStageIcon = (stage: ApplicationStage) => {
    const currentIndex = STAGE_ORDER.indexOf(application.currentStage);
    const stageIndex = STAGE_ORDER.indexOf(stage);

    if (stageIndex < currentIndex) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (stageIndex === currentIndex) {
      return <Clock className="h-5 w-5 text-blue-600" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const handleDocumentUpload = () => {
    // Validate form data
    if (!documentData.documentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a document name.",
        variant: "destructive",
      });
      return;
    }

    if (!documentData.documentUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a document URL.",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(documentData.documentUrl);
    } catch {
      toast({
        title: "Validation Error",
        description: "Please provide a valid URL.",
        variant: "destructive",
      });
      return;
    }

    uploadDocumentMutation.mutate({
      applicationId: application.id,
      stage: application.currentStage,
      documentName: documentData.documentName.trim(),
      documentUrl: documentData.documentUrl.trim(),
      documentType: documentData.documentType || "general",
    });
  };

  return (
    <Card data-testid={`application-card-${application.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Building2 className="h-5 w-5 flex-shrink-0" />
              {course?.id ? (
                <Link 
                  href={`/courses/${course.id}`}
                  className="truncate hover:text-primary hover:underline transition-colors cursor-pointer"
                  data-testid={`link-course-${course.id}`}
                >
                  {course.title}
                </Link>
              ) : (
                <span className="truncate">Course Application</span>
              )}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
              <span>{university?.name || "University"}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="font-mono text-xs">ID: {application.id.slice(0, 8).toUpperCase()}</span>
            </CardDescription>
          </div>
          <Badge
            className={`${STAGE_COLORS[application.currentStage]} flex-shrink-0`}
            data-testid={`stage-badge-${application.id}`}
          >
            {STAGE_DISPLAY_NAMES[application.currentStage]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pending Document Requests Alert */}
        {pendingDocuments && pendingDocuments.pendingRequests && pendingDocuments.pendingRequests.length > 0 && (
          <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" data-testid={`alert-pending-docs-${application.id}`}>
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">
              Documents Requested ({pendingDocuments.pendingRequests.length})
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <div className="space-y-2 mt-2">
                {pendingDocuments.pendingRequests.map((req: any) => (
                  <div key={req.id} className="flex flex-col gap-1 p-2 bg-background/50 rounded-md">
                    <p className="font-medium text-sm">{req.documentType}</p>
                    {req.verificationNotes && (
                      <p className="text-xs text-muted-foreground">{req.verificationNotes}</p>
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="default"
                  className="mt-2"
                  onClick={() => setDocumentDialogOpen(true)}
                  data-testid={`button-upload-requested-doc-${application.id}`}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Requested Documents
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Timeline - Modern Horizontal Design */}
        <div className="space-y-4">
          {/* Progress Header with Percentage */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Application Progress</h4>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{progressPercentage}%</span>
              <span className="text-xs text-muted-foreground">complete</span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="relative">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${progressPercentage}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" 
                  style={{ 
                    animation: 'shimmer 2s infinite linear',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  }} 
                />
              </div>
            </div>
            
            {/* Stage markers on progress bar */}
            <div className="absolute top-0 left-0 right-0 h-3 flex items-center">
              {STUDENT_STAGES.map((stage, index) => {
                const position = ((index + 1) / STUDENT_STAGES.length) * 100;
                const isCompleted = index < currentStudentStageIndex;
                const isActive = index === currentStudentStageIndex;
                
                return (
                  <div 
                    key={stage.id}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${position}%` }}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                      isCompleted ? 'bg-white border-white' : 
                      isActive ? 'bg-white border-primary ring-2 ring-primary/30' : 
                      'bg-muted border-muted-foreground/30'
                    }`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage Labels - 5 Main Student Stages */}
          <div className="flex justify-between text-xs gap-1">
            {STUDENT_STAGES.map((stage, index) => {
              const isCompleted = index < currentStudentStageIndex;
              const isActive = index === currentStudentStageIndex;
              
              return (
                <div 
                  key={stage.id}
                  className={`flex flex-col items-center text-center flex-1 ${
                    isActive ? 'text-primary font-medium' : 
                    isCompleted ? 'text-foreground' : 
                    'text-muted-foreground'
                  }`}
                  data-testid={`stage-label-${stage.id}`}
                >
                  {isActive && (
                    <div className="relative mb-1">
                      <span className="absolute -inset-1 rounded-full bg-primary/20 animate-ping" />
                      <div className="relative w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  {!isActive && !isCompleted && (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mb-1">
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>
                  )}
                  <span className="leading-tight text-[10px] sm:text-xs">{stage.name}</span>
                </div>
              );
            })}
          </div>

          {/* Current Stage Highlight */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
                <span className="text-lg font-bold">{currentStageNumber}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Current Stage</p>
              <p className="font-semibold text-primary truncate">{currentStudentStage.name}</p>
            </div>
            {nextStudentStage && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">Next</p>
                <p className="text-sm font-medium truncate">{nextStudentStage.name}</p>
              </div>
            )}
            {!nextStudentStage && currentStudentStageIndex === STUDENT_STAGES.length - 1 && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Final Stage</span>
              </div>
            )}
          </div>
        </div>

        {/* Course Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Level:</span>
            <span className="ml-2 font-medium">{course?.level || "N/A"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Duration:</span>
            <span className="ml-2 font-medium">{course?.duration || "N/A"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Fees:</span>
            <span className="ml-2 font-medium">{course?.fees ? `$${course.fees}` : "N/A"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Consultant:</span>
            <span className="ml-2 font-medium">
              {consultant ? (
                `${consultant.firstName} ${consultant.lastName}`
              ) : (
                <span className="inline-flex items-center gap-1.5 text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="animate-pulse">Assigning consultant</span>
                  <span className="inline-flex">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Missing Documents Alert */}
        {hasMissingDocuments && (
          <Alert variant="destructive" className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800 dark:text-orange-400">Required Documents Missing</AlertTitle>
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              <p className="mb-2">
                Please upload the following mandatory documents to proceed with your application:
              </p>
              <ul className="list-disc list-inside space-y-1 mb-3">
                {missingRequiredDocs.map((doc) => (
                  <li key={doc.type} className="text-sm">{doc.name}</li>
                ))}
              </ul>
              <Link href="/student/documents">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/30"
                  data-testid="button-upload-missing-docs"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Go to My Documents
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Consultant Communication Notes */}
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-between"
              data-testid={`button-toggle-notes-${application.id}`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Messages with Consultant</span>
                {unreadNotesCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    {unreadNotesCount}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="border rounded-lg p-3 bg-muted/30">
              {notesLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Loading messages...
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Start a conversation with your consultant</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px] pr-3">
                  <div className="space-y-3">
                    {notes.slice().reverse().map((note) => (
                      <div 
                        key={note.id} 
                        className={`flex gap-2 ${note.authorRole === 'student' ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={note.authorProfilePicture || undefined} />
                          <AvatarFallback className={note.authorRole === 'student' ? 'bg-primary text-primary-foreground' : 'bg-blue-500 text-white'}>
                            {note.authorFirstName?.[0] || (note.authorRole === 'student' ? 'S' : 'C')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 max-w-[80%] ${note.authorRole === 'student' ? 'text-right' : ''}`}>
                          <div 
                            className={`inline-block rounded-lg px-3 py-2 text-sm ${
                              note.authorRole === 'student' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-background border'
                            }`}
                          >
                            {note.content}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {note.authorFirstName && `${note.authorFirstName} ${note.authorLastName || ''}`}
                            {note.authorFirstName && ' · '}
                            {new Date(note.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              
              {/* New message input */}
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Textarea
                  placeholder="Type a message..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[60px] flex-1 resize-none"
                  data-testid={`input-note-${application.id}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendNote();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  onClick={handleSendNote}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  data-testid={`button-send-note-${application.id}`}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/student/documents">
            <Button
              variant="default"
              size="sm"
              data-testid={`button-upload-document-${application.id}`}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
          <Calendar className="h-4 w-4" />
          <span>
            Submitted {new Date(application.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
