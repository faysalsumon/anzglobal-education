import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Image, CheckCircle2, XCircle, Clock, Loader2, RefreshCw, Play, AlertTriangle } from "lucide-react";

interface UniversityStat {
  universityId: string;
  universityName: string;
  country: string;
  total: number;
  completed: number;
  missing: number;
  pending: number;
  generating: number;
  failed: number;
}

interface ThumbnailStats {
  total: number;
  completed: number;
  missing: number;
  pending: number;
  generating: number;
  failed: number;
  byUniversity: UniversityStat[];
}

export function AdminThumbnailManager() {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ universityId?: string; universityName?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ completed: 0, failed: 0, total: 0 });

  const { data: stats, isLoading, refetch } = useQuery<ThumbnailStats>({
    queryKey: ["/api/admin/courses/thumbnail-stats"],
    refetchInterval: isGenerating ? 5000 : false,
  });

  useEffect(() => {
    if (stats && isGenerating) {
      const inProgress = (stats.pending || 0) + (stats.generating || 0);
      if (inProgress === 0) {
        setIsGenerating(false);
        toast({ title: "Generation complete", description: `Thumbnails have been processed.` });
      }
    }
  }, [stats, isGenerating]);

  const generateBatch = useCallback(async (universityId?: string) => {
    setIsGenerating(true);
    setGenerationProgress({ completed: 0, failed: 0, total: 0 });

    let totalCompleted = 0;
    let totalFailed = 0;
    let batchNumber = 0;
    const batchSize = 5;

    try {
      while (true) {
        batchNumber++;
        const body: any = { filter: "missing", limit: batchSize };
        if (universityId) body.universityId = universityId;

        const res = await apiRequest("POST", "/api/admin/courses/bulk-generate-thumbnails", body);
        const data = await res.json();

        if (data.mode === "async") {
          toast({ title: "Queued for generation", description: `${data.queued} thumbnails queued via background worker.` });
          break;
        }

        totalCompleted += data.completed || 0;
        totalFailed += data.failed || 0;
        setGenerationProgress({ completed: totalCompleted, failed: totalFailed, total: totalCompleted + totalFailed });

        queryClient.invalidateQueries({ queryKey: ["/api/admin/courses/thumbnail-stats"] });

        if ((data.completed || 0) + (data.failed || 0) < batchSize) {
          break;
        }

        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate thumbnails", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses/thumbnail-stats"] });
      if (totalCompleted > 0 || totalFailed > 0) {
        toast({
          title: "Generation complete",
          description: `${totalCompleted} succeeded, ${totalFailed} failed.`,
        });
      }
    }
  }, [toast]);

  const handleGenerateClick = (universityId?: string, universityName?: string) => {
    setConfirmTarget(universityId ? { universityId, universityName } : null);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    generateBatch(confirmTarget?.universityId);
  };

  const groupedByCountry = stats?.byUniversity?.reduce<Record<string, UniversityStat[]>>((acc, uni) => {
    const country = uni.country || "Unknown";
    if (!acc[country]) acc[country] = [];
    acc[country].push(uni);
    return acc;
  }, {}) || {};

  const totalMissing = stats?.missing || 0;
  const totalInProgress = (stats?.pending || 0) + (stats?.generating || 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-thumbnail-manager">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-thumbnail-title">Course Thumbnails</h2>
          <p className="text-sm text-muted-foreground">Generate AI thumbnails for courses missing images</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isGenerating}
            data-testid="button-refresh-stats"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => handleGenerateClick()}
            disabled={isGenerating || totalMissing === 0}
            data-testid="button-generate-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1.5" />
                Generate All Missing ({totalMissing})
              </>
            )}
          </Button>
        </div>
      </div>

      {isGenerating && generationProgress.total > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Generating thumbnails...</span>
                  <span className="text-xs text-muted-foreground">
                    {generationProgress.completed} done, {generationProgress.failed} failed
                  </span>
                </div>
                <Progress value={generationProgress.total > 0 ? (generationProgress.completed / Math.max(generationProgress.total, totalMissing)) * 100 : 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold" data-testid="text-stat-total">{stats?.total || 0}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Image className="h-3 w-3" />
              Total Courses
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-green-600" data-testid="text-stat-completed">{stats?.completed || 0}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Completed
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-amber-600" data-testid="text-stat-missing">{totalMissing}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              Missing
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-stat-progress">{totalInProgress}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-600" />
              In Progress
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-red-600" data-testid="text-stat-failed">{stats?.failed || 0}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" />
              Failed
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.entries(groupedByCountry).sort(([a], [b]) => a.localeCompare(b)).map(([country, unis]) => {
        const countryMissing = unis.reduce((sum, u) => sum + u.missing, 0);
        const countryTotal = unis.reduce((sum, u) => sum + u.total, 0);
        const countryCompleted = unis.reduce((sum, u) => sum + u.completed, 0);
        return (
          <Card key={country}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-medium">{country}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{countryCompleted}/{countryTotal} complete</Badge>
                  {countryMissing > 0 && (
                    <Badge variant="outline" className="text-xs text-amber-600">{countryMissing} missing</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Institution</TableHead>
                    <TableHead className="text-center w-20">Total</TableHead>
                    <TableHead className="text-center w-20">Done</TableHead>
                    <TableHead className="text-center w-20">Missing</TableHead>
                    <TableHead className="text-center w-20">Status</TableHead>
                    <TableHead className="text-right pr-4 w-32">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unis.map((uni) => {
                    const pct = uni.total > 0 ? Math.round((uni.completed / uni.total) * 100) : 0;
                    const uniInProgress = uni.pending + uni.generating;
                    return (
                      <TableRow key={uni.universityId} data-testid={`row-university-${uni.universityId}`}>
                        <TableCell className="pl-4 font-medium text-sm">{uni.universityName}</TableCell>
                        <TableCell className="text-center text-sm">{uni.total}</TableCell>
                        <TableCell className="text-center text-sm text-green-600">{uni.completed}</TableCell>
                        <TableCell className="text-center text-sm">
                          {uni.missing > 0 ? <span className="text-amber-600">{uni.missing}</span> : <span className="text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {uniInProgress > 0 ? (
                            <Badge variant="secondary" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />{uniInProgress}</Badge>
                          ) : uni.failed > 0 ? (
                            <Badge variant="destructive" className="text-xs">{uni.failed} failed</Badge>
                          ) : uni.missing === 0 ? (
                            <Badge variant="secondary" className="text-xs text-green-600">{pct}%</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {uni.missing > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateClick(uni.universityId, uni.universityName)}
                              disabled={isGenerating}
                              data-testid={`button-generate-${uni.universityId}`}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Generate ({uni.missing})
                            </Button>
                          ) : uni.failed > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateClick(uni.universityId, uni.universityName)}
                              disabled={isGenerating}
                              data-testid={`button-retry-${uni.universityId}`}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">All done</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Thumbnails</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.universityName
                ? `Generate AI thumbnails for all missing courses at ${confirmTarget.universityName}?`
                : `Generate AI thumbnails for all ${totalMissing} courses with missing images?`
              }
              {" "}This uses AI image generation and may take some time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-generate">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} data-testid="button-confirm-generate">
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
