import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, DollarSign, TrendingUp, Clock, CheckCircle2, Eye, Receipt,
} from "lucide-react";

interface InvoiceSummary {
  count: number;
  totalInvoiced: string;
  totalPaid: string;
  outstanding: string;
}

interface AppInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: string;
  amountPaid: string | null;
  issueDate: string;
  dueDate: string;
  currency: string;
  applicationId: string | null;
  customer: { id: string; name: string; email: string | null } | null;
}

interface ApplicationFinancePanelProps {
  applicationId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string | null;
  applicationNumber?: string | null;
  institutionId: string;
  institutionName: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  partially_paid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  void: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  overdue: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  void: "Void",
  overdue: "Overdue",
};

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

function formatCurrency(amount: string, currency = "AUD") {
  return `${currency} ${parseFloat(amount || "0").toFixed(2)}`;
}

export function ApplicationFinancePanel({
  applicationId,
  studentId,
  studentName,
  studentEmail,
  applicationNumber,
  institutionId,
  institutionName,
}: ApplicationFinancePanelProps) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const due30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const defaultNotes = `Student: ${studentName}${applicationNumber ? ` | Application: ${applicationNumber}` : ""}`;

  const [form, setForm] = useState({
    issueDate: today,
    dueDate: due30,
    currency: "AUD",
    gstEnabled: false,
    notes: defaultNotes,
    regionCode: "AU",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);

  const { data, isLoading } = useQuery<{ invoices: AppInvoice[]; summary: InvoiceSummary }>({
    queryKey: ["/api/accounting/invoices/by-application", applicationId],
    enabled: !!applicationId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest("POST", "/api/accounting/invoices", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices/by-application", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      toast({ title: "Invoice created", description: "The invoice has been created as a draft." });
      setCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to create invoice", variant: "destructive" });
    },
  });

  function resetForm() {
    setForm({ issueDate: today, dueDate: due30, currency: "AUD", gstEnabled: false, notes: defaultNotes, regionCode: "AU" });
    setLineItems([{ description: "", quantity: "1", unitPrice: "" }]);
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  function computeSubtotal() {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }

  function handleCreate() {
    if (lineItems.some((li) => !li.description.trim())) {
      toast({ title: "Validation error", description: "All line items need a description.", variant: "destructive" });
      return;
    }
    if (lineItems.some((li) => !li.unitPrice || parseFloat(li.unitPrice) <= 0)) {
      toast({ title: "Validation error", description: "All line items need a valid unit price.", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      billToType: "institution",
      institutionId,
      clientName: institutionName,
      studentId,
      applicationId,
      ...form,
      lineItems: lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
      })),
    });
  }

  const summary = data?.summary;
  const invoices = data?.invoices ?? [];

  const statCards = [
    {
      label: "Total Invoiced",
      value: summary ? formatCurrency(summary.totalInvoiced) : "—",
      icon: Receipt,
      iconClass: "text-blue-500",
    },
    {
      label: "Total Paid",
      value: summary ? formatCurrency(summary.totalPaid) : "—",
      icon: CheckCircle2,
      iconClass: "text-green-500",
    },
    {
      label: "Outstanding",
      value: summary ? formatCurrency(summary.outstanding) : "—",
      icon: Clock,
      iconClass: "text-orange-500",
    },
    {
      label: "Invoices",
      value: summary ? String(summary.count) : "—",
      icon: TrendingUp,
      iconClass: "text-primary",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="application-finance-panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Finance &amp; Invoices
          {applicationNumber && (
            <span className="text-sm font-normal text-muted-foreground">— {applicationNumber}</span>
          )}
        </h3>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          data-testid="button-create-application-invoice"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, iconClass }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${iconClass}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-lg font-semibold" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No invoices yet for this application.{" "}
            <button
              className="text-primary underline underline-offset-2"
              onClick={() => setCreateOpen(true)}
              data-testid="link-create-first-invoice"
            >
              Create the first one
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Invoice #</th>
                    <th className="text-left p-3 font-medium">Billed To</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-right p-3 font-medium">Balance</th>
                    <th className="text-left p-3 font-medium">Due</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const balance = parseFloat(inv.total) - parseFloat(inv.amountPaid || "0");
                    const isOverdue =
                      inv.status !== "paid" &&
                      inv.status !== "void" &&
                      new Date(inv.dueDate) < new Date();
                    return (
                      <tr key={inv.id} className="border-b" data-testid={`row-invoice-${inv.id}`}>
                        <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="p-3 text-sm">{inv.customer?.name || "—"}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`no-default-hover-elevate no-default-active-elevate text-xs ${STATUS_COLORS[inv.status] ?? ""}`}
                            >
                              {STATUS_LABELS[inv.status] ?? inv.status}
                            </Badge>
                            {isOverdue && (
                              <Badge className="no-default-hover-elevate no-default-active-elevate text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">{formatCurrency(inv.total, inv.currency)}</td>
                        <td className="p-3 text-right font-medium">{inv.currency} {balance.toFixed(2)}</td>
                        <td className="p-3 text-sm text-muted-foreground">{inv.dueDate}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            data-testid={`button-view-invoice-${inv.id}`}
                          >
                            <a
                              href={`/admin?tab=finance-invoices&invoice=${inv.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`View invoice ${inv.invoiceNumber} in Accounting`}
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Create Invoice Dialog ─────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 px-4 py-3 text-sm space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Billing To (Institution)</p>
              <p className="font-medium">{institutionName}</p>
              <p className="text-muted-foreground text-xs">Student: {studentName}{applicationNumber ? ` · ${applicationNumber}` : ""}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
                  data-testid="input-invoice-issue-date"
                />
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  data-testid="input-invoice-due-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger data-testid="select-invoice-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="BDT">BDT</SelectItem>
                    <SelectItem value="NZD">NZD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Region</Label>
                <Select value={form.regionCode} onValueChange={(v) => setForm((f) => ({ ...f, regionCode: v }))}>
                  <SelectTrigger data-testid="select-invoice-region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="BD">Bangladesh</SelectItem>
                    <SelectItem value="NZ">New Zealand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button variant="ghost" size="sm" onClick={addLineItem} data-testid="button-add-line-item">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              </div>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-right p-2 font-medium w-16">Qty</th>
                      <th className="text-right p-2 font-medium w-24">Unit Price</th>
                      <th className="text-right p-2 font-medium w-24">Amount</th>
                      <th className="p-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => {
                      const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                      return (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="p-1.5">
                            <Input
                              value={item.description}
                              onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                              placeholder="e.g. Application processing fee"
                              className="h-8 text-sm"
                              data-testid={`input-line-desc-${idx}`}
                            />
                          </td>
                          <td className="p-1.5">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                              className="h-8 text-sm text-right"
                              min="0"
                              data-testid={`input-line-qty-${idx}`}
                            />
                          </td>
                          <td className="p-1.5">
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                              className="h-8 text-sm text-right"
                              min="0"
                              placeholder="0.00"
                              data-testid={`input-line-price-${idx}`}
                            />
                          </td>
                          <td className="p-1.5 text-right pr-2 text-muted-foreground">
                            {amount.toFixed(2)}
                          </td>
                          <td className="p-1.5">
                            {lineItems.length > 1 && (
                              <button
                                onClick={() => removeLineItem(idx)}
                                className="text-muted-foreground hover:text-destructive"
                                data-testid={`button-remove-line-${idx}`}
                              >
                                &times;
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td colSpan={3} className="p-2 text-right font-medium text-sm">Subtotal</td>
                      <td className="p-2 text-right font-medium text-sm">{computeSubtotal().toFixed(2)}</td>
                      <td />
                    </tr>
                    {form.gstEnabled && (
                      <tr>
                        <td colSpan={3} className="p-2 text-right text-sm text-muted-foreground">GST (10%)</td>
                        <td className="p-2 text-right text-sm">{(computeSubtotal() * 0.1).toFixed(2)}</td>
                        <td />
                      </tr>
                    )}
                    <tr className="border-t">
                      <td colSpan={3} className="p-2 text-right font-bold text-sm">Total</td>
                      <td className="p-2 text-right font-bold text-sm">
                        {form.currency} {(computeSubtotal() * (form.gstEnabled ? 1.1 : 1)).toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="gst-toggle"
                checked={form.gstEnabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, gstEnabled: v }))}
                data-testid="switch-gst-enabled"
              />
              <Label htmlFor="gst-toggle">Include GST (10%)</Label>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Additional notes…"
                data-testid="textarea-invoice-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-application-invoice"
            >
              {createMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
