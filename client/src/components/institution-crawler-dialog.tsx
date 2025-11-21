import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Globe2, Sparkles, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

interface InstitutionCrawlerDialogProps {
  trigger?: React.ReactNode;
  institutionId?: string;
  institutionName?: string;
  onJobCreated?: (jobId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InstitutionCrawlerDialog({
  trigger,
  institutionId,
  institutionName,
  onJobCreated,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: InstitutionCrawlerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [url, setUrl] = useState("");
  const [extractInstitutionData, setExtractInstitutionData] = useState(true);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const crawlMutation = useMutation({
    mutationFn: async (data: {
      institutionUrl: string;
      institutionName?: string;
      institutionId?: string;
      extractInstitutionData: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/admin/scraping/crawl-institution", data);
      return await response.json();
    },
    onSuccess: (response: any) => {
      const jobId = response.job?.id;
      setCreatedJobId(jobId);

      toast({
        title: "Institution crawl started!",
        description: `Crawling ${url} to discover all courses. This may take several minutes.`,
      });

      if (onJobCreated && jobId) {
        onJobCreated(jobId);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Crawl failed",
        description: error.message || "Failed to start institution crawl. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartCrawl = () => {
    if (!url) {
      toast({
        title: "URL required",
        description: "Please enter an institution website URL.",
        variant: "destructive",
      });
      return;
    }

    crawlMutation.mutate({
      institutionUrl: url,
      institutionName,
      institutionId,
      extractInstitutionData,
    });
  };

  const handleViewProgress = () => {
    if (createdJobId) {
      setLocation(`/admin/scraping/jobs/${createdJobId}`);
      setOpen(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setUrl("");
    setExtractInstitutionData(true);
    setCreatedJobId(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" data-testid="button-open-crawler-dialog">
            <Globe2 className="h-4 w-4 mr-2" />
            Crawl Institution Website
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-institution-crawler">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Full Website Crawler
          </DialogTitle>
          <DialogDescription>
            Automatically discover and extract all courses from an institution's website using AI-powered web crawling.
          </DialogDescription>
        </DialogHeader>

        {!createdJobId ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="institution-url">Institution Website URL</Label>
              <Input
                id="institution-url"
                data-testid="input-institution-url"
                placeholder="https://university.edu.au"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={crawlMutation.isPending}
              />
              <p className="text-sm text-muted-foreground">
                Enter the homepage or main URL of the institution. The crawler will automatically discover all course pages.
              </p>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="extract-institution">Extract Institution Data</Label>
                <p className="text-sm text-muted-foreground">
                  Also extract institution information (name, description, contact details, etc.)
                </p>
              </div>
              <Switch
                id="extract-institution"
                data-testid="switch-extract-institution"
                checked={extractInstitutionData}
                onCheckedChange={setExtractInstitutionData}
                disabled={crawlMutation.isPending}
              />
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="text-sm font-medium">What happens next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Crawler will scan the entire website</li>
                <li>AI will identify and extract all course pages</li>
                <li>Data will be saved for your review</li>
                <li>You can approve/reject each course individually</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Crawl Job Created!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                The crawler is now discovering and extracting courses from {url}
              </p>
            </div>
            <Button onClick={handleViewProgress} className="w-full" data-testid="button-view-progress">
              View Progress & Review Courses
            </Button>
          </div>
        )}

        {!createdJobId && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={crawlMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartCrawl}
              disabled={crawlMutation.isPending || !url}
              data-testid="button-start-crawl"
            >
              {crawlMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {crawlMutation.isPending ? "Starting Crawl..." : "Start Crawl"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
