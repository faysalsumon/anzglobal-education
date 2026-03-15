import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Image, CheckCircle2, XCircle, Clock, Loader2, RefreshCw, Play, AlertTriangle, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";

interface CourseThumbnailInfo {
  id: string;
  title: string;
  discipline: string | null;
  level: string | null;
  thumbnailUrl: string | null;
  thumbnailStatus: string | null;
  universityName: string;
}

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
  const [expandedUnis, setExpandedUnis] = useState<Set<string>>(new Set());
  const [retryingCourses, setRetryingCourses] = useState<Set<string>>(new Set());

  const { data: stats, isLoading, refetch } = useQuery<ThumbnailStats>({
    queryKey: ["/api/admin/courses/thumbnail-stats"],
    refetchInterval: (query) => {
      const data = query.state.data as ThumbnailStats | undefined;
      const pendingOrGenerating = (data?.pending || 0) + (data?.generating || 0);
      if (isGenerating || pendingOrGenerating > 0) return 10000;
      return false;
    },
  });

  const fetchUniversityCourses = useCallback(async (universityId: string): Promise<CourseThumbnailInfo[]> => {
    const res = await apiRequest("GET", `/api/admin/courses/thumbnail-courses?universityId=${universityId}`);
    return res.json();
  }, []);

  const [coursesByUni, setCoursesByUni] = useState<Record<string, CourseThumbnailInfo[]>>({});
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback(async (universityId: string) => {
    setExpandedUnis(prev => {
      const next = new Set(prev);
      if (next.has(universityId)) {
        next.delete(universityId);
      } else {
        next.add(universityId);
        if (!coursesByUni[universityId]) {
          setLoadingCourses(lc => new Set(lc).add(universityId));
          fetchUniversityCourses(universityId).then(courses => {
            setCoursesByUni(prev => ({ ...prev, [universityId]: courses }));
            setLoadingCourses(lc => { const n = new Set(lc); n.delete(universityId); return n; });
          });
        }
      }
      return next;
    });
  }, [coursesByUni, fetchUniversityCourses]);

  const retrySingleCourse = useCallback(async (courseId: string) => {
    setRetryingCourses(prev => new Set(prev).add(courseId));
    try {
      const res = await apiRequest("POST", `/api/courses/${courseId}/generate-thumbnail`);
      const data = await res.json();
      if (data.success) {
        toast({ title: "Thumbnail generated", description: data.thumbnailUrl ? "Thumbnail created successfully." : "Queued for generation." });
      } else {
        toast({ title: "Failed", description: data.message || "Thumbnail generation failed.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate thumbnail", variant: "destructive" });
    } finally {
      setRetryingCourses(prev => { const n = new Set(prev); n.delete(courseId); return n; });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses/thumbnail-stats"] });
      for (const uid of expandedUnis) {
        fetchUniversityCourses(uid).then(courses => {
          setCoursesByUni(prev => ({ ...prev, [uid]: courses }));
        });
      }
    }
  }, [expandedUnis, fetchUniversityCourses, toast]);

  const generateBatch = useCallback(async (universityId?: string) => {
    setIsGenerating(true);
    setGenerationProgress({ completed: 0, failed: 0, total: 0 });

    let totalCompleted = 0;
    let totalFailed = 0;
    let totalQueued = 0;
    const batchSize = 100;

    try {
      while (true) {
        const body: any = { filter: "missing", limit: batchSize };
        if (universityId) body.universityId = universityId;

        const res = await apiRequest("POST", "/api/admin/courses/bulk-generate-thumbnails", body);
        const data = await res.json();

        if (data.mode === "async") {
          totalQueued += data.queued || 0;
          if ((data.queued || 0) < batchSize) {
            toast({ title: "Queued for generation", description: `${totalQueued} thumbnails queued via background worker.` });
            break;
          }
          await new Promise(r => setTimeout(r, 500));
          continue;
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
      for (const uid of expandedUnis) {
        fetchUniversityCourses(uid).then(courses => {
          setCoursesByUni(prev => ({ ...prev, [uid]: courses }));
        });
      }
      if (totalCompleted > 0 || totalFailed > 0) {
        toast({
          title: "Generation complete",
          description: `${totalCompleted} succeeded, ${totalFailed} failed.`,
        });
      }
    }
  }, [toast, expandedUnis, fetchUniversityCourses]);

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

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="text-xs text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Done</Badge>;
      case "generating":
        return <Badge variant="secondary" className="text-xs text-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating</Badge>;
      case "pending":
        return <Badge variant="secondary" className="text-xs text-amber-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs text-muted-foreground">No thumbnail</Badge>;
    }
  };

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
                <div className="flex items-center justify-between gap-2 mb-1">
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
              {unis.map((uni) => {
                const pct = uni.total > 0 ? Math.round((uni.completed / uni.total) * 100) : 0;
                const uniInProgress = uni.pending + uni.generating;
                const isExpanded = expandedUnis.has(uni.universityId);
                const uniCourses = coursesByUni[uni.universityId] || [];
                const isLoadingCourses = loadingCourses.has(uni.universityId);

                return (
                  <div key={uni.universityId} className="border-t" data-testid={`row-university-${uni.universityId}`}>
                    <div className="flex items-center justify-between gap-2 px-4 py-2 flex-wrap">
                      <button
                        className="flex items-center gap-2 text-left hover-elevate rounded-md px-1 py-0.5"
                        onClick={() => toggleExpand(uni.universityId)}
                        data-testid={`button-expand-${uni.universityId}`}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium text-sm">{uni.universityName}</span>
                      </button>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-muted-foreground">{uni.completed}/{uni.total}</span>
                        {uniInProgress > 0 ? (
                          <Badge variant="secondary" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />{uniInProgress}</Badge>
                        ) : uni.failed > 0 ? (
                          <Badge variant="destructive" className="text-xs">{uni.failed} failed</Badge>
                        ) : uni.missing === 0 ? (
                          <Badge variant="secondary" className="text-xs text-green-600">{pct}%</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        )}
                        {(uni.missing > 0 || uni.failed > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateClick(uni.universityId, uni.universityName)}
                            disabled={isGenerating}
                            data-testid={`button-generate-${uni.universityId}`}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {uni.missing > 0 ? `Generate (${uni.missing})` : "Retry"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-3">
                        {isLoadingCourses ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : uniCourses.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No courses found</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Course</TableHead>
                                <TableHead className="text-xs w-28">Discipline</TableHead>
                                <TableHead className="text-xs w-24">Level</TableHead>
                                <TableHead className="text-xs text-center w-24">Status</TableHead>
                                <TableHead className="text-xs text-right w-24">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {uniCourses.map((course) => (
                                <TableRow key={course.id} data-testid={`row-course-${course.id}`}>
                                  <TableCell className="text-xs font-medium max-w-[300px] truncate" title={course.title}>{course.title}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{course.discipline || "-"}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{course.level || "-"}</TableCell>
                                  <TableCell className="text-center">{getStatusBadge(course.thumbnailStatus)}</TableCell>
                                  <TableCell className="text-right">
                                    {(course.thumbnailStatus === "failed" || !course.thumbnailUrl) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => retrySingleCourse(course.id)}
                                        disabled={retryingCourses.has(course.id) || isGenerating}
                                        data-testid={`button-retry-course-${course.id}`}
                                      >
                                        {retryingCourses.has(course.id) ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <RotateCcw className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
