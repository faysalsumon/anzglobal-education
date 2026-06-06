/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, Save, Lock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CONTRACT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
];

const PAYMENT_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannually", label: "Bi-annually" },
  { value: "annually", label: "Annually" },
  { value: "per_enrollment", label: "Per Enrollment" },
];

interface BusinessTerms {
  id: string;
  institutionId: string;
  commissionPercentage: string | null;
  bonusStructure: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractStatus: string | null;
  paymentTerms: string | null;
  paymentFrequency: string | null;
  bankDetails: string | null;
  specialConditions: string | null;
  internalNotes: string | null;
}

interface InstitutionBusinessTermsPanelProps {
  institutionId: string;
  institutionName: string;
}

export function InstitutionBusinessTermsPanel({ institutionId, institutionName: _institutionName }: InstitutionBusinessTermsPanelProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    commissionPercentage: "",
    bonusStructure: "",
    contractStartDate: "",
    contractEndDate: "",
    contractStatus: "active",
    paymentTerms: "",
    paymentFrequency: "",
    bankDetails: "",
    specialConditions: "",
    internalNotes: "",
  });

  const { data: terms, isLoading } = useQuery<BusinessTerms | null>({
    queryKey: ["/api/admin/institution-crm/institutions", institutionId, "business-terms"],
    enabled: !!institutionId,
  });

  useEffect(() => {
    if (terms) {
      setFormData({
        commissionPercentage: terms.commissionPercentage || "",
        bonusStructure: terms.bonusStructure || "",
        contractStartDate: terms.contractStartDate || "",
        contractEndDate: terms.contractEndDate || "",
        contractStatus: terms.contractStatus || "active",
        paymentTerms: terms.paymentTerms || "",
        paymentFrequency: terms.paymentFrequency || "",
        bankDetails: terms.bankDetails || "",
        specialConditions: terms.specialConditions || "",
        internalNotes: terms.internalNotes || "",
      });
    }
  }, [terms]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", `/api/admin/institution-crm/institutions/${institutionId}/business-terms`, data);
    },
    onSuccess: () => {
      toast({ title: "Business terms saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/institution-crm/institutions", institutionId, "business-terms"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save business terms",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const _getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "pending": return "secondary";
      case "expired": return "outline";
      case "terminated": return "destructive";
      default: return "outline";
    }
  };

  return (
    <Card data-testid="card-institution-business-terms">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Business Terms
              <Badge variant="outline" className="ml-2 text-xs">Confidential</Badge>
            </CardTitle>
            <CardDescription>Partnership details, commission structure, and contract information</CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-business-terms"
          >
            <Save className="h-4 w-4 mr-1" />
            {saveMutation.isPending ? "Saving..." : "Save Terms"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-business-terms">Loading business terms...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Commission Structure
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Commission Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g., 15.00"
                    value={formData.commissionPercentage}
                    onChange={(e) => setFormData({ ...formData, commissionPercentage: e.target.value })}
                    data-testid="input-commission-percentage"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus Structure</Label>
                  <Textarea
                    placeholder="Describe any bonus or incentive structure..."
                    value={formData.bonusStructure}
                    onChange={(e) => setFormData({ ...formData, bonusStructure: e.target.value })}
                    rows={3}
                    data-testid="textarea-bonus-structure"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Contract Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.contractStartDate}
                    onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                    data-testid="input-contract-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                    data-testid="input-contract-end-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contract Status</Label>
                <Select
                  value={formData.contractStatus}
                  onValueChange={(value) => setFormData({ ...formData, contractStatus: value })}
                >
                  <SelectTrigger data-testid="select-contract-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value} data-testid={`option-status-${status.value}`}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Payment Terms</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Payment Frequency</Label>
                  <Select
                    value={formData.paymentFrequency}
                    onValueChange={(value) => setFormData({ ...formData, paymentFrequency: value })}
                  >
                    <SelectTrigger data-testid="select-payment-frequency">
                      <SelectValue placeholder="Select frequency..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value} data-testid={`option-frequency-${freq.value}`}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Textarea
                    placeholder="Net 30, Net 60, etc..."
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    rows={2}
                    data-testid="textarea-payment-terms"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Details</Label>
                  <Textarea
                    placeholder="Banking information for payments..."
                    value={formData.bankDetails}
                    onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                    rows={2}
                    data-testid="textarea-bank-details"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Additional Information</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Special Conditions</Label>
                  <Textarea
                    placeholder="Any special terms or conditions..."
                    value={formData.specialConditions}
                    onChange={(e) => setFormData({ ...formData, specialConditions: e.target.value })}
                    rows={3}
                    data-testid="textarea-special-conditions"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    placeholder="Internal notes (not shared with institution)..."
                    value={formData.internalNotes}
                    onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                    rows={3}
                    data-testid="textarea-internal-notes"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
