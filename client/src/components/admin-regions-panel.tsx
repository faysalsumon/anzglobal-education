import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Globe, Plane, Plus, Edit, Trash2, DollarSign, Languages } from "lucide-react";

interface Region {
  id: string;
  code: string;
  name: string;
  domainPattern: string;
  primaryDomain: string;
  defaultLocale: string;
  supportedLocales: string[];
  defaultCurrency: string;
  currencySymbol: string;
  timezone: string;
  flagEmoji: string;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
}

interface Pathway {
  id: string;
  code: string;
  name: string;
  description: string;
  requiresVisa: boolean;
  isActive: boolean;
  displayOrder: number;
}

interface CourseVariant {
  id: string;
  courseId: string;
  regionId: string;
  pathwayId: string | null;
  tuitionFee: string | null;
  applicationFee: string | null;
  currency: string;
  ieltsOverall: string | null;
  ieltsReading: string | null;
  ieltsWriting: string | null;
  ieltsSpeaking: string | null;
  ieltsListening: string | null;
  pteScore: string | null;
  toeflScore: string | null;
  academicRequirements: string | null;
  isActive: boolean;
  course?: { id: string; title: string };
  region?: { id: string; name: string; code: string };
  pathway?: { id: string; name: string; code: string };
}

export function AdminRegionsPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("regions");
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [pathwayDialogOpen, setPathwayDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [editingPathway, setEditingPathway] = useState<Pathway | null>(null);
  const [editingVariant, setEditingVariant] = useState<CourseVariant | null>(null);
  const [_selectedCourseId, _setSelectedCourseId] = useState<string>("");
  
  // State for region form switches
  const [regionIsActive, setRegionIsActive] = useState(true);
  const [regionIsDefault, setRegionIsDefault] = useState(false);
  
  // State for pathway form switches
  const [pathwayRequiresVisa, setPathwayRequiresVisa] = useState(true);
  const [pathwayIsActive, setPathwayIsActive] = useState(true);
  
  // State for variant form switches
  const [variantIsActive, setVariantIsActive] = useState(true);

  const { data: regions = [], isLoading: regionsLoading } = useQuery<Region[]>({
    queryKey: ["/api/admin/regions"],
  });

  const { data: pathways = [], isLoading: pathwaysLoading } = useQuery<Pathway[]>({
    queryKey: ["/api/admin/pathways"],
  });

  const { data: courses = [] } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ["/api/courses"],
  });

  const { data: courseVariants = [], isLoading: variantsLoading } = useQuery<CourseVariant[]>({
    queryKey: ["/api/admin/course-variants"],
  });

  const createRegionMutation = useMutation({
    mutationFn: async (data: Partial<Region>) => {
      return apiRequest("POST", "/api/admin/regions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regions"] });
      setRegionDialogOpen(false);
      setEditingRegion(null);
      toast({ title: "Region created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create region", description: error.message, variant: "destructive" });
    },
  });

  const updateRegionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Region> }) => {
      return apiRequest("PATCH", `/api/admin/regions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regions"] });
      setRegionDialogOpen(false);
      setEditingRegion(null);
      toast({ title: "Region updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update region", description: error.message, variant: "destructive" });
    },
  });

  const deleteRegionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/regions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regions"] });
      toast({ title: "Region deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete region", description: error.message, variant: "destructive" });
    },
  });

  const createPathwayMutation = useMutation({
    mutationFn: async (data: Partial<Pathway>) => {
      return apiRequest("POST", "/api/admin/pathways", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      setPathwayDialogOpen(false);
      setEditingPathway(null);
      toast({ title: "Pathway created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create pathway", description: error.message, variant: "destructive" });
    },
  });

  const createVariantMutation = useMutation({
    mutationFn: async (data: Partial<CourseVariant>) => {
      return apiRequest("POST", "/api/admin/course-variants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/course-variants"] });
      setVariantDialogOpen(false);
      setEditingVariant(null);
      toast({ title: "Course variant created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create course variant", description: error.message, variant: "destructive" });
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CourseVariant> }) => {
      return apiRequest("PATCH", `/api/admin/course-variants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/course-variants"] });
      setVariantDialogOpen(false);
      setEditingVariant(null);
      toast({ title: "Course variant updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update course variant", description: error.message, variant: "destructive" });
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/course-variants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/course-variants"] });
      toast({ title: "Course variant deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete course variant", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveRegion = (formData: FormData) => {
    const data = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      domainPattern: formData.get("domainPattern") as string,
      primaryDomain: formData.get("primaryDomain") as string,
      defaultLocale: formData.get("defaultLocale") as string,
      supportedLocales: (formData.get("supportedLocales") as string).split(",").map((s) => s.trim()),
      defaultCurrency: formData.get("defaultCurrency") as string,
      currencySymbol: formData.get("currencySymbol") as string,
      timezone: formData.get("timezone") as string,
      flagEmoji: formData.get("flagEmoji") as string,
      displayOrder: parseInt(formData.get("displayOrder") as string) || 1,
      isActive: regionIsActive,
      isDefault: regionIsDefault,
    };

    if (editingRegion) {
      updateRegionMutation.mutate({ id: editingRegion.id, data });
    } else {
      createRegionMutation.mutate(data);
    }
  };

  const handleSaveVariant = (formData: FormData) => {
    const data = {
      courseId: formData.get("courseId") as string,
      regionId: formData.get("regionId") as string,
      pathwayId: (formData.get("pathwayId") as string) || null,
      tuitionFee: formData.get("tuitionFee") as string || null,
      applicationFee: formData.get("applicationFee") as string || null,
      currency: formData.get("currency") as string || "AUD",
      ieltsOverall: formData.get("ieltsOverall") as string || null,
      ieltsReading: formData.get("ieltsReading") as string || null,
      ieltsWriting: formData.get("ieltsWriting") as string || null,
      ieltsSpeaking: formData.get("ieltsSpeaking") as string || null,
      ieltsListening: formData.get("ieltsListening") as string || null,
      pteScore: formData.get("pteScore") as string || null,
      toeflScore: formData.get("toeflScore") as string || null,
      academicRequirements: formData.get("academicRequirements") as string || null,
      isActive: variantIsActive,
    };

    if (editingVariant) {
      updateVariantMutation.mutate({ id: editingVariant.id, data });
    } else {
      createVariantMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Region Management</h2>
          <p className="text-muted-foreground">
            Manage global regions, student pathways, and course pricing variants
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="regions" className="gap-2" data-testid="tab-regions">
            <Globe className="h-4 w-4" />
            Regions
          </TabsTrigger>
          <TabsTrigger value="pathways" className="gap-2" data-testid="tab-pathways">
            <Plane className="h-4 w-4" />
            Pathways
          </TabsTrigger>
          <TabsTrigger value="variants" className="gap-2" data-testid="tab-variants">
            <DollarSign className="h-4 w-4" />
            Course Variants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Regions</CardTitle>
                <CardDescription>Geographic regions with currency and locale settings</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingRegion(null);
                  setRegionIsActive(true);
                  setRegionIsDefault(false);
                  setRegionDialogOpen(true);
                }}
                data-testid="button-add-region"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Region
              </Button>
            </CardHeader>
            <CardContent>
              {regionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading regions...</div>
              ) : regions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No regions configured</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Locale</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regions.map((region) => (
                      <TableRow key={region.id} data-testid={`row-region-${region.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{region.flagEmoji}</span>
                            <div>
                              <div className="font-medium">{region.name}</div>
                              <div className="text-sm text-muted-foreground">{region.code}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{region.primaryDomain}</div>
                            <div className="text-muted-foreground">{region.domainPattern}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {region.currencySymbol} {region.defaultCurrency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Languages className="h-3 w-3" />
                            {region.supportedLocales?.join(", ")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {region.isActive ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {region.isDefault && <Badge variant="outline">Default</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingRegion(region);
                                setRegionIsActive(region.isActive);
                                setRegionIsDefault(region.isDefault);
                                setRegionDialogOpen(true);
                              }}
                              data-testid={`button-edit-region-${region.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteRegionMutation.mutate(region.id)}
                              data-testid={`button-delete-region-${region.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pathways" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Student Pathways</CardTitle>
                <CardDescription>Onshore, offshore, and PR pathway configurations</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingPathway(null);
                  setPathwayRequiresVisa(true);
                  setPathwayIsActive(true);
                  setPathwayDialogOpen(true);
                }}
                data-testid="button-add-pathway"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pathway
              </Button>
            </CardHeader>
            <CardContent>
              {pathwaysLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading pathways...</div>
              ) : pathways.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No pathways configured</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pathway</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Visa Required</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pathways.map((pathway) => (
                      <TableRow key={pathway.id} data-testid={`row-pathway-${pathway.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{pathway.name}</div>
                            <div className="text-sm text-muted-foreground">{pathway.code}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{pathway.description}</TableCell>
                        <TableCell>
                          {pathway.requiresVisa ? (
                            <Badge className="bg-amber-500">Visa Required</Badge>
                          ) : (
                            <Badge variant="outline">No Visa</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {pathway.isActive ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingPathway(pathway);
                                setPathwayRequiresVisa(pathway.requiresVisa);
                                setPathwayIsActive(pathway.isActive);
                                setPathwayDialogOpen(true);
                              }}
                              data-testid={`button-edit-pathway-${pathway.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Course Regional Variants</CardTitle>
                <CardDescription>Region-specific pricing and requirements for courses</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingVariant(null);
                  setVariantIsActive(true);
                  setVariantDialogOpen(true);
                }}
                data-testid="button-add-variant"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </CardHeader>
            <CardContent>
              {variantsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading variants...</div>
              ) : courseVariants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No course variants configured. Add variants to customize pricing and requirements by region.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Pathway</TableHead>
                      <TableHead>Tuition Fee</TableHead>
                      <TableHead>IELTS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseVariants.map((variant) => (
                      <TableRow key={variant.id} data-testid={`row-variant-${variant.id}`}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {variant.course?.title || variant.courseId}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{variant.region?.code || variant.regionId}</Badge>
                        </TableCell>
                        <TableCell>
                          {variant.pathway ? (
                            <Badge variant="secondary">{variant.pathway.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">All</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {variant.tuitionFee ? (
                            <span>
                              {variant.currency} {parseFloat(variant.tuitionFee).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {variant.ieltsOverall ? (
                            <span>{variant.ieltsOverall}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {variant.isActive ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingVariant(variant);
                                setVariantIsActive(variant.isActive);
                                setVariantDialogOpen(true);
                              }}
                              data-testid={`button-edit-variant-${variant.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteVariantMutation.mutate(variant.id)}
                              data-testid={`button-delete-variant-${variant.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={regionDialogOpen} onOpenChange={setRegionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRegion ? "Edit Region" : "Add Region"}</DialogTitle>
            <DialogDescription>
              Configure region settings for domain, currency, and localization
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveRegion(new FormData(e.currentTarget));
            }}
          >
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Region Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="AU"
                  defaultValue={editingRegion?.code}
                  required
                  data-testid="input-region-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Region Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Australia"
                  defaultValue={editingRegion?.name}
                  required
                  data-testid="input-region-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryDomain">Primary Domain</Label>
                <Input
                  id="primaryDomain"
                  name="primaryDomain"
                  placeholder="anzglobal.com.au"
                  defaultValue={editingRegion?.primaryDomain}
                  required
                  data-testid="input-primary-domain"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domainPattern">Domain Pattern</Label>
                <Input
                  id="domainPattern"
                  name="domainPattern"
                  placeholder=".com.au"
                  defaultValue={editingRegion?.domainPattern}
                  required
                  data-testid="input-domain-pattern"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Input
                  id="defaultCurrency"
                  name="defaultCurrency"
                  placeholder="AUD"
                  defaultValue={editingRegion?.defaultCurrency}
                  required
                  data-testid="input-default-currency"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currencySymbol">Currency Symbol</Label>
                <Input
                  id="currencySymbol"
                  name="currencySymbol"
                  placeholder="A$"
                  defaultValue={editingRegion?.currencySymbol}
                  required
                  data-testid="input-currency-symbol"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLocale">Default Locale</Label>
                <Input
                  id="defaultLocale"
                  name="defaultLocale"
                  placeholder="en"
                  defaultValue={editingRegion?.defaultLocale}
                  required
                  data-testid="input-default-locale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportedLocales">Supported Locales (comma-separated)</Label>
                <Input
                  id="supportedLocales"
                  name="supportedLocales"
                  placeholder="en, bn"
                  defaultValue={editingRegion?.supportedLocales?.join(", ")}
                  required
                  data-testid="input-supported-locales"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  name="timezone"
                  placeholder="Australia/Sydney"
                  defaultValue={editingRegion?.timezone}
                  required
                  data-testid="input-timezone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flagEmoji">Flag Emoji</Label>
                <Input
                  id="flagEmoji"
                  name="flagEmoji"
                  placeholder="🇦🇺"
                  defaultValue={editingRegion?.flagEmoji}
                  data-testid="input-flag-emoji"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  name="displayOrder"
                  type="number"
                  defaultValue={editingRegion?.displayOrder || 1}
                  data-testid="input-display-order"
                />
              </div>
              <div className="flex items-center gap-6 col-span-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={regionIsActive}
                    onCheckedChange={setRegionIsActive}
                    data-testid="switch-is-active"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isDefault"
                    checked={regionIsDefault}
                    onCheckedChange={setRegionIsDefault}
                    data-testid="switch-is-default"
                  />
                  <Label htmlFor="isDefault">Default Region</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRegionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-region">
                {editingRegion ? "Update" : "Create"} Region
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pathwayDialogOpen} onOpenChange={setPathwayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPathway ? "Edit Pathway" : "Add Pathway"}</DialogTitle>
            <DialogDescription>Configure student pathway settings</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createPathwayMutation.mutate({
                code: formData.get("code") as string,
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                requiresVisa: pathwayRequiresVisa,
                isActive: pathwayIsActive,
                displayOrder: parseInt(formData.get("displayOrder") as string) || 1,
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pathway-code">Code</Label>
                <Input
                  id="pathway-code"
                  name="code"
                  placeholder="offshore"
                  defaultValue={editingPathway?.code}
                  required
                  data-testid="input-pathway-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pathway-name">Name</Label>
                <Input
                  id="pathway-name"
                  name="name"
                  placeholder="Offshore Student"
                  defaultValue={editingPathway?.name}
                  required
                  data-testid="input-pathway-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pathway-description">Description</Label>
                <Textarea
                  id="pathway-description"
                  name="description"
                  placeholder="Students applying from outside Australia"
                  defaultValue={editingPathway?.description}
                  data-testid="input-pathway-description"
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="requiresVisa"
                    checked={pathwayRequiresVisa}
                    onCheckedChange={setPathwayRequiresVisa}
                    data-testid="switch-requires-visa"
                  />
                  <Label htmlFor="requiresVisa">Requires Visa</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="pathway-isActive"
                    checked={pathwayIsActive}
                    onCheckedChange={setPathwayIsActive}
                    data-testid="switch-pathway-active"
                  />
                  <Label htmlFor="pathway-isActive">Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPathwayDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-pathway">
                {editingPathway ? "Update" : "Create"} Pathway
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit Course Variant" : "Add Course Variant"}</DialogTitle>
            <DialogDescription>
              Configure region-specific pricing and requirements for a course
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveVariant(new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courseId">Course</Label>
                  <Select name="courseId" defaultValue={editingVariant?.courseId}>
                    <SelectTrigger data-testid="select-course">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regionId">Region</Label>
                  <Select name="regionId" defaultValue={editingVariant?.regionId}>
                    <SelectTrigger data-testid="select-region">
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.flagEmoji} {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pathwayId">Pathway (Optional)</Label>
                  <Select name="pathwayId" defaultValue={editingVariant?.pathwayId || "all"}>
                    <SelectTrigger data-testid="select-pathway">
                      <SelectValue placeholder="All pathways" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pathways</SelectItem>
                      {pathways.map((pathway) => (
                        <SelectItem key={pathway.id} value={pathway.id}>
                          {pathway.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    name="currency"
                    placeholder="AUD"
                    defaultValue={editingVariant?.currency || "AUD"}
                    data-testid="input-variant-currency"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tuitionFee">Tuition Fee</Label>
                  <Input
                    id="tuitionFee"
                    name="tuitionFee"
                    type="number"
                    step="0.01"
                    placeholder="25000.00"
                    defaultValue={editingVariant?.tuitionFee || ""}
                    data-testid="input-tuition-fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationFee">Application Fee</Label>
                  <Input
                    id="applicationFee"
                    name="applicationFee"
                    type="number"
                    step="0.01"
                    placeholder="250.00"
                    defaultValue={editingVariant?.applicationFee || ""}
                    data-testid="input-application-fee"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">English Requirements</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ieltsOverall">IELTS Overall</Label>
                    <Input
                      id="ieltsOverall"
                      name="ieltsOverall"
                      placeholder="6.0"
                      defaultValue={editingVariant?.ieltsOverall || ""}
                      data-testid="input-ielts-overall"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pteScore">PTE Score</Label>
                    <Input
                      id="pteScore"
                      name="pteScore"
                      placeholder="50"
                      defaultValue={editingVariant?.pteScore || ""}
                      data-testid="input-pte-score"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toeflScore">TOEFL Score</Label>
                    <Input
                      id="toeflScore"
                      name="toeflScore"
                      placeholder="60"
                      defaultValue={editingVariant?.toeflScore || ""}
                      data-testid="input-toefl-score"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="ieltsReading">Reading</Label>
                    <Input
                      id="ieltsReading"
                      name="ieltsReading"
                      placeholder="5.5"
                      defaultValue={editingVariant?.ieltsReading || ""}
                      data-testid="input-ielts-reading"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ieltsWriting">Writing</Label>
                    <Input
                      id="ieltsWriting"
                      name="ieltsWriting"
                      placeholder="5.5"
                      defaultValue={editingVariant?.ieltsWriting || ""}
                      data-testid="input-ielts-writing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ieltsSpeaking">Speaking</Label>
                    <Input
                      id="ieltsSpeaking"
                      name="ieltsSpeaking"
                      placeholder="5.5"
                      defaultValue={editingVariant?.ieltsSpeaking || ""}
                      data-testid="input-ielts-speaking"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ieltsListening">Listening</Label>
                    <Input
                      id="ieltsListening"
                      name="ieltsListening"
                      placeholder="5.5"
                      defaultValue={editingVariant?.ieltsListening || ""}
                      data-testid="input-ielts-listening"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="academicRequirements">Academic Requirements</Label>
                <Textarea
                  id="academicRequirements"
                  name="academicRequirements"
                  placeholder="Minimum GPA, prerequisite courses, etc."
                  defaultValue={editingVariant?.academicRequirements || ""}
                  data-testid="input-academic-requirements"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="variant-isActive"
                  checked={variantIsActive}
                  onCheckedChange={setVariantIsActive}
                  data-testid="switch-variant-active"
                />
                <Label htmlFor="variant-isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVariantDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-variant">
                {editingVariant ? "Update" : "Create"} Variant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
