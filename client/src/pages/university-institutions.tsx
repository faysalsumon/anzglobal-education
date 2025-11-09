import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Plus, Edit, Trash2, CheckCircle, XCircle, Clock, AlertCircle, Sparkles, TrendingUp, School, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GooglePlacesAutocomplete } from "@/components/ui/google-places-autocomplete";

interface Institution {
  id: string;
  name: string;
  description: string | null;
  location: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  providerType: string | null;
  numberOfCampuses: number | null;
  establishedYear: number | null;
  scholarshipPercentage: number | null;
  approvalStatus: string;
  rejectionReason: string | null;
  isActive: boolean;
  createdAt: string | null;
}

const institutionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  providerType: z.string().optional(),
  numberOfCampuses: z.coerce.number().int().positive().optional().or(z.literal("")),
  establishedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().or(z.literal("")),
  scholarshipPercentage: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
});

export default function UniversityInstitutions() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null);

  const form = useForm<z.infer<typeof institutionSchema>>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      website: "",
      providerType: "",
    },
  });

  // Fetch institutions created by this user
  const { data: institutions, isLoading } = useQuery<Institution[]>({
    queryKey: ["/api/university/my-institutions"],
  });

  // Create institution mutation
  const createInstitutionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof institutionSchema>) => {
      return await apiRequest("POST", "/api/university/institutions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/university/my-institutions"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Institution submitted",
        description: "Your institution has been submitted for approval. You'll be notified once it's reviewed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create institution",
        variant: "destructive",
      });
    },
  });

  // Update institution mutation
  const updateInstitutionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof institutionSchema>> }) => {
      return await apiRequest("PATCH", `/api/university/institutions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/university/my-institutions"] });
      setDialogOpen(false);
      setEditingInstitution(null);
      form.reset();
      toast({
        title: "Institution updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update institution",
        variant: "destructive",
      });
    },
  });

  // Delete institution mutation
  const deleteInstitutionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/university/institutions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/university/my-institutions"] });
      setDeletingInstitution(null);
      toast({
        title: "Institution deleted",
        description: "The institution has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete institution",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    form.reset();
    setEditingInstitution(null);
    setDialogOpen(true);
  };

  const handleEdit = (institution: Institution) => {
    setEditingInstitution(institution);
    form.reset({
      name: institution.name,
      location: institution.location,
      description: institution.description || "",
      contactEmail: institution.contactEmail || "",
      contactPhone: institution.contactPhone || "",
      website: institution.website || "",
      providerType: institution.providerType || "",
      numberOfCampuses: institution.numberOfCampuses || ("" as any),
      establishedYear: institution.establishedYear || ("" as any),
      scholarshipPercentage: institution.scholarshipPercentage || ("" as any),
    });
    setDialogOpen(true);
  };

  const handleSubmit = (data: z.infer<typeof institutionSchema>) => {
    if (editingInstitution) {
      updateInstitutionMutation.mutate({ id: editingInstitution.id, data });
    } else {
      createInstitutionMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-600 text-white border-0"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter institutions
  const filteredInstitutions = institutions?.filter(institution => {
    const matchesStatus = statusFilter === "all" || institution.approvalStatus === statusFilter;
    const matchesSearch = searchQuery === "" || 
      institution.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      institution.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: institutions?.length || 0,
    approved: institutions?.filter(i => i.approvalStatus === "approved").length || 0,
    pending: institutions?.filter(i => i.approvalStatus === "pending").length || 0,
    rejected: institutions?.filter(i => i.approvalStatus === "rejected").length || 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-8 border border-primary/10">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                Institution Portal
              </h1>
              <p className="text-muted-foreground mt-1 text-lg">
                Manage your educational institutions with AI-powered platform
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">AI-Enhanced Experience</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <span className="text-muted-foreground">Real-time Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-primary/20 hover-elevate active-elevate-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Institutions</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <School className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all statuses</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-green-200 dark:border-green-900/30 hover-elevate active-elevate-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">Live on platform</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-yellow-200 dark:border-yellow-900/30 hover-elevate active-elevate-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-950/20" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-red-200 dark:border-red-900/30 hover-elevate active-elevate-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs revision</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="border-primary/10">
        <CardHeader className="border-b bg-gradient-to-r from-background to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Your Institutions</CardTitle>
              <CardDescription className="mt-1">Create and manage your educational institutions</CardDescription>
            </div>
            <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20" data-testid="button-create-institution">
              <Plus className="h-4 w-4" />
              Add Institution
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-institutions"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">✓ Approved</SelectItem>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="rejected">✗ Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-primary/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Institution</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Visibility</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-muted-foreground">Loading institutions...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInstitutions && filteredInstitutions.length > 0 ? (
                  filteredInstitutions.map((institution) => (
                    <TableRow key={institution.id} className="hover-elevate" data-testid={`row-institution-${institution.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold">{institution.name}</div>
                            {institution.providerType && (
                              <div className="text-xs text-muted-foreground mt-0.5">{institution.providerType}</div>
                            )}
                            {institution.approvalStatus === "rejected" && institution.rejectionReason && (
                              <div className="flex items-start gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-md p-2">
                                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>{institution.rejectionReason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{institution.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(institution.approvalStatus)}</TableCell>
                      <TableCell>
                        {institution.isActive ? (
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(institution)}
                            data-testid={`button-edit-${institution.id}`}
                            className="hover-elevate"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingInstitution(institution)}
                            data-testid={`button-delete-${institution.id}`}
                            className="hover-elevate text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-muted rounded-full">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {statusFilter !== "all" ? "No institutions found with this status" : "No institutions yet"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {statusFilter === "all" && "Click 'Add Institution' to get started"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {editingInstitution ? (
                <>
                  <Edit className="h-5 w-5 text-primary" />
                  Edit Institution
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  Add New Institution
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-base">
              {editingInstitution 
                ? "Update your institution details to keep your profile current"
                : "Create a new institution. It will be reviewed by our team before going live on the platform."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Institution Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., University of Sydney" data-testid="input-institution-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Location *</FormLabel>
                          <FormControl>
                            <GooglePlacesAutocomplete
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Start typing a city name..."
                              testId="input-location"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Brief description of your institution..." data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <School className="h-4 w-4" />
                    Institution Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="providerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Public University">Public University</SelectItem>
                              <SelectItem value="Private University">Private University</SelectItem>
                              <SelectItem value="TAFE">TAFE</SelectItem>
                              <SelectItem value="Private Institutions">Private Institutions</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="establishedYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Established Year</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="e.g., 1850" data-testid="input-established-year" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="numberOfCampuses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Campuses</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="e.g., 5" data-testid="input-number-campuses" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scholarshipPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scholarship %</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} min="0" max="100" placeholder="e.g., 20" data-testid="input-scholarship" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-3">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} placeholder="info@university.edu" data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+61 2 9999 9999" data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input type="url" {...field} placeholder="https://www.university.edu" data-testid="input-website" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInstitutionMutation.isPending || updateInstitutionMutation.isPending}
                  data-testid="button-save-institution"
                  className="gap-2"
                >
                  {createInstitutionMutation.isPending || updateInstitutionMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingInstitution ? "Save Changes" : "Submit for Approval"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingInstitution} onOpenChange={() => setDeletingInstitution(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Institution
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deletingInstitution?.name}"</span>? 
              This action cannot be undone and will also delete all associated courses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInstitution && deleteInstitutionMutation.mutate(deletingInstitution.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Institution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
