import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Globe2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  Trash2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminLayout } from "@/components/admin-layout";

interface ScrapingJob {
  id: string;
  institutionUrl: string;
  institutionName: string | null;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  totalPages: number | null;
  scrapedPages: number | null;
  coursesFound: number | null;
  coursesExtracted: number | null;
  useFullWebsiteCrawl: boolean;
  extractInstitutionData: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

interface JobStats {
  job: ScrapingJob;
  scrapedCourses: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export default function ScrapingJobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const previousStatusRef = useRef<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch job details and statistics
  const { data: stats, isLoading, error } = useQuery<JobStats>({
    queryKey: ["/api/admin/scraping/jobs", jobId, "stats"],
    refetchInterval: (query) => {
      // Auto-refresh every 2 seconds while job is running
      const job = query.state.data?.job;
      return job?.status === "running" || job?.status === "pending" ? 2000 : false;
    },
  });

  // Delete job mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/scraping/jobs/${jobId}`);
    },
    onSuccess: () => {
      toast({
        title: "Job Deleted",
        description: "The scraping job has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/jobs"] });
      setLocation("/admin/dashboard");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "Failed to delete the scraping job.",
      });
    },
  });

  // Show notification when crawl completes
  useEffect(() => {
    if (stats?.job) {
      const currentStatus = stats.job.status;
      const previousStatus = previousStatusRef.current;

      // Check if status changed to completed
      if (previousStatus && previousStatus !== "completed" && currentStatus === "completed") {
        const coursesFound = stats.job.coursesFound || 0;
        
        toast({
          title: "✅ Crawling Completed!",
          description: `Successfully discovered and extracted ${coursesFound} course${coursesFound !== 1 ? 's' : ''} from ${stats.job.institutionName || 'the institution'}.`,
          duration: 10000, // Show for 10 seconds
        });

        // Play notification sound if available
        if (typeof Audio !== 'undefined') {
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAk+ltryxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILElyx6OyrWBUIQ5zd8sFuJAUuhM/z1YU2Bhxqvu7mnEoPEFWq5O+zYBoJPJPY88p2KwUme8rx3I4+CRZitOvpo1QSC0mi4PK8aB8FM4nU8tGAMQYfccPu45ZFDBFYrOPwsmMaCT2U2PLJdiwFJ33K8dyOPgkWYrTr6aJUEgtJouDyvGgfBTOJ1PLRgDEGH3HD7uOWRQwRV6zj8LJjGgk9lNjyyXYsBSd9yvHcjj4JFmK06+mjVBILSaLg8rxoHwUzidTy0YAxBh9xw+7jlkUMEVes4/CyYxoJPZTY8sl2LAUnfcrx3I4+CRZitOvpo1QSC0mi4PK8aB8FM4nU8tGAMQYfccPu45ZFDBFXrOPwsmMaCT2U2PLJdiwFJ33K8dyOPgkWYrTr6aJUEgtJouDyvGgfBTOJ1PLRgDEGH3HD7uOWRQwRV6zj8LJjGgk9lNjyyXYsBSd9yvHcjj4JFmK06+mjVBILSaLg8rxoHwUzidTy0YAxBh9xw+7jlkUMEVes4/CyYxoJPZTY8sl2LAUnfcrx3I4+CRZitOvpo1QSC0mi4PK8aB8FM4nU8tGAMQYfccPu45ZFDBFXrOPwsmMaCT2U2PLJdiwFJ33K8dyOPgkWYrTr6aNUEgtJouDyvGgfBTOJ1PLRgDEGH3HD7uOWRQwRV6zj8LJjGgk9lNjyyXYsBSd9yvHcjj4JFmK06+mjVBILSaLg8rxoHwUzidTy0YAxBh9xw+7jlkUMEVes4/CyYxoJPZTY8sl2LAUnfcrx3I4+CRZitOvpo1QSC0mi4PK8aB8FM4nU8tGAMQYfccPu45ZFDBFXrOPwsmMaCT2U2PLJdiwFJ33K8dyOPgkWYrTr6aNUEgtJouDyvGgfBTOJ1PLRgDEGH3HD7uOWRQwRV6zj8LJjGgk9lNjyyXYsBSd9yvHcjj4JFmK06+mjVBILSaLg8rxoHwUzidTy0YAxBh9xw+7jlkUMEVes4/CyYxoJPZTY8sl2LAUnfcrx3I4+CRZitOvpo1QSC0mi4PK8aB8FM4nU8tGAMQYfccPu45ZFDBFXrOPwsmMaCT2U2PLJdiwFJ33K8dyOPgkWYrTr6aNUEgtJouDyvGgfBTOJ1PLRgDEGH3HD7uOWRQwRV6zj8LJjGgo=');
            audio.volume = 0.3;
            audio.play().catch(() => {
              // Ignore errors if audio playback is blocked
            });
          } catch (e) {
            // Ignore audio errors
          }
        }
      }

      // Update previous status
      previousStatusRef.current = currentStatus;
    }
  }, [stats?.job, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Job
            </CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load scraping job details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/admin/dashboard")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { job, scrapedCourses } = stats;

  const getStatusIcon = () => {
    switch (job.status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
      case "cancelled":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      running: "default",
      completed: "secondary",
      failed: "destructive",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[job.status]} data-testid={`badge-status-${job.status}`}>
        {job.status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <AdminLayout activeTab="scraping" breadcrumbTitle="Scraping Job Details">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {getStatusIcon()}
                Scraping Job
              </h1>
              <p className="text-sm text-muted-foreground">{job.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-job"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Job
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-5 w-5" />
              Institution Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Website URL</div>
              <a
                href={job.institutionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
                data-testid="link-institution-url"
              >
                {job.institutionUrl}
              </a>
            </div>
            {job.institutionName && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Institution Name</div>
                <div className="text-sm" data-testid="text-institution-name">
                  {job.institutionName}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Crawl Mode</div>
              <div className="text-sm flex items-center gap-2 mt-1">
                {job.useFullWebsiteCrawl ? (
                  <>
                    <Badge variant="secondary">Full Website Crawl</Badge>
                    {job.extractInstitutionData && <Badge variant="outline">+ Institution Data</Badge>}
                  </>
                ) : (
                  <Badge variant="outline">Single Page</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="text-sm" data-testid="text-created-at">
                {new Date(job.createdAt).toLocaleString()}
              </div>
            </div>
            {job.startedAt && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Started</div>
                <div className="text-sm" data-testid="text-started-at">
                  {new Date(job.startedAt).toLocaleString()}
                </div>
              </div>
            )}
            {job.completedAt && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Completed</div>
                <div className="text-sm" data-testid="text-completed-at">
                  {new Date(job.completedAt).toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {job.status === "running" && (
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Crawling and extracting course data...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span className="font-medium">{job.progress}%</span>
              </div>
              <Progress value={job.progress} className="h-2" data-testid="progress-overall" />
            </div>
            {job.scrapedPages !== null && job.totalPages !== null && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Pages Scanned</div>
                  <div className="text-2xl font-bold" data-testid="text-pages-scanned">
                    {job.scrapedPages} / {job.totalPages}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Courses Extracted</div>
                  <div className="text-2xl font-bold" data-testid="text-courses-extracted">
                    {job.coursesExtracted || 0}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {job.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extracted Courses
            </CardTitle>
            <CardDescription>Review and approve the extracted course data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 rounded-lg bg-secondary/20">
                <div className="text-3xl font-bold" data-testid="text-total-courses">
                  {scrapedCourses.total}
                </div>
                <div className="text-sm text-muted-foreground">Total Courses</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-pending-courses">
                  {scrapedCourses.pending}
                </div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-approved-courses">
                  {scrapedCourses.approved}
                </div>
                <div className="text-sm text-muted-foreground">Approved</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/10">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400" data-testid="text-rejected-courses">
                  {scrapedCourses.rejected}
                </div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation(`/admin/scraping/review/${job.id}`)}
                className="flex-1"
                data-testid="button-review-courses"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Review Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {job.status === "failed" && job.errorMessage && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm bg-destructive/10 p-4 rounded-lg" data-testid="text-error-message">
              {job.errorMessage}
            </div>
          </CardContent>
        </Card>
      )}

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Scraping Job?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this scraping job and all associated data (discovered URLs, scraped courses, etc.). 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteMutation.mutate();
                  setShowDeleteDialog(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Job
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
