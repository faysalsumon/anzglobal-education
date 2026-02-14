import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, Plus, Edit, Trash2, Phone, Building2, Search, Loader2, Globe, QrCode, Download, Printer, Copy } from "lucide-react";

interface Region {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  regionId: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  displayOrder: number | null;
  isActive: boolean;
  isHeadquarters: boolean;
  createdAt: string | null;
  region?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const branchFormSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  code: z.string().min(1, "Branch code is required").max(20, "Code must be 20 characters or less"),
  regionId: z.string().min(1, "Region is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  isHeadquarters: z.boolean().default(false),
});

type BranchFormData = z.infer<typeof branchFormSchema>;

const defaultFormValues: BranchFormData = {
  name: "",
  code: "",
  regionId: "",
  address: "",
  city: "",
  state: "",
  postcode: "",
  phone: "",
  email: "",
  isActive: true,
  isHeadquarters: false,
};

export function AdminBranchesPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrBranch, setQrBranch] = useState<Branch | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (qrBranch) {
      const url = `${window.location.origin}/auth?mode=signup&source=walk_in&branch_id=${qrBranch.id}`;
      QRCode.toDataURL(url, { width: 256, margin: 2 })
        .then((dataUrl: string) => setQrDataUrl(dataUrl))
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [qrBranch]);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/admin/branches"],
  });

  const { data: regions = [], isLoading: regionsLoading } = useQuery<Region[]>({
    queryKey: ["/api/admin/regions"],
  });

  const activeRegions = regions.filter(r => r.isActive);

  const createMutation = useMutation({
    mutationFn: async (data: BranchFormData) => {
      return apiRequest("POST", "/api/admin/branches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches"] });
      setDialogOpen(false);
      form.reset(defaultFormValues);
      setEditingBranch(null);
      toast({ title: "Branch created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create branch", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BranchFormData> }) => {
      return apiRequest("PATCH", `/api/admin/branches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches"] });
      setDialogOpen(false);
      form.reset(defaultFormValues);
      setEditingBranch(null);
      toast({ title: "Branch updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update branch", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches"] });
      setDeleteDialogOpen(false);
      setDeletingBranch(null);
      toast({ title: "Branch deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete branch", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditingBranch(null);
    form.reset(defaultFormValues);
    setDialogOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    form.reset({
      name: branch.name,
      code: branch.code,
      regionId: branch.regionId || "",
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      postcode: branch.postcode || "",
      phone: branch.phone || "",
      email: branch.email || "",
      isActive: branch.isActive,
      isHeadquarters: branch.isHeadquarters,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (branch: Branch) => {
    setDeletingBranch(branch);
    setDeleteDialogOpen(true);
  };

  const onSubmit = (data: BranchFormData) => {
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleConfirmDelete = () => {
    if (deletingBranch) {
      deleteMutation.mutate(deletingBranch.id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setDialogOpen(false);
      setEditingBranch(null);
      form.reset(defaultFormValues);
    } else {
      setDialogOpen(true);
    }
  };

  const filteredBranches = branches.filter(branch => {
    const query = searchQuery.toLowerCase();
    return (
      branch.name.toLowerCase().includes(query) ||
      branch.code.toLowerCase().includes(query) ||
      (branch.region?.name?.toLowerCase().includes(query) || false) ||
      (branch.city?.toLowerCase().includes(query) || false)
    );
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Branch Management
            </CardTitle>
            <CardDescription>
              Manage your office locations and branches worldwide
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} data-testid="button-create-branch">
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-branches"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-branches">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="empty-branches">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No branches found</p>
              <p className="text-sm">Create your first branch to get started</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((branch) => (
                    <TableRow key={branch.id} data-testid={`row-branch-${branch.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span data-testid={`text-branch-name-${branch.id}`}>{branch.name}</span>
                          {branch.isHeadquarters && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-hq-${branch.id}`}>HQ</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`text-branch-code-${branch.id}`}>{branch.code}</Badge>
                      </TableCell>
                      <TableCell data-testid={`text-branch-region-${branch.id}`}>
                        {branch.region ? (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span>{branch.region.name}</span>
                            <Badge variant="outline" className="text-xs ml-1">{branch.region.code}</Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-branch-city-${branch.id}`}>{branch.city || "-"}</TableCell>
                      <TableCell>
                        {branch.phone ? (
                          <div className="flex items-center gap-1 text-sm" data-testid={`text-branch-phone-${branch.id}`}>
                            <Phone className="h-3 w-3" />
                            {branch.phone}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={branch.isActive ? "default" : "secondary"}
                          data-testid={`badge-status-${branch.id}`}
                        >
                          {branch.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setQrBranch(branch);
                              setQrDialogOpen(true);
                            }}
                            data-testid={`button-qr-branch-${branch.id}`}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(branch)}
                            data-testid={`button-edit-branch-${branch.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(branch)}
                            data-testid={`button-delete-branch-${branch.id}`}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-branch">
              {editingBranch ? "Edit Branch" : "Add New Branch"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch 
                ? "Update the branch details below" 
                : "Enter the details for the new branch location"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Dhaka Office" 
                          {...field} 
                          data-testid="input-branch-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Code *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., DHK" 
                          maxLength={20}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          data-testid="input-branch-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={regionsLoading}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-branch-region">
                          <SelectValue placeholder={regionsLoading ? "Loading regions..." : "Select a region"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeRegions.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No regions available. Please create a region first.
                          </div>
                        ) : (
                          activeRegions.map((region) => (
                            <SelectItem key={region.id} value={region.id} data-testid={`option-region-${region.id}`}>
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <span>{region.name}</span>
                                <Badge variant="outline" className="text-xs">{region.code}</Badge>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Street address" 
                        {...field} 
                        data-testid="input-branch-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="City" 
                          {...field} 
                          data-testid="input-branch-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="State" 
                          {...field} 
                          data-testid="input-branch-state"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Postcode" 
                          {...field} 
                          data-testid="input-branch-postcode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+880 2 1234 5678" 
                          {...field} 
                          data-testid="input-branch-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="branch@example.com" 
                          {...field} 
                          data-testid="input-branch-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-branch-active"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isHeadquarters"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-branch-hq"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Headquarters</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDialogClose(false)}
                  disabled={isPending}
                  data-testid="button-cancel-branch"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending || activeRegions.length === 0} 
                  data-testid="button-save-branch"
                >
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingBranch ? "Update Branch" : "Create Branch"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="dialog-title-delete-branch">Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the branch "{deletingBranch?.name}"? 
              This action cannot be undone. Users assigned to this branch will have their branch assignment removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteMutation.isPending}
              data-testid="button-cancel-delete-branch"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-branch"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Branch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={qrDialogOpen} onOpenChange={(open) => {
        setQrDialogOpen(open);
        if (!open) {
          setQrBranch(null);
        }
      }}>
        <DialogContent className="max-w-md" data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code - {qrBranch?.name}
            </DialogTitle>
            <DialogDescription>
              {[qrBranch?.city, qrBranch?.state, qrBranch?.country].filter(Boolean).join(", ") || "Walk-in registration QR code"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${qrBranch?.name}`}
                width={256}
                height={256}
                className="rounded-md border"
              />
            ) : (
              <div className="flex items-center justify-center" style={{ width: 256, height: 256 }}>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center break-all select-all px-4">
              {qrBranch ? `${window.location.origin}/auth?mode=signup&source=walk_in&branch_id=${qrBranch.id}` : ""}
            </p>
          </div>

          <DialogFooter className="flex flex-row flex-wrap justify-center gap-2 sm:justify-center">
            <Button
              variant="outline"
              onClick={() => {
                if (qrDataUrl && qrBranch) {
                  const link = document.createElement("a");
                  link.download = `qr-branch-${qrBranch.code}.png`;
                  link.href = qrDataUrl;
                  link.click();
                }
              }}
              disabled={!qrDataUrl}
              data-testid="button-download-qr"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (qrDataUrl && qrBranch) {
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head><title>QR Code - ${qrBranch.name}</title></head>
                        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
                          <h2>${qrBranch.name}</h2>
                          <p>${[qrBranch.city, qrBranch.state, qrBranch.country].filter(Boolean).join(", ")}</p>
                          <img src="${qrDataUrl}" width="256" height="256" />
                          <p style="font-size:12px;margin-top:16px;word-break:break-all;max-width:400px;text-align:center;">
                            ${window.location.origin}/auth?mode=signup&source=walk_in&branch_id=${qrBranch.id}
                          </p>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }
              }}
              disabled={!qrDataUrl}
              data-testid="button-print-qr"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print QR Code
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (qrBranch) {
                  const url = `${window.location.origin}/auth?mode=signup&source=walk_in&branch_id=${qrBranch.id}`;
                  navigator.clipboard.writeText(url).then(() => {
                    toast({ title: "Link copied to clipboard" });
                  });
                }
              }}
              data-testid="button-copy-qr-link"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
