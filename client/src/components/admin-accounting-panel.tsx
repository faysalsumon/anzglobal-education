/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  FileText,
  DollarSign,
  CreditCard,
  BarChart3,
  ArrowLeft,
  Printer,
  Send,
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Bell,
  Building2,
  GraduationCap,
  PenLine,
  Search,
  X,
  Info,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function formatCurrency(amount: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    sent: "default",
    partially_paid: "outline",
    paid: "default",
    overdue: "destructive",
    cancelled: "secondary",
    unpaid: "outline",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    partially_paid: "Partial",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
    unpaid: "Unpaid",
  };
  return <Badge variant={variants[status] || "secondary"} data-testid={`badge-status-${status}`}>{labels[status] || status}</Badge>;
}

function BillToTypeBadge({ billToType }: { billToType?: string }) {
  if (billToType === "institution") {
    return <Badge variant="outline" className="gap-1" data-testid={`badge-billto-${billToType}`}><Building2 className="h-3 w-3" /> Institution</Badge>;
  }
  if (billToType === "student") {
    return <Badge variant="outline" className="gap-1" data-testid={`badge-billto-${billToType}`}><GraduationCap className="h-3 w-3" /> Student</Badge>;
  }
  return <Badge variant="secondary" className="gap-1" data-testid="badge-billto-manual"><PenLine className="h-3 w-3" /> Manual</Badge>;
}

// ==================== INVOICES TAB ====================

function InvoicesTab({ isCTO: _isCTO, onNavigate }: { isCTO: boolean; onNavigate?: (tab: string, entityId?: string) => void }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/accounting/invoices"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/accounting/invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      setShowCreateDialog(false);
      toast({ title: "Invoice created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      setSelectedInvoice(null);
      toast({ title: "Invoice deleted" });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("POST", `/api/accounting/invoices/${id}/payments`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      setShowPaymentDialog(false);
      toast({ title: "Payment recorded" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/accounting/invoices/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      setShowEditDialog(false);
      toast({ title: "Invoice updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const statusUpdateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/accounting/invoices/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      toast({ title: "Invoice status updated" });
    },
  });

  const filtered = statusFilter === "all" ? invoices : invoices.filter((i: any) => i.status === statusFilter);

  if (selectedInvoice) {
    const inv = invoices.find((i: any) => i.id === selectedInvoice) || selectedInvoice;
    return (
      <>
        <InvoiceDetail
          invoice={inv}
          onBack={() => setSelectedInvoice(null)}
          onRecordPayment={() => setShowPaymentDialog(true)}
          onDelete={() => deleteMutation.mutate(inv.id)}
          onStatusChange={(status: string) => statusUpdateMutation.mutate({ id: inv.id, status })}
          paymentDialog={showPaymentDialog}
          onClosePaymentDialog={() => setShowPaymentDialog(false)}
          onSubmitPayment={(data: any) => paymentMutation.mutate({ id: inv.id, data })}
          paymentPending={paymentMutation.isPending}
          onNavigate={onNavigate}
          onEdit={() => setShowEditDialog(true)}
        />
        {showEditDialog && (
          <EditInvoiceDialog
            open={showEditDialog}
            onClose={() => setShowEditDialog(false)}
            onSubmit={(data: any) => editMutation.mutate({ id: inv.id, data })}
            isPending={editMutation.isPending}
            invoice={inv}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-invoices-title">Invoices</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-invoice-status-filter">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="partially_paid">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-new-invoice">
            <Plus className="h-4 w-4 mr-1" /> New Invoice
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground" data-testid="text-no-invoices">No invoices found</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Bill To</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv: any) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedInvoice(inv)}
                  data-testid={`row-invoice-${inv.id}`}
                >
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    <BillToTypeBadge billToType={inv.billToType} />
                  </TableCell>
                  <TableCell>{inv.clientName}</TableCell>
                  <TableCell>{formatDate(inv.issueDate)}</TableCell>
                  <TableCell>{formatDate(inv.dueDate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.total, inv.currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.amountPaid, inv.currency)}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CreateInvoiceDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={(data: any) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
    </div>
  );
}

function InvoiceDetail({
  invoice, onBack, onRecordPayment, onDelete, onStatusChange,
  paymentDialog, onClosePaymentDialog, onSubmitPayment, paymentPending,
  onNavigate, onEdit
}: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-invoices">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold" data-testid="text-invoice-number">{invoice.invoiceNumber}</h2>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(invoice.status === "draft" || invoice.status === "sent") && onEdit && (
            <Button type="button" variant="outline" onClick={onEdit} data-testid="button-edit-invoice">
              <PenLine className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
          {invoice.status === "draft" && (
            <Button variant="outline" onClick={() => onStatusChange("sent")} data-testid="button-mark-sent">
              <Send className="h-4 w-4 mr-1" /> Mark Sent
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Button onClick={onRecordPayment} data-testid="button-record-payment">
              <DollarSign className="h-4 w-4 mr-1" /> Record Payment
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.open(`/admin/accounting/invoices/${invoice.id}/print`, "_blank")}
            data-testid="button-print-invoice"
          >
            <Printer className="h-4 w-4 mr-1" /> Print / PDF
          </Button>
          {invoice.status === "draft" && (
            <Button variant="destructive" size="icon" onClick={() => onDelete()} data-testid="button-delete-invoice">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs text-muted-foreground">Billed To</p>
            <BillToTypeBadge billToType={invoice.billToType} />
          </div>
          {invoice.institution && invoice.institution.logo && (
            <div className="mb-2">
              <img src={invoice.institution.logo} alt={invoice.clientName} className="h-8 w-8 rounded-md object-cover" data-testid="img-invoice-institution-logo" />
            </div>
          )}
          {invoice.student && (
            <div className="mb-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium" data-testid="avatar-invoice-student">
                {(invoice.clientName || "?").charAt(0).toUpperCase()}
              </div>
            </div>
          )}
          <p className="font-medium" data-testid="text-invoice-client">{invoice.clientName}</p>
          {invoice.clientEmail && <p className="text-sm text-muted-foreground">{invoice.clientEmail}</p>}
          {invoice.institution && (
            <div className="mt-1">
              <p className="text-xs text-muted-foreground">{invoice.institution.country}</p>
              {onNavigate && (
                <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={() => onNavigate("institutions", invoice.institutionId)} data-testid="link-invoice-institution">
                  <ExternalLink className="h-3 w-3 mr-1" />View Institution Profile
                </Button>
              )}
            </div>
          )}
          {invoice.student && (
            <div className="mt-1">
              <p className="text-xs text-muted-foreground">{invoice.student.nationality || invoice.student.email}</p>
              {onNavigate && (
                <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={() => onNavigate("crm-contacts", invoice.studentId)} data-testid="link-invoice-student">
                  <ExternalLink className="h-3 w-3 mr-1" />View Student Profile
                </Button>
              )}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Dates</p>
          <p className="text-sm">Issued: {formatDate(invoice.issueDate)}</p>
          <p className="text-sm">Due: {formatDate(invoice.dueDate)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Amounts ({invoice.currency})</p>
          <p className="text-sm">Total: {formatCurrency(invoice.total, invoice.currency)}</p>
          <p className="text-sm">Paid: {formatCurrency(invoice.amountPaid, invoice.currency)}</p>
          <p className="font-medium">Due: {formatCurrency(invoice.amountDue, invoice.currency)}</p>
        </Card>
      </div>

      {invoice.notes && (
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{invoice.notes}</p>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b">
          <h3 className="font-medium">Line Items</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invoice.lineItems || []).map((item: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(parseFloat(item.unitPrice), invoice.currency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(parseFloat(item.amount), invoice.currency)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(invoice.total, invoice.currency)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {(invoice.payments || []).length > 0 && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-medium">Payment History</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paymentDate)}</TableCell>
                  <TableCell>{p.method || "-"}</TableCell>
                  <TableCell>{p.reference || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(parseFloat(p.amount), invoice.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <RecordPaymentDialog
        open={paymentDialog}
        onClose={onClosePaymentDialog}
        onSubmit={onSubmitPayment}
        isPending={paymentPending}
        maxAmount={invoice.amountDue}
        currency={invoice.currency}
      />
    </div>
  );
}

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function EntitySearchCombobox({ type, onSelect, selected, onClear }: {
  type: "institution" | "student";
  onSelect: (entity: any) => void;
  selected: any;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const endpoint = type === "institution"
    ? `/api/accounting/search/institutions?q=${encodeURIComponent(debouncedQuery)}`
    : `/api/accounting/search/students?q=${encodeURIComponent(debouncedQuery)}`;

  const { data: results = [] } = useQuery<any[]>({
    queryKey: [endpoint],
    enabled: isOpen || debouncedQuery.length > 0,
  });

  if (selected) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
        {type === "institution" ? <Building2 className="h-4 w-4 text-muted-foreground shrink-0" /> : <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selected.name || selected.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{selected.email || selected.contactEmail || ""}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClear} data-testid="button-clear-entity">
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={type === "institution" ? "Search institutions..." : "Search students..."}
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="pl-8"
          data-testid={`input-search-${type}`}
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto border rounded-md bg-popover shadow-md">
          {results.map((item: any) => (
            <button
              type="button"
              key={item.id}
              className="w-full text-left px-3 py-2 text-sm hover-elevate cursor-pointer flex items-center gap-2"
              onClick={() => { onSelect(item); setIsOpen(false); setQuery(""); }}
              data-testid={`option-${type}-${item.id}`}
            >
              {type === "institution" ? <Building2 className="h-3 w-3 text-muted-foreground shrink-0" /> : <GraduationCap className="h-3 w-3 text-muted-foreground shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium truncate">{type === "institution" ? item.name : item.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {type === "institution" ? `${item.country || ""} ${item.contactEmail ? `- ${item.contactEmail}` : ""}` : `${item.email || ""} ${item.nationality ? `- ${item.nationality}` : ""}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {isOpen && query && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full border rounded-md bg-popover shadow-md p-3 text-sm text-muted-foreground">
          No {type === "institution" ? "institutions" : "students"} found
        </div>
      )}
    </div>
  );
}

const STUDENT_FEE_TYPES = [
  { label: "Visa Application Fee", description: "Visa Application Fee" },
  { label: "Service Fee", description: "Education Consulting Service Fee" },
  { label: "Document Fee", description: "Document Processing & Translation Fee" },
  { label: "Consultation Fee", description: "Professional Consultation Fee" },
  { label: "Application Fee", description: "University Application Processing Fee" },
];

function CreateInvoiceDialog({ open, onClose, onSubmit, isPending }: any) {
  const [billToType, setBillToType] = useState<"institution" | "student" | "manual">("manual");
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [notes, setNotes] = useState("");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [items, setItems] = useState([{ description: "", quantity: "1", unitPrice: "" }]);

  const handleSelectInstitution = (inst: any) => {
    setSelectedInstitution(inst);
    setClientName(inst.name || "");
    setClientEmail(inst.contactEmail || "");
    setClientPhone(inst.contactPhone || "");
    const addresses = inst.campusAddresses;
    if (Array.isArray(addresses) && addresses.length > 0) {
      const addr = addresses[0];
      setClientAddress([addr.address, addr.city, addr.state, addr.postcode, addr.country].filter(Boolean).join(", "));
    }
  };

  const handleSelectStudent = (stud: any) => {
    setSelectedStudent(stud);
    setClientName(stud.fullName || "");
    setClientEmail(stud.email || "");
    setClientPhone(stud.phone || "");
    setClientAddress(stud.address || "");
  };

  const handleClearEntity = () => {
    setSelectedInstitution(null);
    setSelectedStudent(null);
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("");
  };

  const handleBillToTypeChange = (type: "institution" | "student" | "manual") => {
    setBillToType(type);
    handleClearEntity();
  };

  const addItem = () => setItems([...items, { description: "", quantity: "1", unitPrice: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const addFeeType = (feeType: { description: string }) => {
    const hasEmpty = items.some(i => !i.description && !i.unitPrice);
    if (hasEmpty) {
      const idx = items.findIndex(i => !i.description && !i.unitPrice);
      updateItem(idx, "description", feeType.description);
    } else {
      setItems([...items, { description: feeType.description, quantity: "1", unitPrice: "" }]);
    }
  };

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
  const gstAmount = gstEnabled ? subtotal * 0.1 : 0;
  const total = subtotal + gstAmount;

  const handleSubmit = () => {
    if (!clientName || !issueDate || !dueDate || items.some(i => !i.description || !i.unitPrice)) return;
    const payload: any = {
      billToType,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      issueDate,
      dueDate,
      currency,
      notes,
      gstEnabled,
      lineItems: items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
    };
    if (billToType === "institution" && selectedInstitution) {
      payload.institutionId = selectedInstitution.id;
    }
    if (billToType === "student" && selectedStudent) {
      payload.studentId = selectedStudent.id;
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Bill To</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={billToType === "institution" ? "default" : "outline"}
                size="sm"
                onClick={() => handleBillToTypeChange("institution")}
                data-testid="button-billto-institution"
              >
                <Building2 className="h-3.5 w-3.5 mr-1" /> Institution
              </Button>
              <Button
                type="button"
                variant={billToType === "student" ? "default" : "outline"}
                size="sm"
                onClick={() => handleBillToTypeChange("student")}
                data-testid="button-billto-student"
              >
                <GraduationCap className="h-3.5 w-3.5 mr-1" /> Student
              </Button>
              <Button
                type="button"
                variant={billToType === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => handleBillToTypeChange("manual")}
                data-testid="button-billto-manual"
              >
                <PenLine className="h-3.5 w-3.5 mr-1" /> Manual
              </Button>
            </div>
          </div>

          {billToType === "institution" && (
            <div className="space-y-3">
              <EntitySearchCombobox
                type="institution"
                onSelect={handleSelectInstitution}
                selected={selectedInstitution}
                onClear={handleClearEntity}
              />
              {(selectedInstitution?.commissionPercentage || selectedInstitution?.paymentTerms) && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm">
                    {selectedInstitution.commissionPercentage && <p><span className="font-medium">Commission:</span> {selectedInstitution.commissionPercentage}%</p>}
                    {selectedInstitution.paymentTerms && <p className="text-muted-foreground">{selectedInstitution.paymentTerms}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {billToType === "student" && (
            <div className="space-y-3">
              <EntitySearchCombobox
                type="student"
                onSelect={handleSelectStudent}
                selected={selectedStudent}
                onClear={handleClearEntity}
              />
              {selectedStudent && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Quick add fee types:</p>
                  <div className="flex flex-wrap gap-1">
                    {STUDENT_FEE_TYPES.map(ft => (
                      <Button
                        type="button"
                        key={ft.label}
                        variant="outline"
                        size="sm"
                        onClick={() => addFeeType(ft)}
                        data-testid={`button-fee-${ft.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Plus className="h-3 w-3 mr-1" /> {ft.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(billToType === "manual" || selectedInstitution || selectedStudent) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Client Name *</Label>
                <Input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  readOnly={billToType !== "manual"}
                  className={billToType !== "manual" ? "bg-muted/30" : ""}
                  data-testid="input-client-name"
                />
              </div>
              <div>
                <Label>Client Email</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  readOnly={billToType !== "manual"}
                  className={billToType !== "manual" ? "bg-muted/30" : ""}
                  data-testid="input-client-email"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  readOnly={billToType !== "manual"}
                  className={billToType !== "manual" ? "bg-muted/30" : ""}
                  data-testid="input-client-phone"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={clientAddress}
                  onChange={e => setClientAddress(e.target.value)}
                  readOnly={billToType !== "manual"}
                  className={billToType !== "manual" ? "bg-muted/30" : ""}
                  data-testid="input-client-address"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Issue Date *</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} data-testid="input-issue-date" />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-due-date" />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="select-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="BDT">BDT</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-invoice-notes" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-line-item">
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {idx === 0 && <Label className="text-xs">Description</Label>}
                  <Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} data-testid={`input-item-desc-${idx}`} />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs">Qty</Label>}
                  <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} data-testid={`input-item-qty-${idx}`} />
                </div>
                <div className="col-span-3">
                  {idx === 0 && <Label className="text-xs">Unit Price</Label>}
                  <Input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", e.target.value)} data-testid={`input-item-price-${idx}`} />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <span className="text-sm font-medium">{formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), currency)}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} data-testid={`button-remove-item-${idx}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="rounded" data-testid="checkbox-gst" />
                Include GST (10%)
              </label>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(subtotal, currency)}</p>
                {gstEnabled && <p className="text-sm text-muted-foreground">GST (10%): {formatCurrency(gstAmount, currency)}</p>}
                <p className="font-bold text-lg" data-testid="text-invoice-total">Total: {formatCurrency(total, currency)}</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending} data-testid="button-submit-invoice">
            {isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditInvoiceDialog({ open, onClose, onSubmit, isPending, invoice }: any) {
  const [billToType, setBillToType] = useState<"institution" | "student" | "manual">(invoice.billToType || "manual");
  const [selectedInstitution, setSelectedInstitution] = useState<any>(invoice.institution || null);
  const [selectedStudent, setSelectedStudent] = useState<any>(invoice.student || null);
  const [clientName, setClientName] = useState(invoice.clientName || "");
  const [clientEmail, setClientEmail] = useState(invoice.clientEmail || "");
  const [clientPhone, setClientPhone] = useState(invoice.customer?.phone || "");
  const [clientAddress, setClientAddress] = useState(invoice.customer?.address || "");
  const [issueDate, setIssueDate] = useState(invoice.issueDate || "");
  const [dueDate, setDueDate] = useState(invoice.dueDate || "");
  const [currency, setCurrency] = useState(invoice.currency || "AUD");
  const [notes, setNotes] = useState(invoice.notes || "");
  const [gstEnabled, setGstEnabled] = useState(invoice.gstEnabled || false);
  const existingItems = (invoice.lineItems || []).map((li: any) => ({ description: li.description, quantity: li.quantity || "1", unitPrice: li.unitPrice || "" }));
  const [items, setItems] = useState(existingItems.length > 0 ? existingItems : [{ description: "", quantity: "1", unitPrice: "" }]);

  const handleSelectInstitution = (inst: any) => {
    setSelectedInstitution(inst);
    setClientName(inst.name || "");
    setClientEmail(inst.contactEmail || "");
    setClientPhone(inst.contactPhone || "");
    const addresses = inst.campusAddresses;
    if (Array.isArray(addresses) && addresses.length > 0) {
      const addr = addresses[0];
      setClientAddress([addr.address, addr.city, addr.state, addr.postcode, addr.country].filter(Boolean).join(", "));
    }
  };

  const handleSelectStudent = (stud: any) => {
    setSelectedStudent(stud);
    setClientName(stud.fullName || "");
    setClientEmail(stud.email || "");
    setClientPhone(stud.phone || "");
    setClientAddress(stud.address || "");
  };

  const handleClearEntity = () => {
    setSelectedInstitution(null);
    setSelectedStudent(null);
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("");
  };

  const handleBillToTypeChange = (type: "institution" | "student" | "manual") => {
    setBillToType(type);
    handleClearEntity();
  };

  const addItem = () => setItems([...items, { description: "", quantity: "1", unitPrice: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_: any, i: number) => i !== idx));
  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const addFeeType = (feeType: { description: string }) => {
    const hasEmpty = items.some((i: any) => !i.description && !i.unitPrice);
    if (hasEmpty) {
      const idx = items.findIndex((i: any) => !i.description && !i.unitPrice);
      updateItem(idx, "description", feeType.description);
    } else {
      setItems([...items, { description: feeType.description, quantity: "1", unitPrice: "" }]);
    }
  };

  const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
  const gstAmount = gstEnabled ? subtotal * 0.1 : 0;
  const total = subtotal + gstAmount;

  const handleSubmit = () => {
    if (!clientName || !issueDate || !dueDate || items.some((i: any) => !i.description || !i.unitPrice)) return;
    const payload: any = {
      billToType,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      issueDate,
      dueDate,
      currency,
      notes,
      gstEnabled,
      lineItems: items.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
    };
    if (billToType === "institution" && selectedInstitution) {
      payload.institutionId = selectedInstitution.id;
    }
    if (billToType === "student" && selectedStudent) {
      payload.studentId = selectedStudent.id;
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Bill To</Label>
            <div className="flex gap-1">
              <Button type="button" variant={billToType === "institution" ? "default" : "outline"} size="sm" onClick={() => handleBillToTypeChange("institution")} data-testid="button-edit-billto-institution">
                <Building2 className="h-3.5 w-3.5 mr-1" /> Institution
              </Button>
              <Button type="button" variant={billToType === "student" ? "default" : "outline"} size="sm" onClick={() => handleBillToTypeChange("student")} data-testid="button-edit-billto-student">
                <GraduationCap className="h-3.5 w-3.5 mr-1" /> Student
              </Button>
              <Button type="button" variant={billToType === "manual" ? "default" : "outline"} size="sm" onClick={() => handleBillToTypeChange("manual")} data-testid="button-edit-billto-manual">
                <PenLine className="h-3.5 w-3.5 mr-1" /> Manual
              </Button>
            </div>
          </div>

          {billToType === "institution" && !selectedInstitution && (
            <EntitySearchCombobox type="institution" onSelect={handleSelectInstitution} selected={selectedInstitution} onClear={handleClearEntity} />
          )}
          {billToType === "institution" && selectedInstitution && (
            <div className="space-y-3">
              <EntitySearchCombobox type="institution" onSelect={handleSelectInstitution} selected={selectedInstitution} onClear={handleClearEntity} />
              {(selectedInstitution?.commissionPercentage || selectedInstitution?.paymentTerms) && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm">
                    {selectedInstitution.commissionPercentage && <p><span className="font-medium">Commission:</span> {selectedInstitution.commissionPercentage}%</p>}
                    {selectedInstitution.paymentTerms && <p className="text-muted-foreground">{selectedInstitution.paymentTerms}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {billToType === "student" && (
            <div className="space-y-3">
              <EntitySearchCombobox type="student" onSelect={handleSelectStudent} selected={selectedStudent} onClear={handleClearEntity} />
              {selectedStudent && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Quick add fee types:</p>
                  <div className="flex flex-wrap gap-1">
                    {STUDENT_FEE_TYPES.map(ft => (
                      <Button type="button" key={ft.label} variant="outline" size="sm" onClick={() => addFeeType(ft)} data-testid={`button-edit-fee-${ft.label.toLowerCase().replace(/\s+/g, "-")}`}>
                        <Plus className="h-3 w-3 mr-1" /> {ft.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(billToType === "manual" || selectedInstitution || selectedStudent) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Client Name *</Label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} readOnly={billToType !== "manual"} className={billToType !== "manual" ? "bg-muted/30" : ""} data-testid="input-edit-client-name" />
              </div>
              <div>
                <Label>Client Email</Label>
                <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} readOnly={billToType !== "manual"} className={billToType !== "manual" ? "bg-muted/30" : ""} data-testid="input-edit-client-email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} readOnly={billToType !== "manual"} className={billToType !== "manual" ? "bg-muted/30" : ""} data-testid="input-edit-client-phone" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={clientAddress} onChange={e => setClientAddress(e.target.value)} readOnly={billToType !== "manual"} className={billToType !== "manual" ? "bg-muted/30" : ""} data-testid="input-edit-client-address" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Issue Date *</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} data-testid="input-edit-issue-date" />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-edit-due-date" />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="select-edit-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="BDT">BDT</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-edit-invoice-notes" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-edit-add-line-item">
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            {items.map((item: any, idx: number) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {idx === 0 && <Label className="text-xs">Description</Label>}
                  <Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} data-testid={`input-edit-item-desc-${idx}`} />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs">Qty</Label>}
                  <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} data-testid={`input-edit-item-qty-${idx}`} />
                </div>
                <div className="col-span-3">
                  {idx === 0 && <Label className="text-xs">Unit Price</Label>}
                  <Input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", e.target.value)} data-testid={`input-edit-item-price-${idx}`} />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <span className="text-sm font-medium">{formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), currency)}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} data-testid={`button-edit-remove-item-${idx}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="rounded" data-testid="checkbox-edit-gst" />
                Include GST (10%)
              </label>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(subtotal, currency)}</p>
                {gstEnabled && <p className="text-sm text-muted-foreground">GST (10%): {formatCurrency(gstAmount, currency)}</p>}
                <p className="font-bold text-lg" data-testid="text-edit-invoice-total">Total: {formatCurrency(total, currency)}</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending} data-testid="button-submit-edit-invoice">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({ open, onClose, onSubmit, isPending, maxAmount, currency }: any) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");

  const handleSubmit = () => {
    if (!amount || !paidOn) return;
    onSubmit({ amount: parseFloat(amount), paymentDate: paidOn, method, reference });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount * (max: {formatCurrency(maxAmount, currency)})</Label>
            <Input type="number" step="0.01" max={maxAmount} value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-payment-amount" />
          </div>
          <div>
            <Label>Date *</Label>
            <Input type="date" value={paidOn} onChange={e => setPaidOn(e.target.value)} data-testid="input-payment-date" />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger data-testid="select-payment-method"><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="card">Credit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reference</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} data-testid="input-payment-reference" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit-payment">
            {isPending ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== EXPENSES TAB ====================

function ExpensesTab() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/accounting/expenses"],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/accounting/expense-categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/accounting/expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/expenses"] });
      setShowCreateDialog(false);
      toast({ title: "Expense recorded" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/expenses"] });
      toast({ title: "Expense deleted" });
    },
  });

  const categoryMap = new Map(categories.map((c: any) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-expenses-title">Expenses</h2>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-new-expense">
          <Plus className="h-4 w-4 mr-1" /> Record Expense
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : expenses.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground" data-testid="text-no-expenses">No expenses recorded</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((exp: any) => (
                <TableRow key={exp.id} data-testid={`row-expense-${exp.id}`}>
                  <TableCell>{formatDate(exp.expenseDate)}</TableCell>
                  <TableCell>{categoryMap.get(exp.categoryId) || "-"}</TableCell>
                  <TableCell>{exp.vendor || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{exp.description || "-"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(parseFloat(exp.amount), exp.currency)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(exp.id)} data-testid={`button-delete-expense-${exp.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CreateExpenseDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={(data: any) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
        categories={categories}
      />
    </div>
  );
}

function CreateExpenseDialog({ open, onClose, onSubmit, isPending, categories }: any) {
  const [categoryId, setCategoryId] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [receiptRef, setReceiptRef] = useState("");

  const handleSubmit = () => {
    if (!amount || !expenseDate) return;
    onSubmit({
      categoryId: categoryId ? parseInt(categoryId) : null,
      vendor, amount: parseFloat(amount), currency, expenseDate, description, receiptRef,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger data-testid="select-expense-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor</Label>
              <Input value={vendor} onChange={e => setVendor(e.target.value)} data-testid="input-expense-vendor" />
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-expense-amount" />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="select-expense-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="BDT">BDT</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} data-testid="input-expense-date" />
            </div>
            <div>
              <Label>Receipt Reference</Label>
              <Input value={receiptRef} onChange={e => setReceiptRef(e.target.value)} data-testid="input-expense-receipt" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} data-testid="input-expense-description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit-expense">
            {isPending ? "Saving..." : "Record Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== BILLS TAB ====================

function BillsTab() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState<any>(null);

  const { data: bills = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/accounting/bills"],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/accounting/expense-categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/accounting/bills", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/bills"] });
      setShowCreateDialog(false);
      toast({ title: "Bill created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/accounting/bills/${id}/pay`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/bills"] });
      setShowPayDialog(null);
      toast({ title: "Payment recorded" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/bills"] });
      toast({ title: "Bill deleted" });
    },
  });

  const categoryMap = new Map(categories.map((c: any) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-bills-title">Bills</h2>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-new-bill">
          <Plus className="h-4 w-4 mr-1" /> New Bill
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : bills.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground" data-testid="text-no-bills">No bills found</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill: any) => (
                <TableRow
                  key={bill.id}
                  className={bill.isOverdue && bill.status !== "paid" ? "bg-destructive/5" : ""}
                  data-testid={`row-bill-${bill.id}`}
                >
                  <TableCell className="font-medium">{bill.vendor}</TableCell>
                  <TableCell>{categoryMap.get(bill.categoryId) || "-"}</TableCell>
                  <TableCell>{formatDate(bill.issueDate)}</TableCell>
                  <TableCell>
                    <span className={bill.isOverdue && bill.status !== "paid" ? "text-destructive font-medium" : ""}>
                      {formatDate(bill.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(parseFloat(bill.amount), bill.currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(bill.amountPaid, bill.currency)}</TableCell>
                  <TableCell>
                    {bill.isOverdue && bill.status !== "paid" ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : (
                      <StatusBadge status={bill.status} />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {bill.status !== "paid" && (
                        <Button variant="outline" size="sm" onClick={() => setShowPayDialog(bill)} data-testid={`button-pay-bill-${bill.id}`}>
                          Mark Paid
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(bill.id)} data-testid={`button-delete-bill-${bill.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CreateBillDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={(data: any) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
        categories={categories}
      />

      {showPayDialog && (
        <BillPaymentDialog
          open={!!showPayDialog}
          onClose={() => setShowPayDialog(null)}
          bill={showPayDialog}
          onSubmit={(data: any) => payMutation.mutate({ id: showPayDialog.id, data })}
          isPending={payMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateBillDialog({ open, onClose, onSubmit, isPending, categories }: any) {
  const [vendor, setVendor] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");

  const handleSubmit = () => {
    if (!vendor || !amount || !issueDate || !dueDate) return;
    onSubmit({
      vendor, categoryId: categoryId ? parseInt(categoryId) : null,
      amount: parseFloat(amount), currency, issueDate, dueDate, description, reference,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Bill</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendor *</Label>
              <Input value={vendor} onChange={e => setVendor(e.target.value)} data-testid="input-bill-vendor" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger data-testid="select-bill-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-bill-amount" />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="select-bill-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="BDT">BDT</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Issue Date *</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} data-testid="input-bill-issue-date" />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-bill-due-date" />
            </div>
          </div>
          <div>
            <Label>Reference</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} data-testid="input-bill-reference" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} data-testid="input-bill-description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit-bill">
            {isPending ? "Creating..." : "Create Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BillPaymentDialog({ open, onClose, bill, onSubmit, isPending }: any) {
  const [amount, setAmount] = useState(String(bill.amountDue));
  const [paidOn, setPaidOn] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay Bill - {bill.vendor}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount (Due: {formatCurrency(bill.amountDue, bill.currency)})</Label>
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-bill-pay-amount" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={paidOn} onChange={e => setPaidOn(e.target.value)} data-testid="input-bill-pay-date" />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger data-testid="select-bill-pay-method"><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="card">Credit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reference</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} data-testid="input-bill-pay-reference" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => onSubmit({ amount: parseFloat(amount), paidOn, method, reference })} disabled={isPending} data-testid="button-submit-bill-payment">
            {isPending ? "Processing..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== REPORTS TAB ====================

function ReportsTab({ isCTO }: { isCTO: boolean }) {
  const [reportType, setReportType] = useState("profit-loss");
  const [dateRange, setDateRange] = useState("this-fy");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const getDateParams = () => {
    const now = new Date();
    switch (dateRange) {
      case "this-month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: start.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
      }
      case "this-quarter": {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), qMonth, 1);
        return { startDate: start.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
      }
      case "this-fy": {
        const fyStart = now.getMonth() >= 6 ? new Date(now.getFullYear(), 6, 1) : new Date(now.getFullYear() - 1, 6, 1);
        return { startDate: fyStart.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
      }
      case "custom":
        return { startDate: customStart, endDate: customEnd };
      default:
        return {};
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-reports-title">Financial Reports</h2>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-[180px]" data-testid="select-report-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profit-loss">Profit & Loss</SelectItem>
            <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
            <SelectItem value="cash-flow">Cash Flow</SelectItem>
            <SelectItem value="ar-aging">AR Aging</SelectItem>
            <SelectItem value="ap-aging">AP Aging</SelectItem>
          </SelectContent>
        </Select>

        {(reportType === "profit-loss" || reportType === "balance-sheet") && (
          <>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]" data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="this-fy">This FY</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {dateRange === "custom" && (
              <>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-[160px]" data-testid="input-custom-start" />
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-[160px]" data-testid="input-custom-end" />
              </>
            )}
          </>
        )}
      </div>

      {reportType === "profit-loss" && <ProfitLossReport dateParams={getDateParams()} />}
      {reportType === "balance-sheet" && <BalanceSheetReport dateParams={getDateParams()} />}
      {reportType === "cash-flow" && <CashFlowReport />}
      {reportType === "ar-aging" && <ARAgingReport />}
      {reportType === "ap-aging" && <APAgingReport />}

      {isCTO && <OverdueRemindersSection />}
    </div>
  );
}

function ProfitLossReport({ dateParams }: { dateParams: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/accounting/reports/profit-loss", dateParams],
  });

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>;
  if (!data) return null;

  const report = data as any;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-pl-revenue">{formatCurrency(report.revenue)}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-pl-expenses">{formatCurrency(report.expenses)}</p>
            </div>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className={`text-xl font-bold ${report.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-pl-net-profit">
                {formatCurrency(report.netProfit)}
              </p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {report.expensesByCategory && report.expensesByCategory.length > 0 && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-medium">Expenses by Category</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.expensesByCategory.map((cat: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{cat.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(cat.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function BalanceSheetReport({ dateParams }: { dateParams: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/accounting/reports/balance-sheet", { asOfDate: dateParams.endDate }],
  });

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>;
  if (!data) return null;

  const report = data as any;

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-medium">Balance Sheet as of {formatDate(report.asOfDate)}</h3>
        </div>
        <Table>
          <TableBody>
            <TableRow className="bg-muted/50">
              <TableCell colSpan={2} className="font-bold">Assets</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-6">Cash & Cash Equivalents</TableCell>
              <TableCell className="text-right">{formatCurrency(report.assets.cash)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-6">Accounts Receivable</TableCell>
              <TableCell className="text-right">{formatCurrency(report.assets.accountsReceivable)}</TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-bold">Total Assets</TableCell>
              <TableCell className="text-right font-bold" data-testid="text-bs-total-assets">{formatCurrency(report.assets.total)}</TableCell>
            </TableRow>
            <TableRow className="bg-muted/50">
              <TableCell colSpan={2} className="font-bold">Liabilities</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-6">Accounts Payable</TableCell>
              <TableCell className="text-right">{formatCurrency(report.liabilities.accountsPayable)}</TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-bold">Total Liabilities</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(report.liabilities.total)}</TableCell>
            </TableRow>
            <TableRow className="bg-muted/50 border-t-2">
              <TableCell className="font-bold">Equity</TableCell>
              <TableCell className="text-right font-bold" data-testid="text-bs-equity">{formatCurrency(report.equity)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function CashFlowReport() {
  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["/api/accounting/reports/cash-flow"],
  });

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>;
  if (!data) return null;

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Cash Flow - Last 12 Months</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <RechartsTooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: 8 }}
            />
            <Legend />
            <Bar dataKey="moneyIn" name="Money In" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="moneyOut" name="Money Out" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function AgingTable({ data, label }: { data: any; label: string }) {
  if (!data) return null;

  const bucketLabels = [
    { key: "current", label: "0-30 days", color: "text-green-600 dark:text-green-400" },
    { key: "31-60", label: "31-60 days", color: "text-yellow-600 dark:text-yellow-400" },
    { key: "61-90", label: "61-90 days", color: "text-orange-600 dark:text-orange-400" },
    { key: "90+", label: "90+ days", color: "text-red-600 dark:text-red-400" },
  ];

  const grandTotal = Object.values(data.totals as Record<string, number>).reduce((s: number, v: number) => s + v, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {bucketLabels.map(b => (
          <Card key={b.key} className="p-4">
            <p className="text-xs text-muted-foreground">{b.label}</p>
            <p className={`text-lg font-bold ${b.color}`}>{formatCurrency(data.totals[b.key])}</p>
            <p className="text-xs text-muted-foreground">{data.buckets[b.key]?.length || 0} {label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Total Outstanding</h3>
          <span className="text-lg font-bold">{formatCurrency(grandTotal)}</span>
        </div>
      </Card>

      {bucketLabels.map(b => {
        const items = data.buckets[b.key] || [];
        if (items.length === 0) return null;
        return (
          <Card key={b.key}>
            <div className="p-4 border-b">
              <h3 className="font-medium">{b.label} ({items.length})</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{label === "invoices" ? "Invoice" : "Vendor"}</TableHead>
                  <TableHead>{label === "invoices" ? "Client" : "Description"}</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{label === "invoices" ? item.invoiceNumber : item.vendor}</TableCell>
                    <TableCell>{label === "invoices" ? item.clientName : (item.description || "-")}</TableCell>
                    <TableCell>{formatDate(item.dueDate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );
      })}
    </div>
  );
}

function ARAgingReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/accounting/reports/ar-aging"],
  });
  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>;
  return <AgingTable data={data} label="invoices" />;
}

function APAgingReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/accounting/reports/ap-aging"],
  });
  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>;
  return <AgingTable data={data} label="bills" />;
}

function OverdueRemindersSection() {
  const { toast } = useToast();

  const { data: logs = [] } = useQuery<any[]>({
    queryKey: ["/api/accounting/reminder-logs"],
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/invoices/send-overdue-reminders", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/reminder-logs"] });
      toast({ title: `Sent ${data.sentCount} overdue reminders` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const lastRun = logs.length > 0 ? logs[0] : null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Overdue Reminders</h3>
            {lastRun && (
              <p className="text-xs text-muted-foreground">
                Last sent: {new Date(lastRun.sentAt).toLocaleString()} to {lastRun.sentTo}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending}
          data-testid="button-send-reminders"
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          {sendMutation.isPending ? "Sending..." : "Send Overdue Reminders"}
        </Button>
      </div>
    </Card>
  );
}

// ==================== MAIN PANEL ====================

interface AdminAccountingPanelProps {
  isCTO?: boolean;
  onNavigate?: (tab: string, entityId?: string) => void;
}

export default function AdminAccountingPanel({ isCTO = false, onNavigate }: AdminAccountingPanelProps) {
  return (
    <Tabs defaultValue="invoices" className="space-y-4">
      <TabsList data-testid="tabs-accounting">
        <TabsTrigger value="invoices" data-testid="tab-invoices">
          <FileText className="h-4 w-4 mr-1" /> Invoices
        </TabsTrigger>
        <TabsTrigger value="expenses" data-testid="tab-expenses">
          <CreditCard className="h-4 w-4 mr-1" /> Expenses
        </TabsTrigger>
        <TabsTrigger value="bills" data-testid="tab-bills">
          <DollarSign className="h-4 w-4 mr-1" /> Bills
        </TabsTrigger>
        <TabsTrigger value="reports" data-testid="tab-reports">
          <BarChart3 className="h-4 w-4 mr-1" /> Reports
        </TabsTrigger>
      </TabsList>

      <TabsContent value="invoices">
        <InvoicesTab isCTO={isCTO} onNavigate={onNavigate} />
      </TabsContent>

      <TabsContent value="expenses">
        <ExpensesTab />
      </TabsContent>

      <TabsContent value="bills">
        <BillsTab />
      </TabsContent>

      <TabsContent value="reports">
        <ReportsTab isCTO={isCTO} />
      </TabsContent>
    </Tabs>
  );
}
