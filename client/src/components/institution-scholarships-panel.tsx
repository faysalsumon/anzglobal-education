import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, GraduationCap, Calendar, DollarSign, Link as LinkIcon } from "lucide-react";

type ScholarshipStatus = "open" | "not_open_yet" | "closed";
type ScholarshipValueType = "percentage" | "fixed";

interface Scholarship {
  id: string;
  institutionId: string;
  name: string;
  description: string | null;
  valueType: ScholarshipValueType;
  value: number;
  currency: string | null;
  status: ScholarshipStatus;
  startDate: string | null;
  endDate: string | null;
  eligibility: string | null;
  applicationUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ScholarshipFormData {
  name: string;
  description: string;
  valueType: ScholarshipValueType;
  value: string;
  currency: string;
  status: ScholarshipStatus;
  startDate: string;
  endDate: string;
  eligibility: string;
  applicationUrl: string;
}

const defaultFormData: ScholarshipFormData = {
  name: "",
  description: "",
  valueType: "percentage",
  value: "",
  currency: "AUD",
  status: "open",
  startDate: "",
  endDate: "",
  eligibility: "",
  applicationUrl: "",
};

const STATUS_LABELS: Record<ScholarshipStatus, string> = {
  open: "Open",
  not_open_yet: "Not Open Yet",
  closed: "Closed",
};

const STATUS_VARIANTS: Record<ScholarshipStatus, "default" | "secondary" | "destructive"> = {
  open: "default",
  not_open_yet: "secondary",
  closed: "destructive",
};

interface InstitutionScholarshipsPanelProps {
  institutionId: string;
  institutionName: string;
}

export function InstitutionScholarshipsPanel({ institutionId, institutionName }: InstitutionScholarshipsPanelProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [formData, setFormData] = useState<ScholarshipFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: scholarships = [], isLoading } = useQuery<Scholarship[]>({
    queryKey: ["/api/institutions", institutionId, "scholarships"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScholarshipFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        valueType: data.valueType,
        value: parseFloat(data.value) || 0,
        currency: data.valueType === "fixed" ? data.currency : null,
        status: data.status,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        eligibility: data.eligibility || null,
        applicationUrl: data.applicationUrl || null,
      };
      const response = await apiRequest("POST", `/api/admin/institutions/${institutionId}/scholarships`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institutions", institutionId, "scholarships"] });
      toast({ title: "Success", description: "Scholarship created successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create scholarship", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ScholarshipFormData }) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        valueType: data.valueType,
        value: parseFloat(data.value) || 0,
        currency: data.valueType === "fixed" ? data.currency : null,
        status: data.status,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        eligibility: data.eligibility || null,
        applicationUrl: data.applicationUrl || null,
      };
      const response = await apiRequest("PATCH", `/api/admin/scholarships/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institutions", institutionId, "scholarships"] });
      toast({ title: "Success", description: "Scholarship updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update scholarship", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/scholarships/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institutions", institutionId, "scholarships"] });
      toast({ title: "Success", description: "Scholarship deleted successfully" });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete scholarship", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingScholarship(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (scholarship: Scholarship) => {
    setEditingScholarship(scholarship);
    setFormData({
      name: scholarship.name,
      description: scholarship.description || "",
      valueType: scholarship.valueType,
      value: scholarship.value.toString(),
      currency: scholarship.currency || "AUD",
      status: scholarship.status,
      startDate: scholarship.startDate ? scholarship.startDate.split("T")[0] : "",
      endDate: scholarship.endDate ? scholarship.endDate.split("T")[0] : "",
      eligibility: scholarship.eligibility || "",
      applicationUrl: scholarship.applicationUrl || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required", variant: "destructive" });
      return;
    }
    if (!formData.value || parseFloat(formData.value) <= 0) {
      toast({ title: "Validation Error", description: "Value must be greater than 0", variant: "destructive" });
      return;
    }

    if (editingScholarship) {
      updateMutation.mutate({ id: editingScholarship.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatValue = (scholarship: Scholarship) => {
    if (scholarship.valueType === "percentage") {
      return `${scholarship.value}%`;
    }
    return `${scholarship.currency || "AUD"} ${scholarship.value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Scholarships
            </CardTitle>
            <CardDescription>
              Manage scholarships offered by {institutionName}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            data-testid="button-add-scholarship"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Scholarship
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground" data-testid="text-loading-scholarships">Loading scholarships...</p>
        ) : scholarships.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-scholarships">No scholarships added yet.</p>
        ) : (
          <div className="space-y-3" data-testid="list-scholarships">
            {scholarships.map((scholarship) => (
              <div
                key={scholarship.id}
                className="flex flex-wrap items-start justify-between gap-3 p-3 border rounded-md"
                data-testid={`scholarship-item-${scholarship.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm" data-testid={`scholarship-name-${scholarship.id}`}>
                      {scholarship.name}
                    </h4>
                    <Badge variant={STATUS_VARIANTS[scholarship.status]} data-testid={`scholarship-status-${scholarship.id}`}>
                      {STATUS_LABELS[scholarship.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1" data-testid={`scholarship-value-${scholarship.id}`}>
                      <DollarSign className="h-3 w-3" />
                      {formatValue(scholarship)}
                    </span>
                    {(scholarship.startDate || scholarship.endDate) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(scholarship.startDate)} - {formatDate(scholarship.endDate) || "Ongoing"}
                      </span>
                    )}
                  </div>
                  {scholarship.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {scholarship.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(scholarship)}
                    data-testid={`button-edit-scholarship-${scholarship.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirmId(scholarship.id)}
                    data-testid={`button-delete-scholarship-${scholarship.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-scholarship-title">
              {editingScholarship ? "Edit Scholarship" : "Add Scholarship"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Academic Excellence Scholarship"
                data-testid="input-scholarship-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the scholarship..."
                rows={3}
                data-testid="input-scholarship-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="valueType">Value Type *</Label>
                <Select
                  value={formData.valueType}
                  onValueChange={(value: ScholarshipValueType) => setFormData({ ...formData, valueType: value })}
                >
                  <SelectTrigger data-testid="select-scholarship-value-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    step={formData.valueType === "percentage" ? "1" : "100"}
                    max={formData.valueType === "percentage" ? "100" : undefined}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.valueType === "percentage" ? "e.g., 20" : "e.g., 5000"}
                    data-testid="input-scholarship-value"
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.valueType === "percentage" ? "%" : ""}
                  </span>
                </div>
              </div>
            </div>
            {formData.valueType === "fixed" && (
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger data-testid="select-scholarship-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                    <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: ScholarshipStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger data-testid="select-scholarship-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="not_open_yet">Not Open Yet</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  data-testid="input-scholarship-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-scholarship-end-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eligibility">Eligibility Criteria</Label>
              <Textarea
                id="eligibility"
                value={formData.eligibility}
                onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                placeholder="Who is eligible for this scholarship?"
                rows={2}
                data-testid="input-scholarship-eligibility"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicationUrl" className="flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                Application URL
              </Label>
              <Input
                id="applicationUrl"
                type="url"
                value={formData.applicationUrl}
                onChange={(e) => setFormData({ ...formData, applicationUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-scholarship-url"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" data-testid="button-cancel-scholarship">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-scholarship"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="dialog-delete-scholarship-title">Delete Scholarship</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this scholarship? This action cannot be undone and will remove the scholarship from all linked courses.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
