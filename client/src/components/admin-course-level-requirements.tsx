import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Sparkles, ChevronDown, ChevronRight, FileCheck, Filter, Loader2, AlertCircle } from "lucide-react";
import type { CourseLevelRequirementTemplate, AcademicQualificationType } from "@shared/schema";

const COURSE_LEVELS = [
  "VCE (11-12)",
  "Certificate I",
  "Certificate II", 
  "Certificate III",
  "Certificate IV",
  "Diploma",
  "Advanced Diploma",
  "Associate Degree",
  "Graduate Certificate",
  "Graduate Diploma",
  "Bachelor Degree",
  "Bachelor Honours",
  "Masters Degree",
  "Doctoral Degree",
  "Higher Doctoral Degree",
  "Foundation",
  "Pathway Program",
];

const INSTITUTION_COUNTRIES = [
  "Australia",
  "New Zealand",
  "United Kingdom",
  "Canada",
  "United States",
  "Malaysia",
  "Singapore",
];

interface TemplateWithQualification extends CourseLevelRequirementTemplate {
  qualification: AcademicQualificationType;
}

interface TemplateFormData {
  courseLevel: string;
  institutionCountry: string;
  qualificationTypeId: string;
  minGrade: string;
  displayLabel: string;
  displayOrder: number;
  isDefault: boolean;
}

export function AdminCourseLevelRequirementsPanel() {
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>("all");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("all");
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set(["Bachelor Degree", "Masters Degree", "Diploma"]));
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithQualification | null>(null);
  
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiCountry, setAiCountry] = useState("");
  const [aiLevel, setAiLevel] = useState("");
  const [aiGeneratedTemplates, setAiGeneratedTemplates] = useState<TemplateFormData[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const [formData, setFormData] = useState<TemplateFormData>({
    courseLevel: "",
    institutionCountry: "Australia",
    qualificationTypeId: "",
    minGrade: "",
    displayLabel: "",
    displayOrder: 0,
    isDefault: false,
  });

  const { data: templates, isLoading } = useQuery<TemplateWithQualification[]>({
    queryKey: ["/api/admin/course-level-requirements/all"],
  });

  const { data: qualificationTypes } = useQuery<AcademicQualificationType[]>({
    queryKey: ["/api/academic-qualifications"],
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/course-level-requirements/all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/course-level-requirements"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const response = await apiRequest("POST", "/api/admin/course-level-requirements", data);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Template created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error creating template", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateFormData> }) => {
      const response = await apiRequest("PATCH", `/api/admin/course-level-requirements/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Template updated successfully" });
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast({ title: "Error updating template", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/course-level-requirements/${id}`);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Template deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (templates: TemplateFormData[]) => {
      let successCount = 0;
      for (const template of templates) {
        try {
          await apiRequest("POST", "/api/admin/course-level-requirements", template);
          successCount++;
        } catch (e) {
          console.error("Failed to create template:", e);
        }
      }
      return successCount;
    },
    onSuccess: (successCount) => {
      invalidateQueries();
      toast({ title: `Successfully added ${successCount} templates` });
      setIsAIDialogOpen(false);
      setAiGeneratedTemplates([]);
      setAiCountry("");
      setAiLevel("");
    },
    onError: (error: any) => {
      toast({ title: "Error adding templates", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      courseLevel: "",
      institutionCountry: "Australia",
      qualificationTypeId: "",
      minGrade: "",
      displayLabel: "",
      displayOrder: 0,
      isDefault: false,
    });
  };

  const handleEdit = (template: TemplateWithQualification) => {
    setEditingTemplate(template);
    setFormData({
      courseLevel: template.courseLevel,
      institutionCountry: template.institutionCountry,
      qualificationTypeId: template.qualificationTypeId,
      minGrade: template.minGrade || "",
      displayLabel: template.displayLabel || "",
      displayOrder: template.displayOrder || 0,
      isDefault: template.isDefault || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleLevel = (level: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const handleGenerateAI = async () => {
    if (!aiCountry || !aiLevel) {
      toast({ title: "Please select both country and course level", variant: "destructive" });
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const response = await apiRequest("POST", "/api/admin/course-level-requirements/suggest", {
        institutionCountry: aiCountry,
        courseLevel: aiLevel,
      });
      const data = await response.json();
      setAiGeneratedTemplates(data.suggestions || []);
    } catch (error: any) {
      toast({ title: "Error generating suggestions", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const groupedTemplates = useMemo(() => {
    if (!templates) return {};
    
    const filtered = templates.filter(t => {
      const matchesSearch = searchTerm === "" || 
        t.qualification?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.qualification?.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.displayLabel?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCountry = selectedCountryFilter === "all" || t.institutionCountry === selectedCountryFilter;
      const matchesLevel = selectedLevelFilter === "all" || t.courseLevel === selectedLevelFilter;
      return matchesSearch && matchesCountry && matchesLevel;
    });
    
    const grouped: Record<string, Record<string, TemplateWithQualification[]>> = {};
    for (const template of filtered) {
      if (!grouped[template.courseLevel]) {
        grouped[template.courseLevel] = {};
      }
      if (!grouped[template.courseLevel][template.institutionCountry]) {
        grouped[template.courseLevel][template.institutionCountry] = [];
      }
      grouped[template.courseLevel][template.institutionCountry].push(template);
    }
    return grouped;
  }, [templates, searchTerm, selectedCountryFilter, selectedLevelFilter]);

  const qualificationsByCountry = useMemo(() => {
    if (!qualificationTypes) return {};
    const grouped: Record<string, AcademicQualificationType[]> = {};
    for (const q of qualificationTypes) {
      if (!grouped[q.country]) grouped[q.country] = [];
      grouped[q.country].push(q);
    }
    return grouped;
  }, [qualificationTypes]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Entry Requirement Templates
              </CardTitle>
              <CardDescription>
                Link qualification types to course levels with default minimum grades. These templates appear when editing course entry requirements.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAIDialogOpen(true)}
                data-testid="button-ai-suggest-templates"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Suggest
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                data-testid="button-add-template"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search qualifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                data-testid="input-search-templates"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCountryFilter} onValueChange={setSelectedCountryFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-country-filter">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {INSTITUTION_COUNTRIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLevelFilter} onValueChange={setSelectedLevelFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-level-filter">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {COURSE_LEVELS.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && Object.keys(groupedTemplates).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No templates found.</p>
              <p className="text-sm">Use "AI Suggest" to generate templates or add them manually.</p>
            </div>
          )}

          {!isLoading && Object.entries(groupedTemplates).sort(([a], [b]) => {
            const order = COURSE_LEVELS.indexOf(a) - COURSE_LEVELS.indexOf(b);
            return order !== 0 ? order : a.localeCompare(b);
          }).map(([level, countriesData]) => (
            <div key={level} className="border rounded-lg">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                onClick={() => toggleLevel(level)}
                data-testid={`toggle-level-${level.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center gap-2">
                  {expandedLevels.has(level) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{level}</span>
                  <Badge variant="secondary" className="text-xs">
                    {Object.values(countriesData).flat().length} templates
                  </Badge>
                </div>
              </button>
              
              {expandedLevels.has(level) && (
                <div className="border-t">
                  {Object.entries(countriesData).sort(([a], [b]) => a.localeCompare(b)).map(([country, countryTemplates]) => (
                    <div key={`${level}-${country}`} className="border-b last:border-b-0">
                      <div className="px-4 py-2 bg-muted/30">
                        <span className="text-sm font-medium">{country}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {countryTemplates.length}
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Qualification</TableHead>
                            <TableHead>Source Country</TableHead>
                            <TableHead>Min Grade</TableHead>
                            <TableHead>Display Label</TableHead>
                            <TableHead className="w-[80px] text-center">Default</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {countryTemplates.map((template) => (
                            <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                              <TableCell className="font-medium">
                                {template.qualification?.name || "Unknown"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {template.qualification?.country || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell>{template.minGrade || "-"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {template.displayLabel || "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                {template.isDefault && (
                                  <Badge variant="secondary" className="text-xs">Yes</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEdit(template)}
                                    data-testid={`button-edit-template-${template.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDelete(template.id)}
                                    data-testid={`button-delete-template-${template.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Entry Requirement Template</DialogTitle>
            <DialogDescription>
              Link a qualification type to a course level with a default minimum grade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Course Level *</Label>
                <Select value={formData.courseLevel} onValueChange={(v) => setFormData(p => ({ ...p, courseLevel: v }))}>
                  <SelectTrigger data-testid="select-course-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_LEVELS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Institution Country *</Label>
                <Select value={formData.institutionCountry} onValueChange={(v) => setFormData(p => ({ ...p, institutionCountry: v }))}>
                  <SelectTrigger data-testid="select-institution-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTION_COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Qualification Type *</Label>
              <Select value={formData.qualificationTypeId} onValueChange={(v) => setFormData(p => ({ ...p, qualificationTypeId: v }))}>
                <SelectTrigger data-testid="select-qualification-type">
                  <SelectValue placeholder="Select qualification" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(qualificationsByCountry).map(([country, quals]) => (
                    <div key={country}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">{country}</div>
                      {quals.map(q => (
                        <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Grade</Label>
                <Input
                  placeholder="e.g., ATAR 65, GPA 3.0"
                  value={formData.minGrade}
                  onChange={(e) => setFormData(p => ({ ...p, minGrade: e.target.value }))}
                  data-testid="input-min-grade"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData(p => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))}
                  data-testid="input-display-order"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Display Label</Label>
              <Input
                placeholder="e.g., Year 12 with ATAR 65"
                value={formData.displayLabel}
                onChange={(e) => setFormData(p => ({ ...p, displayLabel: e.target.value }))}
                data-testid="input-display-label"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData(p => ({ ...p, isDefault: !!checked }))}
                data-testid="checkbox-is-default"
              />
              <Label htmlFor="isDefault" className="text-sm">Auto-select when creating courses</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.courseLevel || !formData.qualificationTypeId || createMutation.isPending}
              data-testid="button-save-template"
            >
              {createMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Entry Requirement Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Course Level</Label>
                <Select value={formData.courseLevel} onValueChange={(v) => setFormData(p => ({ ...p, courseLevel: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_LEVELS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Institution Country</Label>
                <Select value={formData.institutionCountry} onValueChange={(v) => setFormData(p => ({ ...p, institutionCountry: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTION_COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Grade</Label>
                <Input
                  placeholder="e.g., ATAR 65, GPA 3.0"
                  value={formData.minGrade}
                  onChange={(e) => setFormData(p => ({ ...p, minGrade: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData(p => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Display Label</Label>
              <Input
                placeholder="e.g., Year 12 with ATAR 65"
                value={formData.displayLabel}
                onChange={(e) => setFormData(p => ({ ...p, displayLabel: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefaultEdit"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData(p => ({ ...p, isDefault: !!checked }))}
              />
              <Label htmlFor="isDefaultEdit" className="text-sm">Auto-select when creating courses</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editingTemplate && updateMutation.mutate({ id: editingTemplate.id, data: formData })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Suggest Templates
            </DialogTitle>
            <DialogDescription>
              Generate entry requirement templates based on course level and institution country.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Institution Country *</Label>
                <Select value={aiCountry} onValueChange={setAiCountry}>
                  <SelectTrigger data-testid="select-ai-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTION_COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Course Level *</Label>
                <Select value={aiLevel} onValueChange={setAiLevel}>
                  <SelectTrigger data-testid="select-ai-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_LEVELS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button
              onClick={handleGenerateAI}
              disabled={!aiCountry || !aiLevel || isGeneratingAI}
              className="w-full"
              data-testid="button-generate-ai-templates"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Suggestions
                </>
              )}
            </Button>

            {aiGeneratedTemplates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Generated Templates ({aiGeneratedTemplates.length})</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAiGeneratedTemplates([])}
                  >
                    Clear
                  </Button>
                </div>
                <div className="rounded-md border max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Qualification</TableHead>
                        <TableHead>Source Country</TableHead>
                        <TableHead>Min Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiGeneratedTemplates.map((t, idx) => {
                        const qual = qualificationTypes?.find(q => q.id === t.qualificationTypeId);
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{qual?.name || t.qualificationTypeId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{qual?.country || "-"}</Badge>
                            </TableCell>
                            <TableCell>{t.minGrade || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>Cancel</Button>
            {aiGeneratedTemplates.length > 0 && (
              <Button
                onClick={() => bulkCreateMutation.mutate(aiGeneratedTemplates)}
                disabled={bulkCreateMutation.isPending}
                data-testid="button-add-all-ai-templates"
              >
                {bulkCreateMutation.isPending ? "Adding..." : `Add All (${aiGeneratedTemplates.length})`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
