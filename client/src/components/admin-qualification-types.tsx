/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  Plus, 
  Trash2, 
  Edit, 
  Sparkles, 
  ChevronDown, 
  Globe,
  Search,
  Loader2,
  Check,
  X
} from "lucide-react";
import type { AcademicQualificationType } from "@shared/schema";

const LEVEL_CATEGORIES = [
  { value: 'primary', label: 'Primary School' },
  { value: 'lower_secondary', label: 'Lower Secondary (Year 8-10)' },
  { value: 'upper_secondary', label: 'Upper Secondary (Year 11-12)' },
  { value: 'foundation', label: 'Foundation/Pathway' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'associate', label: 'Associate Degree' },
  { value: 'bachelor', label: 'Bachelor Degree' },
  { value: 'graduate_certificate', label: 'Graduate Certificate' },
  { value: 'graduate_diploma', label: 'Graduate Diploma' },
  { value: 'masters', label: 'Masters Degree' },
  { value: 'doctoral', label: 'Doctoral Degree' },
];

const COUNTRIES = [
  'Australia',
  'Bangladesh',
  'India',
  'United Kingdom',
  'Canada',
  'New Zealand',
  'Nepal',
  'Sri Lanka',
  'Pakistan',
  'China',
  'Vietnam',
  'Philippines',
  'Malaysia',
  'Indonesia',
  'Thailand',
];

interface QualificationFormData {
  country: string;
  countryCode?: string;
  name: string;
  fullName?: string;
  levelCategory: string;
  gradingScale?: string;
  gradingType?: string;
  minGrade?: string;
  displayOrder?: number;
}

export function AdminQualificationTypesPanel() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [editingQualification, setEditingQualification] = useState<AcademicQualificationType | null>(null);
  const [aiCountry, setAiCountry] = useState("");
  const [aiGeneratedQuals, setAiGeneratedQuals] = useState<QualificationFormData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState<QualificationFormData>({
    country: "",
    name: "",
    levelCategory: "",
  });

  // Fetch all qualifications grouped by country
  const { data: groupedQualifications, isLoading } = useQuery<Record<string, AcademicQualificationType[]>>({
    queryKey: ["/api/academic-qualifications/grouped"],
  });

  // Helper to invalidate all qualification-related queries
  const invalidateQualificationQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/academic-qualifications/grouped"] });
    queryClient.invalidateQueries({ queryKey: ["/api/academic-qualifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/course-level-requirements"] });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: QualificationFormData) => {
      const response = await apiRequest("POST", "/api/admin/academic-qualifications", data);
      return response.json();
    },
    onSuccess: () => {
      invalidateQualificationQueries();
      toast({ title: "Qualification type created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error creating qualification", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QualificationFormData> }) => {
      const response = await apiRequest("PATCH", `/api/admin/academic-qualifications/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      invalidateQualificationQueries();
      toast({ title: "Qualification type updated successfully" });
      setIsEditDialogOpen(false);
      setEditingQualification(null);
    },
    onError: (error: any) => {
      toast({ title: "Error updating qualification", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/academic-qualifications/${id}`);
      return response.json();
    },
    onSuccess: () => {
      invalidateQualificationQueries();
      toast({ title: "Qualification type deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting qualification", description: error.message, variant: "destructive" });
    },
  });

  // Bulk create mutation for AI generated qualifications
  const bulkCreateMutation = useMutation({
    mutationFn: async (qualifications: QualificationFormData[]) => {
      let successCount = 0;
      for (const qual of qualifications) {
        try {
          await apiRequest("POST", "/api/admin/academic-qualifications", qual);
          successCount++;
        } catch (e) {
          console.error("Failed to create qualification:", qual.name, e);
        }
      }
      return successCount;
    },
    onSuccess: (successCount) => {
      invalidateQualificationQueries();
      toast({ title: `Successfully added ${successCount} qualification types` });
      setIsAIDialogOpen(false);
      setAiGeneratedQuals([]);
      setAiCountry("");
    },
    onError: (error: any) => {
      toast({ title: "Error adding qualifications", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      country: "",
      name: "",
      levelCategory: "",
    });
  };

  const handleEdit = (qual: AcademicQualificationType) => {
    setEditingQualification(qual);
    setFormData({
      country: qual.country,
      countryCode: qual.countryCode || "",
      name: qual.name,
      fullName: qual.fullName || "",
      levelCategory: qual.levelCategory,
      gradingScale: qual.gradingScale || "",
      gradingType: qual.gradingType || "",
      minGrade: qual.minGrade || "",
      displayOrder: qual.displayOrder || 0,
    });
    setIsEditDialogOpen(true);
  };

  const handleAIGenerate = async () => {
    if (!aiCountry) {
      toast({ title: "Please select a country", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/admin/academic-qualifications/generate", { country: aiCountry });
      const data = await response.json();
      setAiGeneratedQuals(data.qualifications || []);
    } catch (error: any) {
      toast({ title: "Error generating qualifications", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const removeGeneratedQual = (index: number) => {
    setAiGeneratedQuals(prev => prev.filter((_, i) => i !== index));
  };

  // Filter qualifications
  const filteredQualifications = useMemo(() => {
    if (!groupedQualifications) return {};
    
    const filtered: Record<string, AcademicQualificationType[]> = {};
    
    for (const [country, quals] of Object.entries(groupedQualifications)) {
      if (selectedCountry !== "all" && country !== selectedCountry) continue;
      
      const filteredQuals = quals.filter(q => 
        searchQuery === "" ||
        q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (filteredQuals.length > 0) {
        filtered[country] = filteredQuals;
      }
    }
    
    return filtered;
  }, [groupedQualifications, selectedCountry, searchQuery]);

  const totalCount = useMemo(() => {
    return Object.values(groupedQualifications || {}).reduce((sum, quals) => sum + quals.length, 0);
  }, [groupedQualifications]);

  const countriesInData = useMemo(() => {
    return Object.keys(groupedQualifications || {}).sort();
  }, [groupedQualifications]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Qualification Types Management
              </CardTitle>
              <CardDescription>
                Manage academic qualification types for different countries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAIDialogOpen(true)}
                variant="default"
                data-testid="button-ai-generate-country"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Add Country (AI)
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
                data-testid="button-add-qualification"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Qualification
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search qualifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-qualifications"
              />
            </div>
            
            {/* Country Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter:</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-country">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries ({totalCount})</SelectItem>
                  {countriesInData.map(country => (
                    <SelectItem key={country} value={country}>
                      {country} ({groupedQualifications?.[country]?.length || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications by Country */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading qualifications...</p>
          </CardContent>
        </Card>
      ) : Object.keys(filteredQualifications).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No qualification types found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Add Country (AI)" to automatically generate qualifications for a country
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredQualifications).map(([country, quals]) => (
            <Collapsible key={country} defaultOpen>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4" />
                        {country}
                        <Badge variant="secondary" className="ml-2">{quals.length}</Badge>
                      </CardTitle>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Grading</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quals.map((qual) => (
                          <TableRow key={qual.id} data-testid={`qualification-row-${qual.id}`}>
                            <TableCell className="font-medium">{qual.name}</TableCell>
                            <TableCell className="text-muted-foreground">{qual.fullName || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {LEVEL_CATEGORIES.find(l => l.value === qual.levelCategory)?.label || qual.levelCategory}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {qual.gradingType && qual.gradingScale ? (
                                <span>{qual.gradingType}: {qual.gradingScale}</span>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEdit(qual)}
                                  data-testid={`button-edit-qual-${qual.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm("Delete this qualification type?")) {
                                      deleteMutation.mutate(qual.id);
                                    }
                                  }}
                                  data-testid={`button-delete-qual-${qual.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingQualification(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Edit Qualification Type" : "Add Qualification Type"}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen 
                ? "Update the qualification type details" 
                : "Add a new academic qualification type"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country *</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                >
                  <SelectTrigger data-testid="select-qual-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Level Category *</Label>
                <Select 
                  value={formData.levelCategory} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, levelCategory: value }))}
                >
                  <SelectTrigger data-testid="select-qual-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_CATEGORIES.map(level => (
                      <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Short Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., HSC, A-Levels, ATAR"
                data-testid="input-qual-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.fullName || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="e.g., Higher Secondary Certificate"
                data-testid="input-qual-fullname"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grading Type</Label>
                <Select 
                  value={formData.gradingType || ""} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gradingType: value }))}
                >
                  <SelectTrigger data-testid="select-qual-grading-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpa">GPA</SelectItem>
                    <SelectItem value="cgpa">CGPA</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="grades">Letter Grades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grading Scale</Label>
                <Input
                  value={formData.gradingScale || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, gradingScale: e.target.value }))}
                  placeholder="e.g., 5.0, 4.0, 100"
                  data-testid="input-qual-grading-scale"
                />
              </div>
            </div>
            
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setEditingQualification(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!formData.country || !formData.name || !formData.levelCategory) {
                  toast({ title: "Please fill in required fields", variant: "destructive" });
                  return;
                }
                
                if (isEditDialogOpen && editingQualification) {
                  updateMutation.mutate({ id: editingQualification.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-qualification"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isEditDialogOpen ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Country Dialog */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Add Country with AI
            </DialogTitle>
            <DialogDescription>
              Select a country and AI will automatically generate all relevant qualification types
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="mb-2 block">Select Country</Label>
                <Select value={aiCountry} onValueChange={setAiCountry}>
                  <SelectTrigger data-testid="select-ai-country">
                    <SelectValue placeholder="Choose a country..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAIGenerate}
                disabled={!aiCountry || isGenerating}
                className="mt-6"
                data-testid="button-generate-qualifications"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
            </div>
            
            {aiGeneratedQuals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Generated Qualifications ({aiGeneratedQuals.length})</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAiGeneratedQuals([])}
                  >
                    Clear All
                  </Button>
                </div>
                
                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  {aiGeneratedQuals.map((qual, index) => (
                    <div key={index} className="p-3 flex items-center justify-between gap-4 hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{qual.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {LEVEL_CATEGORIES.find(l => l.value === qual.levelCategory)?.label || qual.levelCategory}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {qual.fullName}
                          {qual.gradingType && ` • ${qual.gradingType}: ${qual.gradingScale}`}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeGeneratedQual(index)}
                        data-testid={`button-remove-generated-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAIDialogOpen(false);
              setAiGeneratedQuals([]);
              setAiCountry("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkCreateMutation.mutate(aiGeneratedQuals)}
              disabled={aiGeneratedQuals.length === 0 || bulkCreateMutation.isPending}
              data-testid="button-add-all-qualifications"
            >
              {bulkCreateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Add All ({aiGeneratedQuals.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
