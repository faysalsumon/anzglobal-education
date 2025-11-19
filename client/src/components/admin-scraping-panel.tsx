import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Globe,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ScrapingJob {
  id: string;
  institutionId?: string;
  institutionUrl: string;
  institutionName?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress?: number;
  coursesFound?: number;
  coursesExtracted?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

interface ScrapedCourse {
  id: string;
  jobId: string;
  institutionId?: string;
  title?: string;
  subject?: string;
  level?: string;
  description?: string;
  duration?: string;
  fees?: number;
  currency?: string;
  location?: string;
  country?: string;
  sourceUrl: string;
  confidence: number;
  warnings?: string[];
  reviewStatus: "pending" | "approved" | "rejected";
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  approvedCourseId?: string;
  extractedAt: string;
}

export function AdminScrapingPanel() {
  const { toast } = useToast();
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<ScrapedCourse | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  
  // Form state for triggering scrape
  const [institutionUrl, setInstitutionUrl] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [useBrowser, setUseBrowser] = useState(false);

  // Fetch scraping jobs
  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: ScrapingJob[] }>({
    queryKey: ["/api/admin/scraping/jobs"],
  });

  // Fetch scraped courses
  const { data: coursesData, isLoading: coursesLoading } = useQuery<{ scrapedCourses: ScrapedCourse[] }>({
    queryKey: ["/api/admin/scraping/scraped-courses"],
  });

  // Trigger scraping job mutation
  const triggerScrapeMutation = useMutation({
    mutationFn: async (data: { institutionUrl: string; institutionName?: string; useBrowser?: boolean }) => {
      return await apiRequest("POST", "/api/admin/scraping/trigger", data);
    },
    onSuccess: () => {
      toast({
        title: "Scraping job started",
        description: "The web scraping job has been queued successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/jobs"] });
      setTriggerDialogOpen(false);
      setInstitutionUrl("");
      setInstitutionName("");
      setUseBrowser(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start scraping job",
        variant: "destructive",
      });
    },
  });

  // Approve scraped course mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, reviewNotes }: { id: string; reviewNotes?: string }) => {
      return await apiRequest("PUT", `/api/admin/scraping/scraped-courses/${id}/approve`, { reviewNotes });
    },
    onSuccess: () => {
      toast({
        title: "Course approved",
        description: "The scraped course has been approved and added to the courses database.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/scraped-courses"] });
      setReviewDialogOpen(false);
      setSelectedCourse(null);
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve course",
        variant: "destructive",
      });
    },
  });

  // Reject scraped course mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reviewNotes }: { id: string; reviewNotes: string }) => {
      return await apiRequest("PUT", `/api/admin/scraping/scraped-courses/${id}/reject`, { reviewNotes });
    },
    onSuccess: () => {
      toast({
        title: "Course rejected",
        description: "The scraped course has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/scraped-courses"] });
      setReviewDialogOpen(false);
      setSelectedCourse(null);
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject course",
        variant: "destructive",
      });
    },
  });

  // Test scraping mutation (direct, bypasses queue)
  const testScrapeMutation = useMutation({
    mutationFn: async (data: { institutionUrl: string; institutionName?: string; useBrowser?: boolean }) => {
      return await apiRequest("POST", "/api/admin/scraping/test", data);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Test scraping completed!",
        description: `Extracted course with ${(response.extractionResult.confidence * 100).toFixed(0)}% confidence. Check Pending Review tab.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/scraped-courses"] });
      setTriggerDialogOpen(false);
      setInstitutionUrl("");
      setInstitutionName("");
      setUseBrowser(false);
    },
    onError: (error: any) => {
      toast({
        title: "Test scraping failed",
        description: error.message || "Failed to scrape and extract course data",
        variant: "destructive",
      });
    },
  });

  const handleTriggerScrape = () => {
    if (!institutionUrl.trim()) {
      toast({
        title: "Error",
        description: "Institution URL is required",
        variant: "destructive",
      });
      return;
    }

    triggerScrapeMutation.mutate({
      institutionUrl: institutionUrl.trim(),
      institutionName: institutionName.trim() || undefined,
      useBrowser,
    });
  };

  const handleTestScrape = () => {
    if (!institutionUrl.trim()) {
      toast({
        title: "Error",
        description: "Institution URL is required",
        variant: "destructive",
      });
      return;
    }

    testScrapeMutation.mutate({
      institutionUrl: institutionUrl.trim(),
      institutionName: institutionName.trim() || undefined,
      useBrowser,
    });
  };

  const handleReviewCourse = (course: ScrapedCourse) => {
    setSelectedCourse(course);
    setReviewNotes("");
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedCourse) return;
    approveMutation.mutate({
      id: selectedCourse.id,
      reviewNotes: reviewNotes.trim() || undefined,
    });
  };

  const handleReject = () => {
    if (!selectedCourse) return;
    if (!reviewNotes.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({
      id: selectedCourse.id,
      reviewNotes: reviewNotes.trim(),
    });
  };

  const getStatusBadge = (status: ScrapingJob["status"]) => {
    const variants: Record<ScrapingJob["status"], { variant: "default" | "secondary" | "destructive"; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      running: { variant: "default", icon: Loader2 },
      completed: { variant: "secondary", icon: CheckCircle2 },
      failed: { variant: "destructive", icon: XCircle },
      cancelled: { variant: "secondary", icon: XCircle },
    };
    
    const config = variants[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1" data-testid={`status-${status}`}>
        <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getReviewStatusBadge = (status: ScrapedCourse["reviewStatus"]) => {
    const variants: Record<ScrapedCourse["reviewStatus"], "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    
    return (
      <Badge variant={variants[status]} data-testid={`review-status-${status}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const pendingCourses = coursesData?.scrapedCourses?.filter(c => c.reviewStatus === "pending") ?? [];
  const reviewedCourses = coursesData?.scrapedCourses?.filter(c => c.reviewStatus !== "pending") ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-scraping-title">AI Web Scraping</h2>
          <p className="text-muted-foreground text-sm">
            Automatically extract course data from institution websites
          </p>
        </div>
        <Button 
          onClick={() => {
            // Reset form when opening dialog
            setInstitutionUrl("");
            setInstitutionName("");
            setUseBrowser(false);
            setTriggerDialogOpen(true);
          }} 
          data-testid="button-new-job"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Scraping Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-total-jobs">
              {jobsData?.jobs?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-pending-review">
              {pendingCourses?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600 dark:text-green-400" data-testid="stat-approved">
              {coursesData?.scrapedCourses?.filter(c => c.reviewStatus === "approved")?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-3xl text-red-600 dark:text-red-400" data-testid="stat-rejected">
              {coursesData?.scrapedCourses?.filter(c => c.reviewStatus === "rejected")?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs" data-testid="tab-jobs">Scraping Jobs</TabsTrigger>
          <TabsTrigger value="review" data-testid="tab-review">
            Pending Review ({pendingCourses.length})
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Review History</TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scraping Jobs</CardTitle>
              <CardDescription>View and manage web scraping jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (jobsData?.jobs?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scraping jobs yet. Click "New Scraping Job" to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Courses Found</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobsData?.jobs.map((job) => (
                        <TableRow key={job.id} data-testid={`job-row-${job.id}`}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{job.institutionName || "Unnamed Institution"}</span>
                              <a 
                                href={job.institutionUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                data-testid={`link-institution-${job.id}`}
                              >
                                <ExternalLink className="h-3 w-3" />
                                {new URL(job.institutionUrl).hostname}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell>
                            {job.progress !== undefined ? `${job.progress}%` : "N/A"}
                          </TableCell>
                          <TableCell data-testid={`courses-found-${job.id}`}>
                            {job.coursesExtracted || 0} / {job.coursesFound || 0}
                          </TableCell>
                          <TableCell>
                            {new Date(job.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/jobs"] })}
                              data-testid={`button-refresh-${job.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Review Tab */}
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Review</CardTitle>
              <CardDescription>Review and approve scraped courses before publishing</CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (pendingCourses?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No courses pending review.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Warnings</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingCourses.map((course) => (
                        <TableRow key={course.id} data-testid={`course-row-${course.id}`}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{course.title || "Untitled Course"}</span>
                              <a 
                                href={course.sourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Source
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>{course.subject || "N/A"}</TableCell>
                          <TableCell>{course.level || "N/A"}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={course.confidence >= 0.7 ? "default" : "secondary"}
                              data-testid={`confidence-${course.id}`}
                            >
                              {Math.round(course.confidence * 100)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {course.warnings && course.warnings.length > 0 ? (
                              <Badge variant="secondary" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {course.warnings.length}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleReviewCourse(course)}
                              data-testid={`button-review-${course.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review History</CardTitle>
              <CardDescription>View previously reviewed courses</CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (reviewedCourses?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reviewed courses yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewedCourses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell>{course.title || "Untitled Course"}</TableCell>
                          <TableCell>{getReviewStatusBadge(course.reviewStatus)}</TableCell>
                          <TableCell>{Math.round(course.confidence * 100)}%</TableCell>
                          <TableCell>
                            {course.reviewedAt ? new Date(course.reviewedAt).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {course.reviewNotes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trigger Scrape Dialog */}
      <Dialog open={triggerDialogOpen} onOpenChange={setTriggerDialogOpen}>
        <DialogContent data-testid="dialog-trigger-scrape">
          <DialogHeader>
            <DialogTitle>Start New Scraping Job</DialogTitle>
            <DialogDescription>
              Enter the institution website URL to start extracting course data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="institutionUrl">Institution Website URL *</Label>
              <Input
                id="institutionUrl"
                placeholder="https://example.edu.au"
                value={institutionUrl}
                onChange={(e) => setInstitutionUrl(e.target.value)}
                data-testid="input-institution-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="institutionName">Institution Name (Optional)</Label>
              <Input
                id="institutionName"
                placeholder="Example University"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                data-testid="input-institution-name"
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                The AI will automatically discover course pages, extract course data, and save them for your review.
                This process may take several minutes depending on the website size.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setTriggerDialogOpen(false)}
              data-testid="button-cancel-trigger"
              className="sm:flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="secondary"
              onClick={handleTestScrape}
              disabled={testScrapeMutation.isPending || !institutionUrl.trim()}
              data-testid="button-test-scraping"
              className="sm:flex-1"
            >
              {testScrapeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {testScrapeMutation.isPending ? "Testing..." : "Test Scraping"}
            </Button>
            <Button 
              onClick={handleTriggerScrape}
              disabled={triggerScrapeMutation.isPending || !institutionUrl.trim()}
              data-testid="button-start-scraping"
              className="sm:flex-1"
            >
              {triggerScrapeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Queue Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Course Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-review-course">
          <DialogHeader>
            <DialogTitle>Review Scraped Course</DialogTitle>
            <DialogDescription>
              Review the extracted course data and approve or reject it.
            </DialogDescription>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4 py-4">
              {/* Course Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm text-muted-foreground">Title</Label>
                  <p className="font-medium">{selectedCourse.title || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Subject</Label>
                  <p className="font-medium">{selectedCourse.subject || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Level</Label>
                  <p className="font-medium">{selectedCourse.level || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Duration</Label>
                  <p className="font-medium">{selectedCourse.duration || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Fees</Label>
                  <p className="font-medium">
                    {selectedCourse.fees 
                      ? `${selectedCourse.currency || "AUD"} ${selectedCourse.fees}`
                      : "N/A"
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Location</Label>
                  <p className="font-medium">{selectedCourse.location || "N/A"}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Description</Label>
                <p className="mt-1 text-sm">{selectedCourse.description || "N/A"}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Source URL</Label>
                <a 
                  href={selectedCourse.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {selectedCourse.sourceUrl}
                </a>
              </div>

              <div className="flex gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">AI Confidence</Label>
                  <Badge 
                    variant={selectedCourse.confidence >= 0.7 ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {Math.round(selectedCourse.confidence * 100)}%
                  </Badge>
                </div>
                {selectedCourse.warnings && selectedCourse.warnings.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Warnings</Label>
                    <div className="mt-1 space-y-1">
                      {selectedCourse.warnings.map((warning, idx) => (
                        <Alert key={idx} variant="default" className="py-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="reviewNotes">Review Notes</Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="Add notes about your decision (required for rejection)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-2"
                  rows={3}
                  data-testid="input-review-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setReviewDialogOpen(false)}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              data-testid="button-reject-course"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              data-testid="button-approve-course"
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
