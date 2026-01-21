import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Globe
} from "lucide-react";

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
  const [extractInstitutionData, setExtractInstitutionData] = useState(false);
  const [useAutoDiscovery, setUseAutoDiscovery] = useState(true);
  const { toast } = useToast();

  // Get institutions list for dropdown
  const { data: institutions } = useQuery<{ id: string; name: string; websiteUrl?: string }[]>({
    queryKey: ["/api/institutions"],
    enabled: open && !institutionId,
  });

  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | undefined>(institutionId);

  const createJobMutation = useMutation({
    mutationFn: async (data: { 
      institutionUrl: string; 
      institutionId?: string;
      extractInstitutionData?: boolean;
      useAutoDiscovery?: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/admin/scraping/jobs", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Scraping job created",
        description: "The crawling job has been started successfully.",
      });
      setUrl("");
      setExtractInstitutionData(false);
      setOpen(false);
      if (onJobCreated && data.id) {
        onJobCreated(data.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter an institution URL to crawl.",
        variant: "destructive",
      });
      return;
    }

    createJobMutation.mutate({
      institutionUrl: url.trim(),
      institutionId: selectedInstitutionId || institutionId,
      extractInstitutionData,
      useAutoDiscovery,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {institutionName ? `Crawl ${institutionName}` : "Start Institution Crawler"}
          </DialogTitle>
          <DialogDescription>
            Enter a URL to crawl for course data. The AI will automatically discover and extract course information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Institution Website URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.edu"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="input-crawler-url"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoDiscovery"
              checked={useAutoDiscovery}
              onCheckedChange={(checked) => setUseAutoDiscovery(checked === true)}
              data-testid="checkbox-auto-discovery"
            />
            <Label htmlFor="autoDiscovery" className="text-sm font-normal cursor-pointer">
              Use AI auto-discovery to find course pages
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="extractInstitution"
              checked={extractInstitutionData}
              onCheckedChange={(checked) => setExtractInstitutionData(checked === true)}
              data-testid="checkbox-extract-institution"
            />
            <Label htmlFor="extractInstitution" className="text-sm font-normal cursor-pointer">
              Also extract institution profile data
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-crawler"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createJobMutation.isPending}
              data-testid="button-start-crawler"
            >
              {createJobMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Start Crawling"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
