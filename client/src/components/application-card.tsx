import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, Building2, Upload, CheckCircle, Clock, XCircle, Eye, ChevronRight, Download, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ApplicationStage = 
  | "Assessment"
  | "Collect-Docs"
  | "Documents-Verification"
  | "Offer-Letter"
  | "GS-Clearance"
  | "COE"
  | "Health-Cover"
  | "Visa-Lodgment"
  | "Application-Won"
  | "Application-Refusal"
  | "Application-Lost";

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
  documentUrl: string;
  documentType: string | null;
  uploadedByUserId: string;
  uploadedByRole: string;
  uploadedAt: string;
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
  "Collect-Docs",
  "Documents-Verification",
  "Offer-Letter",
  "GS-Clearance",
  "COE",
  "Health-Cover",
  "Visa-Lodgment",
  "Application-Won",
  "Application-Refusal",
  "Application-Lost",
];

const STAGE_DISPLAY_NAMES: Record<ApplicationStage, string> = {
  "Assessment": "Initial Assessment",
  "Collect-Docs": "Collect Documents",
  "Documents-Verification": "Document Verification",
  "Offer-Letter": "Offer Letter",
  "GS-Clearance": "GS Clearance",
  "COE": "Confirmation of Enrollment",
  "Health-Cover": "Health Cover",
  "Visa-Lodgment": "Visa Lodgment",
  "Application-Won": "Application Won",
  "Application-Refusal": "Application Refusal",
  "Application-Lost": "Application Lost",
};

const STAGE_COLORS: Record<ApplicationStage, string> = {
  "Assessment": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Collect-Docs": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Documents-Verification": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Offer-Letter": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "GS-Clearance": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "COE": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "Health-Cover": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "Visa-Lodgment": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Application-Won": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Application-Refusal": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "Application-Lost": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function ApplicationCard({ application, course, university, consultant }: ApplicationCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentData, setDocumentData] = useState({
    documentName: "",
    documentUrl: "",
    documentType: undefined as string | undefined,
  });

  const { data: stageHistory } = useQuery<StageHistory[]>({
    queryKey: [`/api/student/applications/${application.id}/history`],
    enabled: isExpanded,
  });

  const { data: documents } = useQuery<StageDocument[]>({
    queryKey: [`/api/student/applications/${application.id}/documents`],
    enabled: isExpanded,
  });

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
              <span className="truncate">{course?.title || "Course Application"}</span>
            </CardTitle>
            <CardDescription className="mt-1">
              {university?.name || "University"} • {course?.country || "Unknown Location"}
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
        {/* Progress Timeline */}
        <div>
          <h4 className="text-sm font-medium mb-4">Application Progress</h4>
          <div className="space-y-3">
            {STAGE_ORDER.filter(s => !["Application-Refusal", "Application-Lost"].includes(s)).slice(0, 5).map((stage) => {
              const currentIndex = STAGE_ORDER.indexOf(application.currentStage);
              const stageIndex = STAGE_ORDER.indexOf(stage);
              const isActive = stageIndex === currentIndex;

              return (
                <div
                  key={stage}
                  className={`flex items-center gap-3 ${isActive ? "font-medium" : ""}`}
                  data-testid={`stage-item-${stage}`}
                >
                  {getStageIcon(stage)}
                  <div className="flex-1">
                    <p className={`text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {STAGE_DISPLAY_NAMES[stage]}
                    </p>
                  </div>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
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
              {consultant ? `${consultant.firstName} ${consultant.lastName}` : "Unassigned"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid={`button-toggle-details-${application.id}`}
          >
            {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {isExpanded ? "Hide Details" : "View Details"}
          </Button>
          <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                data-testid={`button-upload-document-${application.id}`}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" data-testid="dialog-upload-document">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload documents for {STAGE_DISPLAY_NAMES[application.currentStage]} stage
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="documentName">Document Name *</Label>
                  <Input
                    id="documentName"
                    placeholder="e.g., Passport Copy, Academic Transcript"
                    value={documentData.documentName}
                    onChange={(e) => setDocumentData({ ...documentData, documentName: e.target.value })}
                    data-testid="input-document-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentUrl">Document URL *</Label>
                  <Input
                    id="documentUrl"
                    placeholder="https://..."
                    value={documentData.documentUrl}
                    onChange={(e) => setDocumentData({ ...documentData, documentUrl: e.target.value })}
                    data-testid="input-document-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select
                    value={documentData.documentType || undefined}
                    onValueChange={(value) => setDocumentData({ ...documentData, documentType: value })}
                  >
                    <SelectTrigger data-testid="select-document-type">
                      <SelectValue placeholder="Select document type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="transcript">Academic Transcript</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                      <SelectItem value="ielts">IELTS/TOEFL</SelectItem>
                      <SelectItem value="financial">Financial Document</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDocumentDialogOpen(false)}
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDocumentUpload}
                  disabled={uploadDocumentMutation.isPending}
                  data-testid="button-confirm-upload"
                >
                  {uploadDocumentMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stage History */}
        {isExpanded && stageHistory && stageHistory.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Stage History</h4>
            <div className="space-y-2">
              {stageHistory.map((history) => (
                <div
                  key={history.id}
                  className="flex items-start gap-3 text-sm"
                  data-testid={`history-item-${history.id}`}
                >
                  <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <p>
                      Moved to <span className="font-medium">{STAGE_DISPLAY_NAMES[history.toStage]}</span>
                    </p>
                    {history.notes && (
                      <p className="text-muted-foreground text-xs mt-1">{history.notes}</p>
                    )}
                    <p className="text-muted-foreground text-xs mt-1">
                      {new Date(history.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {isExpanded && documents && documents.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Uploaded Documents</h4>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border"
                  data-testid={`document-item-${doc.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.documentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.isVerified === true && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {doc.isVerified === false && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    )}
                    {doc.isVerified === null && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      data-testid={`button-download-${doc.id}`}
                    >
                      <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isExpanded && documents && documents.length === 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              No documents uploaded yet. Click "Upload Document" to add documents for this stage.
            </p>
          </div>
        )}

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
