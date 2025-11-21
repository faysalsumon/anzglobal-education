import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, Calendar, User, AlertCircle, RefreshCw, MessageSquare, 
  Upload, CheckCircle, Clock, ArrowRight, FileCheck, Search, Filter 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Application } from "@shared/schema";

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

interface InstitutionApplication {
  application: Application;
  course: {
    id: string;
    name: string;
    courseCode: string | null;
  } | null;
  student: {
    id: string;
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    country: string | null;
  } | null;
}

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

export default function UniversityApplications() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [offerLetterDialogOpen, setOfferLetterDialogOpen] = useState(false);
  const [documentRequestDialogOpen, setDocumentRequestDialogOpen] = useState(false);
  const [stageTransitionDialogOpen, setStageTransitionDialogOpen] = useState(false);
  const [offerLetterFile, setOfferLetterFile] = useState("");
  const [documentRequestType, setDocumentRequestType] = useState("");
  const [documentRequestNote, setDocumentRequestNote] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("");

  const { data, isLoading, isError, error, refetch } = useQuery<{ applications: InstitutionApplication[] }>({
    queryKey: ["/api/institution/applications"],
  });

  const applications = data?.applications || [];

  const uploadOfferLetterMutation = useMutation({
    mutationFn: async ({ applicationId, documentUrl, documentName }: { applicationId: string; documentUrl: string; documentName: string }) => {
      return await apiRequest("POST", `/api/institution/applications/${applicationId}/upload-offer-letter`, { 
        documentUrl,
        documentName 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institution/applications"] });
      setOfferLetterDialogOpen(false);
      setOfferLetterFile("");
      toast({
        title: "Offer letter uploaded",
        description: "The offer letter has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestDocumentMutation = useMutation({
    mutationFn: async ({ applicationId, documentType, requestNote }: { applicationId: string; documentType: string; requestNote: string }) => {
      return await apiRequest("POST", `/api/institution/applications/${applicationId}/request-documents`, {
        documentType,
        requestNote
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institution/applications"] });
      setDocumentRequestDialogOpen(false);
      setDocumentRequestType("");
      setDocumentRequestNote("");
      toast({
        title: "Document requested",
        description: "The student will be notified to upload the requested document.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const transitionStageMutation = useMutation({
    mutationFn: async ({ applicationId, toStage, notes }: { applicationId: string; toStage: string; notes?: string }) => {
      return await apiRequest("POST", `/api/institution/applications/${applicationId}/transition-stage`, {
        toStage,
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institution/applications"] });
      setStageTransitionDialogOpen(false);
      setSelectedStage("");
      toast({
        title: "Stage updated",
        description: "Application stage has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async (studentUserId: string) => {
      return await apiRequest("POST", "/api/conversations", { otherUserId: studentUserId });
    },
    onSuccess: () => {
      setLocation("/university/chat");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchQuery || 
      `${app.student?.firstName} ${app.student?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.student?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.course?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = stageFilter === "all" || app.application.currentStage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.application.status === "pending").length,
    documents: applications.filter(a => a.application.currentStage === "Documents Verification").length,
    offerStage: applications.filter(a => a.application.currentStage === "Offer-Letter").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Application Management</h1>
        <p className="text-muted-foreground">Review and manage student applications to your courses</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-applications">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Document Review</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-documents">{stats.documents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Offer</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-offer-stage">{stats.offerStage}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, email, or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="select-stage-filter"
                >
                  <option value="all">All Stages</option>
                  <option value="Assessment">Assessment</option>
                  <option value="Collect Docs">Collect Docs</option>
                  <option value="Documents Verification">Document Review</option>
                  <option value="Offer-Letter">Offer Letter</option>
                  <option value="COE">COE</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Applications</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{error instanceof Error ? error.message : "Failed to load applications. Please try again."}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit" data-testid="button-retry">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-lg font-medium mb-2">
              {applications.length === 0 ? "No applications yet" : "No matching applications"}
            </p>
            <p className="text-sm text-muted-foreground">
              {applications.length === 0 
                ? "Applications will appear here once students apply to your courses"
                : "Try adjusting your search or filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map((item) => (
            <Card key={item.application.id} data-testid={`application-card-${item.application.id}`} className="hover-elevate">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {item.student ? `${item.student.firstName || ''} ${item.student.lastName || ''}`.trim() : 'Unknown Student'}
                      </CardTitle>
                      <Badge className={STAGE_COLORS[item.application.currentStage as ApplicationStage]}>
                        {item.application.currentStage}
                      </Badge>
                    </div>
                    <CardDescription className="space-y-1">
                      <div>{item.student?.email || 'No email'}</div>
                      <div className="font-medium text-foreground">{item.course?.name || 'Unknown Course'}</div>
                      {item.course?.courseCode && (
                        <div className="text-xs">Code: {item.course.courseCode}</div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Stage Transition Button */}
                    <Dialog open={stageTransitionDialogOpen && selectedApplication === item.application.id} 
                            onOpenChange={(open) => {
                              setStageTransitionDialogOpen(open);
                              if (open) {
                                setSelectedApplication(item.application.id);
                                setSelectedStage(item.application.currentStage);
                              }
                            }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid={`button-transition-stage-${item.application.id}`}>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Update Stage
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Application Stage</DialogTitle>
                          <DialogDescription>
                            Move application to a new stage (limited to Documents Verification, Offer Letter, GS Clearance, or COE)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="stage-select">New Stage</Label>
                            <select
                              id="stage-select"
                              value={selectedStage}
                              onChange={(e) => setSelectedStage(e.target.value)}
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              data-testid="select-new-stage"
                            >
                              <option value="">Select a stage...</option>
                              <option value="Documents Verification">Documents Verification</option>
                              <option value="Offer-Letter">Offer-Letter</option>
                              <option value="GS-Clearance">GS-Clearance</option>
                              <option value="COE">COE</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                              setStageTransitionDialogOpen(false);
                              setSelectedStage("");
                            }}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => {
                                if (selectedStage && selectedApplication) {
                                  transitionStageMutation.mutate({
                                    applicationId: selectedApplication,
                                    toStage: selectedStage
                                  });
                                }
                              }}
                              disabled={!selectedStage || transitionStageMutation.isPending}
                              data-testid="button-confirm-stage-transition"
                            >
                              {transitionStageMutation.isPending ? "Updating..." : "Update Stage"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Offer Letter Upload (only for Offer-Letter stage) */}
                    {item.application.currentStage === "Offer-Letter" && (
                      <Dialog open={offerLetterDialogOpen && selectedApplication === item.application.id} 
                              onOpenChange={(open) => {
                                setOfferLetterDialogOpen(open);
                                if (open) setSelectedApplication(item.application.id);
                              }}>
                        <DialogTrigger asChild>
                          <Button variant="default" size="sm" data-testid={`button-upload-offer-${item.application.id}`}>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Offer Letter
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload Offer Letter</DialogTitle>
                            <DialogDescription>
                              Upload the offer letter for {item.student?.firstName} {item.student?.lastName}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="offer-letter-url">Document URL</Label>
                              <Input
                                id="offer-letter-url"
                                placeholder="https://example.com/offer-letter.pdf"
                                value={offerLetterFile}
                                onChange={(e) => setOfferLetterFile(e.target.value)}
                                data-testid="input-offer-letter-url"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Enter the URL of the uploaded offer letter document
                              </p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => {
                                setOfferLetterDialogOpen(false);
                                setOfferLetterFile("");
                              }}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={() => {
                                  if (offerLetterFile && selectedApplication) {
                                    uploadOfferLetterMutation.mutate({
                                      applicationId: selectedApplication,
                                      documentUrl: offerLetterFile,
                                      documentName: `Offer_Letter_${item.student?.firstName}_${item.student?.lastName}.pdf`
                                    });
                                  }
                                }}
                                disabled={!offerLetterFile || uploadOfferLetterMutation.isPending}
                                data-testid="button-submit-offer-letter"
                              >
                                {uploadOfferLetterMutation.isPending ? "Uploading..." : "Upload"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Request Documents */}
                    <Dialog open={documentRequestDialogOpen && selectedApplication === item.application.id} 
                            onOpenChange={(open) => {
                              setDocumentRequestDialogOpen(open);
                              if (open) setSelectedApplication(item.application.id);
                            }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid={`button-request-docs-${item.application.id}`}>
                          <FileText className="h-4 w-4 mr-2" />
                          Request Documents
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request Documents</DialogTitle>
                          <DialogDescription>
                            Request additional documents from {item.student?.firstName} {item.student?.lastName}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="document-type">Document Type</Label>
                            <Input
                              id="document-type"
                              placeholder="e.g., Academic Transcript, English Test Results"
                              value={documentRequestType}
                              onChange={(e) => setDocumentRequestType(e.target.value)}
                              data-testid="input-document-type"
                            />
                          </div>
                          <div>
                            <Label htmlFor="request-note">Request Note</Label>
                            <Textarea
                              id="request-note"
                              placeholder="Please provide additional details about the document request..."
                              value={documentRequestNote}
                              onChange={(e) => setDocumentRequestNote(e.target.value)}
                              rows={3}
                              data-testid="textarea-request-note"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                              setDocumentRequestDialogOpen(false);
                              setDocumentRequestType("");
                              setDocumentRequestNote("");
                            }}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => {
                                if (documentRequestType && documentRequestNote && selectedApplication) {
                                  requestDocumentMutation.mutate({
                                    applicationId: selectedApplication,
                                    documentType: documentRequestType,
                                    requestNote: documentRequestNote
                                  });
                                }
                              }}
                              disabled={!documentRequestType || !documentRequestNote || requestDocumentMutation.isPending}
                              data-testid="button-submit-document-request"
                            >
                              {requestDocumentMutation.isPending ? "Sending..." : "Send Request"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Message Student */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (item.student?.userId) {
                          startConversationMutation.mutate(item.student.userId);
                        }
                      }}
                      disabled={!item.student?.userId || startConversationMutation.isPending}
                      data-testid={`button-message-${item.application.id}`}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Student
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Status</p>
                    <Badge variant={item.application.status === "pending" ? "secondary" : "default"}>
                      {item.application.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Country</p>
                    <p className="text-sm text-muted-foreground">{item.student?.country || 'Not specified'}</p>
                  </div>
                </div>
                {item.application.personalStatement && (
                  <div>
                    <p className="text-sm font-medium mb-1">Personal Statement</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">{item.application.personalStatement}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Submitted {new Date(item.application.createdAt!).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
