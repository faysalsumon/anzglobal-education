/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Check, X, Loader2, Search, Eye, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface SeoMetadata {
  id: string;
  entityType: 'course' | 'institution' | 'blog';
  entityId: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  focusKeywords?: string[];
  isAiGenerated: boolean;
  aiModel?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Course {
  id: string;
  title: string;
  subject: string;
  level?: string;
}

interface Institution {
  id: string;
  name: string;
  country?: string;
}

export function AdminSeoPanel() {
  const { toast } = useToast();
  const [entityType, setEntityType] = useState<'course' | 'institution'>('course');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatedSeo, setGeneratedSeo] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingMetaTitle, setEditingMetaTitle] = useState("");
  const [editingMetaDescription, setEditingMetaDescription] = useState("");
  const [editingKeywords, setEditingKeywords] = useState("");

  const { data: seoEntries, isLoading: loadingSeo } = useQuery<SeoMetadata[]>({
    queryKey: ["/api/admin/seo"],
  });

  const { data: coursesData } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    enabled: entityType === 'course',
  });

  const { data: institutionsData } = useQuery<Institution[]>({
    queryKey: ["/api/institutions"],
    enabled: entityType === 'institution',
  });

  const generateMutation = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: string; entityId: string }) => {
      const response = await apiRequest('POST', '/api/admin/seo/generate', { entityType, entityId });
      return response.json();
    },
    onSuccess: (data: any) => {
      setGeneratedSeo(data);
      setEditingMetaTitle(data.metaTitle || '');
      setEditingMetaDescription(data.metaDescription || '');
      setEditingKeywords(data.focusKeywords?.join(', ') || '');
      setShowPreviewDialog(true);
      toast({
        title: "SEO Generated",
        description: "AI-generated SEO metadata is ready for review",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/seo', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo"] });
      setShowPreviewDialog(false);
      setGeneratedSeo(null);
      toast({
        title: "SEO Saved",
        description: "SEO metadata saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/seo/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo"] });
      toast({
        title: "Approved",
        description: "SEO metadata approved and now active",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/seo/${id}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo"] });
      toast({
        title: "Rejected",
        description: "SEO metadata rejected",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/seo/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo"] });
      toast({
        title: "Deleted",
        description: "SEO metadata deleted",
      });
    },
  });

  const filteredCourses = coursesData?.filter(c => 
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 20) || [];

  const filteredInstitutions = institutionsData?.filter(i => 
    i.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 20) || [];

  const handleGenerate = () => {
    if (!selectedEntity) {
      toast({
        title: "Select Entity",
        description: "Please select a course or institution first",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate({ entityType, entityId: selectedEntity });
  };

  const handleSave = () => {
    if (!generatedSeo) return;
    
    saveMutation.mutate({
      entityType: generatedSeo.entityType,
      entityId: generatedSeo.entityId,
      metaTitle: editingMetaTitle,
      metaDescription: editingMetaDescription,
      ogTitle: editingMetaTitle,
      ogDescription: editingMetaDescription,
      focusKeywords: editingKeywords.split(',').map((k: string) => k.trim()).filter(Boolean),
      isAiGenerated: generatedSeo.isAiGenerated,
      aiModel: generatedSeo.aiModel,
      aiPrompt: generatedSeo.aiPrompt,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SEO Management</h2>
          <p className="text-muted-foreground">Generate and manage AI-powered SEO metadata for courses and institutions</p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate" data-testid="tab-seo-generate">Generate SEO</TabsTrigger>
          <TabsTrigger value="manage" data-testid="tab-seo-manage">Manage SEO ({seoEntries?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI SEO Generator
              </CardTitle>
              <CardDescription>
                Generate optimized meta titles and descriptions using AI for better search engine visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select value={entityType} onValueChange={(v) => { setEntityType(v as any); setSelectedEntity(null); }}>
                    <SelectTrigger data-testid="select-entity-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="institution">Institution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Search {entityType === 'course' ? 'Courses' : 'Institutions'}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${entityType}s...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-entity"
                    />
                  </div>
                </div>
              </div>

              {searchQuery && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {entityType === 'course' ? (
                    filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => (
                        <div
                          key={course.id}
                          className={`p-3 cursor-pointer hover-elevate transition-colors ${selectedEntity === course.id ? 'bg-primary/10' : ''}`}
                          onClick={() => setSelectedEntity(course.id)}
                          data-testid={`select-course-${course.id}`}
                        >
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-muted-foreground">{course.subject} {course.level && `• ${course.level}`}</p>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-muted-foreground">No courses found</p>
                    )
                  ) : (
                    filteredInstitutions.length > 0 ? (
                      filteredInstitutions.map((inst) => (
                        <div
                          key={inst.id}
                          className={`p-3 cursor-pointer hover-elevate transition-colors ${selectedEntity === inst.id ? 'bg-primary/10' : ''}`}
                          onClick={() => setSelectedEntity(inst.id)}
                          data-testid={`select-institution-${inst.id}`}
                        >
                          <p className="font-medium">{inst.name}</p>
                          <p className="text-sm text-muted-foreground">{inst.country}</p>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-muted-foreground">No institutions found</p>
                    )
                  )}
                </div>
              )}

              {selectedEntity && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Selected: {
                    entityType === 'course' 
                      ? coursesData?.find(c => c.id === selectedEntity)?.title
                      : institutionsData?.find(i => i.id === selectedEntity)?.name
                  }</p>
                </div>
              )}

              <Button 
                onClick={handleGenerate} 
                disabled={!selectedEntity || generateMutation.isPending}
                className="w-full"
                data-testid="button-generate-seo"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate SEO with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO Metadata Entries</CardTitle>
              <CardDescription>Review and manage generated SEO metadata</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSeo ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : seoEntries && seoEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity</TableHead>
                      <TableHead>Meta Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>AI Generated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seoEntries.map((entry) => (
                      <TableRow key={entry.id} data-testid={`seo-entry-${entry.id}`}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{entry.entityType}</Badge>
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]">{entry.entityId}</p>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="font-medium truncate">{entry.metaTitle}</p>
                          <p className="text-xs text-muted-foreground truncate">{entry.metaDescription}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell>
                          {entry.isAiGenerated ? (
                            <Badge variant="secondary" className="text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {entry.aiModel || 'AI'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Manual</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {entry.status === 'pending' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => approveMutation.mutate(entry.id)}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-${entry.id}`}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => rejectMutation.mutate(entry.id)}
                                  disabled={rejectMutation.isPending}
                                  data-testid={`button-reject-${entry.id}`}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(entry.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${entry.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No SEO metadata entries yet</p>
                  <p className="text-sm">Generate SEO metadata using the AI generator</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview & Edit SEO Metadata
            </DialogTitle>
            <DialogDescription>
              Review the AI-generated SEO content and make any adjustments before saving
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meta Title <span className="text-muted-foreground text-xs">({editingMetaTitle.length}/60 chars)</span></Label>
              <Input
                value={editingMetaTitle}
                onChange={(e) => setEditingMetaTitle(e.target.value)}
                maxLength={60}
                data-testid="input-meta-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Meta Description <span className="text-muted-foreground text-xs">({editingMetaDescription.length}/160 chars)</span></Label>
              <Textarea
                value={editingMetaDescription}
                onChange={(e) => setEditingMetaDescription(e.target.value)}
                maxLength={160}
                rows={3}
                data-testid="input-meta-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Focus Keywords <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
              <Input
                value={editingKeywords}
                onChange={(e) => setEditingKeywords(e.target.value)}
                placeholder="keyword1, keyword2, keyword3"
                data-testid="input-keywords"
              />
            </div>

            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Google Search Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-blue-600 text-lg hover:underline cursor-pointer">{editingMetaTitle || 'No title'}</p>
                  <p className="text-green-700 text-sm">anzglobal.com.au › courses</p>
                  <p className="text-sm text-muted-foreground">{editingMetaDescription || 'No description'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-seo">
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save SEO Metadata'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
