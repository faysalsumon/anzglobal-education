import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText,
  Filter,
} from "lucide-react";

interface ScrapedCourse {
  id: string;
  title: string | null;
  subject: string | null;
  level: string | null;
  discipline: string | null;
  duration: string | null;
  fees: number | null;
  currency: string | null;
  description: string | null;
  sourceUrl: string;
  confidence: string;
  warnings: string[];
  reviewStatus: "pending" | "approved" | "rejected";
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export default function ScrapingReviewDashboard() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const { toast } = useToast();

  // Fetch aggregate stats for tab badges and batch operations
  const { data: stats } = useQuery<{ job: any; scrapedCourses: { total: number; pending: number; approved: number; rejected: number } }>({
    queryKey: [`/api/admin/scraping/jobs/${jobId}/stats`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/scraping/jobs/${jobId}/stats`);
      return await response.json();
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch scraped courses for this job (filtered)
  const { data: courses, isLoading } = useQuery<{ scrapedCourses: ScrapedCourse[] }>({
    queryKey: ["/api/admin/scraping/scraped-courses", { jobId, reviewStatus: filter === "all" ? undefined : filter }],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const approveMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await apiRequest("PUT", `/api/admin/scraping/scraped-courses/${courseId}/approve`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/scraped-courses"] });
      toast({
        title: "Course approved",
        description: "The course has been added to the platform.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval failed",
        description: error.message || "Failed to approve course",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await apiRequest("PUT", `/api/admin/scraping/scraped-courses/${courseId}/reject`, {
        reviewNotes: "Rejected by admin",
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/scraped-courses"] });
      toast({
        title: "Course rejected",
        description: "The course has been marked as rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection failed",
        description: error.message || "Failed to reject course",
        variant: "destructive",
      });
    },
  });

  const batchApproveMutation = useMutation({
    mutationFn: async (courseIds: string[]) => {
      const response = await apiRequest("POST", "/api/admin/scraping/scraped-courses/batch-approve", {
        courseIds,
        reviewNotes: "Bulk approved",
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/scraped-courses"] });
      toast({
        title: "Batch approval completed",
        description: `${data.approvedCount || 0} courses approved successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Batch approval failed",
        description: error.message || "Failed to approve courses in batch",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (courseId: string) => {
    approveMutation.mutate(courseId);
  };

  const handleReject = (courseId: string) => {
    rejectMutation.mutate(courseId);
  };

  const handleBatchApprove = async () => {
    // Fetch all pending courses for batch approval (not just the current page)
    const response = await apiRequest("GET", `/api/admin/scraping/scraped-courses?jobId=${jobId}&reviewStatus=pending`);
    const allPendingData = await response.json();
    const allPendingCourses = allPendingData.scrapedCourses || [];

    if (allPendingCourses.length === 0) {
      toast({
        title: "No pending courses",
        description: "There are no pending courses to approve.",
        variant: "destructive",
      });
      return;
    }

    const courseIds = allPendingCourses.map((c: ScrapedCourse) => c.id);
    batchApproveMutation.mutate(courseIds);
  };

  const getConfidenceBadge = (confidence: string) => {
    const score = parseFloat(confidence);
    if (score >= 0.85) {
      return <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">High ({(score * 100).toFixed(0)}%)</Badge>;
    } else if (score >= 0.7) {
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">Medium ({(score * 100).toFixed(0)}%)</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400">Low ({(score * 100).toFixed(0)}%)</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const scrapedCourses = courses?.scrapedCourses || [];
  
  // Use aggregate stats for counts (not filtered data)
  const totalCount = stats?.scrapedCourses.total || 0;
  const pendingCount = stats?.scrapedCourses.pending || 0;
  const approvedCount = stats?.scrapedCourses.approved || 0;
  const rejectedCount = stats?.scrapedCourses.rejected || 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/admin/scraping/jobs/${jobId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Review Scraped Courses
            </h1>
            <p className="text-sm text-muted-foreground">Job ID: {jobId}</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <Button
            onClick={handleBatchApprove}
            disabled={batchApproveMutation.isPending}
            data-testid="button-batch-approve"
          >
            {batchApproveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve All Pending ({pendingCount})
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Courses
              </CardTitle>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-total-count">{totalCount}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-pending-count">{pendingCount}</div>
                <div className="text-muted-foreground">Pending</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-approved-count">{approvedCount}</div>
                <div className="text-muted-foreground">Approved</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-rejected-count">{rejectedCount}</div>
                <div className="text-muted-foreground">Rejected</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "pending" | "approved" | "rejected")}>
            <TabsList className="grid w-full grid-cols-4" data-testid="tabs-filter">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="approved" data-testid="tab-approved">
                Approved ({approvedCount})
              </TabsTrigger>
              <TabsTrigger value="rejected" data-testid="tab-rejected">
                Rejected ({rejectedCount})
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all">
                All ({totalCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {scrapedCourses.length === 0 ? (
        <Card data-testid="empty-state">
          <CardContent className="py-12 text-center space-y-2">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground font-medium" data-testid="text-empty-message">
              No {filter !== "all" && filter} courses found
            </p>
            <p className="text-sm text-muted-foreground">
              {filter === "pending" && "All courses have been reviewed."}
              {filter === "approved" && "No courses have been approved yet."}
              {filter === "rejected" && "No courses have been rejected yet."}
              {filter === "all" && "No courses found for this job."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scrapedCourses.map((course) => (
            <Card key={course.id} data-testid={`card-course-${course.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{course.title || "Untitled Course"}</CardTitle>
                    <CardDescription className="mt-1">
                      {course.level && <Badge variant="outline" className="mr-2">{course.level}</Badge>}
                      {course.discipline && <Badge variant="outline">{course.discipline}</Badge>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getConfidenceBadge(course.confidence)}
                    {course.reviewStatus === "approved" && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                    {course.reviewStatus === "rejected" && (
                      <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {course.subject && (
                    <div>
                      <div className="text-muted-foreground">Subject</div>
                      <div className="font-medium">{course.subject}</div>
                    </div>
                  )}
                  {course.duration && (
                    <div>
                      <div className="text-muted-foreground">Duration</div>
                      <div className="font-medium">{course.duration}</div>
                    </div>
                  )}
                  {course.fees && (
                    <div>
                      <div className="text-muted-foreground">Fees</div>
                      <div className="font-medium">
                        {course.currency || "AUD"} ${course.fees.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {course.description && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Description</div>
                    <p className="text-sm line-clamp-3">{course.description}</p>
                  </div>
                )}

                {course.warnings && course.warnings.length > 0 && (
                  <div className="rounded-lg bg-yellow-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">
                        <div className="font-medium mb-1">Warnings</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {course.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <a
                    href={course.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                    data-testid="link-source-url"
                  >
                    View Source
                  </a>
                  {course.reviewStatus === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(course.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-${course.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(course.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-${course.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
